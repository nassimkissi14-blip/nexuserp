import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '60vh', padding: 40, textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
          Une erreur est survenue
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24, maxWidth: 400 }}>
          Ce module a rencontré un problème. Cliquez sur "Recharger" pour réessayer.
        </p>
        {this.state.error && (
          <pre style={{
            fontSize: 11, color: '#ef4444', background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8,
            padding: '10px 16px', marginBottom: 24, maxWidth: 500,
            textAlign: 'left', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {this.state.error.message}
          </pre>
        )}
        <button
          onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
          style={{
            padding: '10px 24px', background: '#6366f1', color: 'white',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600,
          }}
        >
          Recharger la page
        </button>
      </div>
    );
  }
}
