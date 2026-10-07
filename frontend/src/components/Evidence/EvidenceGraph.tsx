import { useCallback, useMemo } from 'react';
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
import type { EvidenceItem, ResolveResponse } from '../../types/api';

// ─── Custom Node Components ───────────────────────────────────────────────────

function QueryNode({ data }: { data: { label: string } }) {
  return (
    <div style={{
      background: 'var(--brand-blue-glow)',
      border: '1.5px solid var(--brand-blue)',
      borderRadius: 10,
      padding: '8px 14px',
      fontSize: 12, fontWeight: 700,
      color: 'var(--brand-blue)',
      textAlign: 'center',
      minWidth: 140, maxWidth: 200,
    }}>
      <div style={{ fontSize: 10, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-tertiary)' }}>Customer Query</div>
      <div style={{ lineHeight: 1.4, color: 'var(--text-primary)', fontWeight: 600, fontSize: 11 }}>{data.label}</div>
      <Handle type="source" position={Position.Bottom} style={{ background: 'var(--brand-blue)', border: 'none' }} />
    </div>
  );
}

function EvidenceNode({ data, selected }: { data: { label: string; score: number; sourceType: string; authority?: number | string }; selected?: boolean }) {
  const isHigh = data.score > 0.6;
  const color = isHigh ? 'var(--resolve-text)' : 'var(--clarify-text)';
  const bg    = isHigh ? 'var(--resolve-bg)' : 'var(--clarify-bg)';
  const border= isHigh ? 'var(--resolve-border)' : 'var(--clarify-border)';

  return (
    <div style={{
      background: selected ? 'var(--bg-card-hover)' : 'var(--bg-card)',
      border: `1.5px solid ${selected ? 'var(--brand-blue)' : border}`,
      borderRadius: 10,
      padding: '6px 12px',
      minWidth: 130, maxWidth: 170,
      boxShadow: selected ? '0 0 12px var(--brand-blue-glow)' : 'none',
      transition: 'all 0.15s ease',
    }}>
      <Handle type="target" position={Position.Top} style={{ background: border, border: 'none' }} />
      <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-tertiary)', marginBottom: 2 }}>
        {data.sourceType}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: 4 }}>
        {data.label}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: 10, fontFamily: 'var(--font-mono)',
          background: bg, border: `1px solid ${border}`,
          color, borderRadius: 4, padding: '1px 5px',
        }}>
          {data.score.toFixed(2)}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: border, border: 'none' }} />
    </div>
  );
}

function MemoryNode({ data }: { data: { label: string; score: number } }) {
  return (
    <div style={{
      background: 'rgba(139,92,246,0.08)',
      border: '1.5px solid #6d28d9',
      borderRadius: 10, padding: '6px 12px',
      minWidth: 130, maxWidth: 170,
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#6d28d9', border: 'none' }} />
      <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#a78bfa', marginBottom: 2 }}>Historical</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: 4 }}>{data.label}</div>
      <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#a78bfa' }}>score {data.score.toFixed(2)}</div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#6d28d9', border: 'none' }} />
    </div>
  );
}

function ResolutionNode({ data }: { data: { label: string; decision: string } }) {
  const colors: Record<string, { bg: string; border: string; text: string }> = {
    RESOLVE:  { bg: 'var(--resolve-bg)',  border: 'var(--resolve-border)',  text: 'var(--resolve-text)' },
    CLARIFY:  { bg: 'var(--clarify-bg)',  border: 'var(--clarify-border)',  text: 'var(--clarify-text)' },
    ABSTAIN:  { bg: 'var(--abstain-bg)',  border: 'var(--abstain-border)',  text: 'var(--abstain-text)' },
    ESCALATE: { bg: 'var(--escalate-bg)', border: 'var(--escalate-border)', text: 'var(--escalate-text)' },
  };
  const c = colors[data.decision] ?? colors.RESOLVE;
  return (
    <div style={{
      background: c.bg, border: `2px solid ${c.border}`,
      borderRadius: 10, padding: '8px 16px',
      minWidth: 150, textAlign: 'center',
    }}>
      <Handle type="target" position={Position.Top} style={{ background: c.border, border: 'none' }} />
      <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: c.text, marginBottom: 2 }}>AI Decision</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: c.text }}>{data.decision}</div>
      <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>{data.label}</div>
      <Handle type="source" position={Position.Bottom} style={{ background: c.border, border: 'none' }} />
    </div>
  );
}

function VerificationNode({ data }: { data: { passed: boolean; groundedness: number } }) {
  const ok = data.passed;
  return (
    <div style={{
      background: ok ? 'var(--resolve-bg)' : 'var(--escalate-bg)',
      border: `1.5px solid ${ok ? 'var(--resolve-border)' : 'var(--escalate-border)'}`,
      borderRadius: 10, padding: '6px 12px',
      minWidth: 130, textAlign: 'center',
    }}>
      <Handle type="target" position={Position.Top} style={{ background: ok ? 'var(--resolve-border)' : 'var(--escalate-border)', border: 'none' }} />
      <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: ok ? 'var(--resolve-text)' : 'var(--escalate-text)', marginBottom: 2 }}>Verification</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: ok ? 'var(--resolve-text)' : 'var(--escalate-text)' }}>
        {ok ? '✓ Passed' : '✗ Failed'}
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
        groundedness {Math.round(data.groundedness * 100)}%
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: ok ? 'var(--resolve-border)' : 'var(--escalate-border)', border: 'none' }} />
    </div>
  );
}

function HumanReviewNode({ data }: { data: { status: 'pending' | 'approved' | 'escalated' } }) {
  const labels = { pending: 'Awaiting Review', approved: '✓ Approved', escalated: '↗ Escalated' };
  const colors = {
    pending:   { bg: 'var(--bg-card)',      border: 'var(--border-strong)',   text: 'var(--text-secondary)' },
    approved:  { bg: 'var(--resolve-bg)',   border: 'var(--resolve-border)',  text: 'var(--resolve-text)' },
    escalated: { bg: 'var(--escalate-bg)',  border: 'var(--escalate-border)', text: 'var(--escalate-text)' },
  };
  const c = colors[data.status];
  return (
    <div style={{
      background: c.bg, border: `2px solid ${c.border}`,
      borderRadius: 10, padding: '8px 16px',
      minWidth: 140, textAlign: 'center',
    }}>
      <Handle type="target" position={Position.Top} style={{ background: c.border, border: 'none' }} />
      <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: c.text, marginBottom: 2 }}>Human Review</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: c.text }}>{labels[data.status]}</div>
    </div>
  );
}

// ─── Node Types ───────────────────────────────────────────────────────────────

const nodeTypes: NodeTypes = {
  query:       QueryNode       as NodeTypes[string],
  evidence:    EvidenceNode    as NodeTypes[string],
  memory:      MemoryNode      as NodeTypes[string],
  resolution:  ResolutionNode  as NodeTypes[string],
  verification:VerificationNode as NodeTypes[string],
  humanReview: HumanReviewNode as NodeTypes[string],
};

// ─── Layout helpers ───────────────────────────────────────────────────────────

const ROW_Y = { query: 0, evidence: 130, resolution: 280, verification: 390, human: 490 };

function buildGraph(
  result: ResolveResponse,
  humanStatus: 'pending' | 'approved' | 'escalated',
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // --- Query node ---
  const q = result.summary.slice(0, 60) + (result.summary.length > 60 ? '…' : '');
  nodes.push({
    id: 'query',
    type: 'query',
    position: { x: 0, y: ROW_Y.query },
    data: { label: q },
  });

  // --- Evidence nodes ---
  const evList = result.evidence.slice(0, 6);
  const totalEv = evList.length + result.resolution_memory.slice(0, 2).length;
  const evSpacing = Math.max(160, 800 / Math.max(totalEv, 1));
  const evOffset = -((totalEv - 1) * evSpacing) / 2;

  evList.forEach((ev, i) => {
    const nid = `ev-${ev.id}`;
    nodes.push({
      id: nid,
      type: 'evidence',
      position: { x: evOffset + i * evSpacing, y: ROW_Y.evidence },
      data: {
        label: ev.title.slice(0, 35) + (ev.title.length > 35 ? '…' : ''),
        score: ev.score,
        sourceType: ev.source_type,
        authority: ev.metadata.authority,
      },
    });
    edges.push({
      id: `q-${nid}`,
      source: 'query', target: nid,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#334070', width: 12, height: 12 },
      style: { stroke: '#334070', strokeWidth: 1.5 },
      animated: true,
    });
    edges.push({
      id: `${nid}-res`,
      source: nid, target: 'resolution',
      markerEnd: { type: MarkerType.ArrowClosed, color: '#334070', width: 12, height: 12 },
      style: { stroke: '#334070', strokeWidth: 1.5 },
    });
  });

  // --- Memory nodes ---
  const memList = result.resolution_memory.slice(0, 2);
  memList.forEach((m, i) => {
    const nid = `mem-${m.id}`;
    const xIdx = evList.length + i;
    nodes.push({
      id: nid,
      type: 'memory',
      position: { x: evOffset + xIdx * evSpacing, y: ROW_Y.evidence },
      data: {
        label: m.problem.slice(0, 35) + (m.problem.length > 35 ? '…' : ''),
        score: m.success_score,
      },
    });
    edges.push({
      id: `q-${nid}`,
      source: 'query', target: nid,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#6d28d9', width: 12, height: 12 },
      style: { stroke: '#6d28d9', strokeWidth: 1.5, strokeDasharray: '4,3' },
      animated: true,
    });
    edges.push({
      id: `${nid}-res`,
      source: nid, target: 'resolution',
      markerEnd: { type: MarkerType.ArrowClosed, color: '#6d28d9', width: 12, height: 12 },
      style: { stroke: '#6d28d9', strokeWidth: 1.5, strokeDasharray: '4,3' },
    });
  });

  // --- Resolution node ---
  nodes.push({
    id: 'resolution',
    type: 'resolution',
    position: { x: -75, y: ROW_Y.resolution },
    data: { label: 'Resolution Proposal', decision: result.decision },
  });

  // --- Verification node ---
  nodes.push({
    id: 'verification',
    type: 'verification',
    position: { x: -65, y: ROW_Y.verification },
    data: { passed: result.verification.passed, groundedness: result.verification.groundedness },
  });
  edges.push({
    id: 'res-ver',
    source: 'resolution', target: 'verification',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#334070', width: 12, height: 12 },
    style: { stroke: '#334070', strokeWidth: 1.5 },
  });

  // --- Human review node ---
  nodes.push({
    id: 'human',
    type: 'humanReview',
    position: { x: -70, y: ROW_Y.human },
    data: { status: humanStatus },
  });
  edges.push({
    id: 'ver-human',
    source: 'verification', target: 'human',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#334070', width: 12, height: 12 },
    style: { stroke: '#334070', strokeWidth: 1.5 },
  });

  return { nodes, edges };
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend() {
  const items = [
    { color: 'var(--brand-blue)', label: 'Query' },
    { color: 'var(--resolve-border)', label: 'Evidence' },
    { color: '#6d28d9', label: 'Historical' },
    { color: 'var(--border-strong)', label: 'Resolution flow' },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 10, left: 10, zIndex: 10,
      background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--r-md)', padding: '6px 10px',
      display: 'flex', gap: 12, alignItems: 'center',
    }}>
      {items.map(({ color, label }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text-secondary)' }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
          {label}
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface EvidenceGraphProps {
  result: ResolveResponse;
  humanStatus: 'pending' | 'approved' | 'escalated';
  onNodeClick: (evidence: EvidenceItem | null) => void;
}

export function EvidenceGraph({ result, humanStatus, onNodeClick }: EvidenceGraphProps) {
  const { nodes: initNodes, edges: initEdges } = useMemo(
    () => buildGraph(result, humanStatus),
    [result, humanStatus],
  );

  const [nodes, , onNodesChange] = useNodesState(initNodes);
  const [edges, , onEdgesChange] = useEdgesState(initEdges);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === 'evidence') {
        const ev = result.evidence.find((e) => `ev-${e.id}` === node.id);
        onNodeClick(ev ?? null);
      } else {
        onNodeClick(null);
      }
    },
    [result.evidence, onNodeClick],
  );

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.4}
        maxZoom={2}
        style={{ background: 'var(--bg-base)' }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="var(--border-subtle)" gap={20} size={1} />
        <Controls
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--r-md)',
          }}
        />
        <Legend />
      </ReactFlow>
    </div>
  );
}
