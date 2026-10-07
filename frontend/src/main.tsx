import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import type { AppPage, AuthUser } from './types/api';
import { AuthPage } from './pages/AuthPage';
import { CopilotPage } from './pages/CopilotPage';
import { CustomerChatPage } from './pages/CustomerChatPage';
import { ResolutionMemoryPage } from './components/Memory/ResolutionMemory';
import { AnalyticsDashboard, KnowledgeGapsPage } from './components/Analytics/AnalyticsDashboard';
import { ProvenanceGraphPage } from './pages/ProvenanceGraphPage';

// ─── Admin Navigation Items ───────────────────────────────────────────────────

const ADMIN_NAV_ITEMS: { id: AppPage; label: string; icon: React.ReactNode }[] = [
  {
    id: 'copilot',
    label: 'Copilot (HITL)',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    ),
  },
  {
    id: 'graph',
    label: 'Provenance Graph',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="18" cy="5" r="3"/>
        <circle cx="6" cy="12" r="3"/>
        <circle cx="18" cy="19" r="3"/>
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
      </svg>
    ),
  },
  {
    id: 'customer',
    label: 'Live Customer View',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
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

// ─── App Shell ────────────────────────────────────────────────────────────────

function App() {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('resolveiq_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [page, setPage] = useState<AppPage>('copilot');
  const [backendOk, setBackendOk] = useState<boolean | null>(null);

  // Quick backend health check
  React.useEffect(() => {
    const api = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api/v1';
    fetch(`${api}/analytics/overview`, { signal: AbortSignal.timeout(5000) })
      .then((r) => setBackendOk(r.ok))
      .catch(() => setBackendOk(false));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('resolveiq_auth_user');
    setUser(null);
  };

  const handleSwitchProfile = () => {
    if (!user) return;
    const switched: AuthUser = user.role === 'admin'
      ? {
          id: 'user-01',
          name: 'Alex Morgan',
          email: 'alex.morgan@novamart.io',
          role: 'user',
          tier: 'pro',
        }
      : {
          id: 'admin-01',
          name: 'Sarah Connor',
          email: 'sarah.hitl@resolveiq.ai',
          role: 'admin',
        };

    localStorage.setItem('resolveiq_auth_user', JSON.stringify(switched));
    setUser(switched);
    if (switched.role === 'user') {
      setPage('customer');
    } else {
      setPage('copilot');
    }
  };

  // If not logged in, render Auth page
  if (!user) {
    return (
      <AuthPage
        onLogin={(loggedInUser) => {
          setUser(loggedInUser);
          if (loggedInUser.role === 'user') {
            setPage('customer');
          } else {
            setPage('copilot');
          }
        }}
      />
    );
  }

  const isCustomer = user.role === 'user';

  return (
    <div className="app-shell">
      {/* Top bar */}
      <header className="topbar" role="banner">
        {/* Logo */}
        <div className="topbar__logo">
          <div className="topbar__logo-mark" aria-hidden="true">R</div>
          <div>
            <span className="topbar__logo-text">ResolveIQ</span>
            <span className="topbar__logo-sub">
              {isCustomer ? 'Customer Support Portal' : 'Human-in-the-Loop Supervision'}
            </span>
          </div>
        </div>

        {/* Navigation: only visible for Admins */}
        {!isCustomer ? (
          <nav className="topbar__nav" aria-label="Main navigation">
            {ADMIN_NAV_ITEMS.map(({ id, label, icon }) => (
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
        ) : (
          <div className="topbar__customer-badge-center">
            <span className="topbar__verified-pill">Verified AI Customer Service</span>
          </div>
        )}

        {/* Right side controls */}
        <div className="topbar__right">
          {/* Azure Engine status */}
          <div className="status-dot" title={backendOk === null ? 'Checking backend…' : backendOk ? 'Backend connected' : 'Backend offline'}>
            <div
              className={`status-dot__indicator ${backendOk === false ? 'offline' : ''}`}
              aria-label={backendOk === false ? 'Backend offline' : 'Backend connected'}
            />
            <span>Azure AI</span>
          </div>

          {/* User Role Pill */}
          <div className={`topbar__role-pill ${isCustomer ? 'customer' : 'admin'}`}>
            <span>{isCustomer ? '👤' : '🛡️'}</span>
            <span className="topbar__role-name">{user.name}</span>
            <span className="topbar__role-tag">
              {isCustomer ? (user.tier ? `${user.tier.toUpperCase()}` : 'USER') : 'ADMIN'}
            </span>
          </div>

          {/* Switch Profile shortcut */}
          <button
            className="topbar__switch-btn"
            onClick={handleSwitchProfile}
            title={isCustomer ? 'Switch to Admin Supervisor view' : 'Switch to Customer Chat view'}
          >
            {isCustomer ? 'Switch to Admin 🛡️' : 'Switch to Customer 💬'}
          </button>

          {/* Logout Button */}
          <button
            className="topbar__logout-btn"
            onClick={handleLogout}
            title="Sign out of ResolveIQ"
            aria-label="Sign out"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="app-body" role="main">
        {/* Customer role is strictly restricted to chatbot */}
        {isCustomer ? (
          <CustomerChatPage />
        ) : (
          <>
            {page === 'copilot'   && <CopilotPage />}
            {page === 'graph'     && (
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
                <ProvenanceGraphPage />
              </div>
            )}
            {page === 'customer'  && <CustomerChatPage />}
            {page === 'memory'    && (
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
                <ResolutionMemoryPage />
              </div>
            )}
            {page === 'analytics' && (
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
                <AnalyticsDashboard />
              </div>
            )}
            {page === 'gaps'      && (
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
                <KnowledgeGapsPage />
              </div>
            )}
          </>
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
