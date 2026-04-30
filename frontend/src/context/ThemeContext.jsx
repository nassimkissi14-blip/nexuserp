import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('nexuserp_theme');
    return saved ? saved === 'dark' : true; // dark par défaut
  });

  useEffect(() => {
    localStorage.setItem('nexuserp_theme', darkMode ? 'dark' : 'light');

    // Applique les variables CSS globalement
    const root = document.documentElement;
    if (darkMode) {
      /* ── Premium dark palette (Stripe / Linear inspired) ── */
      root.style.setProperty('--bg-primary',      '#04060f');
      root.style.setProperty('--bg-secondary',    '#070b18');
      root.style.setProperty('--bg-card',         '#0b1120');
      root.style.setProperty('--bg-card-hover',   '#0f1729');
      root.style.setProperty('--bg-elevated',     '#111827');
      root.style.setProperty('--bg-sidebar',      '#060a16');
      root.style.setProperty('--border',          'rgba(255,255,255,0.07)');
      root.style.setProperty('--border-light',    'rgba(255,255,255,0.12)');
      root.style.setProperty('--border-focus',    'rgba(99,102,241,0.6)');
      root.style.setProperty('--text-primary',    '#f1f5ff');
      root.style.setProperty('--text-secondary',  '#8b9cbf');
      root.style.setProperty('--text-muted',      '#3d4f6e');
      root.style.setProperty('--text-accent',     '#818cf8');
      root.style.setProperty('--color-text-primary',   '#f1f5ff');
      root.style.setProperty('--color-text-secondary', '#8b9cbf');
      root.style.setProperty('--color-bg-card',        '#0b1120');
      document.body.style.background = '#04060f';
      document.body.style.color = '#f1f5ff';
    } else {
      /* ── Premium light palette ── */
      root.style.setProperty('--bg-primary',      '#f0f2f8');
      root.style.setProperty('--bg-secondary',    '#e8ecf4');
      root.style.setProperty('--bg-card',         '#ffffff');
      root.style.setProperty('--bg-card-hover',   '#f8f9fc');
      root.style.setProperty('--bg-elevated',     '#f5f7fb');
      root.style.setProperty('--bg-sidebar',      '#1a1f35');
      root.style.setProperty('--border',          'rgba(0,0,0,0.08)');
      root.style.setProperty('--border-light',    'rgba(0,0,0,0.12)');
      root.style.setProperty('--border-focus',    'rgba(99,102,241,0.5)');
      root.style.setProperty('--text-primary',    '#0f172a');
      root.style.setProperty('--text-secondary',  '#334155');
      root.style.setProperty('--text-muted',      '#64748b');
      root.style.setProperty('--text-accent',     '#4f46e5');
      root.style.setProperty('--color-text-primary',   '#0f172a');
      root.style.setProperty('--color-text-secondary', '#334155');
      root.style.setProperty('--color-bg-card',        '#ffffff');
      document.body.style.background = '#f0f2f8';
      document.body.style.color = '#0f172a';
    }
  }, [darkMode]);

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode, toggle: () => setDarkMode(d => !d) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);