import { useState, useRef } from 'react';
import { Plus, Mail, Phone, Briefcase, Calendar, X, ChevronRight, Upload, FileText, Download, Eye, Edit2 } from 'lucide-react';
import { KanbanSkeleton } from '../../components/ui/Skeleton.jsx';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recruitmentAPI, uploadCandidateCV } from '../../api/client.js';
import toast from 'react-hot-toast';
import { useConfirm } from '../../components/ui/ConfirmModal.jsx';

/* ─── Config ──────────────────────────────────────────────────── */
const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'https://nexuserp-pupi.onrender.com';

const STAGES = [
  { key: 'APPLIED',   label: 'Candidatures', color: '#6366f1', icon: '📨', next: 'INTERVIEW', nextLabel: '→ Entretien' },
  { key: 'INTERVIEW', label: 'Entretiens',   color: '#f59e0b', icon: '🎤', next: 'OFFER',     nextLabel: '→ Offre' },
  { key: 'OFFER',     label: 'Offres',       color: '#10b981', icon: '📋', next: 'HIRED',     nextLabel: '→ Embauché' },
  { key: 'HIRED',     label: 'Embauchés',    color: '#06b6d4', icon: '✅', next: null,         nextLabel: null },
];

const JOBS = [
  'Développeur Full Stack', 'Responsable Commercial', 'Comptable',
  'Ingénieur Production', 'Chargé RH', 'Technicien IT',
  'Responsable Marketing', 'Analyste Financier', 'Chef de Projet',
  'Technicien de Maintenance', 'Opérateur de Production', 'Responsable Qualité',
  'Ingénieur Biomédical', 'Technicien Stérilisation', 'Responsable Logistique',
];

const EMPTY_FORM = { name: '', position: '', email: '', phone: '', note: '', stage: 'APPLIED' };
const EMPTY_HIRE = { department: 'Production', salary: '', hireDate: new Date().toISOString().split('T')[0], contractType: 'CDI' };

/* ─── Modal ───────────────────────────────────────────────────── */
const Modal = ({ title, onClose, children, wide }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal" style={{ maxWidth: wide ? 620 : 520 }} onClick={e => e.stopPropagation()}>
      <div className="modal__header">
        <h3>{title}</h3>
        <button className="modal__close" onClick={onClose}><X size={16} /></button>
      </div>
      <div className="modal__body">{children}</div>
    </div>
  </div>
);

/* ─── CV Uploader ─────────────────────────────────────────────── */
function CVUploader({ candidateId, currentCv, onUploaded }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { toast.error('Seuls les fichiers PDF sont acceptés'); return; }
    setUploading(true);
    try {
      const res = await uploadCandidateCV(candidateId, file);
      toast.success('CV téléchargé ✅');
      onUploaded(res.cvUrl || res.data?.cvUrl);
    } catch (err) {
      toast.error(err?.message || 'Erreur upload');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const cvUrl = currentCv ? `${BASE_URL}${currentCv}` : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8 }}>CV (PDF)</div>

      {cvUrl ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8 }}>
          <FileText size={18} color="#6366f1" />
          <span style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>CV disponible</span>
          <a href={cvUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>
            <Eye size={13} /> Voir
          </a>
          <a href={cvUrl} download style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#10b981', fontWeight: 600, textDecoration: 'none' }}>
            <Download size={13} /> DL
          </a>
          <button onClick={() => fileRef.current?.click()} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0 4px', fontSize: 11 }} title="Remplacer">↺</button>
        </div>
      ) : (
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--bg-primary)', border: '1px dashed var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, fontFamily: 'inherit', transition: 'all .15s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
          {uploading ? '⏳ Téléchargement…' : <><Upload size={14} /> Joindre un CV (PDF max 10 MB)</>}
        </button>
      )}

      <input ref={fileRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════ */
export default function RecruitmentPage() {
  const queryClient = useQueryClient();
  const { confirm, modal: confirmModal } = useConfirm();
  const [modal, setModal]       = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [hireModal, setHireModal] = useState(null);
  const [hireForm, setHireForm]   = useState(EMPTY_HIRE);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setE = (k, v) => setEditForm(f => ({ ...f, [k]: v }));

  const openEdit = (candidate) => {
    setEditForm({ name: candidate.name, position: candidate.position, email: candidate.email || '', phone: candidate.phone || '', note: candidate.note || '' });
    setEditMode(true);
  };

  const closeModal = () => { setModal(null); setEditMode(false); };

  /* ── Fetch candidates ── */
  const { data, isLoading } = useQuery({
    queryKey: ['candidates'],
    queryFn: () => recruitmentAPI.getAll(),
  });
  const candidates = data?.data || [];
  const byStage = (key) => candidates.filter(c => c.stage === key);

  /* ── Mutations ── */
  const createMutation = useMutation({
    mutationFn: recruitmentAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      setModal(null);
      setForm(EMPTY_FORM);
      toast.success('✅ Candidat ajouté');
    },
    onError: (err) => toast.error(err?.message || 'Erreur'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => recruitmentAPI.update(id, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      toast.success('Candidat mis à jour');
      setEditMode(false);
      // refresh modal data
      if (res?.data) setModal(res.data);
    },
    onError: (err) => toast.error(err?.message || 'Erreur'),
  });

  const deleteMutation = useMutation({
    mutationFn: recruitmentAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      closeModal();
      toast.success('Candidature supprimée');
    },
    onError: (err) => toast.error(err?.message || 'Erreur'),
  });

  /* ── Actions ── */
  const advance = (candidate, nextStage) => {
    if (nextStage === 'HIRED') {
      setHireModal(candidate);
      setHireForm({ ...EMPTY_HIRE, hireDate: new Date().toISOString().split('T')[0] });
      closeModal();
      return;
    }
    updateMutation.mutate({ id: candidate.id, data: { stage: nextStage } });
    const label = STAGES.find(s => s.key === nextStage)?.label;
    toast.success(`Candidat avancé → ${label}`);
    closeModal();
  };

  const hireMutation = useMutation({
    mutationFn: ({ id, data }) => recruitmentAPI.hire(id, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setHireModal(null);
      toast.success(`✅ ${res.message || 'Employé créé avec succès'}`);
    },
    onError: (err) => toast.error(err?.message || 'Erreur lors de la conversion'),
  });

  const reject = async (candidate) => {
    const ok = await confirm({ title: 'Supprimer la candidature ?', message: `La candidature de ${candidate.name} sera définitivement supprimée.`, confirmLabel: 'Supprimer', variant: 'danger' });
    if (ok) deleteMutation.mutate(candidate.id);
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    createMutation.mutate({ name: form.name, position: form.position, email: form.email, phone: form.phone, note: form.note, stage: form.stage });
  };

  const updateCvInModal = (cvUrl) => {
    // Refresh query so Kanban cards update too
    queryClient.invalidateQueries({ queryKey: ['candidates'] });
    // Update modal locally for instant feedback
    setModal(prev => prev && typeof prev === 'object' ? { ...prev, cvUrl } : prev);
  };

  const total     = candidates.length;
  const hired     = byStage('HIRED').length;
  const inProcess = candidates.filter(c => c.stage !== 'HIRED').length;

  return (
    <div className="page">

      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1 className="page-title">🔍 Recrutement</h1>
          <p className="page-subtitle">{total} candidats · {inProcess} en cours · {hired} embauchés</p>
        </div>
        <button className="btn btn--primary" onClick={() => { setForm(EMPTY_FORM); setModal('create'); }}>
          <Plus size={16} /> Nouveau candidat
        </button>
      </div>

      {/* KPI STRIP */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {STAGES.map(stage => (
          <div key={stage.key} style={{ background: 'var(--bg-card)', border: `1px solid var(--border)`, borderTop: `3px solid ${stage.color}`, borderRadius: 'var(--radius-lg)', padding: '14px 18px', cursor: 'pointer', transition: 'box-shadow .2s' }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 4px 20px ${stage.color}33`; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{stage.icon}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: stage.color, letterSpacing: -1 }}>{byStage(stage.key).length}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{stage.label}</div>
          </div>
        ))}
      </div>

      {/* KANBAN */}
      {isLoading ? (
        <KanbanSkeleton cols={4} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, alignItems: 'start' }}>
          {STAGES.map(stage => (
            <div key={stage.key}>
              {/* Column header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', background: stage.color + '15', border: `1px solid ${stage.color}30`, borderRadius: '10px 10px 0 0', borderBottom: `2px solid ${stage.color}` }}>
                <span style={{ fontWeight: 700, fontSize: 12.5, color: stage.color }}>{stage.icon} {stage.label}</span>
                <span style={{ background: stage.color + '30', color: stage.color, borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{byStage(stage.key).length}</span>
              </div>

              {/* Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0', minHeight: 120 }}>
                {byStage(stage.key).length === 0 ? (
                  <div style={{ padding: '20px 14px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, border: '1px dashed var(--border)', borderRadius: 8 }}>
                    Aucun candidat
                  </div>
                ) : byStage(stage.key).map(candidate => (
                  <div key={candidate.id} onClick={() => setModal(candidate)}
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 9, padding: '12px 14px', cursor: 'pointer', transition: 'border-color .15s, box-shadow .15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = stage.color; e.currentTarget.style.boxShadow = `0 4px 14px ${stage.color}20`; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: stage.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: stage.color, flexShrink: 0 }}>
                        {candidate.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{candidate.name}</div>
                        <div style={{ fontSize: 11, color: stage.color, display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                          <Briefcase size={10} /> {candidate.position}
                        </div>
                      </div>
                    </div>

                    {/* CV badge */}
                    {candidate.cvUrl && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#10b981', background: 'rgba(16,185,129,0.08)', padding: '3px 8px', borderRadius: 4, marginBottom: 6, width: 'fit-content' }}>
                        <FileText size={10} /> CV joint
                      </div>
                    )}

                    {candidate.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>
                        <Mail size={9} /> {candidate.email}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                      <Calendar size={9} /> {new Date(candidate.createdAt).toLocaleDateString('fr-FR')}
                    </div>

                    {candidate.note && (
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', background: 'var(--bg-hover)', padding: '5px 8px', borderRadius: 6, marginBottom: 8 }}>
                        {candidate.note}
                      </div>
                    )}

                    {stage.next && (
                      <button className="btn btn--ghost" style={{ width: '100%', fontSize: 11, padding: '5px 8px', justifyContent: 'center', color: stage.color, borderColor: stage.color + '44' }}
                        onClick={e => { e.stopPropagation(); advance(candidate, stage.next); }}>
                        <ChevronRight size={11} /> {stage.nextLabel}
                      </button>
                    )}
                    {stage.key === 'HIRED' && (
                      <button className="btn btn--primary" style={{ width: '100%', fontSize: 11, padding: '5px 8px', justifyContent: 'center', marginTop: 4 }}
                        onClick={e => { e.stopPropagation(); setHireModal(candidate); setHireForm({ ...EMPTY_HIRE, hireDate: new Date().toISOString().split('T')[0] }); }}>
                        👤 Créer fiche employé
                      </button>
                    )}
                  </div>
                ))}

                {stage.key === 'APPLIED' && (
                  <button className="btn btn--ghost" style={{ fontSize: 12, padding: '8px', justifyContent: 'center', borderStyle: 'dashed', color: 'var(--text-muted)' }}
                    onClick={() => { setForm(EMPTY_FORM); setModal('create'); }}>
                    <Plus size={13} /> Ajouter
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MODAL CRÉATION ───────────────────────────────────────── */}
      {modal === 'create' && (
        <Modal title="➕ Nouveau candidat" onClose={() => setModal(null)}>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Nom complet *</label>
                <input value={form.name} onChange={e => set('name', e.target.value)} required placeholder="Ex: Ahmed Benali" />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Poste visé *</label>
                <input list="jobs-list" value={form.position} onChange={e => set('position', e.target.value)} required placeholder="Saisir ou choisir un poste…" />
                <datalist id="jobs-list">
                  {JOBS.map(j => <option key={j} value={j} />)}
                </datalist>
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" />
              </div>
              <div className="form-group">
                <label>Téléphone</label>
                <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="06..." />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Note / Commentaire</label>
                <textarea value={form.note} onChange={e => set('note', e.target.value)} rows={3} placeholder="Observations sur le candidat…" style={{ resize: 'vertical' }} />
              </div>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 14 }}>
              💡 Vous pourrez joindre un CV après la création du candidat
            </p>
            <div className="form-actions">
              <button type="button" className="btn btn--ghost" onClick={() => setModal(null)}>Annuler</button>
              <button type="submit" className="btn btn--primary" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Ajout…' : 'Ajouter'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL DÉTAIL / ÉDITION CANDIDAT ─────────────────────── */}
      {modal && modal !== 'create' && (
        <Modal title={editMode ? `✏️ Modifier — ${modal.name}` : `👤 ${modal.name}`} onClose={closeModal} wide>

          {editMode ? (
            /* ── FORMULAIRE ÉDITION ── */
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Nom complet *</label>
                  <input value={editForm.name} onChange={e => setE('name', e.target.value)} placeholder="Nom complet" />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Poste visé *</label>
                  <input list="jobs-list-edit" value={editForm.position} onChange={e => setE('position', e.target.value)} placeholder="Saisir ou choisir un poste…" />
                  <datalist id="jobs-list-edit">
                    {JOBS.map(j => <option key={j} value={j} />)}
                  </datalist>
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={editForm.email} onChange={e => setE('email', e.target.value)} placeholder="email@example.com" />
                </div>
                <div className="form-group">
                  <label>Téléphone</label>
                  <input value={editForm.phone} onChange={e => setE('phone', e.target.value)} placeholder="06..." />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Étape</label>
                  <select value={editForm.stage || modal.stage} onChange={e => setE('stage', e.target.value)}>
                    {STAGES.map(s => <option key={s.key} value={s.key}>{s.icon} {s.label}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Note / Commentaire</label>
                  <textarea value={editForm.note} onChange={e => setE('note', e.target.value)} rows={3} style={{ resize: 'vertical' }} placeholder="Observations…" />
                </div>
              </div>
              <div className="form-actions">
                <button className="btn btn--ghost" onClick={() => setEditMode(false)}>Annuler</button>
                <button className="btn btn--primary" disabled={updateMutation.isPending || !editForm.name}
                  onClick={() => updateMutation.mutate({ id: modal.id, data: editForm })}>
                  {updateMutation.isPending ? 'Enregistrement…' : '💾 Enregistrer'}
                </button>
              </div>
            </div>
          ) : (
            /* ── VUE DÉTAIL ── */
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {/* Left — info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--bg-hover)', borderRadius: 8 }}>
                    <Briefcase size={15} style={{ color: 'var(--text-muted)' }} />
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Poste visé</div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{modal.position}</div>
                    </div>
                  </div>
                  {modal.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg-hover)', borderRadius: 8 }}>
                      <Mail size={13} style={{ color: 'var(--text-muted)' }} />
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Email</div>
                        <div style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{modal.email}</div>
                      </div>
                    </div>
                  )}
                  {modal.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg-hover)', borderRadius: 8 }}>
                      <Phone size={13} style={{ color: 'var(--text-muted)' }} />
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Téléphone</div>
                        <div style={{ fontSize: 12 }}>{modal.phone}</div>
                      </div>
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Étape actuelle</div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {STAGES.map(s => (
                        <div key={s.key} style={{ flex: 1, textAlign: 'center', padding: '5px 3px', borderRadius: 6, background: modal.stage === s.key ? s.color + '22' : 'var(--bg-hover)', border: `1px solid ${modal.stage === s.key ? s.color : 'var(--border)'}`, fontSize: 10, color: modal.stage === s.key ? s.color : 'var(--text-muted)', fontWeight: modal.stage === s.key ? 700 : 400 }}>
                          {s.icon}<br />{s.label}
                        </div>
                      ))}
                    </div>
                  </div>
                  {modal.note && (
                    <div style={{ padding: '10px 14px', background: 'var(--bg-hover)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                      💬 {modal.note}
                    </div>
                  )}
                </div>

                {/* Right — CV */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <CVUploader candidateId={modal.id} currentCv={modal.cvUrl} onUploaded={(url) => updateCvInModal(url)} />
                  {modal.cvUrl && (
                    <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', flex: 1, minHeight: 200 }}>
                      <iframe src={`${BASE_URL}${modal.cvUrl}`} style={{ width: '100%', height: 240, border: 'none', background: 'white' }} title="CV Preview" />
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, paddingTop: 16, marginTop: 4, borderTop: '1px solid var(--border)' }}>
                <button className="btn btn--ghost" style={{ flex: 1 }} onClick={() => openEdit(modal)}>
                  <Edit2 size={13} /> Modifier
                </button>
                {STAGES.find(s => s.key === modal.stage)?.next && (
                  <button className="btn btn--primary" style={{ flex: 1 }}
                    onClick={() => advance(modal, STAGES.find(s => s.key === modal.stage).next)}>
                    <ChevronRight size={14} /> {STAGES.find(s => s.key === modal.stage).nextLabel}
                  </button>
                )}
                {modal.stage === 'HIRED' && (
                  <button className="btn btn--primary" style={{ flex: 1, background: '#10b981', borderColor: '#10b981' }}
                    onClick={() => { setHireModal(modal); setHireForm({ ...EMPTY_HIRE, hireDate: new Date().toISOString().split('T')[0] }); closeModal(); }}>
                    👤 Créer fiche employé
                  </button>
                )}
                <button className="btn btn--ghost" style={{ flex: 1, color: '#ef4444', borderColor: '#ef444440' }}
                  onClick={() => reject(modal)}>
                  <X size={14} /> Supprimer
                </button>
              </div>
            </>
          )}
        </Modal>
      )}

      {/* ── MODAL CONVERSION EN EMPLOYÉ ──────────────────────────── */}
      {hireModal && (
        <Modal title={`👤 Créer la fiche de ${hireModal.name}`} onClose={() => setHireModal(null)}>
          <div style={{ marginBottom: 14, padding: '10px 14px', background: 'rgba(99,102,241,0.07)', borderRadius: 8, fontSize: 13 }}>
            <strong>{hireModal.name}</strong> · {hireModal.position} · {hireModal.email || 'Pas d\'email'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label>Département *</label>
              <select value={hireForm.department} onChange={e => setHireForm(f => ({ ...f, department: e.target.value }))}>
                {['Direction','Ressources Humaines','Finance','CRM & Ventes','Production','Logistique','IT','Maintenance','Qualité'].map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Type de contrat</label>
              <select value={hireForm.contractType} onChange={e => setHireForm(f => ({ ...f, contractType: e.target.value }))}>
                {['CDI','CDD','INTERIM','STAGE','FREELANCE'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Salaire mensuel (DZD) *</label>
              <input type="number" min="0" value={hireForm.salary} onChange={e => setHireForm(f => ({ ...f, salary: e.target.value }))} placeholder="0" />
            </div>
            <div className="form-group">
              <label>Date d'embauche *</label>
              <input type="date" value={hireForm.hireDate} onChange={e => setHireForm(f => ({ ...f, hireDate: e.target.value }))} />
            </div>
          </div>
          <div className="form-actions" style={{ marginTop: 16 }}>
            <button className="btn btn--ghost" onClick={() => setHireModal(null)}>Annuler</button>
            <button className="btn btn--primary" disabled={hireMutation.isPending || !hireForm.salary}
              onClick={() => hireMutation.mutate({ id: hireModal.id, data: hireForm })}>
              {hireMutation.isPending ? 'Création…' : '✅ Créer l\'employé'}
            </button>
          </div>
        </Modal>
      )}
      {confirmModal}
    </div>
  );
}
