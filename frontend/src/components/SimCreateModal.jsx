import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { useSimModalStore } from '../store/index.js';
import apiClient from '../api/client.js';

const OPTIONS = [
  { value: 'ARENA',            label: '🔴  Arena Simulation'            },
  { value: 'FLEXSIM',          label: '🔵  FlexSim'                     },
  { value: 'PLANT_SIMULATION', label: '🟢  Tecnomatix Plant Simulation' },
  { value: 'CUSTOM',           label: '🟣  Source personnalisée'        },
];

export default function SimCreateModal() {
  const { open, hide } = useSimModalStore();
  const [newSim, setNewSim] = useState({ name: '', software: 'ARENA' });
  const qc = useQueryClient();

  const createMut = useMutation({
    mutationFn: (body) => apiClient.post('/iot/simulations', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sim-sessions'] });
      hide();
      setNewSim({ name: '', software: 'ARENA' });
      toast.success('Session créée');
    },
    onError: () => toast.error('Erreur lors de la création'),
  });

  if (!open) return null;

  return (
    /* Full-screen overlay — click outside closes */
    <div
      onClick={hide}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        padding: 16,
        boxSizing: 'border-box',
      }}
    >
      {/* Modal box — stop click from bubbling to backdrop */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0a1228',
          border: '1px solid #1e3a5f',
          borderRadius: 16,
          padding: 24,
          width: '100%',
          maxWidth: 420,
          color: '#f0f4ff',
          boxShadow: '0 32px 80px rgba(0,0,0,0.95)',
          boxSizing: 'border-box',
        }}
      >
        <p style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700, color: '#f0f4ff' }}>
          Nouvelle session de simulation
        </p>

        <label style={{ fontSize: 11, color: '#4a5568', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
          Nom
        </label>
        <input
          autoFocus
          value={newSim.name}
          onChange={e => setNewSim(p => ({ ...p, name: e.target.value }))}
          onKeyDown={e => { if (e.key === 'Enter' && newSim.name) createMut.mutate(newSim); }}
          placeholder="Ex: Simulation Ligne A"
          style={{
            display: 'block', width: '100%',
            margin: '6px 0 16px',
            padding: '10px 12px',
            background: '#060d1f', border: '1px solid #1e2d4a',
            borderRadius: 8, color: '#f0f4ff', fontSize: 13,
            outline: 'none', boxSizing: 'border-box',
          }}
        />

        <label style={{ fontSize: 11, color: '#4a5568', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
          Logiciel
        </label>
        <select
          value={newSim.software}
          onChange={e => setNewSim(p => ({ ...p, software: e.target.value }))}
          style={{
            display: 'block', width: '100%',
            margin: '6px 0 24px',
            padding: '10px 12px',
            background: '#060d1f', border: '1px solid #1e2d4a',
            borderRadius: 8, color: '#f0f4ff', fontSize: 13,
            outline: 'none', boxSizing: 'border-box', cursor: 'pointer',
          }}
        >
          {OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={hide}
            style={{
              flex: 1, padding: '11px 0',
              background: 'rgba(255,255,255,0.04)', border: '1px solid #1e2d4a',
              borderRadius: 8, color: '#8899bb', cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
            }}
          >
            Annuler
          </button>
          <button
            onClick={() => createMut.mutate(newSim)}
            disabled={!newSim.name || createMut.isPending}
            style={{
              flex: 1, padding: '11px 0',
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              border: 'none', borderRadius: 8,
              color: '#fff', cursor: newSim.name ? 'pointer' : 'not-allowed',
              fontSize: 13, fontWeight: 700,
              opacity: !newSim.name ? 0.5 : 1,
            }}
          >
            {createMut.isPending ? 'Création…' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}
