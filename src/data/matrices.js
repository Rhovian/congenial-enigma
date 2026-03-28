export const BS = 2;
export const M = 4;
export const N = 4;
export const K = 4;

export const A = [
  [1, 2, 3, 4],
  [5, 6, 7, 8],
  [9, 10, 11, 12],
  [13, 14, 15, 16],
];

export const B = [
  [1, 0, 0, 1],
  [0, 1, 1, 0],
  [1, 1, 0, 0],
  [0, 0, 1, 1],
];

export function mm(A, B) {
  const C = Array.from({ length: M }, () => Array(N).fill(0));
  for (let i = 0; i < M; i++)
    for (let j = 0; j < N; j++)
      for (let k = 0; k < K; k++) C[i][j] += A[i][k] * B[k][j];
  return C;
}

export const C_ref = mm(A, B);
