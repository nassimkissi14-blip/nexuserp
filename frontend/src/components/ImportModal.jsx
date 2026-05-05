import { useState, useRef } from 'react';
import apiClient from '../api/client.js';
import toast from 'react-hot-toast';
import { Upload, Download, X, CheckCircle, AlertTriangle } from 'lucide-react';

export default function ImportModal({ type, label, onClose, onSuccess }) {
  const [file, setFile]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const inputRef = useRef();

  const downloadTemplate = () => {
    const a = document.createElement('a');
    a.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'}/import/template/${type}`;
    a.setAttribute('download', `template-${type}.xlsx`);
    // Add auth header via fetch
    fetch(a.href, { headers: { Authorization: `Bearer ${localStorage.getItem('nexuserp_token')}` } })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        a.href = url;
        a.click();
        URL.revokeObjectURL(url);
      });
  };

  const handleImport = async () => {
    if (!file) return toast.error('Sélectionnez un fichier');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiClient.post(`/import/${type}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data.data);
      if (res.data.data.created > 0) {
        toast.success(`✅ ${res.data.data.created} ${label} importé(s) !`);
        onSuccess?.();
      }
    } catch (e) {
      toast.error(e?.message || 'Erreur import');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.65)',backdropFilter:'blur(4px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }} onClick={onClose}>
      <div style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,width:'100%',maxWidth:500 }} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'18px 24px',borderBottom:'1px solid var(--border)' }}>
          <div style={{ fontWeight:700,fontSize:16 }}>📥 Importer {label}</div>
          <button onClick={onClose} style={{ background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer',fontSize:20 }}><X size={18}/></button>
        </div>

        <div style={{ padding:24 }}>
          {/* Template download */}
          <button onClick={downloadTemplate} style={{ display:'flex',alignItems:'center',gap:8,width:'100%',padding:'10px 14px',background:'rgba(99,102,241,0.07)',border:'1px dashed rgba(99,102,241,0.35)',borderRadius:10,color:'#818cf8',cursor:'pointer',fontSize:13,fontWeight:600,marginBottom:20,justifyContent:'center' }}>
            <Download size={15}/> Télécharger le modèle Excel
          </button>

          {/* Drop zone */}
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); setFile(e.dataTransfer.files[0]); setResult(null); }}
            style={{ border:`2px dashed ${file ? 'var(--accent-primary)' : 'var(--border)'}`,borderRadius:12,padding:'32px 20px',textAlign:'center',cursor:'pointer',transition:'border-color .2s',background: file ? 'rgba(99,102,241,0.04)' : 'transparent' }}
          >
            <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display:'none' }} onChange={e => { setFile(e.target.files[0]); setResult(null); }}/>
            <Upload size={28} style={{ color:'var(--text-muted)', marginBottom:10 }}/>
            {file ? (
              <div>
                <div style={{ fontWeight:600,color:'var(--accent-primary)',fontSize:14 }}>📄 {file.name}</div>
                <div style={{ fontSize:12,color:'var(--text-muted)',marginTop:4 }}>{(file.size/1024).toFixed(1)} Ko</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize:14,fontWeight:600,color:'var(--text-secondary)',marginBottom:4 }}>Glisser-déposer ou cliquer</div>
                <div style={{ fontSize:12,color:'var(--text-muted)' }}>Fichier Excel (.xlsx) ou CSV</div>
              </div>
            )}
          </div>

          {/* Result */}
          {result && (
            <div style={{ marginTop:16,padding:14,background: result.created > 0 ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.07)',border:`1px solid ${result.created > 0 ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,borderRadius:10 }}>
              <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom: result.errors?.length ? 8 : 0 }}>
                {result.created > 0 ? <CheckCircle size={15} color="#10b981"/> : <AlertTriangle size={15} color="#ef4444"/>}
                <span style={{ fontWeight:600,fontSize:13 }}>
                  {result.created} importé(s) · {result.skipped} ignoré(s)
                </span>
              </div>
              {result.errors?.slice(0,5).map((e,i) => (
                <div key={i} style={{ fontSize:11,color:'#ef4444',marginTop:3 }}>⚠ {e}</div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div style={{ display:'flex',gap:10,marginTop:20 }}>
            <button onClick={onClose} style={{ flex:1,padding:'9px 0',borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--text-secondary)',cursor:'pointer',fontSize:13 }}>Fermer</button>
            <button onClick={handleImport} disabled={!file||loading} style={{ flex:2,padding:'9px 0',borderRadius:8,border:'none',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'white',cursor: file&&!loading ? 'pointer' : 'not-allowed',opacity: file&&!loading ? 1 : 0.6,fontSize:13,fontWeight:600 }}>
              {loading ? 'Import en cours…' : '⬆ Lancer l\'import'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
