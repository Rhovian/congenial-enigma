export const BS = 2;
export const M = 2;
export const N = 2;
export const K = 2;

export const A = [
  [1, 2],
  [3, 4],
];

export const B = [
  [5, 6],
  [7, 8],
];

export function mm(A, B) {
  const C = Array.from({ length: M }, () => Array(N).fill(0));
  for (let i = 0; i < M; i++)
    for (let j = 0; j < N; j++)
      for (let k = 0; k < K; k++) C[i][j] += A[i][k] * B[k][j];
  return C;
}

export const C_ref = mm(A, B);
