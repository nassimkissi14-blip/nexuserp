import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { analyticsAPI } from '../../api/client.js';
import { TrendingUp, TrendingDown, Minus, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

function useCountUp(target, duration = 1200) {
  const [val, setVal] = useState(0);
  const raf = useRef(null);
  const t0  = useRef(null);
  useEffect(() => {
    if (target === undefined) return;
    t0.current = null;
    const from = val;
    const tick = (ts) => {
      if (!t0.current) t0.current = ts;
      const p = Math.min((ts - t0.current) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(from + (target - from) * e));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target]);
  return val;
}

// Animated SVG arc gauge
function ArcGauge({ score, grade }) {
  const animated = useCountUp(score);
  const R = 70;
  const CX = 90, CY = 90;
  const startAngle = -210;
  const endAngle   = 30;
  const totalArc   = endAngle - startAngle; // 240 deg
  const pct = Math.min(animated / 100, 1);
  const ang = startAngle + totalArc * pct;

  const toRad = (d) => (d * Math.PI) / 180;
  const arcPath = (sa, ea) => {
    const x1 = CX + R * Math.cos(toRad(sa));
    const y1 = CY + R * Math.sin(toRad(sa));
    const x2 = CX + R * Math.cos(toRad(ea));
    const y2 = CY + R * Math.sin(toRad(ea));
    const large = Math.abs(ea - sa) > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`;
  };

  const color = score >= 85 ? '#10b981' : score >= 70 ? '#3b82f6' : score >= 55 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444';
  const gradId = `hs-grad-${grade}`;

  return (
    <svg width={180} height={130} viewBox="0 0 180 130">
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
      </defs>
      {/* Track */}
      <path d={arcPath(startAngle, endAngle)} fill="none" stroke="#1e2d4a" strokeWidth={10} strokeLinecap="round" />
      {/* Fill */}
      <path d={arcPath(startAngle, ang)} fill="none" stroke={`url(#${gradId})`} strokeWidth={10} strokeLinecap="round" />
      {/* Glow dot at tip */}
      <circle
        cx={CX + R * Math.cos(toRad(ang))}
        cy={CY + R * Math.sin(toRad(ang))}
        r={6}
        fill={color}
        style={{ filter: `drop-shadow(0 0 6px ${color})` }}
      />
      {/* Score text */}
      <text x={CX} y={CY + 6} textAnchor="middle" fill="#f0f4ff" fontSize={32} fontWeight={800} fontFamily="Inter, sans-serif">
        {animated}
      </text>
      <text x={CX} y={CY + 24} textAnchor="middle" fill="#4a5568" fontSize={11} fontFamily="Inter, sans-serif">
        /100
      </text>
    </svg>
  );
}

export default function HealthScoreWidget() {
  const [expanded, setExpanded] = useState(false);
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['health-score'],
    queryFn: () => analyticsAPI.healthScore().then(r => r.data),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const score = data?.score ?? 0;
  const grade = data?.grade ?? '—';
  const trend = data?.trend ?? 'stable';
  const components = data?.components ?? [];

  const color = score >= 85 ? '#10b981' : score >= 70 ? '#3b82f6' : score >= 55 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444';
  const gradeLabel = { A: 'Excellent', B: 'Bon', C: 'Correct', D: 'À surveiller', F: 'Critique' }[grade] || '';

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#6b7280';

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0a1228 0%, #0d1b35 100%)',
      border: `1px solid ${color}33`,
      borderRadius: 16,
      padding: '20px 24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Top glow */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
      <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`, pointerEvents: 'none' }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1 }}>Score Santé Entreprise</span>
            <motion.button
              whileHover={{ rotate: 180 }} transition={{ duration: 0.4 }}
              onClick={() => refetch()}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3d5068', padding: 0, display: 'flex' }}
            >
              <RefreshCw size={12} style={{ opacity: isRefetching ? 1 : 0.6 }} />
            </motion.button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 40, fontWeight: 900, color, lineHeight: 1 }}>{grade}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#c5d0e8' }}>{gradeLabel}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <TrendIcon size={13} color={trendColor} />
                <span style={{ fontSize: 11, color: trendColor, fontWeight: 600 }}>
                  {trend === 'up' ? 'En hausse' : trend === 'down' ? 'En baisse' : 'Stable'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div style={{ width: 180, height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${color}33`, borderTopColor: color, animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          <ArcGauge score={score} grade={grade} />
        )}
      </div>

      {/* Components bar */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#4a5568', fontSize: 11, fontWeight: 600, padding: 0 }}
      >
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        Détail des composantes
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {components.map(c => {
                const cColor = c.score >= 85 ? '#10b981' : c.score >= 70 ? '#3b82f6' : c.score >= 55 ? '#f59e0b' : '#ef4444';
                return (
                  <div key={c.key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11.5, color: '#8899bb' }}>{c.icon} {c.label}</span>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: cColor }}>{c.score}</span>
                    </div>
                    <div style={{ height: 4, background: '#1e2d4a', borderRadius: 4, overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${c.score}%` }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        style={{ height: '100%', background: cColor, borderRadius: 4 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
