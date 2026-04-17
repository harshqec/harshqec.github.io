
import json
import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import numpy as np
import sys, os, time, math, pickle
import multiprocessing as mp
from multiprocessing import Pool, cpu_count
from threading import Thread
import random
from typing import List, Tuple, Set, Optional
import itertools
from itertools import combinations, product, permutations
import pandas as pd
import matplotlib.pyplot as plt
from numba import njit, prange

random.seed(42)

def find_code(input_stabilizers_list):
    """
    Analyzes a list of stabilizer strings to determine if they form a 'bare code'
    (a valid quantum error correction code structure) by verifying permutation rules
    and linear independence of stabilizers.
    
    Args:
        input_stabilizers_list (List[str]): List of stabilizer strings (e.g. ['XIZ', 'IZX']).
        
    Returns:
        str: Status string indicating if it constitutes a valid bare code.
    """
    
    number_of_qubits = len(input_stabilizers_list[0])  # number of qubits
    message_qubits = len(input_stabilizers_list)  # number of stabilizers


    def pauli_stabilizers_to_binary_matrix(stabilizers):
        """
        Input:
        - stabilizers: A list of strings. Each string contains only 'I', 'X', 'Y', or 'Z',
        representing a Pauli operator on n qubits.

        Output:
        - A binary matrix (NumPy array) of shape (number of stabilizers, 2 * n).
        First n columns represent X components, next n columns represent Z components.
        """
        if not isinstance(stabilizers, list) or not all(isinstance(s, str) for s in stabilizers):
            raise TypeError("Input must be a list of strings")

        num_stabilizers = len(stabilizers)
        num_qubits = len(stabilizers[0])
        binary_matrix = np.zeros((num_stabilizers, 2 * num_qubits), dtype=int)

        for row_idx, op_string in enumerate(stabilizers):
            for qubit_idx, op in enumerate(op_string):
                if op == 'X':
                    binary_matrix[row_idx, qubit_idx] = 1
                elif op == 'Z':
                    binary_matrix[row_idx, num_qubits + qubit_idx] = 1
                elif op == 'Y':
                    binary_matrix[row_idx, qubit_idx] = 1
                    binary_matrix[row_idx, num_qubits + qubit_idx] = 1
                elif op == 'I':
                    continue
                else:
                    raise ValueError("Invalid character in stabilizer. Use only 'I', 'X', 'Y', or 'Z'.")

        return binary_matrix

    def new_parity_check(original_matrix):
        """
        Given a binary stabilizer matrix, constructs an extended parity check matrix.
        - Splits the input matrix into two halves (matrix1, matrix2).
        - Returns a new matrix by horizontally stacking the original matrix and the bitwise sum (mod 2) of the two halves.
        This is often used in quantum error correction to generate new parity checks from existing stabilizer matrices.
        """
        m, two_n = original_matrix.shape  # Get dimensions of the original matrix
        n = two_n // 2  # Calculate n

        # Split the original matrix into two matrices
        matrix1 = original_matrix[:, :n]  # First n columns
        matrix2 = original_matrix[:, n:]   # Last n columns
        return np.hstack((original_matrix, (matrix1 + matrix2) % 2))

    complete_parity_matrix = new_parity_check(pauli_stabilizers_to_binary_matrix(input_stabilizers_list))


    def weight(pauli_string):
        """
        Input: pauli_string (str) – Pauli operator string with 'I', 'X', 'Y', 'Z'
        Output: int – Number of non-'I' characters
        """
        return sum(1 for char in pauli_string if char != 'I')


    # -------------------------
    # Helper: get_column (explicit parity_matrix argument)
    # -------------------------
    def get_column(parity_matrix: np.ndarray, operator: str, qubit_index: int, num_qubits: int) -> np.ndarray:
        """
        Return a column (vector) corresponding to operator at qubit_index.
        Uses the layout:
        - Z columns in parity_matrix[:, 0:num_qubits]
        - X columns in parity_matrix[:, num_qubits:2*num_qubits]
        - Y columns in parity_matrix[:, 2*num_qubits:3*num_qubits]
        Returns a 1D numpy array of dtype int (0/1).
        """
        if operator == 'X':
            return parity_matrix[:, num_qubits + qubit_index].astype(int)
        elif operator == 'Z':
            return parity_matrix[:, qubit_index].astype(int)
        elif operator == 'Y':
            return parity_matrix[:, 2 * num_qubits + qubit_index].astype(int)
        else:
            raise ValueError(f"Unknown operator {operator!r}. Allowed: 'X','Y','Z'.")


    # -------------------------
    # Core processing for one combination (permutation)
    # -------------------------
    # -------------------------
    # Core processing for one combination (permutation)
    # -------------------------
    def process_combination(
        operator_positions: List[Tuple[int, str]],
        parity_matrix: np.ndarray,
        num_qubits: int,
        existing_columns: Set[Tuple[int, ...]]
    ) -> Optional[Tuple[List[Tuple[int, ...]], List[Tuple[int, ...]]]]:
        """
        Process a single operator_positions permutation.

        Returns:
        - (original_syndromes, all_syndromes) if the permutation passes both checks
        - None if the permutation is abandoned (per rules described)
        """
        rows = parity_matrix.shape[0]

        n = len(operator_positions)
        if n < 3:
            return None
        zero_syndrome = np.zeros(parity_matrix.shape[0], dtype=int)

        # ---------- ORIGINAL_SYNDROMES ----------
        original_syndromes: List[Tuple[int, ...]] = []

        # Start with sum of first two operators
        (q0, op0), (q1, op1) = operator_positions[0], operator_positions[1]
        col_sum = (get_column(parity_matrix, op0, q0, num_qubits) +
                get_column(parity_matrix, op1, q1, num_qubits)) % 2
        tup = tuple(col_sum.tolist( ))

        if np.array_equal(tup, zero_syndrome) or tup in existing_columns:
            # print(f"1 - {tup}")
            return None
        original_syndromes.append(tup)

        # Keep adding until the second-last element
        for idx in range(2, n - 2):  # include up to penultimate operator
            qk, opk = operator_positions[idx]
            col_sum = (col_sum + get_column(parity_matrix, opk, qk, num_qubits)) % 2
            tup = tuple(col_sum.tolist())
            if np.array_equal(tup, zero_syndrome) or tup in existing_columns or tup in original_syndromes:
                # print(f"2 - {tup}")
                return None
            original_syndromes.append(tup)
        # print(f"Original Syn: {original_syndromes}")

        # ---------- ALL_SYNDROMES ----------

        all_syndromes: List[Tuple[int, ...]] = []
        all_ops = ['X', 'Y', 'Z']

        col_sum = np.zeros(rows, dtype=int)

        for i in range(0, n - 2):  # up to second-last operator
            qi, opi = operator_positions[i]
            # print(col_sum, get_column(parity_matrix, opi, qi, num_qubits))
            col_sum = (col_sum + get_column(parity_matrix, opi, qi, num_qubits)) % 2  # update sum with current operator
            qnext, opnext = operator_positions[i + 1]

            for variant in all_ops:
                if i == (n - 2) - 1 and variant == opnext:
                    continue 
                col_pair = (col_sum + get_column(parity_matrix, variant, qnext, num_qubits)) % 2
                tup_pair = tuple(col_pair.tolist())

                # print(f"operator_positions {operator_positions}")
                # print(f"qi: {qi} opi: {opi}  qnxt {qnext} var {variant} ")

                if np.array_equal(tup, zero_syndrome) or tup_pair in all_syndromes:
                    # print("BREAK")
                    return None
                
                all_syndromes.append(tup_pair)
                # input()


        return original_syndromes, all_syndromes


    # -------------------------
    # Utility to run all permutations
    # -------------------------
    def process_all_permutations(
        operator_positions: List[Tuple[int, str]],
        parity_matrix: np.ndarray,
        num_qubits: int
    ):
        """
        Generate all permutations of operator_positions (length = n!),
        process each, and return successful results.
        """
        existing_columns = {tuple(parity_matrix[:, j].astype(int).tolist())
                            for j in range(parity_matrix.shape[1])}

        results = []
        for perm in itertools.permutations(operator_positions):
            perm = list(perm)
            res = process_combination(perm, parity_matrix, num_qubits, existing_columns)
            if res is not None:
                original_syndromes, all_syndromes = res
                results.append((perm, original_syndromes, all_syndromes))
            # input("Press Enter")
        return results


    results = {}

    # Stabilizer string -> operator_positions
    for stabilizer in input_stabilizers_list:
        if weight(stabilizer) < 3:
            continue    
        operator_positions = [(i, op) for i, op in enumerate(stabilizer) if op in {'X', 'Y', 'Z'}]
        num_qubits = len(stabilizer)
        
        # Run over ALL permutations
        results[stabilizer] = process_all_permutations(operator_positions, complete_parity_matrix, num_qubits)

    def choose_permutations(stabilizer_dict):
        """
        Uses depth-first search (backtracking) to find a mutually consistent set 
        of permutations for all stabilizers. A consistent set guarantees that no 
        two combinations conflict over the original syndromes used.

        Args:
            stabilizer_dict (dict): Maps stabilizer strings to valid permutations.
            
        Returns:
            dict or None: Successful mapping of stabilizers to permutations, 
                          or None if no valid assignment exists.
        """
        stabilizers = list(stabilizer_dict.keys())
        solution = {}
        
        def backtrack(i, used):
            if i == len(stabilizers):
                return True
            
            stab = stabilizers[i]
            for perm, orig, all_syn in stabilizer_dict[stab]:
                orig_set = set(orig)
                if orig_set & used:
                    continue
                
                solution[stab] = (perm, orig, all_syn)
                if backtrack(i+1, used | orig_set):
                    return True

                del solution[stab]
            
            return False
        
        if backtrack(0, set()):
            return solution
        else:
            return None  # no valid assignment
    final = choose_permutations(results)

    if final == None:
        return f"Not a bare  code"
    else:
        return f"Found it..Its a bare code"






# =========================================================
# UI / DISPLAY HELPERS
# =========================================================
def matrix_to_python_list_string(M):
    """
    Converts a NumPy matrix or list of lists into a neatly formatted 
    Python list string. Useful for UI output.
    
    Args:
        M (np.ndarray | list): Input matrix.
        
    Returns:
        str: Formatted string representation of the matrix.
    """
    rows = np.asarray(M).astype(int).tolist()
    if not rows:
        return "[]"

    lines = ["["]
    for i, row in enumerate(rows):
        if i < len(rows) - 1:
            lines.append(f"    {row},")
        else:
            lines.append(f"    {row}")
    lines.append("]")
    return "\n".join(lines)


def node_sort_key(name: str):
    """
    Sorting key for node IDs (e.g., 'c1', 'm2'). 
    Sorts primarily by the integer after the node prefix.
    """
    return int(name[1:]) if len(name) > 1 and name[1:].isdigit() else name


def to_serializable(obj):
    """
    Recursively converts Numpy types and complex internal types into 
    native Python standard types suitable for JSON serialization.
    """
    if isinstance(obj, np.ndarray):
        return obj.astype(int).tolist()
    if isinstance(obj, np.integer):
        return int(obj)
    if isinstance(obj, np.floating):
        return float(obj)
    if isinstance(obj, dict):
        return {k: to_serializable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [to_serializable(v) for v in obj]
    return obj


# =========================================================
# MATRIX BUILDING FROM THE UI GRAPH
# =========================================================
def build_parity_check_matrix(cluster_connections, message_connections):
    """
    Builds the complete parity check matrix H from network adjacency dictionaries.
    
    The resulting matrix is partitioned as:
        H = [ I_n  0_{n x k} | A_cc  A_cm ]
    where:
        - I_n is the identity matrix matching the number of cluster nodes (n)
        - 0_{n x k} is a zero block representing padding for message nodes (k)
        - A_cc is the cluster-cluster adjacency matrix
        - A_cm is the cluster-message adjacency matrix
        
    Args:
        cluster_connections (dict): Connections between cluster nodes.
        message_connections (dict): Connections mapping message nodes to cluster nodes.
        
    Returns:
        tuple: (A_cc, A_cm, H, info_dict)
    """
    cluster_nodes = sorted(cluster_connections.keys(), key=node_sort_key)
    message_nodes = sorted(message_connections.keys(), key=node_sort_key)

    n = len(cluster_nodes)
    k = len(message_nodes)

    cluster_index = {node: i for i, node in enumerate(cluster_nodes)}
    message_index = {node: j for j, node in enumerate(message_nodes)}

    for c, neighbors in cluster_connections.items():
        if not c.startswith("c"):
            raise ValueError(f"{c} is not a valid cluster node name")
        for nb in neighbors:
            if nb not in cluster_index:
                raise ValueError(f"{c} connects to unknown cluster node {nb}")
            if nb == c:
                raise ValueError(f"Self-loop not allowed for {c}")

    for m, neighbors in message_connections.items():
        if not m.startswith("m"):
            raise ValueError(f"{m} is not a valid message node name")
        for c in neighbors:
            if c not in cluster_index:
                raise ValueError(f"{m} connects to unknown cluster node {c}")

    A_cc = np.zeros((n, n), dtype=int)
    for c, neighbors in cluster_connections.items():
        i = cluster_index[c]
        for nb in neighbors:
            j = cluster_index[nb]
            A_cc[i, j] = 1
            A_cc[j, i] = 1

    A_cm = np.zeros((n, k), dtype=int)
    for m, neighbors in message_connections.items():
        j = message_index[m]
        for c in neighbors:
            i = cluster_index[c]
            A_cm[i, j] = 1

    I_n = np.eye(n, dtype=int)
    O_nk = np.zeros((n, k), dtype=int)

    Hx = np.hstack([I_n, O_nk])
    Hz = np.hstack([A_cc, A_cm])
    H = np.hstack([Hx, Hz])

    info = {
        "n": n,
        "k": k,
        "cluster_nodes_order": cluster_nodes,
        "message_nodes_order": message_nodes,
        # "X_part_columns": cluster_nodes + message_nodes,
        # "Z_part_columns": cluster_nodes + message_nodes,
    }

    return A_cc, A_cm, H, info


# =========================================================
# FUNCTIONS MERGED FROM THE SECOND FILE
# =========================================================
def matrix_form(x):
    """
    Converts a Pauli operator string (e.g., 'XYZI') to its binary vector representation.
    
    The output format is a 1D vector of length 2N, where the first N elements represent 
    the X-components and the next N elements represent the Z-components.
    
    Args:
        x (str): Pauli string.
        
    Returns:
        np.ndarray: Binary vector representation of the string.
    """
    if not isinstance(x, str):
        raise TypeError("x should be a string")

    n = len(x)
    l = np.zeros(2 * n, dtype=int)

    for i, pos in zip(x, range(n)):
        if i == "X":
            l[pos] = 1
        elif i == "Z":
            l[n + pos] = 1
        elif i == "Y":
            l[pos] = 1
            l[n + pos] = 1
        elif i == "I":
            pass
        else:
            raise ValueError("x should only contain 'X', 'Y', 'Z', or 'I'")

    return l


def stab_form(l):
    """
    Converts a binary vector back into a Pauli operator string.
    
    Args:
        l (np.ndarray): Binary vector of length 2N (X-components followed by Z-components).
        
    Returns:
        str: Pauli string representation.
    """
    n = int(len(l) / 2)
    s = ""
    for i in range(n):
        if l[i] == 1 and l[n + i] == 1:
            s += "Y"
        elif l[i] == 1 and l[n + i] == 0:
            s += "X"
        elif l[i] == 0 and l[n + i] == 1:
            s += "Z"
        else:
            s += "I"
    return s


def symplectic_product(a, b):
    """
    Computes the symplectic inner product of two binary vectors representing Pauli strings.
    This value indicates if the two strings commute (0) or anti-commute (1).
    
    Args:
        a (np.ndarray): First binary vector.
        b (np.ndarray): Second binary vector.
        
    Returns:
        int: 0 if they commute, 1 if they anti-commute.
    """
    if len(a) != len(b):
        raise ValueError("length of a and b are not same")

    if len(a) % 2 != 0:
        raise ValueError("length of a and b are not even")

    l = len(a)
    n = int(l / 2)
    a_x = a[0:n]
    a_z = a[n:l]
    b_x = b[0:n]
    b_z = b[n:l]

    s = sum(a_x * b_z + a_z * b_x)
    return int(s % 2)


def stabilizer_matrix(stab):
    """
    Constructs a binary matrix from a list of stabilizer strings. Each row
    corresponds to a stabilizer.
    
    Args:
        stab (List[str]): List of stabilizer Pauli strings.
        
    Returns:
        np.ndarray: Matrix representation of the stabilizers.
    """
    if not stab:
        return np.zeros((0, 0), dtype=int)

    l = len(stab)
    n = len(stab[0])
    s_matrix = np.zeros((l, 2 * n), dtype=int)
    for s, i in zip(stab, range(l)):
        s_matrix[i] = matrix_form(s)

    return s_matrix


def mat2stab(matrix):
    """
    Converts a binary check matrix back into a list of Pauli stabilizer strings.
    
    Args:
        matrix (np.ndarray): Binary matrix representing stabilizers.
        
    Returns:
        List[str]: List of stabilizer Pauli strings.
    """
    return [stab_form(row) for row in np.asarray(matrix, dtype=int)]


def calculate_rank(matrix):
    """
    Calculates the rank of a binary matrix over GF(2) using Gaussian elimination.
    Matrix entries should be strictly 0 or 1.
    
    Args:
        matrix (np.ndarray): Binary matrix.
        
    Returns:
        int: The binary rank of the matrix.
    """
    mat = np.array(matrix, dtype=np.int8)
    rows, cols = mat.shape
    rank = 0

    for col in range(cols):
        if rank == rows:
            break

        pivot = rank
        while pivot < rows and mat[pivot, col] == 0:
            pivot += 1
        if pivot == rows:
            continue

        mat[[rank, pivot]] = mat[[pivot, rank]]

        for r in range(rank + 1, rows):
            if mat[r, col]:
                mat[r] ^= mat[rank]

        rank += 1

    return rank


def hx_cluster_mat(n, k):
    """
    Builds the 'Hx' structural constraint part of a cluster graph parity matrix.
    Uses identity matrix for the cluster partition and 0s for message partition.
    
    Returns:
        np.ndarray: An n x (n+k) binary matrix.
    """
    return np.hstack((np.eye(n, dtype=int), np.zeros((n, k), dtype=int)))


def bitpack_matrix(mat):
    """
    Compresses a binary parity matrix into integers for rapid bitwise 
    distance calculations. It separates X components and Z components into 
    integer arrays where each integer encapsulates a row's bits.
    
    Args:
        mat (np.ndarray): The 2N-column binary matrix.
        
    Returns:
        tuple(List[int], List[int]): Packed X array and Z array.
    """
    mat = np.asarray(mat, dtype=int)
    if mat.size == 0:
        return [], []

    n = mat.shape[1] // 2
    xs = []
    zs = []

    for r in range(mat.shape[0]):
        x = 0
        z = 0
        for i in range(n):
            if mat[r, i]:
                x |= 1 << i
            if mat[r, n + i]:
                z |= 1 << i
        xs.append(x)
        zs.append(z)

    return xs, zs


def process_matrix(hx, hz, k, pivot_nodes=None):
    """
    Performs Gaussian elimination-like operator extraction over the adjacency matrices 
    to separate Logical Z, Logical X, and residual pure stabilizers. The message columns
    dictate what becomes a logical degree of freedom.

    Args:
        hx (np.ndarray): X-adjacency block.
        hz (np.ndarray): Z-adjacency/Check block.
        k (int): Number of logical message qubits to extract.
        pivot_nodes (Optional[List[Optional[int]]]): Optional preferred pivot cluster indices
            (0-based, in the original cluster ordering) for each message elimination step.
            Use None for any step to keep automatic pivot selection.
        
    Returns:
        tuple: (updated hx, updated hz, logical X pauli list, logical Z pauli list)
    """
    row_size = hz.shape[0]

    if pivot_nodes is None:
        pivot_nodes = [None] * k
    else:
        if len(pivot_nodes) != k:
            raise ValueError(
                f"pivot_nodes must have exactly {k} entries (one per message column)."
            )
        normalized_pivots = []
        for idx, value in enumerate(pivot_nodes):
            if value is None:
                normalized_pivots.append(None)
                continue
            try:
                pivot_index = int(value)
            except (TypeError, ValueError):
                raise ValueError(
                    f"pivot_nodes[{idx}] must be an integer cluster index or None."
                )
            if pivot_index < 0 or pivot_index >= row_size:
                raise ValueError(
                    f"pivot_nodes[{idx}]={pivot_index} is out of range for n={row_size}."
                )
            normalized_pivots.append(pivot_index)
        pivot_nodes = normalized_pivots

    def eliminate(hx_local, hz_local, p, preferred_pivot=None):
        pos = np.where(hz_local[:, -1] == 1)[0]
        if len(pos) == 0:
            raise ValueError(
                f"Cannot eliminate message column {p + 1}: the current ACM column has no support."
            )

        if preferred_pivot is not None:
            # Local row index q corresponds to original cluster index q + p.
            supported_original = pos + p
            matches = np.where(supported_original == preferred_pivot)[0]
            if len(matches) == 0:
                available = supported_original.tolist()
                raise ValueError(
                    f"Requested pivot c{preferred_pivot + 1} is not connected to message column {p + 1}. "
                    f"Available pivots: {[f'c{i + 1}' for i in available]}"
                )

            chosen_idx = int(matches[0])
            if chosen_idx != 0:
                pos = np.concatenate(([pos[chosen_idx]], np.delete(pos, chosen_idx)))

        if len(pos) > 1:
            hz_local[pos[1:]] ^= hz_local[pos[0]]
            hx_local[pos[1:]] ^= hx_local[pos[0]]

        del_hz = hz_local[pos[0]][:row_size]
        del_hx = hx_local[pos[0]][:row_size]

        lx = stab_form(np.hstack((del_hx, del_hz)))

        lz = "I" * row_size
        for q in pos:
            lz = lz[: q + p] + "Z" + lz[q + p + 1 :]

        hz_local = np.delete(hz_local, pos[0], axis=0)
        hx_local = np.delete(hx_local, pos[0], axis=0)

        hz_local = np.delete(hz_local, -1, axis=1)
        hx_local = np.delete(hx_local, -1, axis=1)

        return hx_local, hz_local, lx, lz

    lx_list = []
    lz_list = []

    for i in range(k):
        hx, hz, lx, lz = eliminate(hx, hz, i, pivot_nodes[i])
        lx_list.append(lx)
        lz_list.append(lz)

    return hx, hz, lx_list, lz_list


def pauli_weight(x, z):
    return (int(x) | int(z)).bit_count()


def pauli_mul(x1, z1, x2, z2):
    return int(x1) ^ int(x2), int(z1) ^ int(z2)


def enumerate_stabilizer_group(stab_xs, stab_zs):
    r = len(stab_xs)
    group = []

    for coeffs in product([0, 1], repeat=r):
        x = 0
        z = 0
        for c, sx, sz in zip(coeffs, stab_xs, stab_zs):
            if c:
                x ^= int(sx)
                z ^= int(sz)
        group.append((x, z))

    return group


def exact_distance(stab_xs, stab_zs, logical_xs, logical_zs):
    """
    Iterates over all combinations of the stabilizer operators and logical Pauli operators
    to find the minimum distance d of the code (the lowest-weight non-trivial logical operator).
    
    Args:
        stab_xs, stab_zs: Packed binary representation of stabilizers.
        logical_xs, logical_zs: Binary representations of the extracted logical operators.
        
    Returns:
        int: Minimum exact distance of the code space.
    """
    k = len(logical_xs)
    if k == 0:
        return 0

    stab_group = enumerate_stabilizer_group(stab_xs, stab_zs)
    min_w = float("inf")

    for coeffs in product([0, 1], repeat=2 * k):
        if not any(coeffs):
            continue

        lx = 0
        lz = 0

        for i in range(k):
            if coeffs[i]:
                lx ^= int(logical_xs[i][0])
                lz ^= int(logical_xs[i][1])
            if coeffs[k + i]:
                lx ^= int(logical_zs[i][0])
                lz ^= int(logical_zs[i][1])

        for sx, sz in stab_group:
            x, z = pauli_mul(lx, lz, sx, sz)
            w = pauli_weight(x, z)
            if w < min_w:
                min_w = w

    return int(min_w) if min_w != float("inf") else 0


PAULI = ("I", "Z", "X", "Y")


def pauli_strings(pairs, n):
    out = []
    for x, z in pairs:
        out.append(
            "".join(
                PAULI[((int(x) >> i) & 1) << 1 | ((int(z) >> i) & 1)]
                for i in range(n)
            )
        )
    return out


def analyze_single_graph(graph_matrix, acm, n, k, pivot_nodes=None):
    """
    Analyzes a single assembled quantum graph topology. Calculates the exact distance
    using stabilizer group iterations and identifies the underlying code structure.
    
    Args:
        graph_matrix: Cluster-cluster adjacency matrix.
        acm: Message-cluster adjacency matrix.
        n: Number of cluster nodes.
        k: Number of message nodes.
        
    Returns:
        tuple: (results dictionary, full final parity check matrix)
    """
    graph_matrix = np.asarray(graph_matrix, dtype=int)
    acm = np.asarray(acm, dtype=int)
    hx = hx_cluster_mat(n, k)

    hz_input = np.hstack((graph_matrix, acm))
    hx_after, hz_after, lx_list, lz_list = process_matrix(
        hx.copy(), hz_input.copy(), k, pivot_nodes=pivot_nodes
    )

    stab_mat = np.hstack((hx_after, hz_after))
    stab_xs, stab_zs = bitpack_matrix(stab_mat)

    logical_xs = []
    logical_zs = []
    for i in range(k):
        lx_x, lx_z = bitpack_matrix(stabilizer_matrix([lx_list[i]]))
        lz_x, lz_z = bitpack_matrix(stabilizer_matrix([lz_list[i]]))
        logical_xs.append((lx_x[0], lx_z[0]))
        logical_zs.append((lz_x[0], lz_z[0]))

    d_exact = exact_distance(stab_xs, stab_zs, logical_xs, logical_zs)
    result_dict = {
        # "graph_adj": graph_matrix,
        # "acm": acm,
        # "hz_input": hz_input,
        # "hx_after": hx_after,
        # "hz_after": hz_after,
        # "logical_Xs": logical_xs,
        # "logical_Zs": logical_zs,
        # "parity check matrix": matrix_to_python_list_string(np.hstack([hx_after, hz_after])),
        "stabilizer_operators": mat2stab(stab_mat),
        "logical_Xs_stab": pauli_strings(logical_xs, n),
        "logical_Zs_stab": pauli_strings(logical_zs, n),
        "What code it is": find_code(mat2stab(stab_mat)),
        "distance": d_exact
    }
    
    return result_dict, np.hstack([hx_after, hz_after])
    

# =========================================================
# DRIVER ADAPTED FOR THE UI GRAPH
# =========================================================
def main(n_k_d, graphs, acm, pivot_nodes=None):
    n, k, d = n_k_d

    graph_list = [np.asarray(graphs, dtype=int)] if np.asarray(graphs).ndim == 2 else [np.asarray(g, dtype=int) for g in graphs]
    acm_list = [np.asarray(acm, dtype=int)] if np.asarray(acm).ndim == 2 else [np.asarray(a, dtype=int) for a in acm]

    results = []
    for graph_matrix in graph_list:
        for acm_matrix in acm_list:
            result, final_matrix = analyze_single_graph(
                graph_matrix, acm_matrix, n, k, pivot_nodes=pivot_nodes
            )
            if result["distance"] == d:
                results.append(result)

    return results, final_matrix


class GraphMatrixUI:
    """
    Tkinter UI class for visually constructing error correction cluster graphs.
    Allows point-and-click additions of Cluster nodes (qubits) and Message nodes (logical operators),
    as well as drawing the connectivity edges (entanglement/parity checks) between them.
    Automatically ties user actions to underlying distance checking logic.
    """
    def __init__(self, root):
        self.root = root
        self.root.title("Parity Check Matrix Builder")
        self.root.geometry("1320x800")

        self.node_radius = 24
        self.nodes = {}
        self.cluster_connections = {}
        self.message_connections = {}
        self.cluster_counter = 0
        self.message_counter = 0
        self.mode = "move"
        self.selected_node = None
        self.dragging_node = None
        self.drag_offset = (0, 0)

        self._build_ui()
        self._set_status("Mode: Move nodes")
        self.refresh_canvas()

    def _build_ui(self):
        toolbar = ttk.Frame(self.root, padding=8)
        toolbar.pack(side=tk.TOP, fill=tk.X)

        ttk.Button(toolbar, text="Add Cluster Node", command=lambda: self.set_mode("add_cluster")).pack(side=tk.LEFT, padx=4)
        ttk.Button(toolbar, text="Add Message Node", command=lambda: self.set_mode("add_message")).pack(side=tk.LEFT, padx=4)
        ttk.Button(toolbar, text="Move Nodes", command=lambda: self.set_mode("move")).pack(side=tk.LEFT, padx=4)
        ttk.Button(toolbar, text="Connect C-C", command=lambda: self.set_mode("connect_cc")).pack(side=tk.LEFT, padx=4)
        ttk.Button(toolbar, text="Connect M-C", command=lambda: self.set_mode("connect_mc")).pack(side=tk.LEFT, padx=4)
        ttk.Button(toolbar, text="Delete Node", command=lambda: self.set_mode("delete_node")).pack(side=tk.LEFT, padx=4)
        ttk.Button(toolbar, text="Delete Link", command=lambda: self.set_mode("delete_link")).pack(side=tk.LEFT, padx=4)

        ttk.Label(toolbar, text="Target d:").pack(side=tk.LEFT, padx=(12, 4))
        self.distance_var = tk.StringVar(value="2")
        self.distance_entry = ttk.Entry(toolbar, textvariable=self.distance_var, width=6)
        self.distance_entry.pack(side=tk.LEFT, padx=(0, 8))

        ttk.Button(toolbar, text="Generate Matrices", command=self.generate_matrices).pack(side=tk.LEFT, padx=10)
        ttk.Button(toolbar, text="Save Graph", command=self.save_graph).pack(side=tk.LEFT, padx=4)
        ttk.Button(toolbar, text="Load Graph", command=self.load_graph).pack(side=tk.LEFT, padx=4)
        ttk.Button(toolbar, text="Load Example", command=self.load_example).pack(side=tk.LEFT, padx=4)
        ttk.Button(toolbar, text="Clear All", command=self.clear_all).pack(side=tk.LEFT, padx=4)

        body = ttk.Frame(self.root, padding=(8, 0, 8, 8))
        body.pack(fill=tk.BOTH, expand=True)

        left = ttk.Frame(body)
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        right = ttk.Frame(body, width=500)
        right.pack(side=tk.RIGHT, fill=tk.BOTH)
        right.pack_propagate(False)

        self.canvas = tk.Canvas(left, bg="white", highlightthickness=1, highlightbackground="#999")
        self.canvas.pack(fill=tk.BOTH, expand=True)
        self.canvas.bind("<Button-1>", self.on_left_click)
        self.canvas.bind("<B1-Motion>", self.on_drag)
        self.canvas.bind("<ButtonRelease-1>", self.on_release)

        ttk.Label(right, text="Output", font=("Arial", 12, "bold")).pack(anchor="w", pady=(0, 6))
        self.output = tk.Text(right, wrap=tk.NONE, font=("Courier New", 10))
        self.output.pack(fill=tk.BOTH, expand=True)

        xscroll = ttk.Scrollbar(right, orient=tk.HORIZONTAL, command=self.output.xview)
        xscroll.pack(fill=tk.X)
        yscroll = ttk.Scrollbar(right, orient=tk.VERTICAL, command=self.output.yview)
        yscroll.place(relx=1.0, rely=0.0, relheight=1.0, anchor="ne")
        self.output.configure(xscrollcommand=xscroll.set, yscrollcommand=yscroll.set)

        legend = ttk.Label(
            self.root,
            text=(
                "Cluster node = blue circle   |   Message node = green square   |   "
                "Black line = cluster-cluster   |   Purple dashed line = message-cluster"
            ),
            padding=(10, 4),
        )
        legend.pack(side=tk.BOTTOM, anchor="w")

        self.status_var = tk.StringVar()
        status = ttk.Label(self.root, textvariable=self.status_var, padding=(10, 4))
        status.pack(side=tk.BOTTOM, fill=tk.X)

    def _set_status(self, text):
        self.status_var.set(text)

    def set_mode(self, mode):
        self.mode = mode
        self.selected_node = None
        self.dragging_node = None
        messages = {
            "add_cluster": "Mode: Add cluster nodes. Click empty canvas to place c-nodes.",
            "add_message": "Mode: Add message nodes. Click empty canvas to place m-nodes.",
            "move": "Mode: Move nodes. Drag a node with the mouse.",
            "connect_cc": "Mode: Connect cluster-cluster. Click two cluster nodes.",
            "connect_mc": "Mode: Connect message-cluster. Click one message node and one cluster node.",
            "delete_node": "Mode: Delete node. Click any node to remove it and its incident links.",
            "delete_link": "Mode: Delete link. Click the two endpoint nodes of the link to remove.",
        }
        self._set_status(messages.get(mode, ""))
        self.refresh_canvas()

    def find_node_at(self, x, y):
        for name in reversed(list(self.nodes.keys())):
            node = self.nodes[name]
            dx = x - node["x"]
            dy = y - node["y"]
            if node["type"] == "cluster":
                if dx * dx + dy * dy <= self.node_radius ** 2:
                    return name
            else:
                if abs(dx) <= self.node_radius and abs(dy) <= self.node_radius:
                    return name
        return None

    def on_left_click(self, event):
        node = self.find_node_at(event.x, event.y)

        if self.mode == "add_cluster":
            if node is not None:
                self._set_status("Click empty space to add a new cluster node.")
                return
            self.add_cluster_node(event.x, event.y)
            return

        if self.mode == "add_message":
            if node is not None:
                self._set_status("Click empty space to add a new message node.")
                return
            self.add_message_node(event.x, event.y)
            return

        if self.mode == "move":
            if node is not None:
                self.dragging_node = node
                self.drag_offset = (self.nodes[node]["x"] - event.x, self.nodes[node]["y"] - event.y)
                self._set_status(f"Moving {node}...")
            else:
                self.dragging_node = None
            return

        if self.mode == "delete_node":
            if node is None:
                self._set_status("No node selected. Click a node to delete it.")
                return
            self.delete_node(node)
            self.refresh_canvas()
            return

        if self.mode in {"connect_cc", "connect_mc", "delete_link"}:
            if node is None:
                self.selected_node = None
                self._set_status("No node selected. Click a valid node.")
                self.refresh_canvas()
                return

            if self.selected_node is None:
                self.selected_node = node
                if self.mode == "delete_link":
                    self._set_status(f"Selected {node}. Now click the second endpoint of the link to delete.")
                else:
                    self._set_status(f"Selected {node}. Now click the second node.")
                self.refresh_canvas()
                return

            first = self.selected_node
            second = node
            self.selected_node = None

            try:
                if self.mode == "delete_link":
                    self.delete_connection(first, second)
                else:
                    self.add_connection(first, second)
            except ValueError as exc:
                messagebox.showerror("Invalid action", str(exc))
                self._set_status(str(exc))
            self.refresh_canvas()

    def on_drag(self, event):
        if self.mode != "move" or self.dragging_node is None:
            return

        x = max(self.node_radius + 5, min(event.x + self.drag_offset[0], self.canvas.winfo_width() - self.node_radius - 5))
        y = max(self.node_radius + 5, min(event.y + self.drag_offset[1], self.canvas.winfo_height() - self.node_radius - 5))
        self.nodes[self.dragging_node]["x"] = x
        self.nodes[self.dragging_node]["y"] = y
        self.refresh_canvas()

    def on_release(self, event):
        if self.dragging_node is not None:
            self._set_status(f"Moved {self.dragging_node}.")
        self.dragging_node = None

    def add_cluster_node(self, x, y):
        self.cluster_counter += 1
        name = f"c{self.cluster_counter}"
        self.nodes[name] = {"type": "cluster", "x": x, "y": y}
        self.cluster_connections[name] = set()
        self._set_status(f"Added cluster node {name}.")
        self.refresh_canvas()

    def add_message_node(self, x, y):
        self.message_counter += 1
        name = f"m{self.message_counter}"
        self.nodes[name] = {"type": "message", "x": x, "y": y}
        self.message_connections[name] = set()
        self._set_status(f"Added message node {name}.")
        self.refresh_canvas()

    def add_connection(self, a, b):
        if a == b:
            raise ValueError("Cannot connect a node to itself.")

        type_a = self.nodes[a]["type"]
        type_b = self.nodes[b]["type"]

        if self.mode == "connect_cc":
            if type_a != "cluster" or type_b != "cluster":
                raise ValueError("Connect C-C mode requires two cluster nodes.")
            self.cluster_connections[a].add(b)
            self.cluster_connections[b].add(a)
            self._set_status(f"Added cluster edge: {a} -- {b}")
            return

        if self.mode == "connect_mc":
            if {type_a, type_b} != {"cluster", "message"}:
                raise ValueError("Connect M-C mode requires one message node and one cluster node.")
            message_node = a if type_a == "message" else b
            cluster_node = b if type_a == "message" else a
            self.message_connections[message_node].add(cluster_node)
            self._set_status(f"Added message edge: {message_node} -- {cluster_node}")
            return

    def delete_node(self, name):
        if name not in self.nodes:
            raise ValueError(f"Unknown node: {name}")

        node_type = self.nodes[name]["type"]

        if node_type == "cluster":
            for neighbor in list(self.cluster_connections.get(name, set())):
                self.cluster_connections[neighbor].discard(name)
            self.cluster_connections.pop(name, None)

            for message_node in self.message_connections:
                self.message_connections[message_node].discard(name)
        else:
            self.message_connections.pop(name, None)

        self.nodes.pop(name, None)

        if self.selected_node == name:
            self.selected_node = None
        if self.dragging_node == name:
            self.dragging_node = None

        self._set_status(f"Deleted node {name} and its incident links.")

    def delete_connection(self, a, b):
        if a == b:
            raise ValueError("Choose two different nodes to delete a link.")
        if a not in self.nodes or b not in self.nodes:
            raise ValueError("Both endpoints must exist.")

        type_a = self.nodes[a]["type"]
        type_b = self.nodes[b]["type"]

        if type_a == "cluster" and type_b == "cluster":
            if b not in self.cluster_connections[a]:
                raise ValueError(f"No cluster link exists between {a} and {b}.")
            self.cluster_connections[a].discard(b)
            self.cluster_connections[b].discard(a)
            self._set_status(f"Deleted cluster edge: {a} -- {b}")
            return

        if {type_a, type_b} == {"cluster", "message"}:
            message_node = a if type_a == "message" else b
            cluster_node = b if type_a == "message" else a
            if cluster_node not in self.message_connections[message_node]:
                raise ValueError(f"No message link exists between {message_node} and {cluster_node}.")
            self.message_connections[message_node].discard(cluster_node)
            self._set_status(f"Deleted message edge: {message_node} -- {cluster_node}")
            return

        raise ValueError("Links are only allowed between cluster-cluster or message-cluster nodes.")

    def refresh_canvas(self):
        self.canvas.delete("all")

        drawn_cc = set()
        for c1 in sorted(self.cluster_connections.keys(), key=node_sort_key):
            for c2 in sorted(self.cluster_connections[c1], key=node_sort_key):
                edge = tuple(sorted((c1, c2), key=node_sort_key))
                if edge in drawn_cc:
                    continue
                drawn_cc.add(edge)
                self.draw_edge(c1, c2, dash=None, color="black")

        for m in sorted(self.message_connections.keys(), key=node_sort_key):
            for c in sorted(self.message_connections[m], key=node_sort_key):
                self.draw_edge(m, c, dash=(5, 3), color="#7a2cbf")

        for name in self.nodes:
            self.draw_node(name)

    def draw_edge(self, node_a, node_b, dash=None, color="black"):
        a = self.nodes[node_a]
        b = self.nodes[node_b]
        self.canvas.create_line(a["x"], a["y"], b["x"], b["y"], width=2, fill=color, dash=dash)

    def draw_node(self, name):
        node = self.nodes[name]
        x = node["x"]
        y = node["y"]
        r = self.node_radius
        outline = "red" if self.selected_node == name else "black"
        width = 3 if self.selected_node == name else 2

        if node["type"] == "cluster":
            self.canvas.create_oval(x - r, y - r, x + r, y + r, fill="#b8d8ff", outline=outline, width=width)
        else:
            self.canvas.create_rectangle(x - r, y - r, x + r, y + r, fill="#c7f0c8", outline=outline, width=width)

        self.canvas.create_text(x, y, text=name, font=("Arial", 10, "bold"))

    def format_connections(self):
        cluster_dict = {
            c: sorted(list(neighbors), key=node_sort_key)
            for c, neighbors in sorted(self.cluster_connections.items(), key=lambda item: node_sort_key(item[0]))
        }
        message_dict = {
            m: sorted(list(neighbors), key=node_sort_key)
            for m, neighbors in sorted(self.message_connections.items(), key=lambda item: node_sort_key(item[0]))
        }
        return cluster_dict, message_dict

    def _graph_data_for_save(self):
        cluster_dict, message_dict = self.format_connections()
        sorted_nodes = dict(sorted(self.nodes.items(), key=lambda item: (item[1]["type"], node_sort_key(item[0]))))
        nodes_payload = {
            name: {
                "type": node_info["type"],
                "x": float(node_info["x"]),
                "y": float(node_info["y"]),
            }
            for name, node_info in sorted_nodes.items()
        }
        return {
            "version": 1,
            "nodes": nodes_payload,
            "cluster_connections": cluster_dict,
            "message_connections": message_dict,
        }

    def save_graph(self):
        file_path = filedialog.asksaveasfilename(
            title="Save graph",
            defaultextension=".json",
            filetypes=[("JSON files", "*.json"), ("All files", "*.*")],
        )
        if not file_path:
            self._set_status("Save cancelled.")
            return

        data = self._graph_data_for_save()
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except OSError as exc:
            messagebox.showerror("Save failed", str(exc))
            self._set_status(f"Save failed: {exc}")
            return

        self._set_status(f"Saved graph to {file_path}")

    def load_graph(self):
        file_path = filedialog.askopenfilename(
            title="Load graph",
            filetypes=[("JSON files", "*.json"), ("All files", "*.*")],
        )
        if not file_path:
            self._set_status("Load cancelled.")
            return

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            self._load_graph_data(data)
        except (OSError, json.JSONDecodeError, ValueError) as exc:
            messagebox.showerror("Load failed", str(exc))
            self._set_status(f"Load failed: {exc}")
            return

        self._set_status(f"Loaded graph from {file_path}")
        self.refresh_canvas()
        if self.cluster_connections:
            self.generate_matrices()

    def _load_graph_data(self, data):
        if not isinstance(data, dict):
            raise ValueError("Invalid file format: top-level JSON object expected.")

        raw_nodes = data.get("nodes")
        raw_cluster_connections = data.get("cluster_connections")
        raw_message_connections = data.get("message_connections")

        if not isinstance(raw_nodes, dict):
            raise ValueError("Invalid file format: 'nodes' must be a JSON object.")
        if raw_cluster_connections is None:
            raw_cluster_connections = {}
        if raw_message_connections is None:
            raw_message_connections = {}
        if not isinstance(raw_cluster_connections, dict):
            raise ValueError("Invalid file format: 'cluster_connections' must be a JSON object.")
        if not isinstance(raw_message_connections, dict):
            raise ValueError("Invalid file format: 'message_connections' must be a JSON object.")

        new_nodes = {}
        new_cluster_connections = {}
        new_message_connections = {}

        for name, info in raw_nodes.items():
            if not isinstance(name, str):
                raise ValueError("Invalid node name in file.")
            if not isinstance(info, dict):
                raise ValueError(f"Node '{name}' must map to an object.")

            node_type = info.get("type")
            x = info.get("x")
            y = info.get("y")

            if node_type not in {"cluster", "message"}:
                raise ValueError(f"Node '{name}' has invalid type: {node_type}")
            if not isinstance(x, (int, float)) or not isinstance(y, (int, float)):
                raise ValueError(f"Node '{name}' must contain numeric x and y coordinates.")

            expected_prefix = "c" if node_type == "cluster" else "m"
            if not name.startswith(expected_prefix):
                raise ValueError(
                    f"Node '{name}' has type '{node_type}' but does not use the expected prefix '{expected_prefix}'."
                )

            new_nodes[name] = {"type": node_type, "x": float(x), "y": float(y)}
            if node_type == "cluster":
                new_cluster_connections[name] = set()
            else:
                new_message_connections[name] = set()

        for cluster_node, neighbors in raw_cluster_connections.items():
            if cluster_node not in new_cluster_connections:
                raise ValueError(f"Cluster connection key '{cluster_node}' does not exist as a cluster node.")
            if not isinstance(neighbors, list):
                raise ValueError(f"Cluster neighbors for '{cluster_node}' must be a list.")
            for neighbor in neighbors:
                if neighbor not in new_cluster_connections:
                    raise ValueError(f"Cluster node '{cluster_node}' connects to unknown cluster node '{neighbor}'.")
                if neighbor == cluster_node:
                    raise ValueError(f"Self-loop not allowed for '{cluster_node}'.")
                new_cluster_connections[cluster_node].add(neighbor)
                new_cluster_connections[neighbor].add(cluster_node)

        for message_node, neighbors in raw_message_connections.items():
            if message_node not in new_message_connections:
                raise ValueError(f"Message connection key '{message_node}' does not exist as a message node.")
            if not isinstance(neighbors, list):
                raise ValueError(f"Message neighbors for '{message_node}' must be a list.")
            for cluster_node in neighbors:
                if cluster_node not in new_cluster_connections:
                    raise ValueError(
                        f"Message node '{message_node}' connects to unknown cluster node '{cluster_node}'."
                    )
                new_message_connections[message_node].add(cluster_node)

        self.nodes = dict(sorted(new_nodes.items(), key=lambda item: (item[1]["type"], node_sort_key(item[0]))))
        self.cluster_connections = dict(
            sorted(
                ((name, neighbors) for name, neighbors in new_cluster_connections.items()),
                key=lambda item: node_sort_key(item[0]),
            )
        )
        self.message_connections = dict(
            sorted(
                ((name, neighbors) for name, neighbors in new_message_connections.items()),
                key=lambda item: node_sort_key(item[0]),
            )
        )
        self.cluster_counter = max((node_sort_key(name) for name in self.cluster_connections), default=0)
        self.message_counter = max((node_sort_key(name) for name in self.message_connections), default=0)
        self.selected_node = None
        self.dragging_node = None
        self.output.delete("1.0", tk.END)

    def generate_matrices(self):
        if not self.cluster_connections:
            messagebox.showwarning("No cluster nodes", "Add at least one cluster node first.")
            return

        cluster_dict, message_dict = self.format_connections()

        try:
            A_cc, A_cm, H, info = build_parity_check_matrix(cluster_dict, message_dict)
        except ValueError as exc:
            messagebox.showerror("Matrix generation failed", str(exc))
            self._set_status(str(exc))
            return

        n = info["n"]
        k = info["k"]

        d = None
        if k > 0:
            try:
                d = int(self.distance_var.get().strip())
                if d <= 0:
                    raise ValueError
            except ValueError:
                messagebox.showerror("Invalid distance", "Target d must be a positive integer.")
                self._set_status("Target d must be a positive integer.")
                return

        lines = []
        # lines.append("cluster_connections =")
        # lines.append(repr(cluster_dict))
        # lines.append("")
        # lines.append("message_connections =")
        # lines.append(repr(message_dict))
        lines.append("")
        # lines.append("INFO:")
        # for key, value in info.items():
        #     lines.append(f"{key}: {value}")
        # lines.append("")
        lines.append(f"A_cc shape = {A_cc.shape}")
        lines.append("A_cc =")
        lines.append(matrix_to_python_list_string(A_cc))
        lines.append("")
        lines.append(f"A_cm shape = {A_cm.shape}")
        lines.append("A_cm =")
        lines.append(matrix_to_python_list_string(A_cm))
        lines.append("")
        lines.append(f"H shape = {H.shape}")
        lines.append("H =")
        lines.append(matrix_to_python_list_string(H))
        lines.append("")
        if k == 0:
            lines.append("results = []")
            lines.append("advanced_result_note = 'Add at least one message node to compute logical operators and distance.'")
            self._set_status("Matrices generated. Add at least one message node for stabilizer results.")
        else:
            # lines.append(f"Target distance d = {d}")
            pass
            try:
                results, parity_check_m = main((n, k, d), graphs=A_cc, acm=A_cm)
                lines.append("")
                lines.append("results =")
                lines.append("Parity check matrix =")
                lines.append(matrix_to_python_list_string(parity_check_m))
                # lines.append("Stabilizer operators =", mat2stab(matrix_to_python_list_string(parity_check_m)))
                lines.append(json.dumps(to_serializable(results), indent=4))

                if not results:
                    full_result,parity_check_m = analyze_single_graph(A_cc, A_cm, n, k)
                    lines.append("")
                    lines.append("computed_output =")
                    # lines.append((mat2stab(matrix_to_python_list_string(parity_check_m))))
                    # lines.append("Parity check matrix =")
                    # lines.append(matrix_to_python_list_string(parity_check_m))
                    lines.append(json.dumps(to_serializable(full_result), indent=4))
                    self._set_status(
                        f"Matrices generated. Exact distance is {full_result['distance']}; no result matched target d={d}."
                    )
                else:
                    self._set_status("Matrices and stabilizer results generated.")
            except ValueError as exc:
                lines.append("")
                lines.append("advanced_result_error =")
                lines.append(str(exc))
                self._set_status(str(exc))

        self.output.delete("1.0", tk.END)
        self.output.insert(tk.END, "\n".join(lines))

    def clear_all(self):
        self.nodes.clear()
