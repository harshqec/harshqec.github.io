import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from standardform import standard_form, encoding_logicals, original_logicals, mattostab
from bare_code_checker import find_code

app = Flask(__name__)
CORS(app)

@app.route('/api/check_bare_code', methods=['POST'])
def check_bare_code():
    data = request.json
    pcm = np.array(data['parity_check_matrix'])
    
    check_mode = data.get('check_mode', 'variants')
    search_mode = data.get('search_mode', 'random')
    max_perms = int(data.get('max_permutations', 1000000))
    max_valid_perms = int(data.get('max_valid_permutations', 1000))

    try:
        # Convert parity check matrix to stabilizer strings
        stab = mattostab(pcm)
        
        # Calculate standard form and logicals
        std_stab_mat, r, swaps = standard_form(stab)
        x_logical, z_logical = encoding_logicals(std_stab_mat, r)
        
        # Undo swaps to get original logicals
        x_logical_orig, z_logical_orig = original_logicals(x_logical, z_logical, swaps)
        
        x_logicals_str = mattostab(x_logical_orig)
        z_logicals_str = mattostab(z_logical_orig)
        
        # Run bare code check
        result = find_code(
            stab,
            [x_logicals_str, z_logicals_str],
            check_mode=check_mode,
            max_permutations_per_stabilizer=max_perms,
            max_valid_permutations_per_stabilizer=max_valid_perms,
            search_mode=search_mode,
            random_seed=123,
            preferred_sequences=None,
            verbose=False,
            old_format=True
        )
        
        is_bare = result.get('is_bare', False)
        status = result.get('status', 'unknown')
        
        return jsonify({
            'success': True,
            'is_bare': is_bare,
            'status': status,
            'logical_Xs': x_logicals_str,
            'logical_Zs': z_logicals_str,
            'check_mode': check_mode,
            'search_mode': search_mode
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)
