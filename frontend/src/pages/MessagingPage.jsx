import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { messagesAPI, usersAPI } from '../api/client.js';
import { useAuthStore } from '../store/index.js';
import { useMessagesStore } from '../store/index.js';
import { useSocket } from '../hooks/useSocket.js';
import { Send, Search, Users, MessageSquare, Plus, Paperclip, X, Download, FileText, File } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../api/client.js';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'https://nexuserp-pupi.onrender.com';

const formatTime = (date) =>
  new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

const formatDate = (date) => {
  const d = new Date(date);
  const diff = new Date() - d;
  if (diff < 86400000) return "Aujourd'hui";
  if (diff < 172800000) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

const isImage = (type) => type?.startsWith('image/');

const ROLE_LABELS = {
  SUPER_ADMIN: 'Super Admin', ADMIN: 'Admin', DIRECTOR: 'Directeur',
  MANAGER: 'Manager', OPERATOR: 'Opérateur',
};
const ROLE_COLORS = {
  SUPER_ADMIN: '#ef4444', ADMIN: '#f97316', DIRECTOR: '#8b5cf6',
  MANAGER: '#3b82f6', OPERATOR: '#10b981',
};

function Avatar({ user, size = 36 }) {
  const color = `hsl(${(user?.firstName?.charCodeAt(0) || 65) * 13 % 360}, 65%, 42%)`;
  return (
    <div style={{ width: size, height: size, minWidth: size, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.35, fontWeight: 700, color: 'white' }}>
      {user?.firstName?.[0]}{user?.lastName?.[0]}
    </div>
  );
}

/* ── File attachment preview (before send) ── */
function FilePreview({ file, onRemove }) {
  const isImg = file.type.startsWith('image/');
  const url   = URL.createObjectURL(file);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', maxWidth: 280 }}>
      {isImg ? (
        <img src={url} alt={file.name} style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 5, flexShrink: 0 }} />
      ) : (
        <div style={{ width: 36, height: 36, background: 'rgba(99,102,241,0.12)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <FileText size={16} color="#6366f1" />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatFileSize(file.size)}</div>
      </div>
      <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 2, borderRadius: 4 }}>
        <X size={14} />
      </button>
    </div>
  );
}

/* ── File message bubble ── */
function FileBubble({ msg, isOwn }) {
  const imgSrc = `${API_BASE}${msg.fileUrl}`;
  const isImg  = isImage(msg.fileType);

  if (isImg) {
    return (
      <div style={{ maxWidth: 260 }}>
        <img
          src={imgSrc}
          alt={msg.fileName}
          style={{ width: '100%', borderRadius: 10, display: 'block', cursor: 'pointer' }}
          onClick={() => window.open(imgSrc, '_blank')}
        />
        {msg.content && <div style={{ fontSize: 13, marginTop: 5, color: isOwn ? 'rgba(255,255,255,0.9)' : 'var(--text-primary)' }}>{msg.content}</div>}
      </div>
    );
  }

  return (
    <a
      href={imgSrc}
      target="_blank"
      rel="noopener noreferrer"
      download={msg.fileName}
      style={{ display: 'flex', alignItems: 'center', gap: 10, background: isOwn ? 'rgba(255,255,255,0.1)' : 'rgba(99,102,241,0.08)', border: `1px solid ${isOwn ? 'rgba(255,255,255,0.15)' : 'rgba(99,102,241,0.2)'}`, borderRadius: 10, padding: '10px 14px', textDecoration: 'none', maxWidth: 260 }}
    >
      <div style={{ width: 38, height: 38, background: isOwn ? 'rgba(255,255,255,0.15)' : 'rgba(99,102,241,0.15)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <File size={18} color={isOwn ? 'white' : '#6366f1'} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: isOwn ? 'white' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.fileName}</div>
        <div style={{ fontSize: 11, color: isOwn ? 'rgba(255,255,255,0.65)' : 'var(--text-muted)', marginTop: 1 }}>{formatFileSize(msg.fileSize)}</div>
      </div>
      <Download size={14} color={isOwn ? 'rgba(255,255,255,0.7)' : '#6366f1'} />
    </a>
  );
}

export default function MessagingPage() {
  const { user } = useAuthStore();
  const { conversations, activeThread, fetchConversations, openThread } = useMessagesStore();
  const { sendMessage, sendTyping, sendStopTyping, markMessagesRead } = useSocket();
  const [messageText, setMessageText]   = useState('');
  const [searchText,  setSearchText]    = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [tab, setTab]                   = useState('conversations');
  const [pendingFile, setPendingFile]   = useState(null); // File object awaiting send
  const [uploading, setUploading]       = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimer    = useRef(null);
  const fileInputRef   = useRef(null);

  const { data: colleaguesData } = useQuery({
    queryKey: ['colleagues'],
    queryFn: () => usersAPI.getColleagues().then(r => r.data || []),
    staleTime: 60_000,
  });
  const colleagues = colleaguesData || [];

  useEffect(() => { fetchConversations(); }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread]);

  const handleSelectConversation = async (conv) => {
    setSelectedUser(conv.user);
    await openThread(conv.user.id);
    markMessagesRead(conv.user.id);
  };

  const handleSelectColleague = async (colleague) => {
    setSelectedUser(colleague);
    await openThread(colleague.id);
    setTab('conversations');
  };

  const handleSend = async () => {
    if (!selectedUser) return;

    // Send file if pending
    if (pendingFile) {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', pendingFile);
        formData.append('receiverId', selectedUser.id);
        const res = await apiClient.post('/messages/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        // Optimistically add to thread via store refresh
        await openThread(selectedUser.id);
        setPendingFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (e) {
        toast.error('Erreur lors de l\'envoi du fichier');
      } finally {
        setUploading(false);
      }
      // Also send text if any
      if (messageText.trim()) {
        sendMessage(selectedUser.id, messageText.trim());
        setMessageText('');
      }
      return;
    }

    if (!messageText.trim()) return;
    sendMessage(selectedUser.id, messageText.trim());
    setMessageText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleTyping = () => {
    if (!selectedUser) return;
    sendTyping(selectedUser.id);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => sendStopTyping(selectedUser.id), 2000);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Fichier trop volumineux (max 20 Mo)');
      return;
    }
    setPendingFile(file);
  };

  const filteredConversations = conversations.filter(c =>
    !searchText || `${c.user.firstName} ${c.user.lastName}`.toLowerCase().includes(searchText.toLowerCase())
  );
  const filteredColleagues = colleagues.filter(c =>
    !searchText || `${c.firstName} ${c.lastName} ${c.department || ''}`.toLowerCase().includes(searchText.toLowerCase())
  );

  const canSend = !uploading && (!!messageText.trim() || !!pendingFile);

  return (
    <div className="messaging-layout">

      {/* SIDEBAR */}
      <div className="messaging-sidebar">
        <div className="messaging-sidebar__header">
          <h2>Messagerie</h2>
          <div className="messaging-search">
            <Search size={14} />
            <input placeholder="Rechercher…" value={searchText} onChange={e => setSearchText(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 0, marginTop: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 3 }}>
            {[
              { key: 'conversations', icon: <MessageSquare size={13} />, label: 'Messages' },
              { key: 'directory',     icon: <Users size={13} />,         label: `Collègues (${colleagues.length})` },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '6px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 600, background: tab === t.key ? 'var(--accent-primary)' : 'transparent', color: tab === t.key ? 'white' : 'var(--text-muted)', transition: 'all .15s' }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'conversations' && (
          <div className="conversations-list">
            {filteredConversations.length === 0 ? (
              <div className="conversations-empty">
                <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                <p style={{ fontWeight: 600, marginBottom: 4 }}>Aucune conversation</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Cliquez sur "Collègues" pour démarrer</p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const preview = conv.lastMessage?.fileName
                  ? `📎 ${conv.lastMessage.fileName}`
                  : conv.lastMessage?.content?.substring(0, 38) || '...';
                return (
                  <div key={conv.user.id} className={`conversation-item ${selectedUser?.id === conv.user.id ? 'active' : ''}`} onClick={() => handleSelectConversation(conv)}>
                    <Avatar user={conv.user} size={38} />
                    <div className="conversation-item__content">
                      <div className="conversation-item__name">{conv.user.firstName} {conv.user.lastName}</div>
                      <div className="conversation-item__preview">{preview}</div>
                    </div>
                    <div className="conversation-item__meta">
                      <div className="conversation-item__time">{conv.lastMessage?.createdAt ? formatTime(conv.lastMessage.createdAt) : ''}</div>
                      {conv.unreadCount > 0 && <div className="conversation-item__badge">{conv.unreadCount}</div>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === 'directory' && (
          <div className="conversations-list">
            {filteredColleagues.length === 0 ? (
              <div className="conversations-empty">
                <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
                <p>Aucun collègue trouvé</p>
              </div>
            ) : (
              filteredColleagues.map((colleague) => (
                <div key={colleague.id} className={`conversation-item ${selectedUser?.id === colleague.id ? 'active' : ''}`} onClick={() => handleSelectColleague(colleague)}>
                  <Avatar user={colleague} size={38} />
                  <div className="conversation-item__content">
                    <div className="conversation-item__name">{colleague.firstName} {colleague.lastName}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                      {colleague.department && (
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'rgba(99,102,241,0.1)', padding: '1px 6px', borderRadius: 3 }}>{colleague.department}</span>
                      )}
                      <span style={{ fontSize: 10, color: ROLE_COLORS[colleague.role] || '#64748b', fontWeight: 600 }}>{ROLE_LABELS[colleague.role] || colleague.role}</span>
                    </div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                      <Plus size={13} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* CHAT ZONE */}
      <div className="messaging-main">
        {!selectedUser ? (
          <div className="messaging-placeholder">
            <div className="messaging-placeholder__icon">💬</div>
            <h3>Commencer une conversation</h3>
            <p>Sélectionnez un collègue pour envoyer un message</p>
            <button onClick={() => setTab('directory')} style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              <Users size={14} /> Voir les collègues
            </button>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="chat-header">
              <Avatar user={selectedUser} size={38} />
              <div className="chat-header__info">
                <div className="chat-header__name">{selectedUser.firstName} {selectedUser.lastName}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                  {selectedUser.department && <span style={{ color: 'var(--text-muted)' }}>{selectedUser.department}</span>}
                  <span style={{ color: ROLE_COLORS[selectedUser.role] || '#64748b', fontWeight: 600 }}>{ROLE_LABELS[selectedUser.role] || selectedUser.role}</span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="messages-list">
              {activeThread.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: 10 }}>
                  <div style={{ fontSize: 40 }}>👋</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Démarrez la conversation</div>
                  <div style={{ fontSize: 12 }}>Envoyez le premier message à {selectedUser.firstName}</div>
                </div>
              )}
              {activeThread.map((msg, i) => {
                const isOwn     = msg.senderId === user?.id;
                const showDate  = i === 0 || formatDate(msg.createdAt) !== formatDate(activeThread[i - 1]?.createdAt);
                const hasFile   = !!msg.fileUrl;
                const hasText   = !!msg.content?.trim();
                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="messages-date-divider"><span>{formatDate(msg.createdAt)}</span></div>
                    )}
                    <div className={`message ${isOwn ? 'message--own' : 'message--other'}`}>
                      {!isOwn && <Avatar user={selectedUser} size={28} />}
                      <div className="message__bubble">
                        {hasFile && <FileBubble msg={msg} isOwn={isOwn} />}
                        {hasText && <div className="message__text">{msg.content}</div>}
                        <div className="message__time">{formatTime(msg.createdAt)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Pending file preview */}
            {pendingFile && (
              <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)' }}>
                <FilePreview file={pendingFile} onRemove={() => { setPendingFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} />
              </div>
            )}

            {/* Input bar */}
            <div className="chat-input-bar">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.mp4,.mp3"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              {/* Attach button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                title="Joindre un fichier"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0 6px', display: 'flex', alignItems: 'center', flexShrink: 0, transition: 'color .15s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                <Paperclip size={18} />
              </button>

              <textarea
                className="chat-input"
                placeholder={pendingFile ? 'Ajouter un message (optionnel)…' : `Message à ${selectedUser.firstName}…`}
                value={messageText}
                onChange={e => { setMessageText(e.target.value); handleTyping(); }}
                onKeyDown={handleKeyDown}
                rows={1}
              />

              <button
                className="chat-send-btn"
                onClick={handleSend}
                disabled={!canSend}
                style={{ opacity: uploading ? 0.6 : 1 }}
              >
                {uploading
                  ? <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  : <Send size={18} />
                }
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
