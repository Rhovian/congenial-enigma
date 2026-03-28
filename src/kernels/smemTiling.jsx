import { A, B, BS, K, N } from '../data/matrices';

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
          <div className="deriv-label">General row-major formula</div>
          <div className="deriv-step">
            A[<span className="deriv-highlight">row</span> * num_cols + <span className="deriv-highlight">col</span>]
          </div>

          <div className="deriv-label">Kernel code</div>
          <div className="deriv-step">
            As[threadRow][threadCol] = A[tx * K + tileIdx + threadCol]
          </div>

          <div className="deriv-label">Mapping — working right to left</div>
          <div className="deriv-step" style={{ fontFamily: 'var(--font-sans)' }}>
            <span className="deriv-highlight">row = tx</span> — the global row this thread is responsible for.
            The stride is K ({K}) — the number of columns in A (since A is M×K).
            So tx * K gets you to the start of row tx in the flat array.
            <br /><br />
            <span className="deriv-highlight">col = tileIdx + threadCol</span> — within that row,
            tileIdx ({tileIdx}) is where the current tile starts along K,
            and threadCol is this thread's position within the tile.
          </div>

          <div className="deriv-label">Substituting for block ({br},{bc})</div>
          <div className="deriv-step">
            row = tx = blockIdx.x * BS + threadRow = {br}*{BS} + r = <span className="deriv-highlight">{br*BS}+r</span>
          </div>
          <div className="deriv-step">
            col = tileIdx + threadCol = <span className="deriv-highlight">{tileIdx}+c</span>
          </div>

          <div className="deriv-label">Result</div>
          <div className="deriv-step">
            As[r][c] = A[<span className="deriv-highlight">{br*BS}+r</span>][<span className="deriv-highlight">{tileIdx}+c</span>]
            {' '}→ rows {br*BS}–{br*BS+BS-1}, cols {tileIdx}–{tileIdx+BS-1}
          </div>
        </>
      ),
    };
  }

  return {
    title: 'Bs load derivation',
    body: (
      <>
        <div className="deriv-label">General row-major formula</div>
        <div className="deriv-step">
          B[<span className="deriv-highlight">row</span> * num_cols + <span className="deriv-highlight">col</span>]
        </div>

        <div className="deriv-label">Kernel code</div>
        <div className="deriv-step">
          Bs[threadRow][threadCol] = B[(tileIdx + threadRow) * N + ty]
        </div>

        <div className="deriv-label">Mapping — working right to left</div>
        <div className="deriv-step" style={{ fontFamily: 'var(--font-sans)' }}>
          <span className="deriv-highlight">row = tileIdx + threadRow</span> — the row comes from the tile position along K ({tileIdx}),
          offset by this thread's row within the tile.
          The stride is N ({N}) — the number of columns in B (since B is K×N).
          <br /><br />
          <span className="deriv-highlight">col = ty</span> — the global column this thread is responsible for.
          ty = blockIdx.y * BS + threadCol, so the column comes from the block's horizontal position.
        </div>

        <div className="deriv-label">Substituting for block ({br},{bc})</div>
        <div className="deriv-step">
          row = tileIdx + threadRow = <span className="deriv-highlight">{tileIdx}+r</span>
        </div>
        <div className="deriv-step">
          col = ty = blockIdx.y * BS + threadCol = {bc}*{BS} + c = <span className="deriv-highlight">{bc*BS}+c</span>
        </div>

        <div className="deriv-label">Result</div>
        <div className="deriv-step">
          Bs[r][c] = B[<span className="deriv-highlight">{tileIdx}+r</span>][<span className="deriv-highlight">{bc*BS}+c</span>]
          {' '}→ rows {tileIdx}–{tileIdx+BS-1}, cols {bc*BS}–{bc*BS+BS-1}
        </div>
      </>
    ),
  };
}

function accumDerivContent(block, tileK) {
  const [br, bc] = block;
  const r0 = br * BS, c0 = bc * BS;
  const kS = tileK * BS;

  // Build the example for thread (0,0)
  const asVals = Array.from({ length: BS }, (_, c) => A[r0][kS + c]);
  const bsVals = Array.from({ length: BS }, (_, r) => B[kS + r][c0]);
  const terms = asVals.map((a, i) => ({ a, b: bsVals[i] }));
  const result = terms.reduce((sum, t) => sum + t.a * t.b, 0);

  return {
    title: `Accumulate derivation — K-tile ${tileK}`,
    body: (
      <>
        <div className="deriv-label">Kernel code</div>
        <div className="deriv-step">
          {'for (int i = 0; i < BLOCK_SIZE; i++)'}<br />
          {'  tmp += As[threadRow][i] * Bs[i][threadCol];'}
        </div>

        <div className="deriv-label">What this does</div>
        <div className="deriv-step" style={{ fontFamily: 'var(--font-sans)' }}>
          Each thread computes a partial dot product from shared memory.
          Thread (threadRow, threadCol) reads its <span className="deriv-highlight">row</span> from
          As and its <span className="deriv-highlight">column</span> from Bs,
          iterating over the shared dimension (i = 0..{BS - 1}).
        </div>

        <div className="deriv-label">As and Bs contents (block {br},{bc}, tile {tileK})</div>
        <div className="deriv-step" style={{ fontFamily: 'var(--font-sans)' }}>
          As = A[rows {r0}–{r0 + BS - 1}][cols {kS}–{kS + BS - 1}]<br />
          Bs = B[rows {kS}–{kS + BS - 1}][cols {c0}–{c0 + BS - 1}]
        </div>

        <div className="deriv-label">Example: thread (0,0) → tmp[0][0]</div>
        <div className="deriv-step">
          {terms.map((t, i) => (
            <span key={i}>
              {i > 0 && ' + '}
              As[0][{i}] * Bs[{i}][0] = <span className="deriv-highlight">{t.a}×{t.b}</span>
            </span>
          ))}
          {' = '}<span className="deriv-highlight">{result}</span>
        </div>

        <div className="deriv-label">All threads in this block</div>
        {Array.from({ length: BS }, (_, tr) =>
          Array.from({ length: BS }, (_, tc) => {
            const vals = Array.from({ length: BS }, (_, i) => ({
              a: A[r0 + tr][kS + i],
              b: B[kS + i][c0 + tc],
            }));
            const sum = vals.reduce((s, v) => s + v.a * v.b, 0);
            return (
              <div className="deriv-step" key={`${tr}-${tc}`}>
                tmp[{tr}][{tc}] += {vals.map((v, i) => (
                  <span key={i}>{i > 0 && '+'}{v.a}×{v.b}</span>
                ))} = <span className="deriv-highlight">{sum}</span>
              </div>
            );
          })
        )}
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
    description: () => {
      return (
        <>
          <b>Grid decomposition.</b> Single block (0,0) covers the entire 2×2
          output. {BS * BS} threads decomposed:{' '}
          <code>threadRow = threadIdx.x/{BS}</code>,{' '}
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
            `tmp[${tr}][${tc}] = ${A[r0 + tr][0]}×${B[0][c0 + tc]}+${A[r0 + tr][1]}×${B[1][c0 + tc]} = ${v}`
          );
        }
      return (
        <>
          <b>Accumulate from SMEM.</b> Completes the dot product (single tile
          covers all of K={K}).
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
          <br />
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Click below to see how tmp is computed.
          </span>
        </>
      );
    },
    extraContent: (block, onShowDeriv) => (
      <>
        <br />
        <span className="deriv-link" onClick={() => onShowDeriv('accum')}>
          How is tmp accumulated from As and Bs?
        </span>
      </>
    ),
    derivPopup: (which, block) => accumDerivContent(block, 0),
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
  title: 'SMEM Tiling GEMM',
  codeLines,
  stepHighlights,
  steps,
  hasBlocks: false,
};
