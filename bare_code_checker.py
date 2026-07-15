"""
Merged bare-code checker.

This file supports two local checking modes:

1. check_mode="no_variants"
   For each ordered stabilizer sequence, check only actual prefixes.
   For weight w, checked prefix lengths are 2 through w-2.

2. check_mode="variants"
   For each ordered stabilizer sequence, check local X/Y/Z variants at each next qubit.
   The actual first pair is checked once. At the second-last operator, the actual
   operator is intentionally skipped and only the other variants are checked.

Both modes support:
- MPCM = [H_X | H_Z | H_X + H_Z]
- zero-syndrome commutation with both logical operators
- local duplicate-syndrome acceptance when the product of operators commutes with both logicals
- MPCM-column collision acceptance when the product with at least one matching single-qubit MPCM operator commutes with both logicals
- global collision acceptance when the product of corresponding operators commutes with both logicals
- preferred_sequences tested before general search
- search_mode="lexicographic" or search_mode="random"
"""

from __future__ import annotations

from dataclasses import dataclass
from itertools import permutations
from math import factorial
from typing import Dict, Iterable, List, Optional, Sequence, Tuple, Union
import random

import numpy as np


Op = Tuple[int, int]          # (zero_based_qubit_index, operator_code), X=1, Y=2, Z=3
Syndrome = Tuple[int, ...]
PreferredOp = Union[Op, Tuple[int, str], str]

PAULI_TO_INT = {"I": 0, "X": 1, "Y": 2, "Z": 3}
INT_TO_PAULI = {0: "I", 1: "X", 2: "Y", 3: "Z"}
VALID_PAULIS = set(PAULI_TO_INT)
VARIANTS = (1, 2, 3)          # X, Y, Z


@dataclass
class Candidate:
    sequence: List[Op]
    syndrome_operator_map: Dict[Syndrome, List[str]]
    checked_steps: List[Dict[str, object]]


@dataclass
class StabilizerSearchResult:
    stabilizer: str
    weight: int
    total_permutations: int
    tested_permutations: int
    valid_permutations: List[Candidate]
    exhaustive: bool


# -----------------------------------------------------------------------------
# Basic Pauli / parity-check utilities
# -----------------------------------------------------------------------------

def validate_inputs(stabilizers: Sequence[str], logicals: Sequence[str]) -> None:
    if not stabilizers:
        raise ValueError("stabilizers must be a non-empty list of Pauli strings")
    if not logicals:
        raise ValueError("logicals must contain at least one logical Pauli string")

    n = len(stabilizers[0])
    if n == 0:
        raise ValueError("Pauli strings must be non-empty")

    for s in stabilizers:
        if len(s) != n:
            raise ValueError("all stabilizers must have the same length")
        bad = set(s) - VALID_PAULIS
        if bad:
            raise ValueError(f"invalid stabilizer character(s) {bad}; use only I, X, Y, Z")

    for logical in logicals:
        if len(logical) != n:
            raise ValueError("logical operators must have the same length as stabilizers")
        bad = set(logical) - VALID_PAULIS
        if bad:
            raise ValueError(f"invalid logical character(s) {bad}; use only I, X, Y, Z")


def weight(pauli_string: str) -> int:
    return sum(ch != "I" for ch in pauli_string)


def stabilizers_to_binary_matrix(stabilizers: Sequence[str]) -> np.ndarray:
    """Return H = [H_X | H_Z] for the stabilizer generators."""
    rows = len(stabilizers)
    n = len(stabilizers[0])
    h = np.zeros((rows, 2 * n), dtype=np.uint8)

    for r, stab in enumerate(stabilizers):
        for q, op in enumerate(stab):
            if op == "X":
                h[r, q] = 1
            elif op == "Z":
                h[r, n + q] = 1
            elif op == "Y":
                h[r, q] = 1
                h[r, n + q] = 1
    return h


def modified_parity_check_matrix(stabilizers: Sequence[str]) -> np.ndarray:
    """Return MPCM = [H_X | H_Z | H_X + H_Z]."""
    h = stabilizers_to_binary_matrix(stabilizers)
    n = h.shape[1] // 2
    hx = h[:, :n]
    hz = h[:, n:]
    hy = (hx + hz) % 2
    return np.hstack([h, hy]).astype(np.uint8)


def precompute_syndrome_columns(mpcm: np.ndarray, n: int) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Syndrome columns for single-qubit errors.

    For error X_q, syndrome is the H_Z column.
    For error Z_q, syndrome is the H_X column.
    For error Y_q, syndrome is H_X + H_Z.
    """
    columns_x = mpcm[:, n : 2 * n].T.copy()       # X error syndromes
    columns_z = mpcm[:, :n].T.copy()              # Z error syndromes
    columns_y = mpcm[:, 2 * n : 3 * n].T.copy()   # Y error syndromes
    return columns_x, columns_y, columns_z


def get_syndrome_column(op: int, q: int, columns_x: np.ndarray, columns_y: np.ndarray, columns_z: np.ndarray) -> np.ndarray:
    if op == 1:
        return columns_x[q]
    if op == 2:
        return columns_y[q]
    if op == 3:
        return columns_z[q]
    raise ValueError("operator code must be 1=X, 2=Y, or 3=Z")


def all_mpcm_column_syndrome_operator_map(mpcm: np.ndarray, num_qubits: int) -> Dict[Syndrome, List[str]]:
    """
    Map each MPCM column syndrome to its corresponding single-qubit Pauli operator(s).

    MPCM layout is [H_X | H_Z | H_X + H_Z]. Checked-operator convention:
        X_q -> H_Z column
        Z_q -> H_X column
        Y_q -> H_X + H_Z column
    """
    syndrome_map: Dict[Syndrome, List[str]] = {}

    def add(column_index: int, op: int, q: int) -> None:
        syndrome = tuple(int(x) for x in mpcm[:, column_index])
        operator_string = ops_to_pauli_string(num_qubits, [(q, op)])
        syndrome_map.setdefault(syndrome, [])
        if operator_string not in syndrome_map[syndrome]:
            syndrome_map[syndrome].append(operator_string)

    for q in range(num_qubits):
        add(q, 3, q)                    # H_X column: Z_q syndrome
        add(num_qubits + q, 1, q)       # H_Z column: X_q syndrome
        add(2 * num_qubits + q, 2, q)   # H_X + H_Z column: Y_q syndrome

    return syndrome_map


def syndrome_to_tuple(s: np.ndarray) -> Syndrome:
    return tuple(int(x) for x in s.tolist())


def pauli_strings_commute(a: str, b: str) -> bool:
    """Return True iff two Pauli strings commute, ignoring phase."""
    parity = 0
    for x, y in zip(a, b):
        if x != "I" and y != "I" and x != y:
            parity ^= 1
    return parity == 0


def multiply_single_pauli(a: str, b: str) -> str:
    """Multiply one-qubit Paulis while ignoring global phase."""
    if a == "I":
        return b
    if b == "I":
        return a
    if a == b:
        return "I"
    return ({"X", "Y", "Z"} - {a, b}).pop()


def multiply_pauli_strings(a: str, b: str) -> str:
    """Multiply Pauli strings qubitwise while ignoring global phase."""
    if len(a) != len(b):
        raise ValueError("Pauli strings must have the same length")
    return "".join(multiply_single_pauli(x, y) for x, y in zip(a, b))


def generate_logical_group(logicals: Sequence[str]) -> List[str]:
    """Generate the full group of logical operators (2^M) from M generators."""
    if not logicals:
        return []
    n = len(logicals[0])
    group = {"I" * n}
    for gen in logicals:
        new_elements = set()
        for elem in group:
            new_elements.add(multiply_pauli_strings(elem, gen))
        group.update(new_elements)
    return list(group)


def product_commutes_with_logicals(a: str, b: str, logicals: Sequence[str]) -> bool:
    product = multiply_pauli_strings(a, b)
    for logical in logicals:
        if not pauli_strings_commute(product, logical):
            return False
    return True


def operators_compatible_for_same_syndrome(a: str, b: str, logicals: Sequence[str]) -> bool:
    return a == b or product_commutes_with_logicals(a, b, logicals)


def ops_to_pauli_string(num_qubits: int, ops: Sequence[Op]) -> str:
    chars = ["I"] * num_qubits
    for q, op in ops:
        chars[q] = INT_TO_PAULI[op]
    return "".join(chars)


def ops_to_compact_label(ops: Sequence[Op]) -> str:
    """Human-readable 1-based label, for example X2Z3Z4."""
    return "".join(f"{INT_TO_PAULI[op]}{q + 1}" for q, op in ops)


def sequence_to_compact_label(sequence: Sequence[Op]) -> str:
    return " -> ".join(f"{INT_TO_PAULI[op]}{q + 1}" for q, op in sequence)


def stabilizer_to_ops(stabilizer: str) -> List[Op]:
    ops: List[Op] = []
    for q, ch in enumerate(stabilizer):
        if ch != "I":
            ops.append((q, PAULI_TO_INT[ch]))
    return ops


def normalize_ordered_sequence(
    sequence: Sequence[PreferredOp],
    expected_ops: Sequence[Op],
) -> List[Op]:
    """
    Normalize a preferred ordered sequence into Op tuples.

    Accepted formats:
        (4, 3)      # numeric op code, 1=X, 2=Y, 3=Z
        (4, "Z")    # Pauli character
        "Z4"        # compact label, zero-based qubit index
    """
    normalized: List[Op] = []

    for item in sequence:
        if isinstance(item, str):
            item = item.strip()
            if len(item) < 2:
                raise ValueError(f"invalid compact operator label: {item!r}")
            op_char = item[0].upper()
            if op_char not in {"X", "Y", "Z"}:
                raise ValueError(f"invalid operator in compact label: {item!r}")
            q = int(item[1:])
            normalized.append((q, PAULI_TO_INT[op_char]))
            continue

        if len(item) != 2:
            raise ValueError(f"invalid operator tuple: {item!r}")
        q, op = item
        if isinstance(op, str):
            op = op.upper()
            if op not in {"X", "Y", "Z"}:
                raise ValueError(f"invalid operator: {op!r}")
            op_code = PAULI_TO_INT[op]
        else:
            op_code = int(op)
            if op_code not in {1, 2, 3}:
                raise ValueError(f"invalid operator code: {op_code!r}")
        normalized.append((int(q), op_code))

    if sorted(normalized) != sorted(expected_ops):
        raise ValueError(
            "preferred sequence must contain exactly the same non-identity "
            "operators as the stabilizer, only reordered"
        )
    return normalized


# -----------------------------------------------------------------------------
# Permutation iterators
# -----------------------------------------------------------------------------

def random_permutation_iterator(
    ops: Sequence[Op],
    max_samples: Optional[int],
    *,
    seed: Optional[int] = None,
    skip_seen: Optional[set[Tuple[Op, ...]]] = None,
) -> Iterable[Tuple[Op, ...]]:
    rng = random.Random(seed)
    seen: set[Tuple[Op, ...]] = set() if skip_seen is None else set(skip_seen)
    total = factorial(len(ops))
    target = total if max_samples is None else min(max_samples, total)
    attempts = 0
    max_attempts = max(10 * target, 1000)

    while len(seen) < target and attempts < max_attempts:
        attempts += 1
        perm = tuple(rng.sample(list(ops), len(ops)))
        if perm in seen:
            continue
        seen.add(perm)
        yield perm


def lexicographic_permutation_iterator(
    ops: Sequence[Op],
    max_samples: Optional[int],
    *,
    skip_seen: Optional[set[Tuple[Op, ...]]] = None,
) -> Iterable[Tuple[Op, ...]]:
    seen = set() if skip_seen is None else set(skip_seen)
    yielded = 0
    for perm in permutations(ops):
        if max_samples is not None and yielded >= max_samples:
            break
        if perm in seen:
            continue
        seen.add(perm)
        yielded += 1
        yield perm


# -----------------------------------------------------------------------------
# Shared checked-operator validation
# -----------------------------------------------------------------------------

def add_checked_operator(
    *,
    num_qubits: int,
    logicals: Sequence[str],
    existing_mpcm_map: Dict[Syndrome, List[str]],
    zero_syndrome: Syndrome,
    local_map: Dict[Syndrome, List[str]],
    checked_steps: List[Dict[str, object]],
    syndrome_vector: np.ndarray,
    checked_ops: Sequence[Op],
) -> bool:
    """
    Validate one checked prefix/variant and add it to the local map.

    - zero syndrome: checked operator must commute with both logicals
    - nonzero MPCM collision: accepted if product with at least one matching
      single-qubit MPCM operator commutes with both logicals
    - local duplicate syndrome: accepted if product of old/new checked operators
      commutes with both logicals
    """
    syndrome = syndrome_to_tuple(syndrome_vector)
    operator_string = ops_to_pauli_string(num_qubits, checked_ops)

    mpcm_collision_products: List[str] = []
    mpcm_collision_accepted = False

    if syndrome == zero_syndrome:
        for logical in logicals:
            if not pauli_strings_commute(operator_string, logical):
                return False
    else:
        if syndrome in existing_mpcm_map:
            for mpcm_operator in existing_mpcm_map[syndrome]:
                product = multiply_pauli_strings(operator_string, mpcm_operator)
                mpcm_collision_products.append(product)
                
                commutes_with_all = True
                for logical in logicals:
                    if not pauli_strings_commute(product, logical):
                        commutes_with_all = False
                        break
                
                if commutes_with_all:
                    mpcm_collision_accepted = True
                    break
            if not mpcm_collision_accepted:
                return False

    duplicate_products: List[str] = []
    if syndrome in local_map:
        for previous_operator in local_map[syndrome]:
            product = multiply_pauli_strings(previous_operator, operator_string)
            duplicate_products.append(product)
            for logical in logicals:
                if not pauli_strings_commute(product, logical):
                    return False
        if operator_string not in local_map[syndrome]:
            local_map[syndrome].append(operator_string)
    else:
        local_map[syndrome] = [operator_string]

    checked_steps.append(
        {
            "operator_label": ops_to_compact_label(checked_ops),
            "operator_history": [(int(q), INT_TO_PAULI[int(op)]) for q, op in checked_ops],
            "operator_string": operator_string,
            "syndrome": syndrome,
            "duplicate_syndrome": len(duplicate_products) > 0,
            "duplicate_products": duplicate_products,
            "mpcm_collision": len(mpcm_collision_products) > 0,
            "mpcm_collision_products": mpcm_collision_products,
            "mpcm_collision_accepted": mpcm_collision_accepted,
        }
    )
    return True


# -----------------------------------------------------------------------------
# Local candidate validation modes
# -----------------------------------------------------------------------------

def validate_permutation_no_variants(
    sequence: Sequence[Op],
    *,
    num_qubits: int,
    rows: int,
    logicals: Sequence[str],
    existing_mpcm_map: Dict[Syndrome, List[str]],
    columns_x: np.ndarray,
    columns_y: np.ndarray,
    columns_z: np.ndarray,
) -> Optional[Candidate]:
    """
    Check only actual prefixes of the permuted stabilizer sequence.

    For weight w, checked prefix lengths are 2, 3, ..., w-2.
    The penultimate and full stabilizer prefixes are not checked in no-variant mode.
    """
    n_ops = len(sequence)
    if n_ops < 3:
        return None

    zero = tuple(0 for _ in range(rows))
    local_map: Dict[Syndrome, List[str]] = {}
    checked_steps: List[Dict[str, object]] = []

    current = np.zeros(rows, dtype=np.uint8)
    prefix_ops: List[Op] = []

    for idx, (q, op) in enumerate(sequence):
        current = np.bitwise_xor(current, get_syndrome_column(op, q, columns_x, columns_y, columns_z))
        prefix_ops.append((q, op))

        # Check prefix lengths 2 through w-2 only.
        if 1 <= idx <= n_ops - 3:
            ok = add_checked_operator(
                num_qubits=num_qubits,
                logicals=logicals,
                existing_mpcm_map=existing_mpcm_map,
                zero_syndrome=zero,
                local_map=local_map,
                checked_steps=checked_steps,
                syndrome_vector=current,
                checked_ops=prefix_ops,
            )
            if not ok:
                return None

    return Candidate(list(sequence), local_map, checked_steps)


def validate_permutation_with_variants(
    sequence: Sequence[Op],
    *,
    num_qubits: int,
    rows: int,
    logicals: Sequence[str],
    existing_mpcm_map: Dict[Syndrome, List[str]],
    columns_x: np.ndarray,
    columns_y: np.ndarray,
    columns_z: np.ndarray,
) -> Optional[Candidate]:
    """
    Check a permuted stabilizer sequence with local X/Y/Z variants.

    Let sequence = [a0, a1, ..., a_{w-1}].
    First check actual pair a0 a1. Then for k=1,...,w-2 check
    fixed actual prefix a0...a_{k-1} plus X/Y/Z at qubit(a_k).
    The actual first pair duplicate and the actual second-last operator are skipped.
    """
    n_ops = len(sequence)
    if n_ops < 3:
        return None

    zero = tuple(0 for _ in range(rows))
    local_map: Dict[Syndrome, List[str]] = {}
    checked_steps: List[Dict[str, object]] = []

    q0, op0 = sequence[0]
    fixed_ops: List[Op] = [(q0, op0)]
    fixed_syndrome = get_syndrome_column(op0, q0, columns_x, columns_y, columns_z).copy()

    # Check actual first two operators once: a0 a1.
    q1, op1 = sequence[1]
    actual_pair_syndrome = np.bitwise_xor(
        fixed_syndrome,
        get_syndrome_column(op1, q1, columns_x, columns_y, columns_z),
    )
    if not add_checked_operator(
        num_qubits=num_qubits,
        logicals=logicals,
        existing_mpcm_map=existing_mpcm_map,
        zero_syndrome=zero,
        local_map=local_map,
        checked_steps=checked_steps,
        syndrome_vector=actual_pair_syndrome,
        checked_ops=[sequence[0], sequence[1]],
    ):
        return None

    # Check local variants for positions 1 through w-2.
    for k in range(1, n_ops - 1):
        qk, actual_op = sequence[k]

        for variant in VARIANTS:
            # Actual first pair was already checked.
            if k == 1 and variant == actual_op:
                continue

            # User's intentional second-last skip rule.
            if k == n_ops - 2 and variant == actual_op:
                continue

            checked_ops = fixed_ops + [(qk, variant)]
            variant_syndrome = np.bitwise_xor(
                fixed_syndrome,
                get_syndrome_column(variant, qk, columns_x, columns_y, columns_z),
            )

            if not add_checked_operator(
                num_qubits=num_qubits,
                logicals=logicals,
                existing_mpcm_map=existing_mpcm_map,
                zero_syndrome=zero,
                local_map=local_map,
                checked_steps=checked_steps,
                syndrome_vector=variant_syndrome,
                checked_ops=checked_ops,
            ):
                return None

        fixed_syndrome = np.bitwise_xor(
            fixed_syndrome,
            get_syndrome_column(actual_op, qk, columns_x, columns_y, columns_z),
        )
        fixed_ops.append((qk, actual_op))

    return Candidate(list(sequence), local_map, checked_steps)


def validate_permutation(
    sequence: Sequence[Op],
    *,
    check_mode: str,
    num_qubits: int,
    rows: int,
    logicals: Sequence[str],
    existing_mpcm_map: Dict[Syndrome, List[str]],
    columns_x: np.ndarray,
    columns_y: np.ndarray,
    columns_z: np.ndarray,
) -> Optional[Candidate]:
    mode = check_mode.lower().strip()
    kwargs = dict(
        num_qubits=num_qubits,
        rows=rows,
        logicals=logicals,
        existing_mpcm_map=existing_mpcm_map,
        columns_x=columns_x,
        columns_y=columns_y,
        columns_z=columns_z,
    )
    if mode in {"variants", "variant", "with_variants"}:
        return validate_permutation_with_variants(sequence, **kwargs)
    if mode in {"no_variants", "no_variant", "prefix", "prefix_only"}:
        return validate_permutation_no_variants(sequence, **kwargs)
    raise ValueError("check_mode must be 'variants' or 'no_variants'")


# -----------------------------------------------------------------------------
# Search and global compatibility
# -----------------------------------------------------------------------------

def search_stabilizer_permutations(
    stabilizer: str,
    *,
    check_mode: str,
    num_qubits: int,
    rows: int,
    logicals: Sequence[str],
    existing_mpcm_map: Dict[Syndrome, List[str]],
    columns_x: np.ndarray,
    columns_y: np.ndarray,
    columns_z: np.ndarray,
    max_permutations_per_stabilizer: Optional[int] = None,
    max_valid_permutations_per_stabilizer: Optional[int] = None,
    search_mode: str = "lexicographic",
    random_seed: Optional[int] = None,
    preferred_sequence: Optional[Sequence[PreferredOp]] = None,
) -> StabilizerSearchResult:
    """
    Search valid ordered permutations for one stabilizer.

    search_mode:
        "lexicographic" - itertools.permutations order.
        "random"        - random unique permutation sampling.

    preferred_sequence:
        Optional ordered sequence to test before the general search.
    """
    ops = stabilizer_to_ops(stabilizer)
    w = len(ops)
    total = factorial(w)

    valid: List[Candidate] = []
    tested = 0
    stopped_by_valid_limit = False
    seen: set[Tuple[Op, ...]] = set()

    if w < 3:
        return StabilizerSearchResult(stabilizer, w, total, 0, [], True)

    def test_sequence(sequence: Sequence[Op]) -> None:
        nonlocal tested, stopped_by_valid_limit
        if stopped_by_valid_limit:
            return
        key = tuple(sequence)
        if key in seen:
            return
        if max_permutations_per_stabilizer is not None and tested >= max_permutations_per_stabilizer:
            return

        seen.add(key)
        tested += 1
        candidate = validate_permutation(
            sequence,
            check_mode=check_mode,
            num_qubits=num_qubits,
            rows=rows,
            logicals=logicals,
            existing_mpcm_map=existing_mpcm_map,
            columns_x=columns_x,
            columns_y=columns_y,
            columns_z=columns_z,
        )

        if candidate is not None:
            valid.append(candidate)
            if (
                max_valid_permutations_per_stabilizer is not None
                and len(valid) >= max_valid_permutations_per_stabilizer
            ):
                stopped_by_valid_limit = True

    # 1. Test known/preferred order first.
    if preferred_sequence is not None:
        preferred = normalize_ordered_sequence(preferred_sequence, ops)
        test_sequence(preferred)

    # 2. Continue with selected search mode.
    remaining_limit = None
    if max_permutations_per_stabilizer is not None:
        remaining_limit = max(0, max_permutations_per_stabilizer - tested)

    if not stopped_by_valid_limit and (remaining_limit is None or remaining_limit > 0):
        mode = search_mode.lower().strip()
        if mode in {"lexicographic", "ordered", "itertools"}:
            iterator = lexicographic_permutation_iterator(ops, remaining_limit, skip_seen=seen)
        elif mode in {"random", "shuffle", "sample"}:
            iterator = random_permutation_iterator(ops, remaining_limit, seed=random_seed, skip_seen=seen)
        else:
            raise ValueError("search_mode must be 'lexicographic' or 'random'")

        for sequence in iterator:
            test_sequence(sequence)
            if stopped_by_valid_limit:
                break

    exhaustive = tested == total and not stopped_by_valid_limit
    return StabilizerSearchResult(stabilizer, w, total, tested, valid, exhaustive)


def candidate_compatible_with_used(
    candidate: Candidate,
    used: Dict[Syndrome, List[str]],
    logicals: Sequence[str],
) -> bool:
    for syndrome, operator_strings in candidate.syndrome_operator_map.items():
        if syndrome not in used:
            continue
        for new_operator in operator_strings:
            for used_operator in used[syndrome]:
                if not operators_compatible_for_same_syndrome(new_operator, used_operator, logicals):
                    return False
    return True


def merge_candidate_into_used(
    candidate: Candidate,
    used: Dict[Syndrome, List[str]],
) -> Dict[Syndrome, List[str]]:
    merged = {syndrome: operators.copy() for syndrome, operators in used.items()}
    for syndrome, operator_strings in candidate.syndrome_operator_map.items():
        if syndrome not in merged:
            merged[syndrome] = []
        for operator_string in operator_strings:
            if operator_string not in merged[syndrome]:
                merged[syndrome].append(operator_string)
    return merged


def choose_global_solution(
    results: Dict[str, StabilizerSearchResult],
    logicals: Sequence[str],
) -> Optional[Dict[str, Candidate]]:
    active = [s for s, r in results.items() if r.weight >= 3]

    for s in active:
        if not results[s].valid_permutations:
            return None

    active.sort(key=lambda s: len(results[s].valid_permutations))
    solution: Dict[str, Candidate] = {}

    def backtrack(i: int, used: Dict[Syndrome, List[str]]) -> bool:
        if i == len(active):
            return True

        stabilizer = active[i]
        for candidate in results[stabilizer].valid_permutations:
            if not candidate_compatible_with_used(candidate, used, logicals):
                continue

            solution[stabilizer] = candidate
            merged = merge_candidate_into_used(candidate, used)
            if backtrack(i + 1, merged):
                return True
            del solution[stabilizer]

        return False

    if backtrack(0, {}):
        return solution
    return None


# -----------------------------------------------------------------------------
# Public API
# -----------------------------------------------------------------------------

def _find_code_single_mode(
    input_stabilizers_list: Sequence[str],
    logicals: Sequence[str],
    *,
    check_mode: str,
    max_permutations_per_stabilizer: Optional[int],
    max_valid_permutations_per_stabilizer: Optional[int],
    search_mode: str,
    random_seed: Optional[int],
    preferred_sequences: Optional[Dict[str, Sequence[PreferredOp]]],
    verbose: bool,
    old_format: bool = True,
    input_stabilizers_for_old_format: Optional[Sequence[str]] = None,
) -> Dict[str, object]:
    validate_inputs(input_stabilizers_list, logicals)

    full_logicals_group = generate_logical_group(logicals)

    num_qubits = len(input_stabilizers_list[0])
    mpcm = modified_parity_check_matrix(input_stabilizers_list)
    rows = mpcm.shape[0]
    columns_x, columns_y, columns_z = precompute_syndrome_columns(mpcm, num_qubits)
    existing = all_mpcm_column_syndrome_operator_map(mpcm, num_qubits)

    mode = check_mode.lower().strip()
    if mode in {"variants", "variant", "with_variants"}:
        banner_mode = "permutation + variant mode"
    elif mode in {"no_variants", "no_variant", "prefix", "prefix_only"}:
        banner_mode = "permutation-only / no-variant mode"
    else:
        raise ValueError("check_mode must be 'variants', 'no_variants', or 'both'")

    if verbose:
        print("=" * 72)
        print(f"Bare-code check: {banner_mode}")
        print(f"Search mode: {search_mode}")
        if preferred_sequences:
            print(f"Preferred sequences supplied: {len(preferred_sequences)}")
        print(f"Stabilizers: {len(input_stabilizers_list)}")
        print(f"Qubits: {num_qubits}")
        print(f"MPCM shape: {mpcm.shape}")
        print("=" * 72)

    results: Dict[str, StabilizerSearchResult] = {}
    for stabilizer in input_stabilizers_list:
        result = search_stabilizer_permutations(
            stabilizer,
            check_mode=check_mode,
            num_qubits=num_qubits,
            rows=rows,
            logicals=full_logicals_group,
            existing_mpcm_map=existing,
            columns_x=columns_x,
            columns_y=columns_y,
            columns_z=columns_z,
            max_permutations_per_stabilizer=max_permutations_per_stabilizer,
            max_valid_permutations_per_stabilizer=max_valid_permutations_per_stabilizer,
            search_mode=search_mode,
            random_seed=random_seed,
            preferred_sequence=(preferred_sequences or {}).get(stabilizer),
        )
        results[stabilizer] = result

        if verbose:
            if result.weight < 3:
                print(f"skip {stabilizer}: weight={result.weight} < 3")
            else:
                print(
                    f"{stabilizer}: weight={result.weight}, "
                    f"tested={result.tested_permutations}/{result.total_permutations}, "
                    f"valid={len(result.valid_permutations)}, exhaustive={result.exhaustive}"
                )

    solution = choose_global_solution(results, full_logicals_group)
    exhaustive = all(r.exhaustive for r in results.values())

    if solution is not None:
        status = "bare"
        is_bare = True
    elif exhaustive:
        status = "not_bare"
        is_bare = False
    else:
        status = "inconclusive_limited_search"
        is_bare = False

    output = {
        "check_mode": check_mode,
        "status": status,
        "is_bare": is_bare,
        "exhaustive": exhaustive,
        "mpcm": mpcm,
        "results_by_stabilizer": results,
        "solution": solution,
    }

    if old_format:
        add_old_format_outputs(output, input_stabilizers_for_old_format or input_stabilizers_list)

    if verbose:
        print("=" * 72)
        print(f"STATUS ({check_mode}): {status}")
        if solution is not None:
            print_solution(output, print_syndromes=True)
        elif status == "inconclusive_limited_search":
            print("No global solution was found inside the selected permutation limits.")
            print("This is not a proof that the code is not bare.")
        print("=" * 72)

    return output


def find_code(
    input_stabilizers_list: Sequence[str],
    logicals: Sequence[str],
    *,
    check_mode: str = "variants",
    max_permutations_per_stabilizer: Optional[int] = None,
    max_valid_permutations_per_stabilizer: Optional[int] = None,
    search_mode: str = "lexicographic",
    random_seed: Optional[int] = None,
    preferred_sequences: Optional[Dict[str, Sequence[PreferredOp]]] = None,
    verbose: bool = True,
    old_format: bool = True,
) -> Dict[str, object]:
    """
    Check whether the code is bare.

    check_mode:
        "variants"    - use local X/Y/Z variant checks.
        "no_variants" - use only actual-prefix checks.
        "both"        - run both modes and return a dictionary with both results.

    search_mode:
        "lexicographic" - use itertools.permutations order.
        "random"        - sample random unique operator orderings.

    preferred_sequences:
        Optional mapping from stabilizer string to a known ordered sequence.
        Preferred sequences are tested before lexicographic/random search.
    """
    flat_logicals = []
    for item in logicals:
        if isinstance(item, str):
            flat_logicals.append(item)
        else:
            flat_logicals.extend(item)
    logicals = flat_logicals

    mode = check_mode.lower().strip()
    common = dict(
        max_permutations_per_stabilizer=max_permutations_per_stabilizer,
        max_valid_permutations_per_stabilizer=max_valid_permutations_per_stabilizer,
        search_mode=search_mode,
        random_seed=random_seed,
        preferred_sequences=preferred_sequences,
        verbose=verbose,
        old_format=old_format,
        input_stabilizers_for_old_format=input_stabilizers_list,
    )

    if mode == "both":
        return {
            "variants": _find_code_single_mode(
                input_stabilizers_list,
                logicals,
                check_mode="variants",
                **common,
            ),
            "no_variants": _find_code_single_mode(
                input_stabilizers_list,
                logicals,
                check_mode="no_variants",
                **common,
            ),
        }

    return _find_code_single_mode(
        input_stabilizers_list,
        logicals,
        check_mode=check_mode,
        **common,
    )


# -----------------------------------------------------------------------------
# Old-output-format compatibility helpers
# -----------------------------------------------------------------------------

def sequence_to_old_ops(sequence: Sequence[Op]) -> List[Tuple[int, str]]:
    """Return [(qubit_index, 'X'/'Y'/'Z'), ...] in the selected order."""
    return [(int(q), INT_TO_PAULI[int(op)]) for q, op in sequence]


def pauli_string_to_history(pauli_str: str) -> List[Tuple[int, str]]:
    """Convert a Pauli string into [(index, op), ...], omitting identities."""
    return [(idx, op) for idx, op in enumerate(pauli_str) if op != "I"]


def history_to_pauli_string(history: Sequence[Tuple[int, str]], num_qubits: int) -> str:
    """Convert [(index, op), ...] into a length-n Pauli string."""
    chars = ["I"] * num_qubits
    for q, op in history:
        chars[int(q)] = str(op)
    return "".join(chars)


def pauli_multiply(p1: str, p2: str) -> str:
    """Multiply two Pauli strings qubitwise, ignoring global phase."""
    return multiply_pauli_strings(p1, p2)


def _history_matches_actual_prefix(history: Sequence[Tuple[int, str]], sequence: Sequence[Op]) -> bool:
    """True iff history is an actual prefix of the selected sequence."""
    if len(history) < 2:
        return False
    if len(history) > max(0, len(sequence) - 2):
        return False
    expected = sequence_to_old_ops(sequence[:len(history)])
    return list(history) == expected


def candidate_to_old_entry(candidate: Candidate, check_mode: str) -> Tuple[List[Tuple[int, str]], List[Syndrome], List[Syndrome]]:
    """
    Convert one selected Candidate to the old tuple format:
        (operator_positions, original_syndromes, all_syndromes)

    operator_positions uses old style [(q, 'X'/'Y'/'Z'), ...].
    original_syndromes contains actual-prefix syndromes.
    all_syndromes contains variant checked syndromes for variant mode, and [] for no-variant mode.
    """
    op_positions = sequence_to_old_ops(candidate.sequence)
    original_syndromes: List[Syndrome] = []
    all_syndromes: List[Syndrome] = []
    mode = check_mode.lower().strip()

    for step in candidate.checked_steps:
        syndrome = tuple(step["syndrome"])
        history = [(int(q), str(op)) for q, op in step.get("operator_history", [])]
        if _history_matches_actual_prefix(history, candidate.sequence):
            original_syndromes.append(syndrome)
        if mode in {"variants", "variant", "with_variants"}:
            all_syndromes.append(syndrome)

    return op_positions, original_syndromes, all_syndromes


def solution_to_old_final(result: Dict[str, object]) -> Dict[str, Tuple[List[Tuple[int, str]], List[Syndrome], List[Syndrome]]]:
    """
    Convert result['solution'] to the old `final` format:
        final[stabilizer] = (perm, orig, all_syn)
    Only weight>2 stabilizers selected by the solver are included here.
    Use rebuild_stabilizer_dict_old(...) to add weight<=2 stabilizers back.
    """
    solution = result.get("solution") or {}
    check_mode = str(result.get("check_mode", "variants"))
    old_final = {}
    for stabilizer, candidate in solution.items():
        old_final[stabilizer] = candidate_to_old_entry(candidate, check_mode)
    return old_final


def enrich_final_old_format(
    old_final: Dict[str, Tuple[List[Tuple[int, str]], List[Syndrome], List[Syndrome]]],
    result: Dict[str, object],
) -> Dict[str, Tuple[List[Tuple[int, str]], List[Tuple[Syndrome, List[Tuple[int, str]]]], List[Tuple[Syndrome, List[Tuple[int, str]]]]]]:
    """
    Old `new_final` format:
        new_final[stab] = (op_positions, enriched_inter_list, enriched_syndromes)

    enriched_inter_list and enriched_syndromes contain:
        (syndrome_tuple, operator_history)
    """
    solution = result.get("solution") or {}
    check_mode = str(result.get("check_mode", "variants")).lower().strip()
    enriched = {}

    for stabilizer, (op_positions, inter_list, syndromes) in old_final.items():
        candidate = solution.get(stabilizer)
        if candidate is None:
            enriched[stabilizer] = (op_positions, [], [])
            continue

        enriched_inter_list = []
        enriched_syndromes = []
        for step in candidate.checked_steps:
            syndrome = tuple(step["syndrome"])
            history = [(int(q), str(op)) for q, op in step.get("operator_history", [])]
            if syndrome in inter_list and _history_matches_actual_prefix(history, candidate.sequence):
                enriched_inter_list.append((syndrome, history))
            if check_mode in {"variants", "variant", "with_variants"} and syndrome in syndromes:
                enriched_syndromes.append((syndrome, history))

        enriched[stabilizer] = (op_positions, enriched_inter_list, enriched_syndromes)

    return enriched


def process_final_old_format(
    new_final: Dict[str, Tuple[List[Tuple[int, str]], List[Tuple[Syndrome, List[Tuple[int, str]]]], List[Tuple[Syndrome, List[Tuple[int, str]]]]]],
) -> Tuple[Dict[str, Tuple[List[Tuple[int, str]], List[Tuple[Syndrome, List[Tuple[int, str]]]], List[Tuple[Syndrome, List[Tuple[int, str]]]]]], List[Dict[str, object]]]:
    """
    Same post-processing idea as the old file:
    for each history in value[2], multiply its Pauli string by each stabilizer
    and keep the lower-weight representative when found.
    """
    updated = {}
    log: List[Dict[str, object]] = []

    for stabilizer, value in new_final.items():
        histories = value[2]
        num_qubits = len(stabilizer)
        new_histories = []

        for binary, history in histories:
            pauli_str = history_to_pauli_string(history, num_qubits)
            w = weight(pauli_str)

            if w < 3:
                new_histories.append((binary, history))
                continue

            best_str = pauli_str
            best_w = w
            best_stab = None

            for stab_key in new_final.keys():
                prod = pauli_multiply(pauli_str, stab_key)
                prod_w = weight(prod)
                if prod_w < best_w:
                    best_str = prod
                    best_w = prod_w
                    best_stab = stab_key

            if best_str != pauli_str:
                new_history = pauli_string_to_history(best_str)
                new_histories.append((binary, new_history))
                log.append({
                    "stabilizer": stabilizer,
                    "binary": binary,
                    "original": pauli_str,
                    "original_weight": w,
                    "improved": best_str,
                    "improved_weight": best_w,
                    "via_stabilizer": best_stab,
                })
            else:
                new_histories.append((binary, history))

        updated[stabilizer] = (value[0], value[1], new_histories)

    return updated, log


def rebuild_stabilizer_dict_old_format(
    stab_dict: Dict[str, Tuple[List[Tuple[int, str]], list, list]],
    stab_list: Sequence[str],
) -> Dict[str, Tuple[List[Tuple[int, str]], list, list]]:
    """
    Rebuild dictionary strictly in the order of stab_list.
    If missing, add the parsed stabilizer with empty syndrome/history lists.
    """
    rebuilt = {}
    for stab in stab_list:
        if stab in stab_dict:
            rebuilt[stab] = stab_dict[stab]
        else:
            parsed = [(i, p) for i, p in enumerate(stab) if p != "I"]
            rebuilt[stab] = (parsed, [], [])
    return rebuilt


def add_old_format_outputs(result: Dict[str, object], input_stabilizers_list: Sequence[str]) -> Dict[str, object]:
    """
    Attach old-format outputs to a single-mode result dictionary:
        result['final']
        result['new_final']
        result['updated']
        result['old_format_log']

    If no solution exists, these are empty/rebuilt placeholders.
    """
    old_final = solution_to_old_final(result)
    new_final = enrich_final_old_format(old_final, result)
    updated, log = process_final_old_format(new_final)
    updated = rebuild_stabilizer_dict_old_format(updated, input_stabilizers_list)

    result["final"] = old_final
    result["new_final"] = new_final
    result["updated"] = updated
    result["old_format_log"] = log
    return result

def print_solution(result: Dict[str, object], *, print_syndromes: bool = True) -> None:
    solution = result.get("solution")
    if not solution:
        print("No solution to print.")
        return

    print("Selected valid sequence for each weight > 2 stabilizer:")
    for stabilizer, candidate in solution.items():
        print(f"\nStabilizer: {stabilizer}")
        print(f"Sequence:   {sequence_to_compact_label(candidate.sequence)}")
        if print_syndromes:
            print("Checked syndrome/operator map:")
            for step in candidate.checked_steps:
                note = ""
                if step.get("duplicate_syndrome"):
                    note += f"  duplicate products={step.get('duplicate_products', [])}"
                if step.get("mpcm_collision"):
                    note += f"  MPCM collision products={step.get('mpcm_collision_products', [])}"
                print(f"  {step['operator_label']}: {step['syndrome']}{note}")


# -----------------------------------------------------------------------------
# Example usage
# -----------------------------------------------------------------------------

# if __name__ == "__main__":
#     input_stabilizers_list = [
#         "XXIIIIIIIIIIII",
#         "XIXIIIIIIIIIII",
#         "IIIXIIIIZIIIII",
#         "IIIIXIIIIZIIII",
#         "IIIIIXIIIZIIII",
#         "IIIIIIXIIZIIII",
#         "IIIIIIIXIZIIII",
#         "ZZZZIIIIXIIIII",
#         "YZZIZZZZZYZZZZ",
#         "IIIIIIIIIZXIII",
#         "IIIIIIIIIZIXII",
#         "IIIIIIIIIZIIXI",
#         "IIIIIIIIIZIIIX",
#     ]

#     Logical_x = "ZZZIIIIIIZIIII"
#     Logical_z = "XIIIIIIIZZIIII"

#     preferred_sequences = {
#         "YZZIZZZZZYZZZZ": [
#             (4, "Z"), (0, "Y"), (5, "Z"), (1, "Z"), (6, "Z"),
#             (2, "Z"), (7, "Z"), (8, "Z"), (9, "Y"), (10, "Z"),
#             (11, "Z"), (12, "Z"), (13, "Z"),
#         ],
#         "ZZZZIIIIXIIIII": [
#             (0, "Z"), (3, "Z"), (1, "Z"), (8, "X"), (2, "Z"),
#         ],
#     }

#     find_code(
#         input_stabilizers_list,
#         [Logical_x, Logical_z],
#         check_mode="both",              # "variants", "no_variants", or "both"
#         max_permutations_per_stabilizer=1_000_000,
#         max_valid_permutations_per_stabilizer=1000,
#         search_mode="random",          # "random" or "lexicographic"
#         random_seed=123,
#         preferred_sequences=preferred_sequences,
#         verbose=True,
#     )
