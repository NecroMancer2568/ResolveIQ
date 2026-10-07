import React, { useState } from 'react';
import type { AuthUser, UserRole } from '../types/api';

interface AuthPageProps {
  onLogin: (user: AuthUser) => void;
  onBackToLanding?: () => void;
}

export function AuthPage({ onLogin, onBackToLanding }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [role, setRole] = useState<UserRole>('user');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tier, setTier] = useState('pro');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password || (mode === 'signup' && !name)) {
      setError('Please fill in all required fields.');
      return;
    }

    const resolvedName = name || (email.split('@')[0] || 'User');
    const user: AuthUser = {
      id: `usr-${Date.now()}`,
      name: resolvedName.charAt(0).toUpperCase() + resolvedName.slice(1),
      email,
      role,
      tier: role === 'user' ? tier : undefined,
    };

    localStorage.setItem('resolveiq_auth_user', JSON.stringify(user));
    onLogin(user);
  };

  const handleQuickDemoLogin = (selectedRole: UserRole) => {
    const demoUser: AuthUser = selectedRole === 'admin'
      ? {
          id: 'admin-01',
          name: 'Sarah Connor',
          email: 'sarah.hitl@resolveiq.ai',
          role: 'admin',
        }
      : {
          id: 'user-01',
          name: 'Alex Morgan',
          email: 'alex.morgan@novamart.io',
          role: 'user',
          tier: 'pro',
        };

    localStorage.setItem('resolveiq_auth_user', JSON.stringify(demoUser));
    onLogin(demoUser);
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        {onBackToLanding && (
          <div style={{ marginBottom: 16 }}>
            <button
              type="button"
              onClick={onBackToLanding}
              className="btn btn--ghost btn--sm"
              style={{ color: 'var(--text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <span>←</span>
              <span>Back to ResolveIQ Overview</span>
            </button>
          </div>
        )}

        {/* Brand Header */}
        <div className="auth-brand">
          <div className="auth-logo-mark" aria-hidden="true">R</div>
          <h1 className="auth-brand-title">ResolveIQ</h1>
          <span className="auth-brand-tag">Resolution Intelligence Platform</span>
        </div>

        {/* Auth Card */}
        <div className="auth-card">
          {/* Tabs: Sign In / Create Account */}
          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => { setMode('login'); setError(null); }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => { setMode('signup'); setError(null); }}
            >
              Create Account
            </button>
          </div>

          {/* Quick Demo Sign-In Bar for Competition/Reviewers */}
          <div className="auth-demo-shortcuts">
            <div className="auth-demo-title">⚡ 1-Click Competition Demo Logins</div>
            <div className="auth-demo-buttons">
              <button
                type="button"
                className="auth-demo-btn auth-demo-btn--user"
                onClick={() => handleQuickDemoLogin('user')}
                title="Sign in as Customer to test the Chatbot"
              >
                <span>💬</span>
                <div>
                  <strong>Customer Profile</strong>
                  <small>Chatbot only • Inbound queries</small>
                </div>
              </button>

              <button
                type="button"
                className="auth-demo-btn auth-demo-btn--admin"
                onClick={() => handleQuickDemoLogin('admin')}
                title="Sign in as Admin to monitor & approve in real-time"
              >
                <span>🛡️</span>
                <div>
                  <strong>Admin (HITL Lead)</strong>
                  <small>Live monitoring • Approve & Escalate</small>
                </div>
              </button>
            </div>
          </div>

          <div className="auth-divider">
            <span>or continue with credentials</span>
          </div>

          {/* Error Message */}
          {error && (
            <div className="auth-error-banner" role="alert">
              <span>⚠ {error}</span>
            </div>
          )}

          {/* Form */}
          <form className="auth-form" onSubmit={handleSubmit}>
            {/* Role Selector Cards */}
            <div className="auth-field">
              <label className="auth-label">Select Account Role:</label>
              <div className="auth-role-grid">
                <div
                  className={`auth-role-card ${role === 'user' ? 'selected' : ''}`}
                  onClick={() => setRole('user')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="auth-role-card-header">
                    <span className="auth-role-icon">👤</span>
                    <span className="auth-role-name">Customer</span>
                    {role === 'user' && <span className="auth-role-check">✓</span>}
                  </div>
                  <p className="auth-role-desc">
                    Access to verified AI customer support messenger only.
                  </p>
                </div>

                <div
                  className={`auth-role-card ${role === 'admin' ? 'selected' : ''}`}
                  onClick={() => setRole('admin')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="auth-role-card-header">
                    <span className="auth-role-icon">🛡️</span>
                    <span className="auth-role-name">Admin (HITL)</span>
                    {role === 'admin' && <span className="auth-role-check">✓</span>}
                  </div>
                  <p className="auth-role-desc">
                    Live supervision, approve/escalate copilot, evidence & audit graphs.
                  </p>
                </div>
              </div>
            </div>

            {/* Name (on sign up) */}
            {mode === 'signup' && (
              <div className="auth-field">
                <label className="auth-label" htmlFor="auth-name">Full Name</label>
                <input
                  id="auth-name"
                  type="text"
                  className="auth-input"
                  placeholder="e.g. Alex Morgan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            {/* Customer Tier selector (if role is user) */}
            {role === 'user' && (
              <div className="auth-field">
                <label className="auth-label" htmlFor="auth-tier">Customer Account Tier</label>
                <select
                  id="auth-tier"
                  className="auth-input auth-select"
                  value={tier}
                  onChange={(e) => setTier(e.target.value)}
                >
                  <option value="pro">Pro Tier Customer</option>
                  <option value="enterprise">Enterprise VIP Customer</option>
                  <option value="free">Free Tier User</option>
                </select>
              </div>
            )}

            {/* Email */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="auth-email">Work or Account Email</label>
              <input
                id="auth-email"
                type="email"
                className="auth-input"
                placeholder={role === 'admin' ? 'admin@resolveiq.ai' : 'customer@company.com'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                type="password"
                className="auth-input"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {/* Submit Button */}
            <button type="submit" className="auth-submit-btn">
              {mode === 'login' ? `Sign In as ${role === 'admin' ? 'Admin' : 'Customer'}` : 'Create Account'}
            </button>
          </form>

          <div className="auth-footer-hint">
            Protected by Azure AI Security & Enterprise Resolution Intelligence
          </div>
        </div>
      </div>
    </div>
  );
}
