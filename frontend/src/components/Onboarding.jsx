import { useState } from 'react';
import { useAuthStore } from '../store/index.js';
import { ChevronRight, ChevronLeft, X, CheckCircle } from 'lucide-react';

const STEPS = [
  {
    id: 1,
    icon: '🎉',
    title: 'Bienvenue sur NexusERP !',
    subtitle: 'Votre ERP intelligent nouvelle génération',
    desc: 'Nous sommes ravis de vous accueillir. NexusERP va transformer la gestion de votre entreprise. Ce guide rapide vous explique les fonctionnalités essentielles en moins de 2 minutes.',
    color: '#6366f1',
    visual: (
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        {['📊 Dashboard', '👥 RH', '📦 Stock', '💰 Finance', '🗂️ Projets', '🤖 IA'].map((item, i) => (
          <div key={i} style={{
            background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: 10, padding: '8px 16px', fontSize: 13, color: '#818cf8',
            animation: `fadeInUp 0.5s ease ${i * 0.1}s both`,
          }}>{item}</div>
        ))}
      </div>
    ),
  },
  {
    id: 2,
    icon: '📊',
    title: 'Le Dashboard',
    subtitle: 'Votre vue d\'ensemble en temps réel',
    desc: 'Le dashboard affiche tous vos KPIs importants : chiffre d\'affaires, employés actifs, état du stock, projets en cours. Les données se mettent à jour automatiquement toutes les minutes.',
    color: '#10b981',
    tips: [
      'Cliquez sur les filtres Jour / Semaine / Mois / Année',
      'Les graphiques montrent vos tendances sur 6 mois',
      'Les alertes critiques apparaissent en rouge',
      'Utilisez le bouton ↻ pour actualiser manuellement',
    ],
    visual: (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { label: 'CA Mensuel', value: '2,400,000 DA', color: '#6366f1' },
          { label: 'Employés', value: '5 actifs', color: '#10b981' },
          { label: 'Stock', value: '3 alertes', color: '#ef4444' },
          { label: 'Projets', value: '3 en cours', color: '#f59e0b' },
        ].map((kpi, i) => (
          <div key={i} style={{
            background: 'var(--bg-primary)', border: `1px solid ${kpi.color}44`,
            borderRadius: 10, padding: '12px', textAlign: 'center',
            borderTop: `3px solid ${kpi.color}`,
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{kpi.label}</div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 3,
    icon: '👥',
    title: 'Ressources Humaines',
    subtitle: 'Gérez votre équipe efficacement',
    desc: 'Le module RH vous permet de gérer vos employés, approuver les congés et suivre la paie. Accédez-y depuis le menu gauche en cliquant sur "Ressources Humaines".',
    color: '#8b5cf6',
    tips: [
      'Ajoutez un employé avec le bouton "Ajouter"',
      'Basculez entre vue Table et vue Cartes',
      'Approuvez les congés en un clic',
      'Générez les fiches de paie en PDF',
    ],
    visual: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {['Ahmed Benali — Directeur', 'Fatima Kaci — RH Manager', 'Karim Meziani — Commercial'].map((emp, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'var(--bg-primary)', borderRadius: 10, padding: '10px 14px',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: `hsl(${i * 60 + 200}, 70%, 45%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: 'white',
            }}>{emp[0]}{emp.split(' ')[1]?.[0]}</div>
            <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{emp}</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 20 }}>Actif</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 4,
    icon: '🤖',
    title: 'NexusAI — Votre Assistant IA',
    subtitle: 'Propulsé par Claude d\'Anthropic',
    desc: 'NexusAI est votre assistant intelligent intégré. Posez-lui n\'importe quelle question sur votre entreprise en langage naturel et obtenez des réponses instantanées basées sur vos données réelles.',
    color: '#f59e0b',
    tips: [
      'Cliquez sur 🤖 NexusAI dans le menu gauche',
      'Utilisez les suggestions rapides pour commencer',
      'L\'IA mémorise toute la conversation',
      'Exportez la conversation en fichier texte',
    ],
    visual: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { q: 'Quel est l\'état du stock ?', a: '2 produits en rupture critique ⚠️', isUser: false },
          { q: 'Génère un rapport mensuel', a: 'CA: 2.4M DZD (+20% objectif) ✅', isUser: false },
        ].map((msg, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', borderRadius: '16px 4px 16px 16px', padding: '8px 14px', fontSize: 12, color: 'white', maxWidth: '80%' }}>
                {msg.q}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px 16px 16px 16px', padding: '8px 14px', fontSize: 12, color: 'var(--text-primary)', maxWidth: '80%' }}>
                {msg.a}
              </div>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 5,
    icon: '⚙️',
    title: 'Administration & Modules',
    subtitle: 'Personnalisez votre ERP',
    desc: 'En tant qu\'administrateur, vous pouvez activer ou désactiver les modules selon vos besoins. Les modules désactivés disparaissent automatiquement du menu de tous les utilisateurs.',
    color: '#ef4444',
    tips: [
      'Allez dans Administration → Modules',
      'Utilisez les toggles pour activer/désactiver',
      'Les changements sont instantanés pour tous',
      'Le module Administration ne peut pas être désactivé',
    ],
    visual: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { name: 'Ressources Humaines', icon: '👥', enabled: true },
          { name: 'CRM', icon: '🤝', enabled: true },
          { name: 'Production', icon: '🏭', enabled: false },
        ].map((mod, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'var(--bg-primary)', borderRadius: 10, padding: '10px 14px',
            opacity: mod.enabled ? 1 : 0.5,
          }}>
            <span style={{ fontSize: 20 }}>{mod.icon}</span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{mod.name}</span>
            <div style={{
              width: 40, height: 22, borderRadius: 11,
              background: mod.enabled ? '#6366f1' : 'var(--border)',
              position: 'relative', cursor: 'pointer',
            }}>
              <div style={{
                position: 'absolute', top: 3, width: 16, height: 16, borderRadius: '50%',
                background: 'white', left: mod.enabled ? 'calc(100% - 19px)' : 3,
                transition: 'left 0.3s ease',
              }} />
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 6,
    icon: '🚀',
    title: 'Vous êtes prêt !',
    subtitle: 'Commencez à utiliser NexusERP',
    desc: 'Félicitations ! Vous connaissez maintenant les fonctionnalités essentielles. Explorez les autres modules à votre rythme. Le guide est toujours accessible depuis le menu.',
    color: '#10b981',
    checklist: [
      'Consultez le Dashboard pour un aperçu global',
      'Ajoutez vos premiers employés dans RH',
      'Configurez votre stock de produits',
      'Testez NexusAI avec vos premières questions',
      'Activez uniquement les modules dont vous avez besoin',
    ],
    visual: (
      <div style={{ textAlign: 'center', padding: '10px 0' }}>
        <div style={{ fontSize: 72, marginBottom: 16, animation: 'bounce-emoji 1s ease infinite' }}>🎊</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#10b981', marginBottom: 8 }}>NexusERP est prêt !</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Bonne gestion de votre entreprise</div>
      </div>
    ),
  },
];

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const { user } = useAuthStore();
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.88)',
      backdropFilter: 'blur(10px)',
      zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        background: 'var(--bg-card)',
        border: `1px solid ${current.color}44`,
        borderRadius: 24, width: '100%', maxWidth: 560,
        boxShadow: `0 24px 80px rgba(0,0,0,0.6), 0 0 40px ${current.color}22`,
        overflow: 'hidden',
        animation: 'slideUp 0.3s cubic-bezier(0.4,0,0.2,1)',
      }}>

        {/* BARRE TOP COLORÉE */}
        <div style={{ height: 4, background: `linear-gradient(90deg, ${current.color}, ${current.color}99)` }} />

        {/* PROGRESS STEPS */}
        <div style={{ display: 'flex', padding: '16px 24px 0', gap: 6, alignItems: 'center' }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= step ? current.color : 'var(--border)', transition: 'background 0.3s ease' }} />
          ))}
          <button onClick={onComplete} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: 8, padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '24px 32px 32px' }}>

          {/* STEP INDICATOR */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: `${current.color}22`,
              border: `2px solid ${current.color}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28,
            }}>
              {current.icon}
            </div>
            <div>
              {step === 0 && (
                <div style={{ fontSize: 13, color: current.color, fontWeight: 600, marginBottom: 2 }}>
                  👋 Bonjour, {user?.firstName} !
                </div>
              )}
              <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.3px' }}>{current.title}</h2>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{current.subtitle}</div>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-primary)', padding: '4px 10px', borderRadius: 20, border: '1px solid var(--border)' }}>
              {step + 1} / {STEPS.length}
            </div>
          </div>

          {/* DESCRIPTION */}
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 20 }}>
            {current.desc}
          </p>

          {/* VISUAL */}
          {current.visual && (
            <div style={{ background: 'var(--bg-primary)', borderRadius: 14, padding: 16, marginBottom: 20, border: '1px solid var(--border)' }}>
              {current.visual}
            </div>
          )}

          {/* TIPS */}
          {current.tips && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>💡 Conseils</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {current.tips.map((tip, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: `${current.color}22`, color: current.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                    {tip}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CHECKLIST */}
          {current.checklist && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>✅ À faire en premier</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {current.checklist.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
                    <CheckCircle size={16} color={current.color} />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BOUTONS */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {!isFirst && (
              <button className="btn btn--ghost" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setStep(s => s - 1)}>
                <ChevronLeft size={16} /> Précédent
              </button>
            )}
            <button
              className="btn btn--primary"
              style={{ flex: 1, justifyContent: 'center', padding: '12px', fontSize: 14, fontWeight: 600 }}
              onClick={() => isLast ? onComplete() : setStep(s => s + 1)}
            >
              {isLast ? '🚀 Commencer maintenant !' : (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                  Suivant <ChevronRight size={16} />
                </span>
              )}
            </button>
          </div>

          {/* SKIP */}
          {!isLast && (
            <button onClick={onComplete} style={{
              background: 'none', border: 'none', color: 'var(--text-muted)',
              fontSize: 12, cursor: 'pointer', marginTop: 14,
              display: 'block', width: '100%', textAlign: 'center',
              textDecoration: 'underline',
            }}>
              Passer le guide d'utilisation
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce-emoji {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}