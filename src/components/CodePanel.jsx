import { useEffect, useRef, useMemo } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';

// Extend cpp with CUDA keywords
Prism.languages.cuda = Prism.languages.extend('cpp', {});
Prism.languages.insertBefore('cuda', 'keyword', {
  'cuda-keyword': {
    pattern: /\b(?:__global__|__device__|__host__|__shared__|__constant__|__restrict__|__launch_bounds__|__syncthreads)\b/,
    alias: 'keyword',
  },
  'cuda-variable': {
    pattern: /\b(?:threadIdx|blockIdx|blockDim|gridDim|warpSize)\b/,
    alias: 'builtin',
  },
});

function highlightLine(text) {
  const html = Prism.highlight(text, Prism.languages.cuda, 'cuda');
  return { __html: html };
}

export default function CodePanel({ codeLines, highlightedLines }) {
  const panelRef = useRef(null);
  const hiSet = new Set(highlightedLines);

  const highlighted = useMemo(
    () => codeLines.map((ln) => (ln ? highlightLine(ln) : null)),
    [codeLines]
  );

  useEffect(() => {
    if (!panelRef.current || highlightedLines.length === 0) return;
    const first = highlightedLines[0];
    const el = panelRef.current.querySelector(`[data-line="${first}"]`);
    if (el) {
      const top = el.offsetTop - panelRef.current.offsetTop - 40;
      panelRef.current.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }
  }, [highlightedLines]);

  return (
    <div className="code-panel" ref={panelRef}>
      {codeLines.map((ln, i) => (
        <div
          key={i}
          data-line={i}
          className={`code-line ${hiSet.has(i) ? 'hi' : ''}`}
        >
          {highlighted[i] ? (
            <span dangerouslySetInnerHTML={highlighted[i]} />
          ) : (
            ' '
          )}
        </div>
      ))}
    </div>
  );
}
