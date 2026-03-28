export default function MatrixGrid({ mat, data, cellClass, size = 4 }) {
  const cells = [];
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      cells.push(
        <div key={`${r}-${c}`} className={`cell ${cellClass(mat, r, c)}`}>
          {data[r][c]}
        </div>
      );
  return <div className={`mat-grid g${size}`}>{cells}</div>;
}
