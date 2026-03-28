import { BS, K, N, C_ref } from '../data/matrices';

const codeLines = [
  '__global__ void sgemm_smem(int M, int N, int K,',
  '    float alpha, const float *A,',
  '    const float *B, float beta, float *C) {',
  '',
  '  const uint threadRow = threadIdx.x / BLOCK_SIZE;',
  '  const uint threadCol = threadIdx.x % BLOCK_SIZE;',
  '',
  '  const uint tx = blockIdx.x * BLOCK_SIZE + threadRow;',
  '  const uint ty = blockIdx.y * BLOCK_SIZE + threadCol;',
  '',
  '  __shared__ float As[BLOCK_SIZE][BLOCK_SIZE];',
  '  __shared__ float Bs[BLOCK_SIZE][BLOCK_SIZE];',
  '',
  '  float tmp = 0.0;',
  '',
  '  for (int tileIdx = 0; tileIdx < K;',
  '       tileIdx += BLOCK_SIZE) {',
  '',
  '    As[threadRow][threadCol] =',
  '        A[tx * K + tileIdx + threadCol];',
  '',
  '    Bs[threadRow][threadCol] =',
  '        B[(tileIdx + threadRow) * N + ty];',
  '',
  '    __syncthreads();',
  '',
  '    for (int i = 0; i < BLOCK_SIZE; i++) {',
  '      tmp += As[threadRow][i]',
  '           * Bs[i][threadCol];',
  '    }',
  '',
  '    __syncthreads();',
  '  }',
  '',
  '  if (tx < M && ty < N) {',
  '    C[tx * N + ty] =',
  '        alpha * tmp + beta * C[tx * N + ty];',
  '  }',
  '}',
];

const stepHighlights = [
  [4, 5, 7, 8],
  [10, 11, 15, 16, 18, 19, 21, 22, 24],
  [26, 27, 28, 29, 31],
  [15, 16, 18, 19, 21, 22, 24],
  [26, 27, 28, 29, 31],
  [34, 35, 36],
];

function tileKForStep(stepId) {
  if (stepId === 'load0' || stepId === 'accum0') return 0;
  if (stepId === 'load1' || stepId === 'accum1') return 1;
  return -1;
}

function makeCellClass(stepId) {
  const tileK = tileKForStep(stepId);

  return (mat, r, c, block) => {
    const [br, bc] = block;
    const r0 = br * BS, c0 = bc * BS;

    if (stepId === 'grid' || stepId === 'write') {
      if (mat === 'A') return r >= r0 && r < r0 + BS ? 'hi-a' : 'dim';
      if (mat === 'B') return c >= c0 && c < c0 + BS ? 'hi-b' : 'dim';
      if (mat === 'C')
        return r >= r0 && r < r0 + BS && c >= c0 && c < c0 + BS
          ? stepId === 'write'
            ? 'hi-out'
            : 'hi-c'
          : 'dim';
    }
    if (tileK >= 0) {
      const kS = tileK * BS;
      if (mat === 'A')
        return r >= r0 && r < r0 + BS && c >= kS && c < kS + BS
          ? 'hi-a'
          : 'dim';
      if (mat === 'B')
        return r >= kS && r < kS + BS && c >= c0 && c < c0 + BS
          ? 'hi-b'
          : 'dim';
      if (mat === 'C')
        return r >= r0 && r < r0 + BS && c >= c0 && c < c0 + BS
          ? 'hi-c'
          : 'dim';
    }
    return '';
  };
}

function makeSharedMemory(stepId) {
  const tileK = tileKForStep(stepId);
  if (tileK < 0) return null;

  return (block, A, B) => {
    const [br, bc] = block;
    const r0 = br * BS, c0 = bc * BS, kS = tileK * BS;
    return [
      {
        label: 'As',
        cls: 'hi-a',
        data: Array.from({ length: BS }, (_, r) =>
          Array.from({ length: BS }, (_, c) => A[r0 + r][kS + c])
        ),
      },
      {
        label: 'Bs',
        cls: 'hi-b',
        data: Array.from({ length: BS }, (_, r) =>
          Array.from({ length: BS }, (_, c) => B[kS + r][c0 + c])
        ),
      },
    ];
  };
}

function derivContent(which, block, tileK) {
  const [br, bc] = block;
  const tileIdx = tileK * BS;

  if (which === 'A') {
    return {
      title: 'As load derivation',
      body: (
        <>
          <div className="deriv-label">Kernel code</div>
          <div className="deriv-step">
            As[threadRow][threadCol] = A[tx * K + tileIdx + threadCol]
          </div>
          <div className="deriv-label">
            Expand tx = blockIdx.x * BS + threadRow
          </div>
          <div className="deriv-step">
            = A[({br}*{BS} + r) * {K} + {tileIdx} + c]
          </div>
          <div className="deriv-label">Simplify</div>
          <div className="deriv-step">
            = A[({br * BS} + r) * {K} + {tileIdx} + c]
          </div>
          <div className="deriv-label">Read as 2D indexing: A[row][col]</div>
          <div className="deriv-step">
            = A[<span className="deriv-highlight">{br * BS}+r</span>][
            <span className="deriv-highlight">{tileIdx}+c</span>]
          </div>
          <div className="deriv-label">Meaning</div>
          <div className="deriv-step" style={{ fontFamily: 'var(--font-sans)' }}>
            Row from <span className="deriv-highlight">block position</span>{' '}
            (rows {br * BS}–{br * BS + BS - 1})
            <br />
            Col from <span className="deriv-highlight">tile position</span>{' '}
            (cols {tileIdx}–{tileIdx + BS - 1})
          </div>
        </>
      ),
    };
  }

  return {
    title: 'Bs load derivation',
    body: (
      <>
        <div className="deriv-label">Kernel code</div>
        <div className="deriv-step">
          Bs[threadRow][threadCol] = B[(tileIdx + threadRow) * N + ty]
        </div>
        <div className="deriv-label">
          Expand ty = blockIdx.y * BS + threadCol
        </div>
        <div className="deriv-step">
          = B[({tileIdx} + r) * {N} + {bc}*{BS} + c]
        </div>
        <div className="deriv-label">Simplify</div>
        <div className="deriv-step">
          = B[({tileIdx} + r) * {N} + {bc * BS} + c]
        </div>
        <div className="deriv-label">Read as 2D indexing: B[row][col]</div>
        <div className="deriv-step">
          = B[<span className="deriv-highlight">{tileIdx}+r</span>][
          <span className="deriv-highlight">{bc * BS}+c</span>]
        </div>
        <div className="deriv-label">Meaning</div>
        <div className="deriv-step" style={{ fontFamily: 'var(--font-sans)' }}>
          Row from <span className="deriv-highlight">tile position</span> (rows{' '}
          {tileIdx}–{tileIdx + BS - 1})
          <br />
          Col from <span className="deriv-highlight">block position</span> (cols{' '}
          {bc * BS}–{bc * BS + BS - 1})
        </div>
      </>
    ),
  };
}

function makeLoadStep(tileK) {
  const tileNum = tileK;
  const stepId = `load${tileK}`;

  return {
    id: stepId,
    cellClass: makeCellClass(stepId),
    sharedMemory: makeSharedMemory(stepId),
    showResult: false,
    description: (block) => {
      const [br, bc] = block;
      const ti = tileK * BS;
      return (
        <>
          <b>K-tile {tileNum}: cooperative load.</b>
          {tileK === 1 && ' Next slice along K.'}
          <br />
          Each thread loads one element into As and Bs.
          <br />
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Click an expression below to see the derivation.
          </span>
        </>
      );
    },
    extraContent: (block, onShowDeriv) => {
      const [br, bc] = block;
      const r0 = br * BS, c0 = bc * BS, ti = tileK * BS;
      return (
        <>
          <br />
          <span className="deriv-link" onClick={() => onShowDeriv('A')}>
            As[r][c] = A[{r0}+r][{ti}+c]
          </span>
          <br />
          <span className="deriv-link" onClick={() => onShowDeriv('B')}>
            Bs[r][c] = B[{ti}+r][{c0}+c]
          </span>
        </>
      );
    },
    derivPopup: (which, block) => derivContent(which, block, tileK),
  };
}

const steps = [
  {
    id: 'grid',
    cellClass: makeCellClass('grid'),
    sharedMemory: null,
    showResult: false,
    description: (block) => {
      const [br, bc] = block;
      const r0 = br * BS, c0 = bc * BS;
      return (
        <>
          <b>Grid decomposition.</b> Block ({br},{bc}) → output rows {r0}–
          {r0 + BS - 1}, cols {c0}–{c0 + BS - 1}. {BS * BS} threads
          decomposed: <code>threadRow = threadIdx.x/{BS}</code>,{' '}
          <code>threadCol = threadIdx.x%{BS}</code>.
        </>
      );
    },
  },
  makeLoadStep(0),
  {
    id: 'accum0',
    cellClass: makeCellClass('accum0'),
    sharedMemory: makeSharedMemory('accum0'),
    showResult: false,
    description: (block, A, B) => {
      const [br, bc] = block;
      const r0 = br * BS, c0 = bc * BS;
      const lines = [];
      for (let tr = 0; tr < BS; tr++)
        for (let tc = 0; tc < BS; tc++) {
          const v =
            A[r0 + tr][0] * B[0][c0 + tc] + A[r0 + tr][1] * B[1][c0 + tc];
          lines.push(
            `tmp[${tr}][${tc}] += ${A[r0 + tr][0]}×${B[0][c0 + tc]}+${A[r0 + tr][1]}×${B[1][c0 + tc]} = ${v}`
          );
        }
      return (
        <>
          <b>K-tile 0: accumulate from SMEM.</b>
          <br />
          <code>
            {lines.map((l, i) => (
              <span key={i}>
                {l}
                <br />
              </span>
            ))}
          </code>
          <code>__syncthreads()</code>
        </>
      );
    },
  },
  makeLoadStep(1),
  {
    id: 'accum1',
    cellClass: makeCellClass('accum1'),
    sharedMemory: makeSharedMemory('accum1'),
    showResult: false,
    description: (block, A, B) => {
      const [br, bc] = block;
      const r0 = br * BS, c0 = bc * BS;
      const lines = [];
      for (let tr = 0; tr < BS; tr++)
        for (let tc = 0; tc < BS; tc++) {
          const prev =
            A[r0 + tr][0] * B[0][c0 + tc] + A[r0 + tr][1] * B[1][c0 + tc];
          const add =
            A[r0 + tr][2] * B[2][c0 + tc] + A[r0 + tr][3] * B[3][c0 + tc];
          lines.push(`tmp[${tr}][${tc}] = ${prev}+${add} = ${prev + add}`);
        }
      return (
        <>
          <b>K-tile 1: accumulate.</b> Completes the dot product.
          <br />
          <code>
            {lines.map((l, i) => (
              <span key={i}>
                {l}
                <br />
              </span>
            ))}
          </code>
          K exhausted (2 tiles × {BS} = {K}).
        </>
      );
    },
  },
  {
    id: 'write',
    cellClass: makeCellClass('write'),
    sharedMemory: null,
    showResult: true,
    description: (block, A, B, C) => {
      const [br, bc] = block;
      const r0 = br * BS, c0 = bc * BS;
      return (
        <>
          <b>Write output.</b> Each thread writes tmp to{' '}
          <code>
            C[{r0}+row][{c0}+col]
          </code>
          .<br />
          Result: [{C[r0].slice(c0, c0 + BS).join(',')},{' '}
          {C[r0 + 1].slice(c0, c0 + BS).join(',')}].
        </>
      );
    },
  },
];

export default {
  id: 'smem-tiling',
  title: 'SMEM Tiling GEMM — 4×4 matrices, BLOCK_SIZE=2',
  codeLines,
  stepHighlights,
  steps,
  hasBlocks: true,
};
