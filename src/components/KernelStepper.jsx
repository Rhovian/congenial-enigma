import { useState, useEffect, useCallback } from 'react';
import { A, B, C_ref, BS, M } from '../data/matrices';
import MatrixGrid from './MatrixGrid';
import SmemGrid from './SmemGrid';
import CodePanel from './CodePanel';
import DerivPopup from './DerivPopup';

export default function KernelStepper({ kernel }) {
  const { codeLines, stepHighlights, steps, hasBlocks = true } = kernel;
  const stepCount = steps.length;

  const [block, setBlock] = useState([0, 0]);
  const [step, setStep] = useState(0);
  const [derivPopup, setDerivPopup] = useState(null);

  const [br, bc] = block;

  // Reset step when kernel changes
  useEffect(() => {
    setStep(0);
    setBlock([0, 0]);
    setDerivPopup(null);
  }, [kernel]);

  const go = useCallback(
    (d) => {
      setStep((s) => Math.max(0, Math.min(stepCount - 1, s + d)));
      setDerivPopup(null);
    },
    [stepCount]
  );

  const pickBlock = useCallback((r, c) => {
    setBlock([r, c]);
    setDerivPopup(null);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Escape') setDerivPopup(null);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [go]);

  const currentStep = steps[step];
  const cellClass = (mat, r, c) => currentStep.cellClass(mat, r, c, block);
  const sharedMem = currentStep.sharedMemory
    ? currentStep.sharedMemory(block, A, B)
    : null;
  const showC = currentStep.showResult;
  const CD = showC
    ? C_ref
    : Array.from({ length: M }, () => Array(M).fill('·'));

  const derivContent = derivPopup && currentStep.derivPopup
    ? currentStep.derivPopup(derivPopup, block)
    : null;

  return (
    <>
      <div className="main">
        <div className="viz">
          {hasBlocks && (
            <div className="block-pick">
              <span>Block:</span>
              {[0, 1].map((i) =>
                [0, 1].map((j) => (
                  <button
                    key={`${i}-${j}`}
                    style={
                      i === br && j === bc
                        ? {
                            background: 'var(--info)',
                            color: '#fff',
                            borderColor: 'var(--info)',
                          }
                        : undefined
                    }
                    onClick={() => pickBlock(i, j)}
                  >
                    ({i},{j})
                  </button>
                ))
              )}
            </div>
          )}

          <div className="section-label">Global memory</div>
          <div className="matrices">
            <div className="mat-group">
              <div className="mat-title">A</div>
              <MatrixGrid mat="A" data={A} cellClass={cellClass} size={M} />
            </div>
            <div
              style={{
                fontSize: '14px',
                marginTop: '28px',
                color: 'var(--text-secondary)',
              }}
            >
              ×
            </div>
            <div className="mat-group">
              <div className="mat-title">B</div>
              <MatrixGrid mat="B" data={B} cellClass={cellClass} size={M} />
            </div>
            <div
              style={{
                fontSize: '14px',
                marginTop: '28px',
                color: 'var(--text-secondary)',
              }}
            >
              =
            </div>
            <div className="mat-group">
              <div className="mat-title">C</div>
              <MatrixGrid mat="C" data={CD} cellClass={cellClass} size={M} />
            </div>
          </div>

          {sharedMem && (
            <>
              <div className="arrow-label">↓ cooperative load ↓</div>
              <div className="section-label">
                Shared memory (block {br},{bc})
              </div>
              <div className="smem-row">
                {sharedMem.map((sm) => (
                  <SmemGrid
                    key={sm.label}
                    label={sm.label}
                    cls={sm.cls}
                    data={sm.data}
                  />
                ))}
              </div>
            </>
          )}

          <div className="step-nav">
            <button
              className="nav-btn"
              onClick={() => go(-1)}
              disabled={step === 0}
            >
              ← Prev
            </button>
            <div className="step-dots">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`dot ${i === step ? 'active' : ''}`}
                />
              ))}
            </div>
            <button
              className="nav-btn"
              onClick={() => go(1)}
              disabled={step === stepCount - 1}
            >
              Next →
            </button>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--text-secondary)',
                marginLeft: '4px',
              }}
            >
              {step + 1}/{stepCount}
            </span>
          </div>

          <div className="step-desc">
            {currentStep.description(block, A, B, C_ref)}
            {currentStep.extraContent &&
              currentStep.extraContent(block, setDerivPopup)}
          </div>

          <div className="legend">
            <div className="legend-item">
              <div
                className="legend-swatch"
                style={{ background: '#EEEDFE', borderColor: '#AFA9EC' }}
              />
              A slice
            </div>
            <div className="legend-item">
              <div
                className="legend-swatch"
                style={{ background: '#E1F5EE', borderColor: '#5DCAA5' }}
              />
              B slice
            </div>
            <div className="legend-item">
              <div
                className="legend-swatch"
                style={{ background: '#FAEEDA', borderColor: '#FAC775' }}
              />
              C region
            </div>
          </div>
        </div>

        <CodePanel
          codeLines={codeLines}
          highlightedLines={stepHighlights[step]}
        />
      </div>

      {derivContent && (
        <DerivPopup
          title={derivContent.title}
          onClose={() => setDerivPopup(null)}
        >
          {derivContent.body}
        </DerivPopup>
      )}
    </>
  );
}
