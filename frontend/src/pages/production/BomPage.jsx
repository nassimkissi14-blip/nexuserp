import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Layers, Trash2, Edit2, Package, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../../api/client.js';
import AnimatedPage from '../../components/ui/AnimatedPage.jsx';
import {
  PageHeader, Btn, Modal, FormGrid, FormActions,
  Field, Input, Select, EmptyState, Badge, Card, SectionLabel
} from '../../components/ui/DesignSystem.jsx';

/* ── API ─────────────────────────────────────── */
const api = {
  bom:       ()       => apiClient.get('/production/bom'),
  createBom: (d)      => apiClient.post('/production/bom', d),
  updateBom: (id, d)  => apiClient.patch(`/production/bom/${id}`, d),
  deleteBom: (id)     => apiClient.delete(`/production/bom/${id}`),
  products:  ()       => apiClient.get('/products'),
};

/* ── BOM FORM MODAL ─────────────────────────── */
function BomModal({ bom, products, onClose, onSave, loading }) {
  const [form, setForm] = useState({
    productId: bom?.productId || '',
    version:   bom?.version   || '1.0',
    isActive:  bom?.isActive  ?? true,
    items: bom?.items?.map(i => ({
      productId: i.productId || i.componentId || '',
      quantity:  i.quantity  || 1,
      unit:      i.unit      || 'pcs',
    })) || [],
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const addItem = () => setForm(f => ({
    ...f, items: [...f.items, { productId: '', quantity: 1, unit: 'pcs' }]
  }));
  const removeItem = i => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const setItem = (i, k, v) => setForm(f => {
    const items = [...f.items]; items[i] = { ...items[i], [k]: v }; return { ...f, items };
  });

  const prods = products?.data || products || [];

  return (
    <Modal title={bom ? `Modifier — ${bom.product?.name}` : 'Nouvelle nomenclature (BOM)'} onClose={onClose} width={700}>
      <FormGrid cols={2}>
        <Field label="Produit fini *" span={2}>
          <Select value={form.productId} onChange={e => set('productId', e.target.value)}>
            <option value="">Sélectionner un produit…</option>
            {prods.map(p => <option key={p.id} value={p.id}>{p.name}{p.reference ? ` — ${p.reference}` : ''}</option>)}
          </Select>
        </Field>
        <Field label="Version">
          <Input value={form.version} onChange={e => set('version', e.target.value)} placeholder="1.0" />
        </Field>
        <Field label="Statut">
          <Select value={form.isActive ? 'true' : 'false'} onChange={e => set('isActive', e.target.value === 'true')}>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </Select>
        </Field>
      </FormGrid>

      {/* Composants */}
      <div className="form-section">
        <div className="form-section__title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Composants ({form.items.length})</span>
          <Btn variant="secondary" size="sm" icon={<Plus size={12} />} onClick={addItem}>Ajouter</Btn>
        </div>

        {form.items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: 13, border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
            Aucun composant — cliquez "Ajouter" pour commencer
          </div>
        )}

        {form.items.map((item, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'end' }}>
            <Field label={i === 0 ? 'Composant' : ''}>
              <Select value={item.productId} onChange={e => setItem(i, 'productId', e.target.value)}>
                <option value="">— Choisir —</option>
                {prods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
            <Field label={i === 0 ? 'Quantité' : ''}>
              <Input type="number" value={item.quantity} onChange={e => setItem(i, 'quantity', e.target.value)} min="0.001" step="0.001" />
            </Field>
            <Field label={i === 0 ? 'Unité' : ''}>
              <Input value={item.unit} onChange={e => setItem(i, 'unit', e.target.value)} placeholder="pcs" />
            </Field>
            <button
              onClick={() => removeItem(i)}
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--accent-danger)', cursor: 'pointer', padding: '10px 8px', marginTop: i === 0 ? 17 : 0 }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <FormActions>
        <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
        <Btn variant="primary" loading={loading} onClick={() => onSave(form)}>
          {bom ? 'Enregistrer' : 'Créer la nomenclature'}
        </Btn>
      </FormActions>
    </Modal>
  );
}

/* ── BOM DETAIL CARD ────────────────────────── */
function BomCard({ bom, onEdit, onDelete, onToggle }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card style={{ cursor: 'default' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 3 }}>
            {bom.product?.name || '—'}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>v{bom.version}</span>
            <Badge color={bom.isActive ? '#10b981' : '#64748b'}>
              {bom.isActive ? 'Active' : 'Inactive'}
            </Badge>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {bom.items?.length || 0} composant{(bom.items?.length || 0) !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <Btn variant="secondary" size="sm" icon={<Edit2 size={12} />} onClick={onEdit} />
          <Btn variant="secondary" size="sm" icon={<Trash2 size={12} />} onClick={onDelete}
            style={{ color: 'var(--accent-danger)' }} />
        </div>
      </div>

      {/* Composants preview */}
      {(bom.items || []).length > 0 && (
        <>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
            {(expanded ? bom.items : bom.items.slice(0, 3)).map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < (expanded ? bom.items.length - 1 : Math.min(2, bom.items.length - 1)) ? '1px solid var(--border)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Package size={12} color="var(--text-muted)" />
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {item.component?.name || item.product?.name || '—'}
                  </span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                  {item.quantity} {item.unit}
                </span>
              </div>
            ))}
          </div>
          {bom.items.length > 3 && (
            <button
              onClick={() => setExpanded(x => !x)}
              style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: 12, marginTop: 8, padding: 0 }}
            >
              {expanded ? '▲ Réduire' : `▼ +${bom.items.length - 3} composant${bom.items.length - 3 > 1 ? 's' : ''}`}
            </button>
          )}
        </>
      )}
    </Card>
  );
}

/* ── MAIN PAGE ──────────────────────────────── */
export default function BomPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);

  const inv = () => qc.invalidateQueries({ queryKey: ['prod-bom'] });

  const { data: bomRes, isLoading } = useQuery({ queryKey: ['prod-bom'], queryFn: api.bom });
  const { data: prodRes }           = useQuery({ queryKey: ['products'],  queryFn: api.products });

  const boms     = bomRes?.data  || [];
  const products = prodRes?.data || prodRes || [];

  const createBom = useMutation({
    mutationFn: api.createBom,
    onSuccess: () => { inv(); setModal(null); toast.success('Nomenclature créée'); },
    onError:   e  => toast.error(e.response?.data?.message || 'Erreur création'),
  });
  const updateBom = useMutation({
    mutationFn: ({ id, data }) => api.updateBom(id, data),
    onSuccess: () => { inv(); setModal(null); toast.success('Nomenclature mise à jour'); },
    onError:   e  => toast.error(e.response?.data?.message || 'Erreur mise à jour'),
  });
  const deleteBom = useMutation({
    mutationFn: api.deleteBom,
    onSuccess: () => { inv(); toast.success('Nomenclature supprimée'); },
    onError:   e  => toast.error(e.response?.data?.message || 'Erreur suppression'),
  });

  const active   = boms.filter(b => b.isActive).length;
  const inactive = boms.filter(b => !b.isActive).length;
  const totalComponents = boms.reduce((s, b) => s + (b.items?.length || 0), 0);

  return (
    <AnimatedPage>
      <div className="erp-page">

        <PageHeader
          icon="📋"
          title="Nomenclatures (BOM)"
          subtitle="Bill of Materials — définissez la composition de chaque produit fini"
          actions={
            <Btn variant="primary" icon={<Plus size={14} />} onClick={() => setModal({ type: 'create' })}>
              Nouvelle nomenclature
            </Btn>
          }
        />

        {/* KPIs */}
        <div className="erp-kpi-grid">
          {[
            { icon: <Layers size={18} />, label: 'Total BOM',     value: boms.length,      sub: 'nomenclatures enregistrées', color: '#6366f1' },
            { icon: <CheckCircle size={18} />, label: 'Actives',  value: active,           sub: 'utilisées en production',    color: '#10b981' },
            { icon: <Package size={18} />, label: 'Composants',   value: totalComponents,  sub: 'matières et sous-ensembles', color: '#f59e0b' },
            { icon: <Layers size={18} />,  label: 'Inactives',    value: inactive,         sub: 'archivées / brouillons',     color: '#64748b' },
          ].map((k, i) => (
            <div key={i} className="erp-kpi" style={{ '--kpi-color': k.color }}>
              <div className="erp-kpi__icon" style={{ background: k.color + '22', color: k.color }}>{k.icon}</div>
              <div>
                <div className="erp-kpi__value" style={{ color: k.color }}>{k.value}</div>
                <div className="erp-kpi__label">{k.label}</div>
                <div className="erp-kpi__sub">{k.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="dashboard-loading">
            <div className="spinner" />
            <span>Chargement des nomenclatures…</span>
          </div>
        ) : boms.length === 0 ? (
          <EmptyState
            icon="📋"
            title="Aucune nomenclature"
            description="Définissez la composition de vos produits finis en créant votre première BOM."
            action={<Btn variant="primary" icon={<Plus size={14} />} onClick={() => setModal({ type: 'create' })}>Créer la première BOM</Btn>}
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
            {boms.map(bom => (
              <BomCard
                key={bom.id}
                bom={bom}
                onEdit={() => setModal({ type: 'edit', data: bom })}
                onDelete={() => {
                  if (confirm(`Supprimer la nomenclature "${bom.product?.name}" v${bom.version} ?`)) {
                    deleteBom.mutate(bom.id);
                  }
                }}
              />
            ))}
          </div>
        )}

        {/* Modals */}
        {(modal?.type === 'create' || modal?.type === 'edit') && (
          <BomModal
            bom={modal.data}
            products={products}
            loading={createBom.isPending || updateBom.isPending}
            onClose={() => setModal(null)}
            onSave={(form) => {
              if (modal.data) updateBom.mutate({ id: modal.data.id, data: form });
              else createBom.mutate(form);
            }}
          />
        )}
      </div>
    </AnimatedPage>
  );
}
