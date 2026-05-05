import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, Info } from 'lucide-react';

/* ── ConfirmModal ─────────────────────────────────────────────── */
export function ConfirmModal({ open, title, message, confirmLabel = 'Confirmer', cancelLabel = 'Annuler', variant = 'danger', onConfirm, onCancel }) {
  if (!open) return null;

  const colors = {
    danger:  { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.25)',  btn: '#ef4444',  icon: <Trash2 size={22} color="#ef4444" /> },
    warning: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', btn: '#f59e0b',  icon: <AlertTriangle size={22} color="#f59e0b" /> },
    info:    { bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.25)', btn: 'var(--accent-primary)', icon: <Info size={22} color="#6366f1" /> },
  };
  const c = colors[variant] || colors.danger;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        onClick={onCancel}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 28 } }}
          exit={{ opacity: 0, scale: 0.94, y: 10 }}
          onClick={e => e.stopPropagation()}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '28px 28px 24px', maxWidth: 400, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
        >
          {/* Icon */}
          <div style={{ width: 52, height: 52, borderRadius: 14, background: c.bg, border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
            {c.icon}
          </div>

          {/* Title */}
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>{title}</div>

          {/* Message */}
          {message && (
            <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>{message}</div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn--ghost" onClick={onCancel} style={{ minWidth: 90 }}>{cancelLabel}</button>
            <button
              className="btn"
              onClick={onConfirm}
              style={{ background: c.btn, color: 'white', border: 'none', minWidth: 110, fontWeight: 600 }}
            >
              {confirmLabel}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ── useConfirm hook ──────────────────────────────────────────── */
export function useConfirm() {
  const [state, setState] = useState({ open: false, title: '', message: '', confirmLabel: 'Confirmer', cancelLabel: 'Annuler', variant: 'danger' });
  const resolveRef = useRef(null);

  const confirm = useCallback(({ title, message, confirmLabel, cancelLabel, variant = 'danger' }) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ open: true, title, message, confirmLabel: confirmLabel || 'Confirmer', cancelLabel: cancelLabel || 'Annuler', variant });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setState(s => ({ ...s, open: false }));
    resolveRef.current?.(true);
  }, []);

  const handleCancel = useCallback(() => {
    setState(s => ({ ...s, open: false }));
    resolveRef.current?.(false);
  }, []);

  const modal = (
    <ConfirmModal
      open={state.open}
      title={state.title}
      message={state.message}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      variant={state.variant}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  return { confirm, modal };
}
