export default function SmemGrid({ label, cls, data }) {
  const rows = data.length;
  const cols = data[0].length;
  const cells = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      cells.push(
        <div key={`${r}-${c}`} className={`cell ${cls}`}>
          {data[r][c]}
        </div>
      );
  return (
    <div className="mat-group">
      <div className="mat-title">{label}</div>
      <div className={`mat-grid g${cols}`}>{cells}</div>
    </div>
  );
}
