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

@app.route('/api/compute', methods=['POST'])
def compute():
    data = request.json
    cluster_dict = data.get("cluster_connections", {})
    message_dict = data.get("message_connections", {})
    d_str = data.get("d", None)
    
    if not cluster_dict:
        return jsonify({"error": "No cluster nodes provided."}), 400

    try:
        A_cc, A_cm, H, info = build_parity_check_matrix(cluster_dict, message_dict)
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400

    n = info["n"]
    k = info["k"]

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
        "results": [],
        "single_result": None,
        "parity_check_matrix": None
    }

    if k == 0:
        response_payload["message"] = "Add at least one message node to compute logical operators and distance."
    else:
        try:
            results, parity_check_m = main((n, k, d), graphs=A_cc, acm=A_cm)
            response_payload["parity_check_matrix"] = parity_check_m.tolist()
            if results and len(results) > 0:
                response_payload["results"] = to_serializable(results)
            else:
                full_result, parity_check_m = analyze_single_graph(A_cc, A_cm, n, k)
                response_payload["parity_check_matrix"] = parity_check_m.tolist()
                response_payload["single_result"] = to_serializable(full_result)
        except Exception as exc:
            return jsonify({"error": str(exc)}), 400

    return jsonify(response_payload)

if __name__ == '__main__':
    print("Starting Flask API on http://127.0.0.1:5000")
    app.run(port=5000, debug=False)
