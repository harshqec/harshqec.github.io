/**
 * math_logic.js
 * Pure JavaScript port of the Python math_logic.py quantum graph parity-check
 * matrix engine.  Runs entirely in the browser — no backend required.
 *
 * Exported entry-points:
 *   computeMatrices(payload)  ->  response object matching the old Flask API shape
 */

// =========================================================
// SMALL HELPERS
// =========================================================

function nodeSortKey(name) {
  const n = parseInt(name.slice(1), 10);
  return isNaN(n) ? Infinity : n;
}

/** Portable Hamming-weight (popcount) for 32-bit non-negative int */
function popcount(v) {
  v = v >>> 0;
  v = v - ((v >>> 1) & 0x55555555);
  v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
  return (((v + (v >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}

// =========================================================
// MATRIX FACTORY HELPERS
// =========================================================

function zeros2D(rows, cols) {
  return Array.from({ length: rows }, () => new Array(cols).fill(0));
}

function eye(n) {
  const m = zeros2D(n, n);
  for (let i = 0; i < n; i++) m[i][i] = 1;
  return m;
}

/** Horizontal stack of same-height 2-D arrays */
function hstack(...mats) {
  if (!mats.length) return [];
  return mats[0].map((_, i) => {
    let row = [];
    for (const m of mats) row = row.concat(m[i]);
    return row;
  });
}

/** Deep-clone a 2-D array of numbers */
function clone2D(m) {
  return m.map(r => r.slice());
}

// =========================================================
// PAULI STRING ↔ BINARY VECTOR
// =========================================================

/**
 * Pauli string -> binary vector [x_0…x_{n-1}, z_0…z_{n-1}]
 * (Python: matrix_form)
 */
function matrixForm(pauli) {
  const n = pauli.length;
  const l = new Array(2 * n).fill(0);
  for (let i = 0; i < n; i++) {
    const c = pauli[i];
    if (c === 'X') { l[i] = 1; }
    else if (c === 'Z') { l[n + i] = 1; }
    else if (c === 'Y') { l[i] = 1; l[n + i] = 1; }
  }
  return l;
}

/**
 * Binary vector -> Pauli string
 * (Python: stab_form)
 */
function stabForm(l) {
  const n = Math.floor(l.length / 2);
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = l[i], z = l[n + i];
    if (x && z) s += 'Y';
    else if (x) s += 'X';
    else if (z) s += 'Z';
    else s += 'I';
  }
  return s;
}

/** Matrix of binary vectors -> list of Pauli strings */
function mat2stab(matrix) {
  return matrix.map(row => stabForm(row));
}

/** List of Pauli strings -> binary matrix */
function stabilizerMatrix(stabs) {
  return stabs.map(s => matrixForm(s));
}

// =========================================================
// BITPACK: compress a binary check matrix into packed ints
// (Python: bitpack_matrix)
// =========================================================

function bitpackMatrix(mat) {
  if (!mat.length || !mat[0].length) return [[], []];
  const n = Math.floor(mat[0].length / 2);
  const xs = [], zs = [];
  for (const row of mat) {
    let x = 0, z = 0;
    for (let i = 0; i < n; i++) {
      if (row[i]) x |= (1 << i);
      if (row[n + i]) z |= (1 << i);
    }
    xs.push(x);
    zs.push(z);
  }
  return [xs, zs];
}

// =========================================================
// PAULI STRINGS FROM PACKED PAIRS
// (Python: pauli_strings)
// =========================================================

const PAULI_CHARS = ['I', 'Z', 'X', 'Y'];

function pauliStrings(pairs, n) {
  return pairs.map(([x, z]) => {
    let s = '';
    for (let i = 0; i < n; i++) {
      const xi = (x >>> i) & 1;
      const zi = (z >>> i) & 1;
      s += PAULI_CHARS[(xi << 1) | zi];
    }
    return s;
  });
}

// =========================================================
// PARITY CHECK MATRIX BUILDER
// (Python: build_parity_check_matrix)
// =========================================================

function buildParityCheckMatrix(clusterConnections, messageConnections) {
  const clusterNodes = Object.keys(clusterConnections)
    .sort((a, b) => nodeSortKey(a) - nodeSortKey(b));
  const messageNodes = Object.keys(messageConnections)
    .sort((a, b) => nodeSortKey(a) - nodeSortKey(b));

  const n = clusterNodes.length;
  const k = messageNodes.length;

  const clusterIndex = {};
  clusterNodes.forEach((node, i) => { clusterIndex[node] = i; });
  const messageIndex = {};
  messageNodes.forEach((node, j) => { messageIndex[node] = j; });

  // Validate
  for (const [c, neighbors] of Object.entries(clusterConnections)) {
    if (!c.startsWith('c')) throw new Error(`${c} is not a valid cluster node name`);
    for (const nb of neighbors) {
      if (!(nb in clusterIndex)) throw new Error(`${c} connects to unknown cluster node ${nb}`);
      if (nb === c) throw new Error(`Self-loop not allowed for ${c}`);
    }
  }
  for (const [m, neighbors] of Object.entries(messageConnections)) {
    if (!m.startsWith('m')) throw new Error(`${m} is not a valid message node name`);
    for (const c of neighbors) {
      if (!(c in clusterIndex)) throw new Error(`${m} connects to unknown cluster node ${c}`);
    }
  }

  // A_cc: cluster–cluster adjacency
  const A_cc = zeros2D(n, n);
  for (const [c, neighbors] of Object.entries(clusterConnections)) {
    const i = clusterIndex[c];
    for (const nb of neighbors) {
      const j = clusterIndex[nb];
      A_cc[i][j] = 1;
      A_cc[j][i] = 1;
    }
  }

  // A_cm: cluster–message adjacency
  const A_cm = zeros2D(n, k);
  for (const [m, neighbors] of Object.entries(messageConnections)) {
    const j = messageIndex[m];
    for (const c of neighbors) {
      const i = clusterIndex[c];
      A_cm[i][j] = 1;
    }
  }

  // H = [I_n | 0_{n×k} | A_cc | A_cm]
  const I_n = eye(n);
  const O_nk = zeros2D(n, k);
  const Hx = hstack(I_n, O_nk);
  const Hz = hstack(A_cc, A_cm);
  const H = hstack(Hx, Hz);

  return { A_cc, A_cm, H, n, k };
}

// =========================================================
// HX CLUSTER MAT
// (Python: hx_cluster_mat)
// =========================================================

function hxClusterMat(n, k) {
  return hstack(eye(n), zeros2D(n, k));
}

// =========================================================
// PROCESS MATRIX – extract logical operators
// (Python: process_matrix)
// =========================================================

function processMatrix(hxIn, hzIn, k, pivotNodes = null) {
  // rowSize is fixed to the initial number of rows (= n)
  const rowSize = hxIn.length;
  let hx = clone2D(hxIn);
  let hz = clone2D(hzIn);

  let normalizedPivots = null;
  if (pivotNodes == null) {
    normalizedPivots = new Array(k).fill(null);
  } else {
    if (!Array.isArray(pivotNodes) || pivotNodes.length !== k) {
      throw new Error(`pivot_nodes must be an array with exactly ${k} entries.`);
    }
    normalizedPivots = pivotNodes.map((value, idx) => {
      if (value == null) return null;
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed < 0 || parsed >= rowSize) {
        throw new Error(`pivot_nodes[${idx}] is invalid. Use a cluster index in range 0..${Math.max(rowSize - 1, 0)} or null.`);
      }
      return parsed;
    });
  }

  const lxList = [];
  const lzList = [];

  for (let p = 0; p < k; p++) {
    // Find rows where last column of hz == 1
    const lastCol = hz[0].length - 1;
    let pos = [];
    for (let r = 0; r < hz.length; r++) {
      if (hz[r][lastCol] === 1) pos.push(r);
    }

    if (pos.length === 0) {
      throw new Error(
        `Cannot eliminate message column ${p + 1}: the current ACM column has no support.`
      );
    }

    const preferredPivot = normalizedPivots[p];
    if (preferredPivot != null) {
      const supportedOriginal = pos.map(q => q + p);
      const chosenIdx = supportedOriginal.indexOf(preferredPivot);
      if (chosenIdx === -1) {
        throw new Error(
          `Requested pivot c${preferredPivot + 1} is not connected to message column ${p + 1}. ` +
          `Available pivots: ${supportedOriginal.map(i => `c${i + 1}`).join(', ')}`
        );
      }
      if (chosenIdx !== 0) {
        pos = [pos[chosenIdx], ...pos.slice(0, chosenIdx), ...pos.slice(chosenIdx + 1)];
      }
    }

    // XOR all other pivot rows with the first pivot row
    if (pos.length > 1) {
      for (let qi = 1; qi < pos.length; qi++) {
        const r = pos[qi];
        for (let c = 0; c <= lastCol; c++) hz[r][c] ^= hz[pos[0]][c];
        for (let c = 0; c < hx[0].length; c++) hx[r][c] ^= hx[pos[0]][c];
      }
    }

    // Extract lx from pivot row (first rowSize columns of each)
    const delHz = hz[pos[0]].slice(0, rowSize);
    const delHx = hx[pos[0]].slice(0, rowSize);
    const lxBin = [...delHx, ...delHz];       // length = 2*rowSize
    const lx = stabForm(lxBin);

    // Build lz: start with all-I, place Z at positions q+p
    let lzArr = new Array(rowSize).fill('I');
    for (const q of pos) {
      const idx = q + p;
      if (idx < rowSize) lzArr[idx] = 'Z';
    }
    const lz = lzArr.join('');

    // Delete pivot row (index pos[0]) from both matrices
    hz.splice(pos[0], 1);
    hx.splice(pos[0], 1);

    // Delete last column from hz and hx
    hz = hz.map(row => row.slice(0, -1));
    hx = hx.map(row => row.slice(0, -1));

    lxList.push(lx);
    lzList.push(lz);
  }

  return { hx, hz, lxList, lzList };
}

function normalizePivotNodes(rawPivotNodes, clusterOrder, messageOrder, k) {
  if (rawPivotNodes == null) return null;

  const clusterLookup = new Map(clusterOrder.map((name, idx) => [name, idx]));
  const parseClusterValue = (value) => {
    if (value == null) return null;
    if (typeof value === 'string') {
      const token = value.trim();
      if (!token || token.toLowerCase() === 'auto') return null;
      if (clusterLookup.has(token)) return clusterLookup.get(token);
      if (/^c\d+$/i.test(token)) {
        const idx = parseInt(token.slice(1), 10) - 1;
        if (idx >= 0 && idx < clusterOrder.length) return idx;
      }
      if (/^\d+$/.test(token)) {
        const idx = parseInt(token, 10);
        if (idx >= 0 && idx < clusterOrder.length) return idx;
        if (idx >= 1 && idx <= clusterOrder.length) return idx - 1;
      }
      throw new Error(`Invalid pivot value '${value}'. Use cluster name (e.g. c3), 0-based index, or 'auto'.`);
    }
    if (Number.isInteger(value)) {
      if (value >= 0 && value < clusterOrder.length) return value;
      throw new Error(`Pivot index ${value} is out of range 0..${Math.max(clusterOrder.length - 1, 0)}.`);
    }
    throw new Error(`Invalid pivot value type '${typeof value}'.`);
  };

  if (Array.isArray(rawPivotNodes)) {
    if (rawPivotNodes.length !== k) {
      throw new Error(`pivot_nodes list must contain exactly ${k} entries.`);
    }
    const parsed = rawPivotNodes.map(parseClusterValue);
    if (k === 1 && parsed.filter(v => v != null).length > 1) {
      throw new Error('With one message qubit, only one pivot node can be selected.');
    }
    return parsed;
  }

  if (typeof rawPivotNodes === 'object') {
    const normalized = new Array(k).fill(null);
    let selectedCount = 0;
    for (const value of Object.values(rawPivotNodes)) {
      const parsedValue = parseClusterValue(value);
      if (parsedValue != null) selectedCount += 1;
    }
    if (k === 1 && selectedCount > 1) {
      throw new Error('With one message qubit, only one pivot node can be selected.');
    }

    for (let i = 0; i < k; i++) {
      const msgName = messageOrder[i];
      let raw = null;
      if (msgName && Object.prototype.hasOwnProperty.call(rawPivotNodes, msgName)) {
        raw = rawPivotNodes[msgName];
      } else if (Object.prototype.hasOwnProperty.call(rawPivotNodes, String(i))) {
        raw = rawPivotNodes[String(i)];
      }
      const parsed = parseClusterValue(raw);
      normalized[i] = parsed;
    }

    return normalized;
  }

  throw new Error('pivot_nodes must be omitted, an array, or an object mapping message nodes to pivots.');
}

// =========================================================
// STABILIZER GROUP ENUMERATION
// (Python: enumerate_stabilizer_group)
// =========================================================

function enumerateStabilizerGroup(stabXs, stabZs) {
  const r = stabXs.length;
  const group = [];
  const total = 1 << r;   // 2^r combinations
  for (let mask = 0; mask < total; mask++) {
    let x = 0, z = 0;
    for (let i = 0; i < r; i++) {
      if ((mask >>> i) & 1) {
        x ^= stabXs[i];
        z ^= stabZs[i];
      }
    }
    group.push([x, z]);
  }
  return group;
}

// =========================================================
// EXACT DISTANCE
// (Python: exact_distance)
// =========================================================

function exactDistance(stabXs, stabZs, logicalXs, logicalZs) {
  const k = logicalXs.length;
  if (k === 0) return 0;

  const stabGroup = enumerateStabilizerGroup(stabXs, stabZs);
  let minW = Infinity;

  const totalLogical = 1 << (2 * k);   // 2^(2k)
  for (let mask = 1; mask < totalLogical; mask++) {   // skip mask=0 (trivial)
    let lx = 0, lz = 0;
    for (let i = 0; i < k; i++) {
      if ((mask >>> i) & 1) {
        lx ^= logicalXs[i][0];
        lz ^= logicalXs[i][1];
      }
      if ((mask >>> (k + i)) & 1) {
        lx ^= logicalZs[i][0];
        lz ^= logicalZs[i][1];
      }
    }

    for (const [sx, sz] of stabGroup) {
      const cx = lx ^ sx, cz = lz ^ sz;
      const w = popcount(cx | cz);
      if (w < minW) minW = w;
    }
  }

  return minW === Infinity ? 0 : minW;
}

// =========================================================
// SINGLE GRAPH ANALYSER
// (Python: analyze_single_graph)
// =========================================================

function analyzeSingleGraph(graphMatrix, acm, n, k, pivotNodes = null) {
  const hx = hxClusterMat(n, k);
  const hzInput = hstack(graphMatrix, acm);

  const { hx: hxAfter, hz: hzAfter, lxList, lzList } =
    processMatrix(clone2D(hx), clone2D(hzInput), k, pivotNodes);

  // Stabilizer matrix = hstack(hxAfter, hzAfter)
  const stabMat = hstack(hxAfter, hzAfter);
  const [stabXs, stabZs] = bitpackMatrix(stabMat);

  const logicalXs = [];
  const logicalZs = [];
  for (let i = 0; i < k; i++) {
    const [lxX, lxZ] = bitpackMatrix(stabilizerMatrix([lxList[i]]));
    const [lzX, lzZ] = bitpackMatrix(stabilizerMatrix([lzList[i]]));
    logicalXs.push([lxX[0], lxZ[0]]);
    logicalZs.push([lzX[0], lzZ[0]]);
  }

  const dExact = exactDistance(stabXs, stabZs, logicalXs, logicalZs);

  const resultDict = {
    stabilizer_operators: mat2stab(stabMat),
    logical_Xs_stab: pauliStrings(logicalXs, n),
    logical_Zs_stab: pauliStrings(logicalZs, n),
    'What code it is': '(bare-code analysis runs locally only)',
    distance: dExact,
  };

  return { result: resultDict, parityCheckMatrix: stabMat };
}

// =========================================================
// MAIN DRIVER
// (Python: main)
// =========================================================

function main(n, k, d, graphs, acm, pivotNodes = null) {
  const results = [];
  let finalMatrix = null;

  // graphs / acm are single 2-D arrays here (one graph at a time from UI)
  const { result, parityCheckMatrix } = analyzeSingleGraph(graphs, acm, n, k, pivotNodes);
  finalMatrix = parityCheckMatrix;
  if (result.distance === d) results.push(result);

  return { results, finalMatrix };
}

// =========================================================
// PUBLIC API  –  matches Flask /api/compute response shape
// =========================================================

/**
 * computeMatrices(payload)
 *
 * payload: {
 *   cluster_connections: { c1: ['c2', ...], ... },
 *   message_connections: { m1: ['c1', ...], ... },
 *   d: number
 * }
 *
 * Returns an object with the same keys the old Flask endpoint returned.
 * Throws a plain Error on validation failures.
 */
export function computeMatrices(payload) {
  const clusterDict = payload.cluster_connections || {};
  const messageDict = payload.message_connections || {};
  const dTarget = payload.d !== undefined ? parseInt(payload.d, 10) : null;
  const rawPivotNodes = payload.pivot_nodes ?? null;

  if (!Object.keys(clusterDict).length) {
    throw new Error('No cluster nodes provided.');
  }

  const { A_cc, A_cm, H, n, k } = buildParityCheckMatrix(clusterDict, messageDict);
  const clusterOrder = Object.keys(clusterDict).sort((a, b) => parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10));
  const messageOrder = Object.keys(messageDict).sort((a, b) => parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10));
  const pivotNodes = normalizePivotNodes(rawPivotNodes, clusterOrder, messageOrder, k);

  const response = {
    A_cc_shape: [n, n],
    A_cc: A_cc,
    A_cm_shape: [n, k],
    A_cm: A_cm,
    H_shape: [n, 2 * (n + k)],
    H: H,
    n,
    k,
    d: dTarget,
    pivot_nodes: pivotNodes,
    results: [],
    single_result: null,
    parity_check_matrix: null,
  };

  if (k === 0) {
    response.message =
      'Add at least one message node to compute logical operators and distance.';
    return response;
  }

  if (dTarget === null || dTarget <= 0) {
    throw new Error('Target d must be a positive integer.');
  }

  const { results, finalMatrix } = main(n, k, dTarget, A_cc, A_cm, pivotNodes);
  response.parity_check_matrix = finalMatrix;

  if (results.length > 0) {
    response.results = results;
  } else {
    // run without distance filter to get full single result
    const { result, parityCheckMatrix } = analyzeSingleGraph(A_cc, A_cm, n, k, pivotNodes);
    response.parity_check_matrix = parityCheckMatrix;
    response.single_result = result;
  }

  return response;
}
