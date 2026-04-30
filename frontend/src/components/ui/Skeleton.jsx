// ─── Skeleton primitives ──────────────────────────────────────────────────────

export function SkeletonBox({ width = '100%', height = 14, radius = 6, style = {} }) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius: radius, flexShrink: 0, ...style }}
    />
  );
}

// ─── KPI card skeleton ────────────────────────────────────────────────────────
export function KPICardSkeleton() {
  return (
    <div className="kpi-card" style={{ '--kpi-color': '#6366f1' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <SkeletonBox width={42} height={42} radius={10} />
        <SkeletonBox width={52} height={22} radius={20} />
      </div>
      <SkeletonBox height={28} width="55%" style={{ marginBottom: 10 }} />
      <SkeletonBox height={13} width="80%" style={{ marginBottom: 6 }} />
      <SkeletonBox height={11} width="45%" />
    </div>
  );
}

// ─── Chart card skeleton ──────────────────────────────────────────────────────
export function ChartCardSkeleton({ height = 260 }) {
  return (
    <div className="chart-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <SkeletonBox width={160} height={18} />
        <SkeletonBox width={80} height={14} />
      </div>
      <SkeletonBox height={height} radius={10} />
    </div>
  );
}

// ─── Table skeleton ───────────────────────────────────────────────────────────
export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="table-card">
      <table className="data-table">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, j) => (
              <th key={j}><SkeletonBox height={10} width={j === 0 ? 100 : 70} /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              {Array.from({ length: cols }).map((_, j) => (
                <td key={j}><SkeletonBox height={13} width={j === 0 ? '75%' : '55%'} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Page header skeleton ─────────────────────────────────────────────────────
export function PageHeaderSkeleton() {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <SkeletonBox width={220} height={26} style={{ marginBottom: 10 }} />
        <SkeletonBox width={140} height={14} />
      </div>
      <SkeletonBox width={140} height={38} radius={10} />
    </div>
  );
}
