import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import type { AppPage } from './types/api';
import { CopilotPage } from './pages/CopilotPage';
import { ResolutionMemoryPage } from './components/Memory/ResolutionMemory';
import { AnalyticsDashboard, KnowledgeGapsPage } from './components/Analytics/AnalyticsDashboard';

// ─── Nav Items ────────────────────────────────────────────────────────────────

const NAV_ITEMS: { id: AppPage; label: string; icon: React.ReactNode }[] = [
  {
    id: 'copilot',
    label: 'Copilot',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    ),
  },
  {
    id: 'memory',
    label: 'Resolution Memory',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
      </svg>
    ),
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    id: 'gaps',
    label: 'Knowledge Gaps',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
  },
];

// ─── App ──────────────────────────────────────────────────────────────────────

function App() {
  const [page, setPage] = useState<AppPage>('copilot');
  const [backendOk, setBackendOk] = useState<boolean | null>(null);

  // Quick health check
  React.useEffect(() => {
    const api = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api/v1';
    fetch(`${api}/analytics/overview`, { signal: AbortSignal.timeout(5000) })
      .then((r) => setBackendOk(r.ok))
      .catch(() => setBackendOk(false));
  }, []);

  return (
    <div className="app-shell">
      {/* Top bar */}
      <header className="topbar" role="banner">
        {/* Logo */}
        <a className="topbar__logo" href="#" aria-label="ResolveIQ Home">
          <div className="topbar__logo-mark" aria-hidden="true">R</div>
          <div>
            <span className="topbar__logo-text">ResolveIQ</span>
            <span className="topbar__logo-sub">Resolution Intelligence</span>
          </div>
        </a>

        {/* Navigation */}
        <nav className="topbar__nav" aria-label="Main navigation">
          {NAV_ITEMS.map(({ id, label, icon }) => (
            <button
              key={id}
              id={`nav-${id}`}
              className={`topbar__nav-btn ${page === id ? 'active' : ''}`}
              onClick={() => setPage(id)}
              aria-current={page === id ? 'page' : undefined}
              aria-label={label}
            >
              {icon}
              {label}
            </button>
          ))}
        </nav>

        {/* Right side */}
        <div className="topbar__right">
          {/* Azure status */}
          <div className="status-dot" title={backendOk === null ? 'Checking backend…' : backendOk ? 'Backend connected' : 'Backend offline'}>
            <div
              className={`status-dot__indicator ${backendOk === false ? 'offline' : ''}`}
              aria-label={backendOk === false ? 'Backend offline' : 'Backend connected'}
            />
            <span style={{ display: 'none' }}>
              {backendOk === null ? '…' : backendOk ? 'Azure AI' : 'Offline'}
            </span>
            Azure AI
          </div>

          {/* User avatar */}
          <div className="avatar" aria-label="User menu" role="button" tabIndex={0}>
            AM
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="app-body" role="main">
        {page === 'copilot'    && <CopilotPage />}
        {page === 'memory'     && (
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
            <ResolutionMemoryPage />
          </div>
        )}
        {page === 'analytics'  && (
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
            <AnalyticsDashboard />
          </div>
        )}
        {page === 'gaps'       && (
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
            <KnowledgeGapsPage />
          </div>
        )}
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
