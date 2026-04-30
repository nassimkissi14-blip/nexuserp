import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit2, ChevronDown, ChevronRight, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import { gpaoAPI } from '../../api/client.js';
import apiClient from '../../api/client.js';

const fmtH = h => h != null ? `${Number(h).toFixed(1)}h` : '—';

const PHASE_DEFAULTS = { sequence: 1, name: '', workCenterId: '', setupTime: 0, machineTime: 0, laborTime: 0, transferTime: 0, notes: '' };

function PhaseRow({ phase, idx, onChange, onRemove, workCenters }) {
  const set = (k, v) => onChange(idx, { ...phase, [k]: v });
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 180px 70px 70px 70px 70px 36px', gap: 6, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <input className="form__input" type="number" value={phase.sequence} min={1} onChange={e => set('sequence', +e.target.value)} style={{ textAlign: 'center', padding: '4px 6px' }} />
      <input className="form__input" value={phase.name} onChange={e => set('name', e.target.value)} placeholder="Nom de la phase" style={{ padding: '4px 8px' }} />
      <select className="form__input" value={phase.workCenterId} onChange={e => set('workCenterId', e.target.value)} style={{ padding: '4px 6px' }}>
        <option value="">— Poste —</option>
        {workCenters.map(wc => <option key={wc.id} value={wc.id}>{wc.code} – {wc.name}</option>)}
      </select>
      {['setupTime', 'machineTime', 'laborTime', 'transferTime'].map(k => (
        <input key={k} className="form__input" type="number" value={phase[k]} min={0} step={0.1} onChange={e => set(k, +e.target.value)} style={{ padding: '4px 6px', textAlign: 'center' }} />
      ))}
      <button className="icon-btn icon-btn--danger" onClick={() => onRemove(idx)} title="Supprimer"><Trash2 size={13} /></button>
    </div>
  );
}

function RoutingModal({ routing, workCenters, products, onClose, onSave, loading }) {
  const [form, setForm] = useState({
    code: routing?.code || '',
    name: routing?.name || '',
    productId: routing?.productId || '',
    isActive: routing?.isActive ?? true,
    phases: routing?.phases?.map(p => ({ ...p })) || [],
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const addPhase = () => setForm(f => ({ ...f, phases: [...f.phases, { ...PHASE_DEFAULTS, sequence: f.phases.length + 1 }] }));
  const updatePhase = (i, p) => setForm(f => { const phases = [...f.phases]; phases[i] = p; return { ...f, phases }; });
  const removePhase = (i) => setForm(f => ({ ...f, phases: f.phases.filter((_, idx) => idx !== i) }));

  const totalTime = form.phases.reduce((s, p) => s + +p.setupTime + +p.machineTime + +p.laborTime + +p.transferTime, 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 900, width: '95vw' }} onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h3><Settings size={16} style={{ display: 'inline', marginRight: 8 }} />{routing ? `Modifier — ${routing.name}` : 'Nouvelle gamme'}</h3>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="modal__body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, marginBottom: 16 }}>
            <div className="form-group">
              <label>Code *</label>
              <input className="form__input" value={form.code} onChange={e => set('code', e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Intitulé *</label>
              <input className="form__input" value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Article lié</label>
              <select className="form__input" value={form.productId} onChange={e => set('productId', e.target.value)}>
                <option value="">— Aucun —</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.sku} – {p.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ justifyContent: 'flex-end', display: 'flex', flexDirection: 'column' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} />
                Active
              </label>
            </div>
          </div>

          <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <strong style={{ fontSize: 14 }}>Phases opératoires ({form.phases.length}) — Total : {fmtH(totalTime)}</strong>
            <button className="btn btn--primary" style={{ padding: '5px 12px', fontSize: 12 }} onClick={addPhase}>
              <Plus size={13} /> Ajouter une phase
            </button>
          </div>

          <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '0 8px', marginBottom: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 180px 70px 70px 70px 70px 36px', gap: 6, padding: '6px 0', borderBottom: '2px solid var(--border)', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
              <span style={{ textAlign: 'center' }}>Séq.</span>
              <span>Désignation</span>
              <span>Poste</span>
              <span style={{ textAlign: 'center' }}>Réglage</span>
              <span style={{ textAlign: 'center' }}>Machine</span>
              <span style={{ textAlign: 'center' }}>MO</span>
              <span style={{ textAlign: 'center' }}>Transit</span>
              <span />
            </div>
            {form.phases.length === 0 && (
              <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Aucune phase — cliquez sur « Ajouter »</div>
            )}
            {form.phases.map((p, i) => (
              <PhaseRow key={i} phase={p} idx={i} onChange={updatePhase} onRemove={removePhase} workCenters={workCenters} />
            ))}
          </div>

          <div className="form-actions">
            <button className="btn btn--ghost" onClick={onClose}>Annuler</button>
            <button className="btn btn--primary" disabled={loading || !form.code || !form.name} onClick={() => onSave(form)}>
              {loading ? 'Enregistrement…' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RoutingCard({ routing, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const total = routing.phases?.reduce((s, p) => s + (p.setupTime || 0) + (p.machineTime || 0) + (p.laborTime || 0) + (p.transferTime || 0), 0) || 0;

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <span style={{ color: 'var(--text-muted)' }}>{open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 13, background: 'var(--bg)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border)' }}>{routing.code}</span>
          <span style={{ fontWeight: 600 }}>{routing.name}</span>
          {!routing.isActive && <span style={{ fontSize: 11, background: '#ef444422', color: '#ef4444', padding: '1px 6px', borderRadius: 4 }}>Inactif</span>}
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-muted)' }}>
          <span>{routing.phases?.length || 0} phase(s)</span>
          <span>Temps total : {fmtH(total)}</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
          <button className="icon-btn" onClick={() => onEdit(routing)} title="Modifier"><Edit2 size={14} /></button>
          <button className="icon-btn icon-btn--danger" onClick={() => { if (window.confirm(`Supprimer la gamme ${routing.code} ?`)) onDelete(routing.id); }} title="Supprimer"><Trash2 size={14} /></button>
        </div>
      </div>

      {open && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px', background: 'var(--bg)' }}>
          {!routing.phases?.length ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Aucune phase définie</div>
          ) : (
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                  <th style={{ textAlign: 'left', padding: '4px 8px' }}>Séq.</th>
                  <th style={{ textAlign: 'left', padding: '4px 8px' }}>Phase</th>
                  <th style={{ textAlign: 'left', padding: '4px 8px' }}>Poste</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px' }}>Réglage</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px' }}>Machine</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px' }}>MO</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px' }}>Transit</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {routing.phases.map(p => {
                  const tot = (p.setupTime || 0) + (p.machineTime || 0) + (p.laborTime || 0) + (p.transferTime || 0);
                  return (
                    <tr key={p.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '6px 8px', textAlign: 'center', color: 'var(--text-muted)' }}>{p.sequence}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 500 }}>{p.name}</td>
                      <td style={{ padding: '6px 8px', color: 'var(--text-muted)' }}>{p.workCenter ? `${p.workCenter.code} – ${p.workCenter.name}` : '—'}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>{fmtH(p.setupTime)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>{fmtH(p.machineTime)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>{fmtH(p.laborTime)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>{fmtH(p.transferTime)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{fmtH(tot)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default function RoutingsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null); // null | 'new' | routing object

  const { data: routingsData, isLoading } = useQuery({ queryKey: ['gpao-routings'], queryFn: () => gpaoAPI.routings().then(r => r.data) });
  const { data: wcData } = useQuery({ queryKey: ['workcenters'], queryFn: () => apiClient.get('/production/workcenters').then(r => r.data) });
  const { data: prodData } = useQuery({ queryKey: ['products-gpao'], queryFn: () => apiClient.get('/products').then(r => r.data) });

  const routings = routingsData || [];
  const workCenters = wcData || [];
  const products = Array.isArray(prodData) ? prodData : (prodData?.data || []);

  const saveMut = useMutation({
    mutationFn: (form) => modal?.id ? gpaoAPI.updateRouting(modal.id, form) : gpaoAPI.createRouting(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gpao-routings'] }); setModal(null); toast.success('Gamme sauvegardée'); },
    onError: e => toast.error(e?.message || 'Erreur'),
  });
  const deleteMut = useMutation({
    mutationFn: gpaoAPI.deleteRouting,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gpao-routings'] }); toast.success('Gamme supprimée'); },
    onError: e => toast.error(e?.message || 'Erreur'),
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">⚙️ Gammes de fabrication</h1>
          <p className="page-subtitle">{routings.length} gamme(s) — définit les phases et temps opératoires</p>
        </div>
        <button className="btn btn--primary" onClick={() => setModal('new')}><Plus size={16} /> Nouvelle gamme</button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Chargement…</div>
      ) : routings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 48 }}>⚙️</div>
          <p>Aucune gamme définie. Créez votre première gamme de fabrication.</p>
        </div>
      ) : (
        <div>
          {routings.map(r => (
            <RoutingCard key={r.id} routing={r} onEdit={r => setModal(r)} onDelete={id => deleteMut.mutate(id)} />
          ))}
        </div>
      )}

      {modal && (
        <RoutingModal
          routing={modal === 'new' ? null : modal}
          workCenters={workCenters}
          products={products}
          onClose={() => setModal(null)}
          onSave={form => saveMut.mutate(form)}
          loading={saveMut.isPending}
        />
      )}
    </div>
  );
}
