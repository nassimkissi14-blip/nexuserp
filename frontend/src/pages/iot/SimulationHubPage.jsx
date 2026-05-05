import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { io as socketIO } from 'socket.io-client';
import {
  Play, Pause, Square, Plus, ChevronDown, ChevronRight,
  Copy, Check, BarChart2,
  AlertTriangle, CheckCircle, Circle, X,
} from 'lucide-react';
import apiClient from '../../api/client.js';
import { toast } from 'react-hot-toast';
import { useSimModalStore } from '../../store/index.js';

/* ── API ─────────────────────────────────────────────────────────── */
const fetchSessions = () => apiClient.get('/iot/simulations').then(r => r.data);
const fetchEvents   = id => apiClient.get(`/iot/simulations/${id}/events`).then(r => r.data);

const SOFTWARE_CFG = {
  ARENA: {
    label: 'Arena Simulation',
    vendor: 'Rockwell Automation',
    color: '#ef4444',
    logo: '🔴',
    desc: 'Discret-event simulation. Export KPIs via Output Analyzer → webhook.',
    guide: [
      'Dans Arena : Model → Properties → Output Analysis',
      'Ajouter un "Web Hook" dans les Output Destinations',
      "URL : {BASE_URL}/iot/simulations/{SESSION_ID}/events",
      'Format : JSON avec champs eventType, data, simTime',
      'Lancer la simulation → les données arrivent en temps réel',
    ],
  },
  FLEXSIM: {
    label: 'FlexSim',
    vendor: 'FlexSim Software Products',
    color: '#3b82f6',
    logo: '🔵',
    desc: 'FlexSim REST API native. Connectez directement via le module HTTP.',
    guide: [
      'Dans FlexSim : Tools → REST API → Enable Server (port 8080)',
      'Créer un Global Table "WebhookConfig"',
      "Ajouter l'URL : {BASE_URL}/iot/simulations/{SESSION_ID}/events",
      'Dans OnModelStop / OnRunEnd : appeler sendHTTP(url, jsonData)',
      "Format données : { eventType: 'KPI_UPDATE', data: { throughput, utilization, ... }, simTime }",
    ],
  },
  PLANT_SIMULATION: {
    label: 'Tecnomatix Plant Simulation',
    vendor: 'Siemens',
    color: '#10b981',
    logo: '🟢',
    desc: 'Siemens Tecnomatix via OPC-UA ou SimTalk HTTP. Données production réelle.',
    guide: [
      'Dans Plant Simulation : Bibliothèque → OPC UA → OpcUaClient',
      "Configurer l'endpoint OPC-UA de NexusERP : opc.tcp://localhost:4840",
      'Mapper les variables SimTalk aux NodeId OPC-UA',
      'Alternativement : SimTalk → Internet.HTTPPost(url, json)',
      "URL cible : {BASE_URL}/iot/simulations/{SESSION_ID}/events",
    ],
  },
  CUSTOM: {
    label: 'Source personnalisée',
    vendor: 'REST / MQTT / OPC-UA',
    color: '#a855f7',
    logo: '🟣',
    desc: 'Tout logiciel ou capteur capable d\'envoyer des requêtes HTTP/REST.',
    guide: [
      "POST {BASE_URL}/iot/simulations/{SESSION_ID}/events",
      'Header: Authorization: Bearer {TOKEN}',
      'Body JSON: { eventType, data: { ...kpis }, simTime }',
      "Types d'événements : KPI_UPDATE, ENTITY_CREATED, RESOURCE_BUSY, ALERT, COMPLETED",
      'Réponse: { success: true, data: { id, ... } }',
    ],
  },
};

const STATUS_CFG = {
  IDLE:      { color: '#4a5568', label: 'En attente',  icon: Circle    },
  RUNNING:   { color: '#10b981', label: 'En cours',    icon: Play      },
  PAUSED:    { color: '#f59e0b', label: 'Pausé',       icon: Pause     },
  COMPLETED: { color: '#6366f1', label: 'Terminé',     icon: CheckCircle },
  ERROR:     { color: '#ef4444', label: 'Erreur',      icon: AlertTriangle },
};

/* ── Copy to clipboard ────────────────────────────────────────────── */
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <button onClick={copy}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#10b981' : '#4a5568', display: 'flex', padding: 2 }}>
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

/* ── Integration guide card ──────────────────────────────────────── */
function IntegrationCard({ software, sessionId }) {
  const [open, setOpen] = useState(false);
  const cfg = SOFTWARE_CFG[software];
  const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1');
  const webhookUrl = `${baseUrl}/iot/simulations/${sessionId || '{SESSION_ID}'}/events`;
  const token = localStorage.getItem('nexuserp_token') || '{TOKEN}';

  return (
    <div style={{ background: '#0a1228', border: `1px solid ${cfg.color}33`, borderRadius: 12, overflow: 'hidden' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', cursor: 'pointer' }}
        onClick={() => setOpen(o => !o)}
      >
        <span style={{ fontSize: 20 }}>{cfg.logo}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{cfg.label}</div>
          <div style={{ fontSize: 10.5, color: '#3d5068' }}>{cfg.vendor} · {cfg.desc.slice(0, 55)}…</div>
        </div>
        {open ? <ChevronDown size={14} color="#4a5568" /> : <ChevronRight size={14} color="#4a5568" />}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${cfg.color}22` }}>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '10px 0 12px' }}>{cfg.desc}</p>

              {/* Webhook URL */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10.5, color: '#3d5068', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>Endpoint Webhook</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#060d1f', border: '1px solid #1e2d4a', borderRadius: 8, padding: '8px 12px' }}>
                  <code style={{ flex: 1, fontSize: 10.5, color: cfg.color, wordBreak: 'break-all' }}>{webhookUrl}</code>
                  <CopyButton text={webhookUrl} />
                </div>
              </div>

              {/* Steps */}
              <div style={{ fontSize: 10.5, color: '#3d5068', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Étapes d'intégration</div>
              {cfg.guide.map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <span style={{ width: 18, height: 18, borderRadius: '50%', background: cfg.color + '22', color: cfg.color, fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontSize: 11.5, color: '#8899bb', lineHeight: 1.5 }}>
                    {step.replace('{BASE_URL}', baseUrl).replace('{SESSION_ID}', sessionId || '{SESSION_ID}').replace('{TOKEN}', token.slice(0, 20) + '…')}
                  </span>
                </div>
              ))}

              {/* Example payload */}
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 10.5, color: '#3d5068', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>Exemple de payload</div>
                <div style={{ position: 'relative' }}>
                  <pre style={{ background: '#060d1f', border: '1px solid #1e2d4a', borderRadius: 8, padding: '10px 12px', fontSize: 10.5, color: '#a5b4fc', overflow: 'auto', margin: 0 }}>
{`POST ${webhookUrl}
Authorization: Bearer ${token.slice(0, 20)}…

{
  "eventType": "KPI_UPDATE",
  "simTime": 3600,
  "data": {
    "throughput": 142,
    "utilization": 78.5,
    "wip": 23,
    "cycleTime": 25.3,
    "bottleneck": "Station_4"
  }
}`}
                  </pre>
                  <CopyButton text={`POST ${webhookUrl}\nAuthorization: Bearer ${token}\n\n{"eventType":"KPI_UPDATE","simTime":3600,"data":{"throughput":142,"utilization":78.5}}`} />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Session card ──────────────────────────────────────────────────── */
function SessionCard({ session, onAction, onSelect, isSelected }) {
  const cfg  = SOFTWARE_CFG[session.software] || SOFTWARE_CFG.CUSTOM;
  const sCfg = STATUS_CFG[session.status]     || STATUS_CFG.IDLE;
  const Icon = sCfg.icon;

  return (
    <motion.div
      layout
      whileHover={{ y: -2 }}
      onClick={() => onSelect(session)}
      style={{
        background: isSelected ? `${cfg.color}0d` : 'linear-gradient(135deg,#0a1228,#0d1b35)',
        border: `1px solid ${isSelected ? cfg.color : '#1e2d4a'}`,
        borderRadius: 14, padding: '16px 18px', cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 18 }}>{cfg.logo}</span>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: '#e2e8f0' }}>{session.name}</span>
          </div>
          <div style={{ fontSize: 11, color: '#3d5068' }}>{cfg.label}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
            <Icon size={11} color={sCfg.color} />
            <span style={{ fontSize: 11, fontWeight: 700, color: sCfg.color }}>{sCfg.label}</span>
            {session.startedAt && <span style={{ fontSize: 10, color: '#3d5068' }}>· {new Date(session.startedAt).toLocaleString('fr-FR')}</span>}
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
          {session.status === 'IDLE' && (
            <button onClick={() => onAction(session.id, 'RUNNING')}
              style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#10b981' }}>
              <Play size={13} />
            </button>
          )}
          {session.status === 'RUNNING' && (
            <>
              <button onClick={() => onAction(session.id, 'PAUSED')}
                style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#f59e0b' }}>
                <Pause size={13} />
              </button>
              <button onClick={() => onAction(session.id, 'COMPLETED')}
                style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444' }}>
                <Square size={13} />
              </button>
            </>
          )}
          {session.status === 'PAUSED' && (
            <button onClick={() => onAction(session.id, 'RUNNING')}
              style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#10b981' }}>
              <Play size={13} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Event stream panel ───────────────────────────────────────────── */
function EventStream({ session }) {
  const [liveEvents, setLiveEvents] = useState([]);
  const listRef = useRef(null);
  const socketRef = useRef(null);

  const { data } = useQuery({
    queryKey: ['sim-events', session.id],
    queryFn: () => fetchEvents(session.id),
    refetchInterval: session.status === 'RUNNING' ? 5000 : false,
  });

  const events = [...(data?.data || []), ...liveEvents];

  // Live socket events
  useEffect(() => {
    const token = localStorage.getItem('nexuserp_token');
    if (!token) return;
    const socket = socketIO(import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:3001', {
      auth: { token }, transports: ['websocket'],
    });
    socketRef.current = socket;
    socket.on('simulation:event', ({ sessionId, event }) => {
      if (sessionId === session.id) setLiveEvents(prev => [event, ...prev].slice(0, 50));
    });
    return () => socket.disconnect();
  }, [session.id]);

  // Auto-scroll
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [liveEvents.length]);

  const TYPE_COLOR = {
    KPI_UPDATE: '#6366f1', ENTITY_CREATED: '#10b981',
    RESOURCE_BUSY: '#f59e0b', ALERT: '#ef4444', COMPLETED: '#a855f7',
  };

  return (
    <div style={{ background: '#060d1f', border: '1px solid #1e2d4a', borderRadius: 12, overflow: 'hidden', height: 380 }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #1e2d4a', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: session.status === 'RUNNING' ? '#10b981' : '#4a5568', animation: session.status === 'RUNNING' ? 'pulse 1.5s infinite' : 'none' }} />
        <span style={{ fontSize: 11.5, fontWeight: 700, color: '#8899bb' }}>Flux d'événements</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#3d5068' }}>{events.length} événements</span>
      </div>
      <div ref={listRef} style={{ overflowY: 'auto', height: 'calc(100% - 41px)', fontFamily: 'monospace' }}>
        {events.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 40, color: '#3d5068', fontSize: 12 }}>
            {session.status === 'IDLE' ? 'Démarrez la session pour recevoir des événements' : 'En attente d\'événements…'}
          </div>
        ) : events.map((e, i) => (
          <div key={e.id || i} style={{ padding: '6px 14px', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 8, fontWeight: 700, background: (TYPE_COLOR[e.eventType] || '#4a5568') + '22', color: TYPE_COLOR[e.eventType] || '#4a5568', padding: '2px 6px', borderRadius: 4, flexShrink: 0, marginTop: 2 }}>{e.eventType}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: '#4a5568', marginBottom: 2 }}>
                {e.simTime ? `t=${e.simTime}s` : ''} · {new Date(e.receivedAt).toLocaleTimeString('fr-FR')}
              </div>
              <pre style={{ fontSize: 9.5, color: '#6b7280', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {JSON.stringify(e.data, null, 2).slice(0, 200)}
              </pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════ */
export default function SimulationHubPage() {
  const [selected, setSelected] = useState(null);
  const { show: openSimModal } = useSimModalStore();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['sim-sessions'],
    queryFn: fetchSessions,
    refetchInterval: 10_000,
  });

  const sessions = data?.data || [];

  const actionMut = useMutation({
    mutationFn: ({ id, status }) => apiClient.patch(`/iot/simulations/${id}/status`, { status }),
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ['sim-sessions'] });
      const labels = { RUNNING: 'Simulation démarrée', PAUSED: 'Simulation pausée', COMPLETED: 'Simulation arrêtée' };
      toast.success(labels[status] || 'Statut mis à jour');
    },
  });

  return (
    <>
      <style>{`@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.4; } }`}</style>

      <div style={{ maxWidth: 1300, margin: '0 auto' }}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              {['🔴 Arena', '🔵 FlexSim', '🟢 Tecnomatix'].map(l => (
                <span key={l} style={{ fontSize: 9.5, fontWeight: 700, background: 'rgba(255,255,255,0.05)', border: '1px solid #1e2d4a', borderRadius: 20, padding: '2px 8px', color: '#6b7280' }}>{l}</span>
              ))}
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0, letterSpacing: -0.8, color: '#f0f4ff' }}>Simulation Hub</h1>
            <p style={{ fontSize: 12.5, color: '#4a5568', margin: '4px 0 0' }}>
              Intégration native Arena · FlexSim · Siemens Plant Simulation — Synchronisation ERP ↔ Digital Twin
            </p>
          </div>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={openSimModal}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
            <Plus size={15} /> Nouvelle session
          </motion.button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 20 }}>

          {/* Left col — sessions + integration guides */}
          <div>
            {/* Sessions */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#3d5068', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>Sessions de simulation</div>
              {isLoading ? (
                Array(3).fill(0).map((_, i) => <div key={i} style={{ height: 90, background: '#0a1228', borderRadius: 14, marginBottom: 10, animation: 'pulse 1.5s infinite' }} />)
              ) : sessions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: '#3d5068', background: '#0a1228', borderRadius: 14, border: '1px dashed #1e2d4a' }}>
                  <BarChart2 size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Aucune session</div>
                  <div style={{ fontSize: 11, marginTop: 4 }}>Créez une session pour commencer</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {sessions.map(s => (
                    <SessionCard key={s.id} session={s}
                      onAction={(id, status) => actionMut.mutate({ id, status })}
                      onSelect={setSelected}
                      isSelected={selected?.id === s.id}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Integration guides */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#3d5068', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>Guides d'intégration</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.keys(SOFTWARE_CFG).map(sw => (
                  <IntegrationCard key={sw} software={sw} sessionId={selected?.id} />
                ))}
              </div>
            </div>
          </div>

          {/* Right col — event stream + selected session detail */}
          <div>
            {selected ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{selected.name}</div>
                    <div style={{ fontSize: 11, color: '#3d5068' }}>{SOFTWARE_CFG[selected.software]?.label}</div>
                  </div>
                  <button onClick={() => setSelected(null)}
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #1e2d4a', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#4a5568' }}>
                    <X size={13} />
                  </button>
                </div>
                <EventStream session={selected} />

                {/* KPI cards from latest event */}
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#3d5068', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>KPIs Simulation en temps réel</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                    {['throughput', 'utilization', 'wip', 'cycleTime', 'bottleneck', 'takt'].map(k => (
                      <div key={k} style={{ background: '#0a1228', border: '1px solid #1e2d4a', borderRadius: 10, padding: '10px 12px' }}>
                        <div style={{ fontSize: 9.5, color: '#3d5068', textTransform: 'uppercase', letterSpacing: 0.8 }}>{k}</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#6366f1', marginTop: 2 }}>—</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, color: '#3d5068', background: '#0a1228', borderRadius: 16, border: '1px dashed #1e2d4a' }}>
                <BarChart2 size={48} style={{ marginBottom: 12, opacity: 0.2 }} />
                <div style={{ fontSize: 14, fontWeight: 600 }}>Sélectionnez une session</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>pour voir le flux d'événements en temps réel</div>
              </div>
            )}
          </div>
        </div>
      </div>

    </>
  );
}
