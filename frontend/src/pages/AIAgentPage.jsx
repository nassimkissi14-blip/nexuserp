import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Loader, Trash2, Download, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../api/client.js';

const SUGGESTIONS = [
  { icon: '📦', text: 'Quel est l\'état du stock ?' },
  { icon: '👥', text: 'Combien d\'employés actifs ?' },
  { icon: '💰', text: 'Quel est le chiffre d\'affaires ce mois ?' },
  { icon: '📊', text: 'Génère un rapport mensuel complet' },
  { icon: '⚠️', text: 'Quelles sont les alertes critiques ?' },
  { icon: '🏖️', text: 'Qui est en congé cette semaine ?' },
  { icon: '🤖', text: 'Donne-moi des recommandations pour améliorer la productivité' },
  { icon: '📈', text: 'Analyse les tendances des ventes' },
];

// ─── Moteur IA local ──────────────────────────────────────────────────────────
function generateLocalResponse(question) {
  const q = question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const match = (...keywords) => keywords.some(k => q.includes(k));

  // STOCK
  if (match('stock', 'inventaire', 'produit', 'rupture', 'alerte stock', 'magasin')) {
    return `📦 **État du stock — Rapport complet**

**Produits en rupture critique :**
🔴 Câble électrique 6mm² : **3 / 100 unités** — Commande urgente requise
🔴 Roulement à billes 6205 : **2 / 20 unités** — Commande urgente requise

**Produits OK :**
✅ Moteur électrique 5kW : 12 unités (seuil: 5)
✅ Variateur de fréquence : 3 unités (seuil: 2)
✅ Huile hydraulique 20L : 45 unités (seuil: 10)
✅ Filtre à air : 28 unités (seuil: 8)

**Valeur totale du stock :** 3 500 000 DZD

💡 **Recommandation :** Lancer immédiatement une commande fournisseur pour le câble 6mm² et le roulement 6205. Ces ruptures peuvent bloquer la production.`;
  }

  // EMPLOYÉS
  if (match('employe', 'staff', 'personnel', 'rh', 'ressource humaine', 'equipe', 'salarie', 'combien d\'employe', 'actif')) {
    return `👥 **Rapport RH — Employés actifs**

**Effectif total : 5 employés actifs**

| Nom | Poste | Salaire |
|-----|-------|---------|
| Ahmed Benali | Directeur Général | 250 000 DZD |
| Fatima Kaci | Responsable RH | 120 000 DZD |
| Karim Meziani | Responsable Ventes | 110 000 DZD |
| Sara Ouali | Comptable | 90 000 DZD |
| Youcef Hamdi | Technicien Production | 75 000 DZD |

**Masse salariale mensuelle :** 670 250 DZD
**Contrats :** 5 CDI

⚠️ **Alertes RH :**
- Sara Ouali en congé maternité (jusqu'au 01/07/2026)
- Demande de congé Ahmed Benali en attente (15-20 Avril)`;
  }

  // CONGÉS
  if (match('conge', 'absence', 'vacance', 'leave', 'qui est absent', 'qui est en conge')) {
    return `🏖️ **Gestion des congés**

**Congés en cours :**
- 👤 Sara Ouali — Congé maternité jusqu'au 01/07/2026

**Demandes en attente :**
- ⏳ Ahmed Benali — Congé du 15 au 20 Avril 2026 (5 jours)

**Taux de présence actuel :** 94%

💡 **Recommandation :** Traiter la demande d'Ahmed Benali rapidement pour planifier la continuité de la direction pendant son absence.`;
  }

  // SALAIRES / PAIE
  if (match('salaire', 'paie', 'paierol', 'payroll', 'remuneration', 'masse salariale')) {
    return `💰 **Rapport de paie**

**Masse salariale mensuelle :** 670 250 DZD
**Masse salariale annuelle :** 8 043 000 DZD

**Détail par employé :**
- Ahmed Benali : 250 000 DZD/mois
- Fatima Kaci : 120 000 DZD/mois
- Karim Meziani : 110 000 DZD/mois
- Sara Ouali : 90 000 DZD/mois
- Youcef Hamdi : 75 000 DZD/mois

**Salaire moyen :** 129 000 DZD
**Prochain virement :** fin du mois en cours`;
  }

  // CA / VENTES / CHIFFRE D'AFFAIRES
  if (match('chiffre', 'ca ', 'vente', 'revenu', 'revenue', 'objectif', 'croissance', 'performance commerciale')) {
    return `📈 **Rapport des ventes — Avril 2026**

**CA du mois en cours :** 2 400 000 DZD
**Objectif mensuel :** 2 000 000 DZD
**Résultat :** ✅ **+20% au-dessus de l'objectif**

**Comparaison mensuelle :**
- Novembre : 1 200 000 DZD
- Décembre : 1 800 000 DZD
- Janvier : 1 400 000 DZD
- Février : 2 100 000 DZD
- Mars : 1 900 000 DZD
- **Avril : 2 400 000 DZD** 🚀

**Croissance sur 6 mois :** +26%

💡 **Analyse :** La tendance est très positive. Sonatrach reste le client principal avec 5,2M DZD de CA cumulé.`;
  }

  // CLIENTS / CRM
  if (match('client', 'crm', 'pipeline', 'prospect', 'lead', 'sonatrach', 'cevital', 'air algerie')) {
    return `🤝 **Rapport Clients / CRM**

**Clients actifs (3) :**
| Client | CA Total | Commandes |
|--------|----------|-----------|
| Sonatrach | 5 200 000 DZD | 12 |
| Cevital | 3 800 000 DZD | 8 |
| Air Algérie | 2 100 000 DZD | 5 |
| Mohamed Amrani | 450 000 DZD | 3 |

**Pipeline commercial :**
- 👀 Nexans Algérie — Prospect à convertir
- 🎯 Sara Benouali — Lead à qualifier

⚠️ **Alerte :** Facture Air Algérie impayée de **450 000 DZD** depuis 30 jours.

💡 **Recommandation :** Relancer Air Algérie cette semaine pour éviter un retard supplémentaire.`;
  }

  // FACTURES / FINANCES
  if (match('facture', 'impaye', 'paiement', 'invoice', 'tresorerie', 'comptabilite', 'finance', 'dette')) {
    return `💳 **Rapport Financier**

**Factures impayées :**
🔴 Air Algérie : **450 000 DZD** — En retard depuis 30 jours

**Situation de trésorerie :**
- CA mensuel : 2 400 000 DZD
- Charges salariales : 670 250 DZD
- Résultat estimé : ~1 730 000 DZD

**Alertes financières :**
- 1 facture en retard critique (Air Algérie)

💡 **Recommandation :** Envoyer une mise en demeure à Air Algérie. Après 30 jours de retard, des pénalités contractuelles peuvent s'appliquer.`;
  }

  // PROJETS
  if (match('projet', 'project', 'tache', 'avancement', 'gantt', 'deadline', 'echeance', 'budget projet')) {
    return `🗂️ **Rapport Projets**

**Projets en cours (3) :**

🔵 **Ligne Production A**
- Avancement : 38%
- Budget : 5 000 000 DZD
- Échéance : Juin 2026
- Statut : En bonne voie

🟡 **CRM Commercial**
- Avancement : 22%
- Budget : 800 000 DZD
- Échéance : Mai 2026
- ⚠️ Risque de retard

🔵 **Certification ISO 9001**
- Avancement : 5%
- Budget : 1 200 000 DZD
- Échéance : Septembre 2026

**Terminés :** ✅ Refonte site web (100%)
**En pause :** ⏸️ Panneaux solaires (12%)

💡 **Recommandation :** Le projet CRM a 22% d'avancement pour une deadline en Mai — accélérer les livraisons.`;
  }

  // ALERTES
  if (match('alerte', 'urgence', 'critique', 'probleme', 'risque', 'danger')) {
    return `🚨 **Tableau de bord des alertes**

**🔴 Alertes critiques (2) :**
1. Stock Câble électrique 6mm² : **3 unités restantes** (seuil min: 100)
2. Stock Roulement à billes 6205 : **2 unités restantes** (seuil min: 20)

**🟡 Alertes modérées (2) :**
3. Facture Air Algérie impayée : **450 000 DZD** (30 jours de retard)
4. Demande de congé Ahmed Benali en attente de validation

**🟢 Positif :**
5. CA mensuel dépassé de **+20%** par rapport à l'objectif

💡 **Actions prioritaires :**
- Commander immédiatement câble 6mm² et roulement 6205
- Relancer Air Algérie pour paiement
- Valider la demande de congé de M. Benali`;
  }

  // RAPPORT / RÉSUMÉ GÉNÉRAL
  if (match('rapport', 'resume', 'synthese', 'bilan', 'dashboard', 'tableau de bord', 'situation', 'etat')) {
    return `📊 **Synthèse générale — NexusERP**

**👥 RH :** 5 employés actifs · Masse salariale 670 250 DZD/mois · 1 congé en attente

**💰 Finances :** CA mois = **2 400 000 DZD** (+20% objectif) · 1 facture impayée (450 000 DZD)

**📦 Stock :** 6 produits · **2 ruptures critiques** (câble + roulement) · Valeur ~3 500 000 DZD

**🤝 CRM :** 4 clients actifs · Sonatrach leader (5,2M DZD) · 2 prospects en pipeline

**🗂️ Projets :** 3 en cours · 1 terminé · 1 en pause · Budget total ~7M DZD

**🚨 Priorités du jour :**
1. 🔴 Commander câble électrique 6mm² (URGENT)
2. 🔴 Commander roulement à billes 6205 (URGENT)
3. 🟡 Relancer Air Algérie (450 000 DZD impayés)
4. 🟡 Valider congé Ahmed Benali`;
  }

  // RECOMMANDATIONS / PRODUCTIVITÉ
  if (match('recommandation', 'conseil', 'amelioration', 'productivite', 'optimisation', 'suggestion')) {
    return `💡 **Recommandations stratégiques**

**1. 🔴 Approvisionnement (Urgent)**
Deux références en rupture critique. Passer commande aujourd'hui pour éviter l'arrêt de production.

**2. 💰 Recouvrement**
Air Algérie a 450 000 DZD en retard. Une relance formelle cette semaine maximise les chances de paiement.

**3. 📈 Développement commercial**
Nexans Algérie (Prospect) représente une opportunité. Planifier un rendez-vous commercial ce mois.

**4. 🗂️ Projet CRM Commercial**
22% d'avancement pour une deadline en Mai. Revoir le planning et renforcer l'équipe si nécessaire.

**5. 👥 RH**
Sara Ouali absente jusqu'en Juillet — prévoir un remplacement temporaire pour la comptabilité.

**Score de santé global : 72/100** — Bon niveau, vigilance sur l'approvisionnement.`;
  }

  // PRÉVISIONS
  if (match('prevision', 'forecast', 'prediction', 'prochain mois', 'tendance', 'futur')) {
    return `📈 **Prévisions — Mai 2026**

**Chiffre d'affaires estimé :**
Sur la base de la tendance +26% : **~2 700 000 DZD**

**Risques identifiés :**
- Rupture stock peut bloquer 2-3 commandes (~300 000 DZD de CA à risque)
- Projet CRM en retard peut impacter la relation client Nexans

**Opportunités :**
- Nexans Algérie à convertir : potentiel ~1 500 000 DZD/an
- Objectif de vente Mai recommandé : **2 200 000 DZD** (+10% vs Avril)

**Effectif prévu :**
- Sara Ouali toujours en congé maternité jusqu'au 1er Juillet
- Besoin de renfort comptabilité à court terme`;
  }

  // BONJOUR / AIDE
  if (match('bonjour', 'salut', 'hello', 'aide', 'help', 'que sais-tu', 'que peux-tu', 'capable')) {
    return `👋 **Bonjour ! Je suis NexusAI**, votre assistant ERP.

Je peux répondre à toutes vos questions sur :

📦 **Stock** — niveaux, alertes, valeur inventaire
👥 **RH** — employés, congés, salaires, présence
💰 **Finances** — CA, factures, trésorerie, budget
🤝 **CRM** — clients, prospects, pipeline commercial
🗂️ **Projets** — avancement, budgets, délais
📊 **Rapports** — synthèses, bilans, prévisions
🚨 **Alertes** — urgences et priorités du jour

Posez-moi n'importe quelle question !`;
  }

  // Réponse par défaut
  return `🤔 Je n'ai pas trouvé de données précises pour cette question dans le système ERP.

Voici ce que je peux analyser pour vous :
- 📦 **"état du stock"** — niveaux et alertes
- 👥 **"rapport employés"** — RH et congés
- 💰 **"chiffre d'affaires"** — ventes et finances
- 🤝 **"situation clients"** — CRM et pipeline
- 🗂️ **"avancement projets"** — planning
- 🚨 **"alertes critiques"** — urgences
- 📊 **"synthèse générale"** — bilan complet

Reformulez votre question avec l'un de ces thèmes.`;
}

const formatMessage = (text) => {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    if (line.startsWith('**') && line.endsWith('**')) {
      return <div key={i} style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: i > 0 ? 10 : 0, marginBottom: 4 }}>{line.replace(/\*\*/g, '')}</div>;
    }
    if (line.match(/^\*\*(.+)\*\*/)) {
      return <div key={i} style={{ marginTop: i > 0 ? 6 : 0 }} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />;
    }
    if (line.startsWith('• ') || line.startsWith('- ') || line.startsWith('* ')) {
      return <div key={i} style={{ paddingLeft: 14, marginTop: 3, display: 'flex', gap: 6 }}><span style={{ color: 'var(--accent-primary)', flexShrink: 0 }}>•</span><span>{line.substring(2)}</span></div>;
    }
    if (line.match(/^\d+\./)) {
      return <div key={i} style={{ paddingLeft: 14, marginTop: 3 }}>{line}</div>;
    }
    if (line.startsWith('#')) {
      const level = line.match(/^#+/)[0].length;
      return <div key={i} style={{ fontWeight: 700, fontSize: level === 1 ? 16 : 14, marginTop: 12, marginBottom: 6, color: 'var(--text-primary)' }}>{line.replace(/^#+\s/, '')}</div>;
    }
    if (line === '') return <div key={i} style={{ height: 6 }} />;
    return <div key={i} style={{ lineHeight: 1.6 }}>{line}</div>;
  });
};

const MessageBubble = ({ msg, onCopy }) => {
  const isAI = msg.role === 'assistant';

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexDirection: isAI ? 'row' : 'row-reverse', marginBottom: 20, animation: 'fadeIn 0.3s ease' }}>
      <div style={{
        width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
        background: isAI ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'linear-gradient(135deg, #10b981, #059669)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
        boxShadow: isAI ? '0 0 14px rgba(99,102,241,0.4)' : '0 0 14px rgba(16,185,129,0.4)',
      }}>
        {isAI ? <Bot size={18} /> : <User size={18} />}
      </div>

      <div style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{
          background: isAI ? 'var(--bg-card)' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
          border: isAI ? '1px solid var(--border)' : 'none',
          borderRadius: isAI ? '4px 18px 18px 18px' : '18px 4px 18px 18px',
          padding: '14px 18px',
          fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-primary)',
          boxShadow: isAI ? 'var(--shadow)' : '0 4px 16px rgba(99,102,241,0.3)',
        }}>
          {typeof msg.content === 'string' ? formatMessage(msg.content) : msg.content}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px', flexDirection: isAI ? 'row' : 'row-reverse' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{msg.time}</span>
          {isAI && (
            <button onClick={() => onCopy(msg.content)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}>
              <Copy size={11} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const TypingIndicator = () => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 20 }}>
    <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Bot size={18} color="white" />
    </div>
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '4px 18px 18px 18px', padding: '14px 20px', display: 'flex', gap: 6, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: '50%',
          background: 'var(--accent-primary)',
          animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
      <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 6 }}>NexusAI analyse…</span>
    </div>
  </div>
);

export default function AIAgentPage() {
  const [messages, setMessages] = useState([
    {
      id: 1, role: 'assistant',
      content: `👋 Bonjour ! Je suis **NexusAI**, votre assistant ERP propulsé par Claude (Anthropic).

J'ai accès en temps réel à vos vraies données : employés, stock, clients, factures, projets, congés.

Posez-moi n'importe quelle question sur votre entreprise !`,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendMessage = async (text) => {
    const userMessage = text || input.trim();
    if (!userMessage || isLoading) return;

    const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    // Ajouter message utilisateur
    const userMsg = { id: Date.now(), role: 'user', content: userMessage, time };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Historique pour Claude
    const newHistory = [...conversationHistory, { role: 'user', content: userMessage }];
    setConversationHistory(newHistory);

    try {
      const result = await apiClient.post('/ai/chat', { messages: newHistory });
      const aiResponse = result.content || 'Pas de réponse.';

      const aiMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: aiResponse,
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, aiMsg]);
      setConversationHistory(prev => [...prev, { role: 'assistant', content: aiResponse }]);

    } catch (error) {
      const errorMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `⚠️ **Erreur** : ${error.message || 'Impossible de contacter NexusAI. Vérifiez que la clé ANTHROPIC_API_KEY est configurée sur le serveur.'}`,
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyMessage = (content) => {
    navigator.clipboard.writeText(content);
    toast.success('✅ Copié !');
  };

  const clearConversation = () => {
    setMessages([{
      id: Date.now(), role: 'assistant',
      content: '🔄 Conversation réinitialisée. Comment puis-je vous aider ?',
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    }]);
    setConversationHistory([]);
    toast.success('Conversation effacée');
  };

  const exportConversation = () => {
    const text = messages.map(m => `[${m.time}] ${m.role === 'user' ? 'Vous' : 'NexusAI'}: ${m.content}`).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'nexusai-conversation.txt';
    a.click();
    toast.success('Conversation exportée !');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px - 56px)', gap: 12 }}>

      {/* HEADER */}
      <div style={{
        background: 'linear-gradient(135deg, #4f46e5, #7c3aed, #6366f1)',
        padding: '14px 20px', borderRadius: 'var(--radius-lg)',
        display: 'flex', alignItems: 'center', gap: 16,
        boxShadow: '0 8px 32px rgba(99,102,241,0.3)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', bottom: -30, right: 60, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Sparkles size={26} color="white" />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'white', margin: 0, letterSpacing: '-0.5px' }}>NexusAI Assistant</h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', margin: '3px 0 0' }}>
            Propulsé par Claude (Anthropic) · Données ERP en temps réel
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.3)', padding: '5px 12px', borderRadius: 20, fontSize: 12, color: 'white' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse-badge 2s infinite' }} />
            En ligne
          </div>
          <button onClick={exportConversation} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '6px 10px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
            <Download size={14} /> Export
          </button>
          <button onClick={clearConversation} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '6px 10px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
            <Trash2 size={14} /> Effacer
          </button>
        </div>
      </div>

      {/* SUGGESTIONS — single scrollable row */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2, flexShrink: 0 }}>
        {SUGGESTIONS.map((s, i) => (
          <button key={i} onClick={() => sendMessage(s.text)} disabled={isLoading}
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 20, padding: '5px 12px', fontSize: 12,
              color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              transition: 'var(--transition)', display: 'flex', alignItems: 'center', gap: 6,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.color = 'var(--accent-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            {s.icon} {s.text}
          </button>
        ))}
      </div>

      {/* MESSAGES */}
      <div style={{
        flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '20px',
        overflowY: 'auto', minHeight: 0,
      }}>
        {messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} onCopy={copyMessage} />
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '10px 14px',
        display: 'flex', gap: 12, alignItems: 'flex-end', flexShrink: 0,
        boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
      }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Posez votre question à NexusAI… (Entrée pour envoyer, Shift+Entrée pour nouvelle ligne)"
            disabled={isLoading}
            rows={1}
            style={{
              background: 'none', border: 'none', outline: 'none',
              color: 'var(--text-primary)', fontSize: 13.5,
              resize: 'none', fontFamily: 'inherit', lineHeight: 1.5,
              minHeight: 24, maxHeight: 120,
            }}
          />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
            <span>⌨️ Entrée pour envoyer</span>
            <span>↵ Shift+Entrée pour nouvelle ligne</span>
            <span style={{ marginLeft: 'auto' }}>{conversationHistory.length / 2} échanges</span>
          </div>
        </div>
        <button
          onClick={() => sendMessage()}
          disabled={!input.trim() || isLoading}
          style={{
            background: input.trim() && !isLoading
              ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
              : 'var(--border)',
            border: 'none', borderRadius: 12,
            padding: '12px 20px', color: 'white',
            cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', gap: 8,
            transition: 'var(--transition)', fontSize: 13, fontWeight: 600,
            boxShadow: input.trim() && !isLoading ? '0 4px 14px rgba(99,102,241,0.4)' : 'none',
            flexShrink: 0,
          }}
        >
          {isLoading
            ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Analyse…</>
            : <><Send size={16} /> Envoyer</>
          }
        </button>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-8px); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}