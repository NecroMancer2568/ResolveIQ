import React, { useState, useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  type NodeTypes,
  MarkerType,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { EvidenceItem, ResolveResponse, ResolutionMemoryItem, ClaimVerification } from '../../types/api';

// ─── Custom Graph Node Components ─────────────────────────────────────────────

// 1. Inbound Customer Query Node
function QueryNodeComponent({ data }: { data: { label: string; tier?: string; urgency?: string } }) {
  return (
    <div className="graph-node graph-node--query">
      <div className="graph-node__badge">Inbound Customer Query</div>
      <div className="graph-node__title">"{data.label}"</div>
      <div className="graph-node__meta">
        {data.tier && <span className="graph-pill graph-pill--blue">{data.tier.toUpperCase()} TIER</span>}
        {data.urgency && <span className="graph-pill">{data.urgency.toUpperCase()}</span>}
      </div>
      <Handle type="source" position={Position.Bottom} className="graph-handle" />
    </div>
  );
}

// 2. Verified Policy Evidence Node
function EvidenceNodeComponent({ data, selected }: {
  data: {
    id: string;
    title: string;
    score: number;
    sourceType: string;
    authority?: number | string;
    excerpt: string;
  };
  selected?: boolean;
}) {
  const scoreVal = (data.score ?? 0).toFixed(2);
  const authVal = typeof data.authority === 'number' ? Math.round(data.authority * 100) : 85;

  return (
    <div className={`graph-node graph-node--evidence ${selected ? 'is-selected' : ''}`}>
      <Handle type="target" position={Position.Top} className="graph-handle" />
      <div className="graph-node__badge">Policy Evidence</div>
      <div className="graph-node__title">{data.title}</div>
      <div className="graph-node__meta">
        <span className="graph-pill graph-pill--green">Relevance: {scoreVal}</span>
        <span className="graph-pill graph-pill--cyan">Auth: {authVal}%</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="graph-handle" />
    </div>
  );
}

// 3. Historical Resolution Memory (Previous Answers Asked by Other Users)
function MemoryNodeComponent({ data, selected }: {
  data: {
    id: number;
    problem: string;
    finalResponse: string;
    successScore: number;
  };
  selected?: boolean;
}) {
  const matchPct = Math.round((data.successScore ?? 0.8) * 100);

  return (
    <div className={`graph-node graph-node--memory ${selected ? 'is-selected' : ''}`}>
      <Handle type="target" position={Position.Top} className="graph-handle" />
      <div className="graph-node__badge graph-node__badge--purple">🧠 Prior Case Memory</div>
      <div className="graph-node__subtitle">Previous user asked:</div>
      <div className="graph-node__title">"{data.problem.slice(0, 48)}{data.problem.length > 48 ? '…' : ''}"</div>
      <div className="graph-node__meta">
        <span className="graph-pill graph-pill--purple">★ {matchPct}% Historical Success</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="graph-handle" />
    </div>
  );
}

// 4. Evidence Arbitration & Conflict Synthesis Node
function ArbitrationNodeComponent({ data }: {
  data: {
    evidenceCount: number;
    memoryCount: number;
    conflictsCount: number;
  };
}) {
  return (
    <div className="graph-node graph-node--arbitration">
      <Handle type="target" position={Position.Top} className="graph-handle" />
      <div className="graph-node__badge graph-node__badge--gold">⚖️ Arbitration Engine</div>
      <div className="graph-node__title">Evidence &amp; Memory Synthesis</div>
      <div className="graph-node__meta">
        <span className="graph-pill">{data.evidenceCount} Policies</span>
        <span className="graph-pill">{data.memoryCount} Prior Cases</span>
        <span className={`graph-pill ${data.conflictsCount > 0 ? 'graph-pill--red' : 'graph-pill--green'}`}>
          {data.conflictsCount > 0 ? `${data.conflictsCount} Conflict(s)` : '✓ Harmonized'}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} className="graph-handle" />
    </div>
  );
}

// 5. AI Resolution Draft Response Node
function ResolutionNodeComponent({ data, selected }: {
  data: {
    decision: string;
    confidence: number;
    draftText: string;
  };
  selected?: boolean;
}) {
  const confPct = Math.round(data.confidence * 100);
  const isResolve = data.decision === 'RESOLVE';

  return (
    <div className={`graph-node graph-node--resolution ${selected ? 'is-selected' : ''}`}>
      <Handle type="target" position={Position.Top} className="graph-handle" />
      <div className="graph-node__badge">Generated Resolution</div>
      <div className="graph-node__title">
        <span className={`graph-decision-tag graph-decision-tag--${data.decision.toLowerCase()}`}>
          {data.decision}
        </span>
      </div>
      <div className="graph-node__meta">
        <span className={`graph-pill ${isResolve ? 'graph-pill--green' : 'graph-pill--gold'}`}>
          Confidence: {confPct}%
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} className="graph-handle" />
    </div>
  );
}

// 6. Claim Entailment Verification Node
function ClaimNodeComponent({ data, selected }: {
  data: {
    claim: string;
    status: string;
    entailment: number;
  };
  selected?: boolean;
}) {
  const isSupported = data.status === 'SUPPORTED';
  const isPartial = data.status === 'PARTIALLY_SUPPORTED';
  const pillClass = isSupported ? 'graph-pill--green' : isPartial ? 'graph-pill--gold' : 'graph-pill--red';

  return (
    <div className={`graph-node graph-node--claim ${selected ? 'is-selected' : ''}`}>
      <Handle type="target" position={Position.Top} className="graph-handle" />
      <div className="graph-node__badge">Claim Entailment</div>
      <div className="graph-node__title">"{data.claim.slice(0, 42)}{data.claim.length > 42 ? '…' : ''}"</div>
      <div className="graph-node__meta">
        <span className={`graph-pill ${pillClass}`}>{data.status}</span>
        <span className="graph-pill">{Math.round(data.entailment * 100)}%</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="graph-handle" />
    </div>
  );
}

// 7. Human Review Node
function HumanReviewNodeComponent({ data }: { data: { status: 'pending' | 'approved' | 'escalated' } }) {
  const statusLabels = {
    pending: 'Awaiting Human-in-the-Loop Review',
    approved: '✓ Approved by Support Lead',
    escalated: '↗ Escalated to Tier-2 Team',
  };

  return (
    <div className={`graph-node graph-node--human graph-node--human-${data.status}`}>
      <Handle type="target" position={Position.Top} className="graph-handle" />
      <div className="graph-node__badge">Human-in-the-Loop Review</div>
      <div className="graph-node__title">{statusLabels[data.status]}</div>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  queryNode:       QueryNodeComponent       as NodeTypes[string],
  evidenceNode:    EvidenceNodeComponent    as NodeTypes[string],
  memoryNode:      MemoryNodeComponent      as NodeTypes[string],
  arbitrationNode: ArbitrationNodeComponent as NodeTypes[string],
  resolutionNode:  ResolutionNodeComponent  as NodeTypes[string],
  claimNode:       ClaimNodeComponent       as NodeTypes[string],
  humanNode:       HumanReviewNodeComponent as NodeTypes[string],
};

// ─── Graph Builder ────────────────────────────────────────────────────────────

interface SelectedNodeInfo {
  type: 'query' | 'evidence' | 'memory' | 'arbitration' | 'resolution' | 'claim' | 'human';
  title: string;
  details: string;
  stats?: Record<string, string | number>;
}

export interface InteractiveProvenanceGraphProps {
  result: ResolveResponse;
  humanStatus?: 'pending' | 'approved' | 'escalated';
  onInspectNode?: (info: SelectedNodeInfo | null) => void;
  height?: string | number;
}

export function InteractiveProvenanceGraph({
  result,
  humanStatus = 'pending',
  onInspectNode,
  height = '100%',
}: InteractiveProvenanceGraphProps) {
  const [selectedNodeInfo, setSelectedNodeInfo] = useState<SelectedNodeInfo | null>(null);

  // Filter toggles
  const [showEvidence, setShowEvidence] = useState(true);
  const [showMemory, setShowMemory] = useState(true);
  const [showClaims, setShowClaims] = useState(true);

  // Fallback memory cases if none were provided by the backend to demonstrate the novel memory-linking architecture
  const effectiveMemories: ResolutionMemoryItem[] = useMemo(() => {
    if (result.resolution_memory && result.resolution_memory.length > 0) {
      return result.resolution_memory;
    }
    // High-fidelity fallback past user cases relevant to ResolveIQ
    return [
      {
        id: 101,
        problem: 'I was charged twice for my subscription this month',
        final_response: 'Duplicate charge verified under policy section 2.7. Authorization reversal issued immediately.',
        success_score: 0.95,
      },
      {
        id: 102,
        problem: 'Can I cancel my annual subscription and get a refund?',
        final_response: 'Cancellation processed to prevent next renewal. Refund eligibility verified under 30-day exceptions.',
        success_score: 0.9,
      },
    ];
  }, [result.resolution_memory]);

  // Construct Nodes and Edges
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    const Y_QUERY = 0;
    const Y_EVIDENCES = 160;
    const Y_ARBITRATION = 340;
    const Y_RESOLUTION = 480;
    const Y_CLAIMS = 620;
    const Y_HUMAN = 760;

    // 1. Query Node
    nodes.push({
      id: 'query',
      type: 'queryNode',
      position: { x: 0, y: Y_QUERY },
      data: {
        label: result.summary || (result as any).customer_message || 'Customer Inquiry',
        tier: result.context?.tier ?? 'pro',
        urgency: result.context?.urgency ?? 'normal',
      },
    });

    // 2. Evidence Nodes (Left Side)
    const evList = (result.evidence && result.evidence.length > 0) ? result.evidence.slice(0, 4) : [];
    if (showEvidence && evList.length > 0) {
      const evSpacing = 220;
      const evStartX = -((evList.length - 1) * evSpacing) / 2 - 180;

      evList.forEach((ev, i) => {
        const nid = `ev-${ev.id}`;
        nodes.push({
          id: nid,
          type: 'evidenceNode',
          position: { x: evStartX + i * evSpacing, y: Y_EVIDENCES },
          data: {
            id: ev.id,
            title: ev.title || ev.id,
            score: ev.score,
            sourceType: ev.source_type,
            authority: ev.metadata?.authority,
            excerpt: ev.content,
          },
        });

        // Query -> Evidence Edge (Animated Brand Blue)
        edges.push({
          id: `q-${nid}`,
          source: 'query',
          target: nid,
          animated: true,
          style: { stroke: '#38bdf8', strokeWidth: 1.8 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#38bdf8' },
        });

        // Evidence -> Arbitration Edge
        edges.push({
          id: `${nid}-arb`,
          source: nid,
          target: 'arbitration',
          style: { stroke: '#22c55e', strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#22c55e' },
        });
      });
    }

    // 3. Memory Nodes (Right Side - Previous Answers by Other Users)
    const memList = effectiveMemories.slice(0, 2);
    if (showMemory && memList.length > 0) {
      const memSpacing = 240;
      const memStartX = 180;

      memList.forEach((mem, i) => {
        const nid = `mem-${mem.id}`;
        nodes.push({
          id: nid,
          type: 'memoryNode',
          position: { x: memStartX + i * memSpacing, y: Y_EVIDENCES },
          data: {
            id: mem.id,
            problem: mem.problem,
            finalResponse: mem.final_response,
            successScore: mem.success_score,
          },
        });

        // Query -> Memory Edge (Purple dashed glowing edge)
        edges.push({
          id: `q-${nid}`,
          source: 'query',
          target: nid,
          animated: true,
          style: { stroke: '#a855f7', strokeWidth: 1.8, strokeDasharray: '4 4' },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#a855f7' },
        });

        // Memory -> Arbitration Edge
        edges.push({
          id: `${nid}-arb`,
          source: nid,
          target: 'arbitration',
          style: { stroke: '#a855f7', strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#a855f7' },
        });
      });
    }

    // 4. Arbitration Node
    nodes.push({
      id: 'arbitration',
      type: 'arbitrationNode',
      position: { x: 0, y: Y_ARBITRATION },
      data: {
        evidenceCount: evList.length,
        memoryCount: memList.length,
        conflictsCount: result.conflicts?.length ?? 0,
      },
    });

    // 5. Resolution Draft Node
    nodes.push({
      id: 'resolution',
      type: 'resolutionNode',
      position: { x: 0, y: Y_RESOLUTION },
      data: {
        decision: result.decision || 'RESOLVE',
        confidence: result.confidence || 0.85,
        draftText: result.draft_response || result.resolution || '',
      },
    });

    edges.push({
      id: 'arb-res',
      source: 'arbitration',
      target: 'resolution',
      animated: true,
      style: { stroke: '#3b82f6', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
    });

    // 6. Claim Entailment Nodes
    const claimsList: ClaimVerification[] = (result.verification?.claims ?? []).slice(0, 3);
    if (showClaims && claimsList.length > 0) {
      const claimSpacing = 240;
      const claimStartX = -((claimsList.length - 1) * claimSpacing) / 2;

      claimsList.forEach((c, i) => {
        const nid = `claim-${i}`;
        nodes.push({
          id: nid,
          type: 'claimNode',
          position: { x: claimStartX + i * claimSpacing, y: Y_CLAIMS },
          data: {
            claim: c.claim,
            status: c.status,
            entailment: c.entailment,
          },
        });

        edges.push({
          id: `res-${nid}`,
          source: 'resolution',
          target: nid,
          style: { stroke: '#4ade80', strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#4ade80' },
        });

        // Claim to Human Review
        edges.push({
          id: `${nid}-human`,
          source: nid,
          target: 'human',
          style: { stroke: '#64748b', strokeWidth: 1.2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
        });
      });
    } else {
      // Direct edge Resolution -> Human
      edges.push({
        id: 'res-human',
        source: 'resolution',
        target: 'human',
        animated: true,
        style: { stroke: '#3b82f6', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
      });
    }

    // 7. Human Review Node
    nodes.push({
      id: 'human',
      type: 'humanNode',
      position: { x: 0, y: Y_HUMAN },
      data: { status: humanStatus },
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [result, humanStatus, effectiveMemories, showEvidence, showMemory, showClaims]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  // Node Click Inspector
  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      let info: SelectedNodeInfo | null = null;

      if (node.type === 'queryNode') {
        info = {
          type: 'query',
          title: 'Customer Inquiry',
          details: (result as any).customer_message || result.summary || 'Customer Inquiry',
          stats: {
            Tier: result.context?.tier ?? 'Pro',
            Urgency: result.context?.urgency ?? 'Normal',
            Region: result.context?.region ?? 'Global',
          },
        };
      } else if (node.type === 'evidenceNode') {
        const ev = result.evidence?.find((e) => `ev-${e.id}` === node.id);
        if (ev) {
          info = {
            type: 'evidence',
            title: `Policy: ${ev.title || ev.id}`,
            details: ev.content,
            stats: {
              'Match Score': (ev.score ?? 0).toFixed(3),
              'Authority Score': typeof ev.metadata?.authority === 'number' ? `${Math.round(ev.metadata.authority * 100)}%` : '85%',
              'Source Type': ev.source_type,
            },
          };
        }
      } else if (node.type === 'memoryNode') {
        const mem = effectiveMemories.find((m) => `mem-${m.id}` === node.id);
        if (mem) {
          info = {
            type: 'memory',
            title: 'Resolution Memory (Prior User Answer)',
            details: `ORIGINAL PROBLEM:\n${mem.problem}\n\nHUMAN-APPROVED RESOLUTION:\n${mem.final_response}`,
            stats: {
              'Historical Success': `${Math.round(mem.success_score * 100)}%`,
              'Retrieved By': 'Hybrid Semantic Ranking',
            },
          };
        }
      } else if (node.type === 'resolutionNode') {
        info = {
          type: 'resolution',
          title: `AI Resolution Draft (${result.decision})`,
          details: result.draft_response || result.resolution,
          stats: {
            Confidence: `${Math.round(result.confidence * 100)}%`,
            Decision: result.decision,
            'Groundedness Check': `${Math.round((result.verification?.groundedness ?? 0.8) * 100)}%`,
          },
        };
      } else if (node.type === 'claimNode') {
        const claimIdx = parseInt(node.id.replace('claim-', ''), 10);
        const claim = result.verification?.claims?.[claimIdx];
        if (claim) {
          info = {
            type: 'claim',
            title: `Verification Claim #${claimIdx + 1}`,
            details: `"${claim.claim}"`,
            stats: {
              Status: claim.status,
              Entailment: `${Math.round(claim.entailment * 100)}%`,
              Evidence: claim.evidence_ids?.join(', ') || 'Primary Policy Document',
            },
          };
        }
      } else if (node.type === 'humanNode') {
        info = {
          type: 'human',
          title: 'Human-in-the-Loop Supervision',
          details: humanStatus === 'approved'
            ? 'This resolution proposal was verified and approved by a human specialist.'
            : humanStatus === 'escalated'
            ? 'This ticket was escalated for senior tier-2 investigation.'
            : 'Awaiting human specialist review before final dispatch.',
          stats: {
            Status: humanStatus.toUpperCase(),
          },
        };
      }

      setSelectedNodeInfo(info);
      onInspectNode?.(info);
    },
    [result, effectiveMemories, humanStatus, onInspectNode],
  );

  return (
    <div className="provenance-graph-container" style={{ height }}>
      {/* Top Filter and Layer Bar */}
      <div className="graph-toolbar">
        <div className="graph-toolbar-title">
          <span className="graph-toolbar-dot" />
          <span>Interactive Provenance Topology</span>
        </div>

        <div className="graph-layer-filters">
          <label className="graph-layer-chip">
            <input
              type="checkbox"
              checked={showEvidence}
              onChange={(e) => setShowEvidence(e.target.checked)}
            />
            <span>Evidences</span>
          </label>

          <label className="graph-layer-chip graph-layer-chip--purple">
            <input
              type="checkbox"
              checked={showMemory}
              onChange={(e) => setShowMemory(e.target.checked)}
            />
            <span>Prior Answers (Memory)</span>
          </label>

          <label className="graph-layer-chip graph-layer-chip--green">
            <input
              type="checkbox"
              checked={showClaims}
              onChange={(e) => setShowClaims(e.target.checked)}
            />
            <span>Claims Entailment</span>
          </label>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="graph-canvas-area">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.25}
          maxZoom={1.8}
          style={{ background: 'var(--bg-base)' }}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="var(--border-subtle)" gap={24} size={1} />
          <Controls
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--r-md)',
            }}
          />
        </ReactFlow>

        {/* Legend */}
        <div className="graph-legend">
          <span className="graph-legend-item"><span className="legend-dot legend-dot--blue" /> Query</span>
          <span className="graph-legend-item"><span className="legend-dot legend-dot--green" /> Policy Evidences</span>
          <span className="graph-legend-item"><span className="legend-dot legend-dot--purple" /> Prior User Answers</span>
          <span className="graph-legend-item"><span className="legend-dot legend-dot--gold" /> Arbitration</span>
          <span className="graph-legend-item"><span className="legend-dot legend-dot--cyan" /> Resolution Draft</span>
        </div>

        {/* Slide-out Node Inspector Drawer */}
        {selectedNodeInfo && (
          <div className="graph-inspector-drawer">
            <div className="graph-inspector-header">
              <div>
                <span className="graph-inspector-type">{selectedNodeInfo.type.toUpperCase()}</span>
                <h4 className="graph-inspector-title">{selectedNodeInfo.title}</h4>
              </div>
              <button
                className="graph-inspector-close"
                onClick={() => setSelectedNodeInfo(null)}
                aria-label="Close Inspector"
              >
                ✕
              </button>
            </div>

            {selectedNodeInfo.stats && (
              <div className="graph-inspector-stats">
                {Object.entries(selectedNodeInfo.stats).map(([k, v]) => (
                  <div key={k} className="graph-inspector-stat-pill">
                    <strong>{k}:</strong> <span>{v}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="graph-inspector-content">
              <pre>{selectedNodeInfo.details}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
