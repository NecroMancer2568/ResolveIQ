import React, { useState, useEffect } from 'react';
import type { UserRole } from '../types/api';

interface LandingPageProps {
  onGetStarted: () => void;
  onQuickDemoLogin: (role: UserRole) => void;
}

export function LandingPage({ onGetStarted, onQuickDemoLogin }: LandingPageProps) {
  const [activeScenario, setActiveScenario] = useState<number>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Monitor scroll for floating header elevation
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scenarios = [
    {
      title: 'Subscription Cancellation Dispute',
      query: 'I requested a cancellation last week but was charged $240 for an annual renewal today. I need an immediate reversal.',
      tier: 'Enterprise Tier',
      policies: [
        { name: 'Subscription Terms §2.4', auth: '95% Authority', score: '0.88' },
        { name: 'Refund Exceptions v3.2', auth: '90% Authority', score: '0.82' },
      ],
      memory: {
        id: 201,
        question: 'Customer charged after canceling during grace period',
        outcome: 'Exception refund authorized by Ops under 30-day billing window',
        success: '96% Success',
      },
      arbitration: 'Harmonized: Grace period exception overrides standard non-refundable annual term.',
      resolution: 'Cancellation confirmed; initiated immediate exception refund with Subscription Operations.',
      confidence: 94,
      groundedness: 98,
    },
    {
      title: 'Enterprise API Rate Limit Overage',
      query: 'Our production webhook pipeline hit 429 errors. We upgraded to Scale Tier yesterday. Why are our limits unchanged?',
      tier: 'Scale Tier',
      policies: [
        { name: 'API Quota Provisioning §5.1', auth: '92% Authority', score: '0.91' },
        { name: 'Billing Sync Latency Guide', auth: '88% Authority', score: '0.79' },
      ],
      memory: {
        id: 184,
        question: 'New tier limits not reflected in API gateway within 2 hours',
        outcome: 'Force-refreshed cluster tenant token and granted temporary burst allowance',
        success: '92% Success',
      },
      arbitration: 'Harmonized: Tier change requires cache flush or manual burst token provisioning.',
      resolution: 'Manual token sync initiated. Temporary 2x burst quota applied while cache propagates.',
      confidence: 91,
      groundedness: 95,
    },
    {
      title: 'Hardware Return Outside Standard Window',
      query: 'Received defective hardware 35 days ago. Company was closed for winter holiday. Can I still request an RMA exchange?',
      tier: 'Pro Tier',
      policies: [
        { name: 'Hardware Warranty Policy §1.2', auth: '96% Authority', score: '0.85' },
        { name: 'Holiday Extension Addendum', auth: '85% Authority', score: '0.89' },
      ],
      memory: {
        id: 142,
        question: 'RMA request during holiday shutdown beyond 30 days',
        outcome: 'Holiday calendar days deducted from warranty clock; RMA approved',
        success: '94% Success',
      },
      arbitration: 'Harmonized: Holiday shutdown calendar extension applies to return window calculation.',
      resolution: 'Holiday window adjustment approved. Pre-paid RMA label and expedited replacement dispatched.',
      confidence: 89,
      groundedness: 93,
    },
  ];

  const current = scenarios[activeScenario];

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-page-root">
      {/* ═══════════════════════════════════════════════════════════════════════════
          FLOATING LIQUID GLASS HEADER (PADDED TO CENTER)
          ═══════════════════════════════════════════════════════════════════════════ */}
      <div className={`landing-header-float-wrapper ${scrolled ? 'is-scrolled' : ''}`}>
        <header className="landing-liquid-glass-header" role="banner">
          {/* Brand Logo */}
          <div className="landing-header-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="landing-logo-emblem" aria-hidden="true">
              <span>R</span>
              <div className="landing-logo-glow" />
            </div>
            <div className="landing-logo-text-group">
              <span className="landing-logo-name">ResolveIQ</span>
              <span className="landing-logo-badge">PROVENANCE AI</span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="landing-header-nav" aria-label="Landing Navigation">
            <button className="landing-nav-link" onClick={() => scrollTo('about')}>
              About Info
            </button>
            <button className="landing-nav-link landing-nav-link--highlight" onClick={() => scrollTo('novelty')}>
              Novelty ⬡
            </button>
            <button className="landing-nav-link" onClick={() => scrollTo('services')}>
              Services
            </button>
            <button className="landing-nav-link" onClick={() => scrollTo('workflow')}>
              Workflow
            </button>
          </nav>

          {/* Header Actions */}
          <div className="landing-header-actions">
            <button
              className="landing-btn-signin"
              onClick={onGetStarted}
              title="Sign in to your account"
            >
              Sign In
            </button>
            <button
              className="landing-btn-getstarted"
              onClick={onGetStarted}
              title="Launch ResolveIQ platform"
            >
              <span>Get Started</span>
              <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            {/* Mobile hamburger button */}
            <button
              className="landing-mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </header>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="landing-mobile-dropdown">
            <button className="landing-mobile-link" onClick={() => scrollTo('about')}>About Info</button>
            <button className="landing-mobile-link" onClick={() => scrollTo('novelty')}>Novelty ⬡</button>
            <button className="landing-mobile-link" onClick={() => scrollTo('services')}>Services</button>
            <button className="landing-mobile-link" onClick={() => scrollTo('workflow')}>Workflow</button>
            <div className="landing-mobile-divider" />
            <button className="landing-btn-getstarted" onClick={onGetStarted} style={{ width: '100%', justifyContent: 'center' }}>
              Get Started Now →
            </button>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════
          HERO SECTION WITH CRAZY ANIMATIONS & DUAL-TRACK SIMULATION
          ═══════════════════════════════════════════════════════════════════════════ */}
      <section className="landing-hero" id="hero">
        {/* Ambient liquid orbs and backdrop light grids */}
        <div className="hero-ambient-orb hero-ambient-orb--cyan" />
        <div className="hero-ambient-orb hero-ambient-orb--purple" />
        <div className="hero-ambient-orb hero-ambient-orb--emerald" />
        <div className="hero-cyber-grid" />

        <div className="landing-container hero-content-wrapper">
          {/* Top Showcase Badge */}
          <div className="hero-top-badge fade-in">
            <span className="hero-badge-dot" />
            <span className="hero-badge-text">MICROSOFT AI HACKATHON · RESOLUTION INTELLIGENCE</span>
            <span className="hero-badge-tag">NOVEL GRAPH TOPOLOGY</span>
          </div>

          {/* Bold Gradient Headline */}
          <h1 className="hero-main-title">
            Enterprise Resolution Intelligence with{' '}
            <span className="gradient-text gradient-text--cyan-purple">
              Interactive Provenance
            </span>{' '}
            &amp;{' '}
            <span className="gradient-text gradient-text--emerald">
              Resolution Memory.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="hero-subtitle">
            Say goodbye to hallucinated chatbot responses and black-box AI.
            ResolveIQ dynamically grounds customer answers in verified policy clauses
            and previous answers asked by other users — mapped across an interactive representational graph.
          </p>

          {/* Hero CTAs */}
          <div className="hero-cta-group">
            <button className="hero-primary-btn" onClick={onGetStarted}>
              <span>Get Started Free</span>
              <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            <button className="hero-secondary-btn" onClick={() => scrollTo('novelty')}>
              <span className="hero-btn-icon">⬡</span>
              <span>Explore Provenance Graph</span>
            </button>
          </div>

          {/* 1-Click Role Direct Launchers */}
          <div className="hero-demo-quickbar">
            <span className="hero-demo-quickbar-label">Instant 1-Click Role Review:</span>
            <button
              className="hero-role-chip hero-role-chip--admin"
              onClick={() => onQuickDemoLogin('admin')}
              title="Launch Supervisor Copilot Workspace"
            >
              <span className="role-icon">🛡️</span>
              <span>Admin HITL Copilot</span>
              <span className="chip-badge">Full Workspace</span>
            </button>
            <button
              className="hero-role-chip hero-role-chip--user"
              onClick={() => onQuickDemoLogin('user')}
              title="Launch Live Customer Chat Portal"
            >
              <span className="role-icon">💬</span>
              <span>Customer Portal</span>
              <span className="chip-badge">Chatbot</span>
            </button>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════
              CRAZY INTERACTIVE HERO SHOWCASE: LIVE TOPOLOGY SIMULATOR
              ═══════════════════════════════════════════════════════════════════════ */}
          <div className="hero-interactive-showcase">
            {/* Showcase Header with Scenario Switchers */}
            <div className="showcase-header">
              <div className="showcase-status">
                <div className="live-pulse" />
                <span className="showcase-status-text">LIVE PROVENANCE SYNTHESIS ENGINE</span>
              </div>
              <div className="showcase-tabs">
                {scenarios.map((sc, idx) => (
                  <button
                    key={idx}
                    className={`showcase-tab-btn ${activeScenario === idx ? 'is-active' : ''}`}
                    onClick={() => setActiveScenario(idx)}
                  >
                    Case #{idx + 1}: {sc.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Showcase Body: Multi-Track Animated Pipeline */}
            <div className="showcase-body">
              {/* Level 1: Inbound Customer Query */}
              <div className="showcase-node showcase-node--query">
                <div className="showcase-node-label">
                  <span className="pill pill--blue">Inbound Customer Message</span>
                  <span className="pill pill--ghost">{current.tier}</span>
                </div>
                <div className="showcase-node-text">
                  "{current.query}"
                </div>
              </div>

              {/* Animated Connecting Stream */}
              <div className="showcase-stream-connector">
                <div className="stream-line stream-line--left" />
                <div className="stream-badge">HYBRID RETRIEVAL &amp; MEMORY SEARCH</div>
                <div className="stream-line stream-line--right" />
              </div>

              {/* Level 2: Dual Track (Policies vs Previous Answers Memory) */}
              <div className="showcase-dual-track">
                {/* Track A: Policy Evidence Clauses */}
                <div className="showcase-track-card showcase-track-card--policy">
                  <div className="track-header">
                    <span className="track-icon">📄</span>
                    <div>
                      <h4 className="track-title">Verified Policy Documents</h4>
                      <span className="track-sub">Grounded hybrid lexical + dense retrieval</span>
                    </div>
                  </div>
                  <div className="track-items">
                    {current.policies.map((p, idx) => (
                      <div key={idx} className="track-item track-item--policy">
                        <div className="track-item-name">{p.name}</div>
                        <div className="track-item-tags">
                          <span className="badge-micro badge-micro--cyan">{p.auth}</span>
                          <span className="badge-micro">Score: {p.score}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Track B: Resolution Memory (Novelty - Previous Answers Asked by Others) */}
                <div className="showcase-track-card showcase-track-card--memory">
                  <div className="track-header">
                    <span className="track-icon">🧠</span>
                    <div>
                      <h4 className="track-title">Resolution Memory Precedent</h4>
                      <span className="track-sub">Previous answer asked by another customer</span>
                    </div>
                  </div>
                  <div className="track-items">
                    <div className="track-item track-item--memory">
                      <div className="memory-orig-q">
                        <strong>Precedent #{current.memory.id}:</strong> "{current.memory.question}"
                      </div>
                      <div className="memory-outcome">
                        ↳ Approved: {current.memory.outcome}
                      </div>
                      <div className="memory-meta">
                        <span className="badge-micro badge-micro--purple">★ {current.memory.success}</span>
                        <span className="badge-micro">Vector Match</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Animated Stream to Arbitration Core */}
              <div className="showcase-stream-single">
                <div className="stream-pulse-dot" />
              </div>

              {/* Level 3: Arbitration & Conflict Harmonization */}
              <div className="showcase-node showcase-node--arbitration">
                <div className="showcase-node-label">
                  <span className="pill pill--gold">⚖️ Evidence Arbitration Engine</span>
                  <span className="pill pill--green">✓ 0 Conflicts</span>
                </div>
                <div className="arbitration-text">
                  {current.arbitration}
                </div>
              </div>

              {/* Animated Stream to Resolution Draft */}
              <div className="showcase-stream-single">
                <div className="stream-pulse-dot stream-pulse-dot--green" />
              </div>

              {/* Level 4: Grounded Resolution & Human Review */}
              <div className="showcase-resolution-box">
                <div className="resolution-meta-bar">
                  <div className="res-meta-left">
                    <span className="decision-badge decision-badge--resolve">RESOLVE</span>
                    <span className="confidence-pill">Confidence: {current.confidence}%</span>
                    <span className="grounded-pill">Groundedness: {current.groundedness}%</span>
                  </div>
                  <div className="res-meta-right">
                    <span className="hitl-indicator">✓ Human Supervisor Approved</span>
                  </div>
                </div>
                <div className="resolution-text-content">
                  {current.resolution}
                </div>
                <div className="resolution-claims-strip">
                  <div className="claim-item">
                    <span className="claim-check">✓</span>
                    <span>Clause §2.4 cancellation entailed</span>
                  </div>
                  <div className="claim-item">
                    <span className="claim-check">✓</span>
                    <span>Exception precedent #{current.memory.id} validated</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Showcase Footer CTA */}
            <div className="showcase-footer">
              <div className="showcase-footer-left">
                <span>Want to test this live on custom tickets?</span>
              </div>
              <button className="showcase-cta-btn" onClick={onGetStarted}>
                Launch Live Playground →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════════
          SECTION 1: ABOUT INFO
          ═══════════════════════════════════════════════════════════════════════════ */}
      <section className="landing-section" id="about">
        <div className="landing-container">
          <div className="section-header text-center">
            <span className="section-eyebrow">ABOUT RESOLVEIQ</span>
            <h2 className="section-title">
              Why Traditional Support Chatbots Fail Enterprise Standards
            </h2>
            <p className="section-desc">
              Generic LLMs guess from training weights. When customer refunds, subscriptions, or SLAs are on the line,
              statistical guessing leads to broken promises, compliance violations, and angry customers.
            </p>
          </div>

          <div className="about-grid">
            <div className="about-card about-card--problem">
              <div className="about-card-badge">THE PROBLEM: BLACK-BOX AI</div>
              <ul className="about-card-list">
                <li>
                  <span className="cross-icon">✗</span>
                  <strong>Hallucinated Terms:</strong> Models invent return windows or promise compensation not in company policy.
                </li>
                <li>
                  <span className="cross-icon">✗</span>
                  <strong>Zero Auditability:</strong> Customer service managers have no way to prove which sentence justified a refund.
                </li>
                <li>
                  <span className="cross-icon">✗</span>
                  <strong>Amnesia on Previous Precedents:</strong> Every conversation starts from zero without learning from human supervisor edits.
                </li>
                <li>
                  <span className="cross-icon">✗</span>
                  <strong>Conflicting Policies:</strong> Fails when new addendums contradict older knowledge base articles.
                </li>
              </ul>
            </div>

            <div className="about-card about-card--solution">
              <div className="about-card-badge about-card-badge--glow">THE RESOLVEIQ STANDARD</div>
              <ul className="about-card-list">
                <li>
                  <span className="check-icon">✓</span>
                  <strong>100% Grounded Citations:</strong> Every sentence is verified against official policy PDFs and manuals.
                </li>
                <li>
                  <span className="check-icon">✓</span>
                  <strong>Interactive Provenance Graph:</strong> Complete topological visual graph tracking claims to sources.
                </li>
                <li>
                  <span className="check-icon">✓</span>
                  <strong>Continuous Resolution Memory:</strong> Reuses verified past answers from other users with vector retrieval.
                </li>
                <li>
                  <span className="check-icon">✓</span>
                  <strong>Human-in-the-Loop Safeguards:</strong> High-risk or low-confidence resolutions automatically pause for review.
                </li>
              </ul>
            </div>
          </div>

          {/* Key Metrics Counter Strip */}
          <div className="metrics-strip">
            <div className="metric-box">
              <div className="metric-num">98.4%</div>
              <div className="metric-label">Grounded Entailment Rate</div>
              <div className="metric-sub">Zero unverified statements</div>
            </div>
            <div className="metric-box">
              <div className="metric-num">&lt; 1.2s</div>
              <div className="metric-label">Arbitration &amp; Synthesis</div>
              <div className="metric-sub">Sub-second policy reasoning</div>
            </div>
            <div className="metric-box">
              <div className="metric-num">100%</div>
              <div className="metric-label">Traceable Provenance</div>
              <div className="metric-sub">Every claim mapped to clause</div>
            </div>
            <div className="metric-box">
              <div className="metric-num">4.2x</div>
              <div className="metric-label">Agent Resolution Velocity</div>
              <div className="metric-sub">With 1-click supervisor review</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════════
          SECTION 2: CORE NOVELTY (REPRESENTATIONAL GRAPH & RESOLUTION MEMORY)
          ═══════════════════════════════════════════════════════════════════════════ */}
      <section className="landing-section landing-section--novelty" id="novelty">
        <div className="landing-container">
          <div className="section-header text-center">
            <span className="section-eyebrow section-eyebrow--purple">OUR CORE NOVELTY</span>
            <h2 className="section-title">
              The Representational Graph That Tracks Responses to Evidence &amp; Past Answers
            </h2>
            <p className="section-desc">
              ResolveIQ’s primary scientific breakthrough: we synthesize a live, interactive topological graph
              that visibly links the proposed response to retrieved policy evidence AND prior solutions asked by other users.
            </p>
          </div>

          <div className="novelty-showcase-grid">
            {/* Novelty Column 1 */}
            <div className="novelty-feature-card">
              <div className="novelty-icon-box novelty-icon-box--cyan">
                <span>⬡</span>
              </div>
              <h3 className="novelty-title">Interactive Provenance Topology</h3>
              <p className="novelty-desc">
                An interactive ReactFlow visual canvas with custom node layers showing exactly how raw customer intent
                traversed policy clauses, conflict arbitration, claim verification, and human supervisor sign-off.
              </p>
              <div className="novelty-points">
                <div className="novelty-point">
                  <span className="np-dot np-dot--cyan" />
                  <span>Click-to-inspect drawers for policy excerpts and authority scores</span>
                </div>
                <div className="novelty-point">
                  <span className="np-dot np-dot--cyan" />
                  <span>Color-coded animated edges tracing data flow in real time</span>
                </div>
                <div className="novelty-point">
                  <span className="np-dot np-dot--cyan" />
                  <span>Layer visibility toggles to isolate evidence, memory, and entailment</span>
                </div>
              </div>
            </div>

            {/* Novelty Column 2 */}
            <div className="novelty-feature-card novelty-feature-card--highlight">
              <div className="novelty-icon-box novelty-icon-box--purple">
                <span>🧠</span>
              </div>
              <h3 className="novelty-title">Previous Answers Memory (Other Users)</h3>
              <p className="novelty-desc">
                ResolveIQ maintains an enterprise Resolution Memory bank. When a user asks a difficult question,
                the engine finds prior human-approved resolutions from other users who encountered the exact same issue.
              </p>
              <div className="novelty-points">
                <div className="novelty-point">
                  <span className="np-dot np-dot--purple" />
                  <span>Indexed by semantic problem embedding &amp; historical success score</span>
                </div>
                <div className="novelty-point">
                  <span className="np-dot np-dot--purple" />
                  <span>Ensures organizational consistency across thousands of support reps</span>
                </div>
                <div className="novelty-point">
                  <span className="np-dot np-dot--purple" />
                  <span>Learns from human supervisor edits to continuously refine memory</span>
                </div>
              </div>
            </div>

            {/* Novelty Column 3 */}
            <div className="novelty-feature-card">
              <div className="novelty-icon-box novelty-icon-box--gold">
                <span>⚖️</span>
              </div>
              <h3 className="novelty-title">Automated Policy Conflict Arbitration</h3>
              <p className="novelty-desc">
                When two policy documents disagree (e.g. general 14-day return vs. holiday 30-day extension),
                our Arbitration Core weighs document authority, recency, and customer tier to resolve contradictions.
              </p>
              <div className="novelty-points">
                <div className="novelty-point">
                  <span className="np-dot np-dot--gold" />
                  <span>Discovers contradictions before generating a single word</span>
                </div>
                <div className="novelty-point">
                  <span className="np-dot np-dot--gold" />
                  <span>Weights verified official policies over standard community guides</span>
                </div>
                <div className="novelty-point">
                  <span className="np-dot np-dot--gold" />
                  <span>Flags irreconcilable ambiguities directly to human supervisors</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Graph Callout Box */}
          <div className="graph-cta-banner">
            <div className="graph-cta-content">
              <h3>See the Graph in Full Interactive Screen</h3>
              <p>
                Experience zoom, pan, node inspection, and layer filtering live inside the ResolveIQ Admin supervisor workstation.
              </p>
            </div>
            <button className="landing-btn-getstarted" onClick={onGetStarted}>
              Launch Provenance Graph ⬡
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════════
          SECTION 3: ENTERPRISE SERVICES & SUITE
          ═══════════════════════════════════════════════════════════════════════════ */}
      <section className="landing-section" id="services">
        <div className="landing-container">
          <div className="section-header text-center">
            <span className="section-eyebrow section-eyebrow--green">FULL SERVICE SUITE</span>
            <h2 className="section-title">Enterprise Customer Support Built for High-Stakes Operations</h2>
            <p className="section-desc">
              From automated frontline customer chats to multi-tier human escalation, ResolveIQ provides a synchronized end-to-end stack.
            </p>
          </div>

          <div className="services-grid">
            <div className="service-card">
              <div className="service-icon">💬</div>
              <h3 className="service-title">Autonomous &amp; Supervised Customer Chat</h3>
              <p className="service-desc">
                Dedicated client portal where customers can submit inquiries and receive immediate, policy-verified resolutions with full transparency.
              </p>
              <div className="service-feature-list">
                <span>✓ Natural conversational interaction</span>
                <span>✓ Context extraction (Tier, Urgency, Product)</span>
                <span>✓ Real-time status sync with Admin Copilot</span>
              </div>
            </div>

            <div className="service-card">
              <div className="service-icon">🛡️</div>
              <h3 className="service-title">Human-in-the-Loop (HITL) Supervisor Copilot</h3>
              <p className="service-desc">
                Real-time workstation for support leads to inspect AI-generated drafts, edit responses, approve one-click resolutions, or escalate to Tier-2.
              </p>
              <div className="service-feature-list">
                <span>✓ Side-by-side live chat monitoring</span>
                <span>✓ 1-click Approve, Edit, Escalate, Clarify</span>
                <span>✓ Instant feedback loop into memory</span>
              </div>
            </div>

            <div className="service-card">
              <div className="service-icon">📊</div>
              <h3 className="service-title">Resolution Memory &amp; Historical Precedents</h3>
              <p className="service-desc">
                Searchable repository of all past resolved cases. Supervisors can inspect full analytics, claims verification, and evidence provenance.
              </p>
              <div className="service-feature-list">
                <span>✓ Filter by resolution status and tier</span>
                <span>✓ Full ticket audit trails</span>
                <span>✓ Direct link to historical provenance graph</span>
              </div>
            </div>

            <div className="service-card">
              <div className="service-icon">🔍</div>
              <h3 className="service-title">Knowledge Gap Intelligence</h3>
              <p className="service-desc">
                Automatically identifies clusters of queries where policy evidence was missing or unsupported, providing recommendations for documentation teams.
              </p>
              <div className="service-feature-list">
                <span>✓ Unsupervised query clustering</span>
                <span>✓ Identifies missing policy documentation</span>
                <span>✓ Tracks AI acceptance rates &amp; trends</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════════
          SECTION 4: WORKFLOW ARCHITECTURE
          ═══════════════════════════════════════════════════════════════════════════ */}
      <section className="landing-section landing-section--workflow" id="workflow">
        <div className="landing-container">
          <div className="section-header text-center">
            <span className="section-eyebrow">STEP-BY-STEP ARCHITECTURE</span>
            <h2 className="section-title">The 8-Stage Enterprise Resolution Pipeline</h2>
            <p className="section-desc">
              Every customer message passes through rigorous, deterministic gates before reaching an end user.
            </p>
          </div>

          <div className="workflow-pipeline">
            {[
              {
                step: '01',
                title: 'Customer Query',
                desc: 'User submits inquiry via live chat portal or API.',
                color: 'blue',
              },
              {
                step: '02',
                title: 'AI Understanding',
                desc: 'Extracts intent, product entity, urgency, and customer SLA tier.',
                color: 'cyan',
              },
              {
                step: '03',
                title: 'Hybrid Retrieval',
                desc: 'Simultaneous BM25 lexical keyword + dense semantic vector search.',
                color: 'cyan',
              },
              {
                step: '04',
                title: 'Resolution Memory',
                desc: 'Finds prior approved solutions from other users with high success scores.',
                color: 'purple',
              },
              {
                step: '05',
                title: 'Evidence Arbitration',
                desc: 'Weighs authority, identifies conflicting policies, and harmonizes rules.',
                color: 'gold',
              },
              {
                step: '06',
                title: 'Grounded Generation',
                desc: 'Synthesizes draft response constrained strictly to cited clauses.',
                color: 'green',
              },
              {
                step: '07',
                title: 'Claim Verification',
                desc: 'Sentence-level Natural Language Inference checks entailment.',
                color: 'green',
              },
              {
                step: '08',
                title: 'Human Review (HITL)',
                desc: 'Supervisor approves, edits, or escalates; feedback writes to memory.',
                color: 'cyan',
              },
            ].map((item, idx) => (
              <div key={idx} className="workflow-step-card">
                <div className={`workflow-step-num workflow-step-num--${item.color}`}>{item.step}</div>
                <h4 className="workflow-step-title">{item.title}</h4>
                <p className="workflow-step-desc">{item.desc}</p>
                {idx < 7 && <div className="workflow-step-arrow">→</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════════
          SECTION 5: FINAL CTA BANNER & FOOTER
          ═══════════════════════════════════════════════════════════════════════════ */}
      <section className="landing-section landing-section--cta">
        <div className="landing-container">
          <div className="final-cta-card">
            <div className="final-cta-glow" />
            <h2 className="final-cta-title">
              Ready to Experience Verified Resolution Intelligence?
            </h2>
            <p className="final-cta-desc">
              Test ResolveIQ in real time. Launch as an Admin Supervisor to monitor live chats and explore the provenance graph,
              or test the Customer Chatbot directly.
            </p>

            <div className="final-cta-buttons">
              <button className="final-cta-btn final-cta-btn--primary" onClick={onGetStarted}>
                <span>Get Started Now</span>
                <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>

              <button
                className="final-cta-btn final-cta-btn--admin"
                onClick={() => onQuickDemoLogin('admin')}
              >
                <span>🛡️ Launch Admin HITL Copilot</span>
              </button>

              <button
                className="final-cta-btn final-cta-btn--user"
                onClick={() => onQuickDemoLogin('user')}
              >
                <span>💬 Launch Customer Portal</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-container footer-content">
          <div className="footer-left">
            <div className="landing-header-logo">
              <div className="landing-logo-emblem">R</div>
              <span className="landing-logo-name">ResolveIQ</span>
            </div>
            <p className="footer-tagline">
              Enterprise Customer Support Copilot with Grounded Evidence Arbitration &amp; Interactive Topology.
            </p>
          </div>

          <div className="footer-right">
            <div className="footer-col">
              <h5>Platform</h5>
              <button onClick={() => scrollTo('about')}>About Info</button>
              <button onClick={() => scrollTo('novelty')}>Provenance Graph</button>
              <button onClick={() => scrollTo('services')}>Enterprise Services</button>
              <button onClick={() => scrollTo('workflow')}>Pipeline Workflow</button>
            </div>
            <div className="footer-col">
              <h5>Access</h5>
              <button onClick={onGetStarted}>Admin Sign In</button>
              <button onClick={onGetStarted}>Customer Portal</button>
              <button onClick={() => onQuickDemoLogin('admin')}>1-Click Admin Demo</button>
              <button onClick={() => onQuickDemoLogin('user')}>1-Click User Demo</button>
            </div>
          </div>
        </div>

        <div className="landing-container footer-bottom">
          <span>© 2026 ResolveIQ. Developed for Microsoft AI Hackathon. All rights reserved.</span>
          <span className="footer-tech-stack">Built with React, Vite, FastAPI &amp; ReactFlow</span>
        </div>
      </footer>
    </div>
  );
}
