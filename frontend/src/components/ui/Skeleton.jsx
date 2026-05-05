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

// ─── Simple stat card skeleton (borderTop style) ──────────────────────────────
export function StatCardSkeleton() {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderTop: '3px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
      <SkeletonBox width={28} height={28} radius={6} style={{ marginBottom: 10 }} />
      <SkeletonBox height={24} width="60%" style={{ marginBottom: 8 }} />
      <SkeletonBox height={12} width="75%" />
    </div>
  );
}

// ─── Stat card grid (3 or 4 cols) ─────────────────────────────────────────────
export function StatCardGridSkeleton({ cols = 3 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 14 }}>
      {Array.from({ length: cols }).map((_, i) => <StatCardSkeleton key={i} />)}
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

// ─── Card grid skeleton (clients, produits en cards) ─────────────────────────
export function CardGridSkeleton({ count = 6, minWidth = 280 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))`, gap: 16 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <SkeletonBox width={44} height={44} radius={22} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <SkeletonBox height={14} width="70%" style={{ marginBottom: 6 }} />
              <SkeletonBox height={11} width="45%" />
            </div>
            <SkeletonBox width={60} height={22} radius={20} />
          </div>
          <SkeletonBox height={11} width="80%" style={{ marginBottom: 6 }} />
          <SkeletonBox height={11} width="55%" style={{ marginBottom: 16 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <SkeletonBox height={32} radius={8} style={{ flex: 1 }} />
            <SkeletonBox height={32} radius={8} style={{ flex: 1 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── List row skeleton (employés, demandes, etc.) ─────────────────────────────
export function ListSkeleton({ rows = 5 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <SkeletonBox width={44} height={44} radius={22} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <SkeletonBox height={14} width="40%" style={{ marginBottom: 6 }} />
            <SkeletonBox height={11} width="60%" />
          </div>
          <SkeletonBox width={70} height={24} radius={20} />
          <SkeletonBox width={80} height={32} radius={8} />
        </div>
      ))}
    </div>
  );
}

// ─── Kanban column skeleton ───────────────────────────────────────────────────
export function KanbanSkeleton({ cols = 4 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 14 }}>
      {Array.from({ length: cols }).map((_, ci) => (
        <div key={ci}>
          <SkeletonBox height={38} radius={8} style={{ marginBottom: 10 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array.from({ length: 3 - (ci % 2) }).map((_, ri) => (
              <div key={ri} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 9, padding: 14 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <SkeletonBox width={34} height={34} radius={17} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <SkeletonBox height={13} width="75%" style={{ marginBottom: 5 }} />
                    <SkeletonBox height={11} width="50%" />
                  </div>
                </div>
                <SkeletonBox height={11} width="85%" style={{ marginBottom: 5 }} />
                <SkeletonBox height={28} radius={6} style={{ marginTop: 8 }} />
              </div>
            ))}
          </div>
        </div>
      ))}
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

// ─── Full page skeleton (header + stat cards + table) ─────────────────────────
export function PageSkeleton({ statCols = 3, tableRows = 6, tableCols = 5 }) {
  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeaderSkeleton />
      <StatCardGridSkeleton cols={statCols} />
      <TableSkeleton rows={tableRows} cols={tableCols} />
    </div>
  );
}
