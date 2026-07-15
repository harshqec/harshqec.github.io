import numpy as np

def check_matrix(stab): 
    '''
    Input -> list of stabilizer subgroup generators
    Output-> matrix representation

    Example:
    check_matrix(['XXI','IXX'])
    array([[1., 1., 0., 0., 0., 0.],
           [0., 1., 1., 0., 0., 0.]])
    '''    

    no_gen = len(stab)
    n = len(stab[0])
    
    matrix = np.zeros((no_gen, 2*n))
    
    i=0
    for _ in stab:
        for pos, op in zip(range(n), _):
            if op == 'X':
                matrix[i][pos] = 1
            elif op == 'Z':
                matrix[i][n+pos] = 1
            elif op == 'Y':
                matrix[i][pos] = matrix[i][n+pos] = 1
            else:
                matrix[i][pos] = matrix[i][n+pos] = 0
        i+=1
        
    return matrix

def mattostab(matrix):
    M = matrix
    n = int(len(M[0])/2)
    a = int(len(M))

    stab = []
    for i in range(a):
        s = ''
        for j in range(n):
            if M[i,j] == 1 and M[i,n+j] == 1:
                s=s+'Y'
            elif M[i,j] == 1 and M[i,n+j] == 0:
                s=s+'X'
            elif M[i,j] == 0 and M[i,n+j] == 1:
                s=s+'Z'
            else:
                s=s+'I'
        stab.append(s)    
    return stab

def standard_form_X(stab):
    M = check_matrix(stab)
    n = int(len(M[0])/2)    #finding no of qubits
    a = int(len(M))         #finding no of stabilizers
    swaps = []

    #Identity on X Matrix
    #iterate over each stabilizer
    for j in range(a):        
        c=j
        while M[j,j] == 0:                      #Ensuring 1s at diagonal
            c+=1
            if c == n:
                if j == a:
                    return M%2, a, swaps
                M[j], M[a-1] = M[a-1].copy(), M[j].copy()
                a-=1                            #We know the last row now is all zeros, let's forget it.
                c = j+1

            if M[j,j] == 0 and M[j,c] == 1:     #Checking again as after row swap M[j,j] could be 1 too.
                M[:,j], M[:,c] = M[:,c].copy(), M[:,j].copy() 
                M[:,n+j], M[:,n+c] = M[:,n+c].copy(), M[:,n+j].copy()

                swaps.append([j,c])             #qubit no of swapped qubits starting from 0
        
        for i in range(a):                      #After getting a 1 at diagonal, make all entries 0 in that column
            if M[i,j] == 1 and i != j:
                M[i] = M[i] + M[j]
        M = M%2

    return M%2, a, swaps

# def standard_form_Z(matrix, r, swaps):
#     M = matrix
#     n = int(len(M[0])/2)    #finding no of qubits
#     a = int(len(M))         #finding no of stabilizers

#     if r == a:
#         return M, r, swaps
    
#     for j in range(a-r):
#         c = j
#         while M[r+j,n+r+j] == 0:
#             c+=1
#             if M[r+j,n+r+c] == 1:
#                 M[:,r+j], M[:,r+c] = M[:,r+c].copy(), M[:,r+j].copy() 
#                 M[:,n+r+j], M[:,n+r+c] = M[:,n+r+c].copy(), M[:,n+r+j].copy()
#                 swaps.append([r+j,r+c])            
        
#         for i in range(a):                      #After getting a 1 at diagonal, make all entries 0 in that column
#             if M[i,n+r+j] == 1 and i != r+j:
#                 M[i] = M[i] + M[r+j]
#         M = M%2
    
#     return M%2, r, swaps

def standard_form(stab):
    mat, r, swaps = standard_form_X(stab)
    SF = standard_form_Z(mat, r, swaps)
    return SF

def encoding_logicals(matrix, r):
    '''
    Input: matrix -> Standard Form of stabilizer check matrix
           r -> rank of X half of matrix
    '''
    M = matrix
    n = int(len(M[0])/2)    #finding no of qubits
    a = int(len(M))         #finding no of stabilizers
    k = int(n-a)            #finding no of logical qubits
    r = r                   #rank of M_x

    A_2 = M[:r, a:n]
    C   = M[:r, n+a:]
    E   = np.zeros((n-k-r,k))
    if r<a:
        E = M[r:, n+a:]

    x_logical = np.concatenate((np.zeros((k,r)), E.T, np.identity(k), C.T, np.zeros((k,n-r))),axis=1)
    z_logical = np.concatenate((np.zeros((k,n)), A_2.T, np.zeros((k, n-k-r)), np.identity(k)),axis=1)

    return x_logical, z_logical

def original_logicals(x_bar, z_bar, swap_ops):
    n = int(len(x_bar[0])/2)
    for i in reversed(swap_ops):
        a, b = i[0], i[1]
        x_bar[:, a], x_bar[:, b] = x_bar[:, b].copy(), x_bar[:, a].copy()
        z_bar[:, a], z_bar[:, b] = z_bar[:, b].copy(), z_bar[:, a].copy()
        x_bar[:, n+a], x_bar[:, n+b] = x_bar[:, n+b].copy(), x_bar[:, n+a].copy()      
        z_bar[:, n+a], z_bar[:, n+b] = z_bar[:, n+b].copy(), z_bar[:, n+a].copy()
    return x_bar, z_bar



def standard_form_Z(matrix, r, swaps):
    """
    Transforms the stabilizer matrix into standard form for Z-type generators.
    
    Parameters:
    - matrix: 2n binary stabilizer matrix (numpy array)
    - r: rank of X-block (from standard_form_X)
    - swaps: list of prior qubit swap operations
    
    Returns:
    - Updated matrix in standard form
    - Unchanged r
    - Updated swaps
    """
    M = matrix.copy()
    n = M.shape[1] // 2
    a = M.shape[0]

    if r == a:
        return M, r, swaps  # No Z-only stabilizers left

    for j in range(a - r):
        diag_idx = n + r + j
        row_idx = r + j

        # Find a suitable column to swap if diagonal is 0
        if M[row_idx, diag_idx] == 0:
            found = False
            for c in range(j + 1, n - r):
                col_idx = n + r + c
                if col_idx >= 2 * n:
                    break  # Avoid overflow
                if M[row_idx, col_idx] == 1:
                    # Swap columns r+j and r+c in both X and Z halves
                    M[:, r+j], M[:, r+c] = M[:, r+c].copy(), M[:, r+j].copy()
                    M[:, n+r+j], M[:, n+r+c] = M[:, n+r+c].copy(), M[:, n+r+j].copy()
                    swaps.append([r+j, r+c])
                    found = True
                    break
            if not found:
                continue  # Skip if no suitable swap found

        # Eliminate Zs from the current column in other rows
        for i in range(a):
            if i != row_idx and M[i, diag_idx] == 1:
                M[i] = (M[i] + M[row_idx]) % 2

    return M, r, swaps
