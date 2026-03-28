import { useEffect, useRef } from 'react';

export default function CodePanel({ codeLines, highlightedLines }) {
  const panelRef = useRef(null);
  const hiSet = new Set(highlightedLines);

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
          {ln || ' '}
        </div>
      ))}
    </div>
  );
}
