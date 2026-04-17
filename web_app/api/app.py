import logging
from math_logic import (
    build_parity_check_matrix, 
    main, 
    analyze_single_graph, 
    matrix_to_python_list_string, 
    to_serializable
)
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Avoid noisy werkzeug logs
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)


def _normalize_pivot_nodes(raw_pivot_nodes, info, k):
    """
    Normalize optional UI pivot selection into a length-k list of cluster indices (0-based).

    Accepted formats:
    - list/tuple: [0, None, 2] or ["c1", "c3", "auto"]
    - dict: {"m1": "c3", "m2": "c1"} or {"0": "c2"}
    """
    if raw_pivot_nodes is None:
        return None

    cluster_nodes = info.get("cluster_nodes_order", [])
    message_nodes = info.get("message_nodes_order", [])
    cluster_lookup = {name: idx for idx, name in enumerate(cluster_nodes)}

    def parse_cluster_value(value):
        if value is None:
            return None

        if isinstance(value, str):
            token = value.strip()
            if token == "" or token.lower() == "auto":
                return None
            if token in cluster_lookup:
                return cluster_lookup[token]
            if token.startswith("c") and token[1:].isdigit():
                candidate = int(token[1:]) - 1
                if 0 <= candidate < len(cluster_nodes):
                    return candidate
            if token.isdigit():
                candidate = int(token)
                if 0 <= candidate < len(cluster_nodes):
                    return candidate
                if 1 <= candidate <= len(cluster_nodes):
                    return candidate - 1
            raise ValueError(
                f"Invalid pivot value '{value}'. Use a cluster name like c3, a 0-based index, or 'auto'."
            )

        if isinstance(value, int):
            if 0 <= value < len(cluster_nodes):
                return value
            raise ValueError(
                f"Pivot index {value} out of range. Valid range is 0..{max(len(cluster_nodes) - 1, 0)}."
            )

        raise ValueError(
            f"Invalid pivot value type: {type(value).__name__}. Use int, str, null/None, or 'auto'."
        )

    if isinstance(raw_pivot_nodes, (list, tuple)):
        if len(raw_pivot_nodes) != k:
            raise ValueError(f"pivot_nodes list must contain exactly {k} entries.")
        parsed = [parse_cluster_value(v) for v in raw_pivot_nodes]
        if k == 1 and sum(v is not None for v in parsed) > 1:
            raise ValueError("With one message qubit, only one pivot node can be selected.")
        return parsed

    if isinstance(raw_pivot_nodes, dict):
        if k == 1:
            selected_count = 0
            for value in raw_pivot_nodes.values():
                parsed_value = parse_cluster_value(value)
                if parsed_value is not None:
                    selected_count += 1
            if selected_count > 1:
                raise ValueError("With one message qubit, only one pivot node can be selected.")

        normalized = [None] * k
        for idx in range(k):
            msg_name = message_nodes[idx] if idx < len(message_nodes) else None
            if msg_name is not None and msg_name in raw_pivot_nodes:
                normalized[idx] = parse_cluster_value(raw_pivot_nodes[msg_name])
            elif str(idx) in raw_pivot_nodes:
                normalized[idx] = parse_cluster_value(raw_pivot_nodes[str(idx)])
        return normalized

    raise ValueError("pivot_nodes must be either a list/tuple, a dict, or omitted.")

@app.route('/api/compute', methods=['POST'])
def compute():
    data = request.get_json(silent=True) or {}
    cluster_dict = data.get("cluster_connections", {})
    message_dict = data.get("message_connections", {})
    d_str = data.get("d", None)
    raw_pivot_nodes = data.get("pivot_nodes", None)
    
    if not cluster_dict:
        return jsonify({"error": "No cluster nodes provided."}), 400

    try:
        A_cc, A_cm, H, info = build_parity_check_matrix(cluster_dict, message_dict)
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400

    n = info["n"]
    k = info["k"]
    try:
        pivot_nodes = _normalize_pivot_nodes(raw_pivot_nodes, info, k)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    d = None
    if k > 0:
        if not d_str:
            return jsonify({"error": "Target d must be a positive integer."}), 400
        try:
            d = int(d_str)
            if d <= 0:
                raise ValueError
        except ValueError:
            return jsonify({"error": "Target d must be a positive integer."}), 400

    response_payload = {
        "A_cc_shape": list(A_cc.shape),
        "A_cc": A_cc.tolist(),
        "A_cm_shape": list(A_cm.shape),
        "A_cm": A_cm.tolist(),
        "H_shape": list(H.shape),
        "H": H.tolist(),
        "n": n,
        "k": k,
        "d": d,
        "pivot_nodes": pivot_nodes,
        "results": [],
        "single_result": None,
        "parity_check_matrix": None
    }

    if k == 0:
        response_payload["message"] = "Add at least one message node to compute logical operators and distance."
    else:
        try:
            results, parity_check_m = main(
                (n, k, d), graphs=A_cc, acm=A_cm, pivot_nodes=pivot_nodes
            )
            response_payload["parity_check_matrix"] = parity_check_m.tolist()
            if results and len(results) > 0:
                response_payload["results"] = to_serializable(results)
            else:
                full_result, parity_check_m = analyze_single_graph(
                    A_cc, A_cm, n, k, pivot_nodes=pivot_nodes
                )
                response_payload["parity_check_matrix"] = parity_check_m.tolist()
                response_payload["single_result"] = to_serializable(full_result)
        except Exception as exc:
            return jsonify({"error": str(exc)}), 400

    return jsonify(response_payload)

if __name__ == '__main__':
    print("Starting Flask API on http://127.0.0.1:5000")
    app.run(port=5000, debug=False)
