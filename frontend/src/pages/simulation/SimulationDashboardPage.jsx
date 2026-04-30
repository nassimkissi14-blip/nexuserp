import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Cpu, Activity, Clock, Package, Zap, Code2, X, Wifi, WifiOff } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../../api/client.js';
import { useSimulationStore } from '../../store/simulationStore.js';

/* ── API helpers ────────────────────────────────────────────────── */
const simAPI = {
  list:   ()     => apiClient.get('/iot/simulations'),
  create: (d)    => apiClient.post('/iot/simulations', d),
  delete: (id)   => apiClient.delete(`/iot/simulations/${id}`),
  events: (id)   => apiClient.get(`/iot/simulations/${id}/events`),
};

/* ── Constants ──────────────────────────────────────────────────── */
const SOFTWARE = {
  ARENA:            { label: 'Arena (Rockwell)',        color: '#e53e3e', icon: '⚙️' },
  PLANT_SIMULATION: { label: 'Plant Sim (Siemens)',     color: '#0069b4', icon: '🏭' },
  FLEXSIM:          { label: 'FlexSim',                 color: '#f59e0b', icon: '🔷' },
  CUSTOM:           { label: 'API Personnalisée',       color: '#6366f1', icon: '🔌' },
};

const STATUS_COLOR = { IDLE: '#64748b', RUNNING: '#10b981', PAUSED: '#f59e0b', COMPLETED: '#6366f1', ERROR: '#ef4444' };

const ARENA_VBA = `' Arena (Rockwell) — VBA Macro — NexusERP Hook
Sub SendKPIToNexus(sessionId As String, simTime As Double, _
                   throughput As Double, cycleTime As Double, wip As Integer)
    Dim http As Object
    Set http = CreateObject("MSXML2.XMLHTTP")
    Dim url As String
    url = "http://YOUR_SERVER:3001/api/v1/iot/simulations/" & sessionId & "/events"
    Dim body As String
    body = "{""eventType"":""KPI_UPDATE"",""simTime"":" & simTime & _
           ",""data"":{""throughput"":" & throughput & _
           ",""avgCycleTime"":" & cycleTime & _
           ",""wip"":" & wip & "}}"
    http.Open "POST", url, False
    http.setRequestHeader "Content-Type", "application/json"
    http.setRequestHeader "Authorization", "Bearer YOUR_TOKEN"
    http.Send body
End Sub`;

const SIMTALK_CODE = `(* Plant Simulation (Siemens Tecnomatix) — SimTalk *)
METHOD sendKPIsToNexus
  VAR
    http      : HTTPClient;
    body      : String;
    sessionId : String := "YOUR_SESSION_ID";
    token     : String := "Bearer YOUR_TOKEN";
  END_VAR
  body := '{"eventType":"KPI_UPDATE","simTime":' +
          eventController.simTime.toString +
          ',"data":{"throughput":' + throughputSensor.value.toString +
          ',"avgCycleTime":' + cycleTimeSensor.mean.toString +
          ',"wip":' + wipCounter.value.toString + '}}';
  http.url := 'http://YOUR_SERVER:3001/api/v1/iot/simulations/' + sessionId + '/events';
  http.method := HTTPPost;
  http.requestHeader['Content-Type'] := 'application/json';
  http.requestHeader['Authorization'] := token;
  http.requestBody := body;
  http.send;
END_METHOD`;

const PYTHON_CODE = `# Python bridge — lit la sortie CSV d'Arena/FlexSim et l'envoie à NexusERP
# pip install watchdog requests
import time, csv, requests
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

SESSION_ID = "YOUR_SESSION_ID"
TOKEN      = "Bearer YOUR_TOKEN"
SERVER     = "http://YOUR_SERVER:3001"
CSV_PATH   = r"C:\\Arena\\Output\\kpis.csv"

def post_kpi(data, sim_time=None):
    requests.post(
        f"{SERVER}/api/v1/iot/simulations/{SESSION_ID}/events",
        headers={"Authorization": TOKEN, "Content-Type": "application/json"},
        json={"eventType": "KPI_UPDATE", "simTime": sim_time, "data": data},
        timeout=5,
    )

class CSVHandler(FileSystemEventHandler):
    def on_modified(self, event):
        if event.src_path != CSV_PATH: return
        with open(CSV_PATH) as f:
            rows = list(csv.DictReader(f))
            if rows:
                r = rows[-1]
                post_kpi({
                    "throughput":   float(r.get("Throughput", 0)),
                    "avgCycleTime": float(r.get("AvgCycleTime", 0)),
                    "wip":          int(r.get("WIP", 0)),
                    "oee":          float(r.get("OEE", 0)),
                }, sim_time=float(r.get("SimTime", 0)))

observer = Observer()
observer.schedule(CSVHandler(), path=CSV_PATH, recursive=False)
observer.start()
print("Connecté — surveillance de", CSV_PATH)
try:
    while True: time.sleep(1)
finally:
    observer.stop()`;

/* ── Sub-components ─────────────────────────────────────────────── */
function UtilBar({ name, util, status, parts }) {
  const pct   = Math.round((util || 0) * 100);
  const color = status === 'DOWN' ? '#ef4444' : pct > 90 ? '#ef4444' : pct > 75 ? '#f59e0b' : '#10b981';
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{name}</span>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {status === 'DOWN' && <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 700 }}>⚠ ARRÊT</span>}
          <span style={{ color, fontWeight: 700 }}>{pct}%</span>
          {parts != null && <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{parts} pcs</span>}
        </div>
      </div>
      <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.8s ease' }} />
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, unit, color }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>{value ?? '—'}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{unit}</div>
    </div>
  );
}

function IntegrationGuide({ sessionId }) {
  const [tab, setTab] = useState('arena');
  const snippets = { arena: ARENA_VBA, plant: SIMTALK_CODE, python: PYTHON_CODE };
  const tabs = [
    { id: 'arena', label: 'Arena VBA',         icon: '⚙️' },
    { id: 'plant', label: 'Plant Sim SimTalk', icon: '🏭' },
    { id: 'python', label: 'Python Bridge',    icon: '🐍' },
  ];
  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
        Copiez le code dans votre logiciel. Remplacez <code>YOUR_SESSION_ID</code> par{' '}
        <strong style={{ color: '#6366f1' }}>{sessionId}</strong> et <code>YOUR_TOKEN</code> par votre token JWT.
      </p>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '6px 14px', borderRadius: 8, border: '1px solid',
            borderColor: tab === t.id ? '#6366f1' : 'var(--border)',
            background: tab === t.id ? '#6366f115' : 'transparent',
            color: tab === t.id ? '#6366f1' : 'var(--text-muted)',
            cursor: 'pointer', fontWeight: 600, fontSize: 12,
          }}>{t.icon} {t.label}</button>
        ))}
      </div>
      <div style={{ position: 'relative' }}>
        <pre style={{
          background: '#0f172a', color: '#94a3b8', padding: 16, borderRadius: 10,
          fontSize: 11.5, lineHeight: 1.6, overflowX: 'auto', maxHeight: 340, margin: 0,
          border: '1px solid #1e293b',
        }}>{snippets[tab]}</pre>
        <button
          onClick={() => { navigator.clipboard.writeText(snippets[tab]); toast.success('Copié !'); }}
          style={{ position: 'absolute', top: 10, right: 10, background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11 }}>
          Copier
        </button>
      </div>
      <div style={{ marginTop: 14, padding: '10px 14px', background: '#10b98115', borderRadius: 8, fontSize: 12, color: '#10b981', border: '1px solid #10b98130' }}>
        <strong>Endpoint :</strong> <code>POST /api/v1/iot/simulations/{sessionId}/events</code><br />
        <strong>Format :</strong> <code>{`{"eventType":"KPI_UPDATE","simTime":1440,"data":{...}}`}</code>
      </div>
    </div>
  );
}

/* ── Waiting screen shown when no real data received yet ────────── */
function WaitingScreen({ session, onGuide }) {
  const swMeta = SOFTWARE[session?.software] || SOFTWARE.CUSTOM;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 12, padding: '48px 32px', textAlign: 'center' }}>
      <WifiOff size={48} strokeWidth={1} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: 'var(--text-primary)' }}>
        En attente de connexion {swMeta.icon} {swMeta.label}
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7, maxWidth: 420, margin: '0 auto 24px' }}>
        Aucune donnée reçue pour cette session.<br />
        Lancez votre logiciel de simulation et configurez le webhook pour envoyer les KPIs en temps réel.
      </p>
      <button className="btn btn--primary" onClick={onGuide}>
        <Code2 size={14} /> Voir le guide d'intégration
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════ */
export default function SimulationDashboardPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected]     = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showGuide, setShowGuide]   = useState(false);

  /* Live data from global socket store */
  const industrialSessions     = useSimulationStore(s => s.industrialSessions);
  const clearIndustrialSession = useSimulationStore(s => s.clearIndustrialSession);
  const sessionData = selected
    ? (industrialSessions[selected.id] || { kpis: null, events: [] })
    : { kpis: null, events: [] };

  /* Sessions list */
  const { data: sessions = [] } = useQuery({
    queryKey: ['sim-sessions'],
    queryFn: () => simAPI.list().then(r => r.data || []),
    refetchInterval: 6000,
  });

  /* Clear stale live data when switching sessions */
  useEffect(() => {
    if (selected?.id) clearIndustrialSession(selected.id);
  }, [selected?.id]);

  /* Mutations */
  const createMut = useMutation({
    mutationFn: (d) => simAPI.create(d),
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ['sim-sessions'] });
      setSelected(r.data);
      setShowCreate(false);
      toast.success('Session créée — lancez votre logiciel et configurez le webhook');
    },
    onError: () => toast.error('Erreur création'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => simAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sim-sessions'] });
      setSelected(null);
      toast.success('Session supprimée');
    },
  });

  const kpis       = sessionData.kpis;
  const liveEvents = sessionData.events;
  const hasLiveData = kpis !== null;
  const swMeta     = SOFTWARE[selected?.software] || SOFTWARE.CUSTOM;

  const eventTypeStyle = {
    KPI_UPDATE:       { color: '#10b981', icon: '📊' },
    ALERT:            { color: '#ef4444', icon: '⚠️' },
    RESOURCE_ALARM:   { color: '#f59e0b', icon: '🔧' },
    BOTTLENECK:       { color: '#f59e0b', icon: '🚧' },
    ENTITY_COMPLETED: { color: '#6366f1', icon: '✅' },
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">🏭 Simulation Industrielle</h1>
          <p className="page-subtitle">Arena · Plant Simulation (Siemens) · FlexSim — données réelles en temps réel</p>
        </div>
        <button className="btn btn--primary" onClick={() => setShowCreate(true)}><Plus size={15}/> Nouvelle session</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Sessions list ── */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
            Sessions ({sessions.length})
          </div>
          {sessions.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🏭</div>
              Aucune session.<br />Créez-en une pour commencer.
            </div>
          ) : sessions.map(s => {
            const sw = SOFTWARE[s.software] || SOFTWARE.CUSTOM;
            const isActive = selected?.id === s.id;
            const hasData = !!industrialSessions[s.id]?.kpis;
            return (
              <div key={s.id} onClick={() => setSelected(s)} style={{
                padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                background: isActive ? 'rgba(99,102,241,0.08)' : 'transparent',
                borderLeft: isActive ? '3px solid #6366f1' : '3px solid transparent',
                transition: 'all 0.15s',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{s.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {hasData
                      ? <Wifi size={12} style={{ color: '#10b981' }} />
                      : <WifiOff size={12} style={{ color: 'var(--text-muted)' }} />}
                    <span style={{ fontSize: 10, fontWeight: 700, color: STATUS_COLOR[s.status], background: STATUS_COLOR[s.status] + '22', padding: '2px 7px', borderRadius: 10 }}>{s.status}</span>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: sw.color, marginTop: 3 }}>{sw.icon} {sw.label}</div>
              </div>
            );
          })}
        </div>

        {/* ── Session detail ── */}
        {!selected ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, color: 'var(--text-muted)', gap: 12 }}>
            <Cpu size={48} strokeWidth={1} />
            <p style={{ fontSize: 14 }}>Sélectionnez une session pour voir les KPIs en temps réel</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Header */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 28 }}>{swMeta.icon}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>{selected.name}</div>
                    <div style={{ fontSize: 12, color: swMeta.color, fontWeight: 600 }}>{swMeta.label}</div>
                  </div>
                  {hasLiveData && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#10b981', background: '#10b98120', padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                      LIVE
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn--ghost" style={{ fontSize: 12 }} onClick={() => setShowGuide(true)}>
                    <Code2 size={13} /> Intégration
                  </button>
                  <button className="btn btn--ghost" style={{ fontSize: 12, color: '#ef4444' }}
                    onClick={() => { if (window.confirm('Supprimer cette session ?')) deleteMut.mutate(selected.id); }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>

            {/* No data yet → waiting screen */}
            {!hasLiveData && <WaitingScreen session={selected} onGuide={() => setShowGuide(true)} />}

            {/* KPI cards — only when real data received */}
            {hasLiveData && (<>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                <KpiCard icon={<Activity size={16}/>} label="Débit"              value={kpis?.throughput}   unit="pcs/h"       color="#10b981" />
                <KpiCard icon={<Clock size={16}/>}    label="Temps cycle moyen"  value={kpis?.avgCycleTime} unit="min"         color="#6366f1" />
                <KpiCard icon={<Package size={16}/>}  label="WIP"                value={kpis?.wip}          unit="pcs en cours" color="#f59e0b" />
                <KpiCard icon={<Zap size={16}/>}      label="OEE"                value={kpis?.oee}          unit="%"           color={kpis?.oee >= 75 ? '#10b981' : '#ef4444'} />
              </div>

              {/* Entities */}
              {kpis?.entities && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {[
                    { label: 'Pièces créées',  value: kpis.entities.created,   color: '#6366f1' },
                    { label: 'Pièces finies',  value: kpis.entities.completed, color: '#10b981' },
                    { label: 'Mises au rebut', value: kpis.entities.scrapped,  color: '#ef4444' },
                  ].map((e, i) => (
                    <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: e.color }}>{e.value}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{e.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Resources + Queues */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: 'var(--text-primary)' }}>
                    <Cpu size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Utilisation ressources
                  </div>
                  {kpis?.resources?.length
                    ? kpis.resources.map(r => <UtilBar key={r.id} name={r.name} util={r.utilization} status={r.status} parts={r.parts} />)
                    : <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Aucune ressource remontée</p>}
                </div>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: 'var(--text-primary)' }}>📦 Files d'attente</div>
                  {kpis?.queues?.length ? kpis.queues.map(q => (
                    <div key={q.id} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{q.name}</span>
                        <span style={{ color: '#f59e0b', fontWeight: 700 }}>{q.length} pcs · {q.avgWait} min</span>
                      </div>
                      <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, q.length * 6.67)}%`, background: q.length > 12 ? '#ef4444' : '#f59e0b', borderRadius: 4, transition: 'width 0.8s ease' }} />
                      </div>
                    </div>
                  )) : <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Aucune file remontée</p>}
                </div>
              </div>
            </>)}

            {/* Live event feed — always shown when session selected */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: 'var(--text-primary)' }}>
                ⚡ Flux événements
                {hasLiveData && <span style={{ marginLeft: 8, fontSize: 11, color: '#10b981' }}>● live</span>}
              </div>
              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                {liveEvents.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
                    En attente d'événements depuis {swMeta.label}…
                  </p>
                ) : liveEvents.map((evt, i) => {
                  const meta = eventTypeStyle[evt.eventType] || { color: '#94a3b8', icon: '🔔' };
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                      <span style={{ fontSize: 14 }}>{meta.icon}</span>
                      <div style={{ flex: 1 }}>
                        <span style={{ color: meta.color, fontWeight: 600 }}>{evt.eventType}</span>
                        {evt.eventType === 'KPI_UPDATE' && evt.data && (
                          <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>
                            Débit: {evt.data.throughput} pcs/h · OEE: {evt.data.oee}% · WIP: {evt.data.wip}
                          </span>
                        )}
                        {['ALERT', 'RESOURCE_ALARM'].includes(evt.eventType) && evt.data && (
                          <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>
                            {evt.data.machine || evt.data.type}
                          </span>
                        )}
                      </div>
                      <span style={{ color: 'var(--text-muted)', fontSize: 10, whiteSpace: 'nowrap' }}>
                        {evt.simTime != null ? `T+${evt.simTime}min` : new Date(evt.receivedAt).toLocaleTimeString('fr-FR')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Create session modal ── */}
      {showCreate && (
        <CreateSessionModal
          onClose={() => setShowCreate(false)}
          onCreate={(d) => createMut.mutate(d)}
          isLoading={createMut.isPending}
        />
      )}

      {/* ── Integration guide modal ── */}
      {showGuide && selected && (
        <div className="modal-overlay" onClick={() => setShowGuide(false)}>
          <div className="modal" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h3>🔌 Guide d'intégration — {selected.name}</h3>
              <button className="modal__close" onClick={() => setShowGuide(false)}><X size={16}/></button>
            </div>
            <div className="modal__body">
              <IntegrationGuide sessionId={selected.id} />
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </div>
  );
}

/* ── Create session modal ── */
function CreateSessionModal({ onClose, onCreate, isLoading }) {
  const [form, setForm] = useState({ name: '', software: 'ARENA' });
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h3>Nouvelle session de simulation</h3>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="modal__body">
          <form onSubmit={e => { e.preventDefault(); onCreate(form); }}>
            <div className="form-group">
              <label>Nom de la session *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Ex: Ligne A — Scénario Optimisé" />
            </div>
            <div className="form-group">
              <label>Logiciel de simulation</label>
              <select value={form.software} onChange={e => setForm(f => ({ ...f, software: e.target.value }))}>
                {Object.entries(SOFTWARE).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </div>
            <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
              Après création, utilisez le bouton <strong>Intégration</strong> pour obtenir le code à insérer dans votre logiciel Arena ou Plant Simulation.
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn--ghost" onClick={onClose}>Annuler</button>
              <button type="submit" className="btn btn--primary" disabled={isLoading}>
                {isLoading ? 'Création…' : 'Créer la session'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
