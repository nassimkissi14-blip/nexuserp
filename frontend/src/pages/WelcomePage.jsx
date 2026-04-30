import { Link } from 'react-router-dom';

export default function WelcomePage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', textAlign: 'center' }}>
      <div>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎉</div>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '12px' }}>Bienvenue sur NexusERP !</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Votre compte a été créé avec succès.</p>
        <Link to="/login" className="btn btn--primary">Se connecter maintenant</Link>
      </div>
    </div>
  );
}