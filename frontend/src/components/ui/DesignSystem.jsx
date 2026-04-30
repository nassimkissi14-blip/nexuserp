/**
 * NexusERP Design System — Premium Edition
 * Framer Motion integrated: Btn, Modal, KpiCard, PageHeader
 */
import { X, AlertTriangle, CheckCircle, Info, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Shared variants ──────────────────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] } },
};
const kpiStagger = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.07 } },
};
const modalOverlay = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.18 } },
  exit:   { opacity: 0, transition: { duration: 0.15 } },
};
const modalPanel = {
  hidden: { opacity: 0, scale: 0.95, y: 16 },
  show:   { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 360, damping: 28 } },
  exit:   { opacity: 0, scale: 0.96, y: 10, transition: { duration: 0.16 } },
};

/* ─────────────────────────────────────────────
   FIELD — labeled wrapper for inputs/selects
───────────────────────────────────────────── */
export function Field({ label, children, span }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 0, gridColumn: span ? `span ${span}` : undefined }}>
      <span className="form__label">{label}</span>
      {children}
    </label>
  );
}

/* ─────────────────────────────────────────────
   INPUT
───────────────────────────────────────────── */
export function Input({ ...props }) {
  return <input className="form__input" {...props} />;
}

/* ─────────────────────────────────────────────
   SELECT
───────────────────────────────────────────── */
export function Select({ children, ...props }) {
  return (
    <select className="form__input" {...props}>
      {children}
    </select>
  );
}

/* ─────────────────────────────────────────────
   TEXTAREA
───────────────────────────────────────────── */
export function Textarea({ rows = 3, ...props }) {
  return <textarea className="form__input" rows={rows} {...props} />;
}

/* ─────────────────────────────────────────────
   BTN — Framer Motion whileTap press
   variant: 'primary' | 'secondary' | 'danger' | 'warning' | 'success' | 'ghost'
───────────────────────────────────────────── */
export function Btn({ variant = 'secondary', size, icon, loading, children, ...props }) {
  const cls = ['btn', `btn--${variant}`, size === 'sm' ? 'btn--sm' : ''].filter(Boolean).join(' ');
  const { onClick, disabled, style, title, type } = props;
  const rest = { onClick, disabled: disabled || loading, style, title, type };

  return (
    <motion.button
      className={cls}
      whileHover={!disabled && !loading ? { y: variant === 'primary' || variant === 'success' || variant === 'danger' ? -1.5 : 0, scale: variant === 'secondary' || variant === 'ghost' ? 1.02 : 1 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.96 } : {}}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      {...rest}
    >
      {loading
        ? <span style={{ width: 13, height: 13, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .6s linear infinite', display: 'inline-block' }} />
        : icon}
      {children}
    </motion.button>
  );
}

/* ─────────────────────────────────────────────
   MODAL — AnimatePresence glassmorphism
───────────────────────────────────────────── */
export function Modal({ title, onClose, children, width = 600, open = true }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-overlay"
          variants={modalOverlay}
          initial="hidden"
          animate="show"
          exit="exit"
          onClick={onClose}
          style={{ animation: 'none' }}
        >
          <motion.div
            className="modal"
            variants={modalPanel}
            initial="hidden"
            animate="show"
            exit="exit"
            style={{ maxWidth: width, animation: 'none' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal__header">
              <h3>{title}</h3>
              <motion.button
                className="modal__close"
                onClick={onClose}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <X size={15} />
              </motion.button>
            </div>
            <div className="modal__body">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────────
   FORM GRID — 2-column grid for forms
───────────────────────────────────────────── */
export function FormGrid({ children, cols = 2 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 14 }}>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────
   FORM ACTIONS — right-aligned button row
───────────────────────────────────────────── */
export function FormActions({ children }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────
   BADGE — colored status pill
───────────────────────────────────────────── */
export function Badge({ color = '#64748b', children, dot }) {
  return (
    <span className="erp-badge" style={{ background: color + '22', color }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block' }} />}
      {children}
    </span>
  );
}

/* ─────────────────────────────────────────────
   STATUS BADGE — looks up from a map
───────────────────────────────────────────── */
export function StatusBadge({ map, value }) {
  const s = map[value] || { label: value, color: '#64748b' };
  return <Badge color={s.color} dot>{s.label}</Badge>;
}

/* ─────────────────────────────────────────────
   PAGE HEADER — Framer Motion entrance
───────────────────────────────────────────── */
export function PageHeader({ icon, title, subtitle, actions }) {
  return (
    <motion.div
      className="erp-page-header"
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="erp-page-header__left">
        <h1>{icon && <span style={{ marginRight: 8 }}>{icon}</span>}{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && (
        <motion.div
          className="erp-page-header__actions"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.28, delay: 0.08, ease: [0.4, 0, 0.2, 1] }}
        >
          {actions}
        </motion.div>
      )}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   KPI CARD — Framer Motion stagger child
───────────────────────────────────────────── */
export function KpiCard({ icon, label, value, sub, color = 'var(--accent-primary)', bar, barValue }) {
  return (
    <motion.div
      className="erp-kpi"
      style={{ '--kpi-color': color }}
      variants={fadeUp}
      whileHover={{ y: -3, transition: { type: 'spring', stiffness: 400, damping: 20 } }}
    >
      <div className="erp-kpi__icon" style={{ background: (color === 'var(--accent-primary)' ? '#6366f1' : color) + '22', color }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="erp-kpi__value" style={{ color }}>{value}</div>
        <div className="erp-kpi__label">{label}</div>
        {sub && <div className="erp-kpi__sub">{sub}</div>}
        {bar && (
          <div style={{ background: 'var(--border)', borderRadius: 99, height: 4, marginTop: 6, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(100, barValue || 0)}%`, background: color, borderRadius: 99, transition: 'width 1s ease' }} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   KPI GRID — stagger wrapper for KpiCard
───────────────────────────────────────────── */
export function KpiGrid({ children }) {
  return (
    <motion.div
      className="erp-kpi-grid"
      variants={kpiStagger}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   ALERT BANNER
───────────────────────────────────────────── */
const ALERT_ICONS = { danger: ShieldAlert, warning: AlertTriangle, info: Info, success: CheckCircle };
const ALERT_COLORS = { danger: '#ef4444', warning: '#f59e0b', info: '#6366f1', success: '#10b981' };

export function AlertBanner({ type = 'warning', title, children }) {
  const Icon = ALERT_ICONS[type];
  const color = ALERT_COLORS[type];
  return (
    <motion.div
      className={`erp-alert erp-alert--${type}`}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.24 }}
    >
      <Icon size={18} color={color} style={{ flexShrink: 0 }} />
      {title && <span style={{ color, fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{title}</span>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{children}</div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   EMPTY STATE — subtle bounce entrance
───────────────────────────────────────────── */
export function EmptyState({ icon, title, description, action }) {
  return (
    <motion.div
      className="empty-state-full"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.34, 1.2, 0.64, 1] }}
    >
      <motion.div
        className="empty-state-full__icon"
        animate={{ y: [0, -5, 0] }}
        transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
      >
        {icon}
      </motion.div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   PROGRESS BAR
───────────────────────────────────────────── */
export function ProgressBar({ value, max = 100, color = '#6366f1', height = 6 }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ background: 'var(--border)', borderRadius: 99, height, overflow: 'hidden' }}>
      <motion.div
        style={{ height: '100%', background: color, borderRadius: 99 }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   SECTION LABEL
───────────────────────────────────────────── */
export function SectionLabel({ children }) {
  return <div className="erp-section-label">{children}</div>;
}

/* ─────────────────────────────────────────────
   CARD
───────────────────────────────────────────── */
export function Card({ children, style, padding = '18px' }) {
  return (
    <motion.div
      className="erp-card"
      style={{ padding, ...style }}
      whileHover={{ y: -2, transition: { type: 'spring', stiffness: 400, damping: 22 } }}
    >
      {children}
    </motion.div>
  );
}
