import React, { useState, useRef, useEffect, memo } from 'react';
import { 
  PlusCircle, PlusSquare, Move, Link as LinkIcon, 
  Unlink, Trash2, Zap, Play, Save, RefreshCw 
} from 'lucide-react';
import { computeMatrices } from './math_logic';
import './App.css';

// A simple utility to merge class names
function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

// Memoized SVG node — only re-renders when its own props change
const GraphNode = memo(({ id, x, y, type, selected, RADIUS, onNodeClick, onPointerDown, onNodeKeyDown, clusterDimmed, disintegratingProgress, reducedMotion }) => {
  const [isFocused, setIsFocused] = useState(false);
  const sColor = selected ? "#FFF" : "none";
  const sWidth = selected ? 3 : 0;
  const visualType = type === 'cluster'
    ? (clusterDimmed ? 'cluster-absorbed' : 'cluster')
    : 'message';
  const nodeOpacity = disintegratingProgress == null ? 1 : Math.max(0, 1 - disintegratingProgress * 1.15);

  const palette = visualType === 'cluster'
    ? { hi: '#dbeafe', mid: '#60a5fa', low: '#1d4ed8', core: 'rgba(255,255,255,0.16)' }
    : visualType === 'cluster-absorbed'
      ? { hi: '#f8dcc4', mid: '#c48b66', low: '#8f5f45', core: 'rgba(255,242,230,0.14)' }
      : { hi: '#ffe0c2', mid: '#fb923c', low: '#c2410c', core: 'rgba(255,240,224,0.14)' };

  const gradId = `sphere-grad-${id}`;
  const orbitRx = RADIUS * 1.2;
  const orbitRy = RADIUS * 0.36;
  const rxX = orbitRx;
  const ryX = orbitRy;
  const rxY = orbitRx;
  const ryY = orbitRy;
  const rxZ = orbitRx;
  const ryZ = orbitRy;
  const orbitPathX = `M ${rxX} 0 A ${rxX} ${ryX} 0 1 0 ${-rxX} 0 A ${rxX} ${ryX} 0 1 0 ${rxX} 0`;
  const orbitPathY = `M ${rxY} 0 A ${rxY} ${ryY} 0 1 0 ${-rxY} 0 A ${rxY} ${ryY} 0 1 0 ${rxY} 0`;
  const orbitPathZ = `M ${rxZ} 0 A ${rxZ} ${ryZ} 0 1 0 ${-rxZ} 0 A ${rxZ} ${ryZ} 0 1 0 ${rxZ} 0`;

  return (
    <g
      className="node node-group"
      data-selected={selected}
      transform={`translate(${x}, ${y})`}
      style={{ opacity: nodeOpacity }}
      tabIndex={0}
      role="button"
      aria-label={`Graph node ${id}`}
      onClick={(e) => onNodeClick(e, id)}
      onPointerDown={(e) => onPointerDown(e, id)}
      onKeyDown={(e) => onNodeKeyDown(e, id)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    >
      <defs>
        <radialGradient id={gradId} cx="30%" cy="28%" r="72%">
          <stop offset="0%" stopColor={palette.hi} />
          <stop offset="56%" stopColor={palette.mid} />
          <stop offset="100%" stopColor={palette.low} />
        </radialGradient>
      </defs>

      <circle cx="0" cy="0" r={RADIUS} className={`node-sphere ${visualType}`} fill={`url(#${gradId})`} />
      <circle cx={-RADIUS * 0.3} cy={-RADIUS * 0.35} r={RADIUS * 0.23} className="node-specular" />
      <circle cx="0" cy="0" r={RADIUS * 0.92} className="node-sphere-inner" fill={palette.core} />
      <g className="node-orbit-system">
        <g className="node-ring ring-x" transform="rotate(0)">
          <ellipse cx="0" cy="0" rx={rxX} ry={ryX} className={`node-orbit-ring ${visualType}`} />
        </g>
        <g className="node-ball-plane ring-x" transform="rotate(0)">
          <g className="node-ball-spin spin-x">
            <circle cx="0" cy="0" r={RADIUS * 0.12} className={`node-orbit-ball ${visualType}`}>
              {!reducedMotion && <animateMotion dur="2.2s" repeatCount="indefinite" path={orbitPathX} />}
            </circle>
          </g>
        </g>

        <g className="node-ring ring-y" transform="rotate(90)">
          <ellipse cx="0" cy="0" rx={rxY} ry={ryY} className={`node-orbit-ring ${visualType}`} />
        </g>
        <g className="node-ball-plane ring-y" transform="rotate(90)">
          <g className="node-ball-spin spin-y">
            <circle cx="0" cy="0" r={RADIUS * 0.12} className={`node-orbit-ball ${visualType}`}>
              {!reducedMotion && <animateMotion dur="2.9s" repeatCount="indefinite" path={orbitPathY} />}
            </circle>
          </g>
        </g>

        <g className="node-ring ring-z" transform="rotate(45)">
          <ellipse cx="0" cy="0" rx={rxZ} ry={ryZ} className={`node-orbit-ring ${visualType}`} />
        </g>
        <g className="node-ball-plane ring-z" transform="rotate(45)">
          <g className="node-ball-spin spin-z">
            <circle cx="0" cy="0" r={RADIUS * 0.12} className={`node-orbit-ball ${visualType}`}>
              {!reducedMotion && <animateMotion dur="3.5s" repeatCount="indefinite" path={orbitPathZ} />}
            </circle>
          </g>
        </g>
      </g>
      <circle cx="0" cy="0" r={RADIUS} fill="none" stroke={sColor} strokeWidth={sWidth} />
      {isFocused && (
        <circle
          cx="0"
          cy="0"
          r={RADIUS + 6}
          fill="none"
          stroke="rgba(147, 197, 253, 0.95)"
          strokeWidth="2.5"
        />
      )}
      <text className="node-text">{id}</text>
    </g>
  );
});

function setupQuantumCanvasAnimation(canvas, options = {}) {
  if (!canvas) return () => {};

  const host = canvas.parentElement;
  if (!host) return () => {};

  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  const {
    densityDivisor = 25000,
    minBlocks = 8,
    speedFactor = 1,
    opacityFactor = 1,
    rotationFactor = 1,
  } = options;

  let width = 0;
  let height = 0;
  let frameId = null;
  let resizeObserver = null;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const symbols = ['|0⟩', '|1⟩', '|ψ⟩', '|+⟩', '|-⟩', '|Φ⟩', 'H', 'X', 'Y', 'Z', '√X'];

  const resize = () => {
    width = Math.max(1, Math.floor(host.clientWidth));
    height = Math.max(1, Math.floor(host.clientHeight));

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  class QuantumBlock {
    constructor() {
      this.reset(true);
    }

    reset(randomHeight = false) {
      this.x = Math.random() * width;
      this.y = randomHeight ? Math.random() * height : height + 50;
      this.z = Math.random() * 0.7 + 0.3;
      this.speedY = (-(Math.random() * 0.5 + 0.2) * this.z) * speedFactor;
      this.speedX = ((Math.random() - 0.5) * 0.5) * speedFactor;
      this.type = Math.random() < 0.2 ? 'grid' : 'symbol';
      this.symbol = symbols[Math.floor(Math.random() * symbols.length)];
      this.size = this.type === 'grid' ? Math.random() * 20 + 80 : Math.random() * 30 + 40;
      this.opacity = (Math.random() * 0.4 + 0.1) * opacityFactor;
      this.rotation = Math.random() * Math.PI * 2;
      this.rotSpeed = ((Math.random() - 0.5) * 0.01) * rotationFactor;
    }

    update() {
      this.y += this.speedY;
      this.x += this.speedX;
      this.rotation += this.rotSpeed;

      if (this.y < -150 || this.x < -150 || this.x > width + 150) {
        this.reset();
      }
    }

    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.scale(this.z, this.z);

      const s = this.size;

      if (this.type === 'grid') {
        const step = s / 3;
        const start = -s / 2 + step / 2;

        ctx.strokeStyle = `rgba(0, 0, 0, ${this.opacity * 0.8})`;
        ctx.lineWidth = 1.5;

        for (let i = 0; i < 3; i += 1) {
          ctx.beginPath();
          ctx.moveTo(start, start + i * step);
          ctx.lineTo(start + 2 * step, start + i * step);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(start + i * step, start);
          ctx.lineTo(start + i * step, start + 2 * step);
          ctx.stroke();
        }

        for (let i = 0; i < 3; i += 1) {
          for (let j = 0; j < 3; j += 1) {
            const vx = start + i * step;
            const vy = start + j * step;

            ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity + 0.5})`;
            ctx.strokeStyle = `rgba(0, 0, 0, ${this.opacity})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(vx, vy, step / 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            if ((i === 0 && j === 0) || (i === 2 && j === 2)) {
              ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity + 0.5})`;
              ctx.font = `600 ${step / 4}px Inter, sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('|+⟩', vx, vy);
            }
          }
        }
      } else {
        const textLen = this.symbol.length;
        const fontSize = textLen >= 4 ? s * 0.21 : (textLen > 1 ? s * 0.35 : s * 0.45);
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity + 0.35})`;
        ctx.font = `600 ${fontSize}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.symbol, 0, 0);
      }

      ctx.restore();
    }
  }

  resize();
  window.addEventListener('resize', resize);

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
  }

  const numBlocks = Math.min(24, Math.max(minBlocks, Math.floor((width * height) / densityDivisor)));
  const blocks = Array.from({ length: numBlocks }, () => new QuantumBlock());

  const animate = () => {
    ctx.clearRect(0, 0, width, height);

    blocks.forEach((block) => {
      block.update();
      block.draw();
    });

    frameId = window.requestAnimationFrame(animate);
  };

  if (!prefersReducedMotion) {
    animate();
  }

  return () => {
    if (frameId) {
      window.cancelAnimationFrame(frameId);
    }
    if (resizeObserver) {
      resizeObserver.disconnect();
    }
    window.removeEventListener('resize', resize);
  };
}

// Computation is now performed entirely in-browser via math_logic.js

export default function App() {
  const bgCanvasRef = useRef(null);
  const terminalBgCanvasRef = useRef(null);
  const [nodes, setNodes] = useState({});
  const [clusterConnections, setClusterConnections] = useState({});
  const [messageConnections, setMessageConnections] = useState({});
  
  const [clusterCounter, setClusterCounter] = useState(0);
  const [messageCounter, setMessageCounter] = useState(0);
  
  const [mode, setMode] = useState('move');
  const [selectedNode, setSelectedNode] = useState(null);
  
  const [distance, setDistance] = useState(2);
  const [pivotNodesByMessage, setPivotNodesByMessage] = useState({});
  const [bareCodeStatus, setBareCodeStatus] = useState('Unknown');
  const [terminalOutput, setTerminalOutput] = useState('Ready to compute matrices...\n\nDraw your parity check graph on the left and click Generate Matrices.');
  const [status, setStatus] = useState('Mode: Move nodes');
  const [lastData, setLastData] = useState(null);
  const [transferWave, setTransferWave] = useState({ active: false, start: 0, now: 0, edges: [] });
  const [messageBurst, setMessageBurst] = useState({ active: false, start: 0, now: 0, nodeIds: [] });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  const svgRef = useRef(null);
  const pointerCaptureTargetRef = useRef(null);
  const pointerCaptureIdRef = useRef(null);
  
  // Dragging state
  const [draggingNode, setDraggingNode] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const RADIUS = 20;
  const sortKey = (a, b) => {
    const numA = parseInt(a.slice(1), 10);
    const numB = parseInt(b.slice(1), 10);
    return numA - numB;
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotionPreference = () => setPrefersReducedMotion(mediaQuery.matches);
    syncMotionPreference();
    mediaQuery.addEventListener('change', syncMotionPreference);

    const cleanups = [];

    if (bgCanvasRef.current) {
      cleanups.push(setupQuantumCanvasAnimation(bgCanvasRef.current));
    }

    if (terminalBgCanvasRef.current) {
      cleanups.push(
        setupQuantumCanvasAnimation(terminalBgCanvasRef.current, {
          densityDivisor: 42000,
          minBlocks: 5,
          speedFactor: 0.75,
          opacityFactor: 0.6,
          rotationFactor: 0.8,
        })
      );
    }

    return () => {
      mediaQuery.removeEventListener('change', syncMotionPreference);
      cleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  useEffect(() => {
    if (!transferWave.active) return;

    const WAVE_BASE_MS = 820;
    const WAVE_STAGGER_MS = 75;
    const totalDuration = WAVE_BASE_MS + Math.max(0, (transferWave.edges.length - 1) * WAVE_STAGGER_MS) + 260;
    let frameId = null;

    const tick = (ts) => {
      const elapsed = ts - transferWave.start;
      if (elapsed >= totalDuration) {
        setTransferWave((prev) => (prev.active ? { ...prev, active: false, now: ts } : prev));
        return;
      }
      setTransferWave((prev) => (prev.active ? { ...prev, now: ts } : prev));
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [transferWave.active, transferWave.start, transferWave.edges.length]);

  useEffect(() => {
    if (!messageBurst.active) return;

    const BURST_MS = 860;
    const STAGGER_MS = 90;
    const totalDuration = BURST_MS + Math.max(0, (messageBurst.nodeIds.length - 1) * STAGGER_MS) + 220;
    let frameId = null;

    const tick = (ts) => {
      const elapsed = ts - messageBurst.start;
      if (elapsed >= totalDuration) {
        setMessageBurst((prev) => (prev.active ? { ...prev, active: false, now: ts } : prev));
        return;
      }
      setMessageBurst((prev) => (prev.active ? { ...prev, now: ts } : prev));
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [messageBurst.active, messageBurst.start, messageBurst.nodeIds]);

  // ------------------------------------
  // Interactions
  // ------------------------------------
  
  const handleModeChange = (newMode) => {
    setMode(newMode);
    setSelectedNode(null);
    const msgs = {
      add_cluster: "Add cluster nodes: Click empty canvas.",
      add_message: "Add message nodes: Click empty canvas.",
      move: "Move nodes: Drag a node.",
      connect_cc: "Connect C-C: Click two cluster nodes sequentially.",
      connect_mc: "Connect M-C: Click one message and one cluster node.",
      delete_node: "Delete node: Click a node to remove it.",
      delete_link: "Delete link: Click two connected nodes.",
    };
    setStatus(`Mode: ${msgs[newMode] || newMode}`);
  };

  const getCanvasCoords = (e) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleSvgClick = (e) => {
    if (draggingNode) return; // Prevent click handling right after drop
    
    // Check if clicked exactly on SVG (empty background) rather than a node child
    if (e.target.tagName !== 'svg') return; 

    const { x, y } = getCanvasCoords(e);

    if (mode === 'add_cluster') {
      const currentClusterCount = Object.values(nodes).filter(n => n.type === 'cluster').length;
      if (currentClusterCount >= 12) {
        setStatus("Error: Maximum limit of 12 cluster nodes reached.");
        return;
      }
      const id = `c${clusterCounter + 1}`;
      setClusterCounter(prev => prev + 1);
      setNodes(prev => ({ ...prev, [id]: { type: 'cluster', x, y } }));
      setClusterConnections(prev => ({ ...prev, [id]: [] }));
      setStatus(`Added cluster node ${id}`);
    } else if (mode === 'add_message') {
      const id = `m${messageCounter + 1}`;
      setMessageCounter(prev => prev + 1);
      setNodes(prev => ({ ...prev, [id]: { type: 'message', x, y } }));
      setMessageConnections(prev => ({ ...prev, [id]: [] }));
      setStatus(`Added message node ${id}`);
    }
  };

  const handleNodeClick = (e, id) => {
    e.stopPropagation();

    if (mode === 'delete_node') {
      const newNodes = { ...nodes };
      const newCC = { ...clusterConnections };
      const newMC = { ...messageConnections };
      
      delete newNodes[id];
      if (id.startsWith('c')) {
        delete newCC[id];
        Object.keys(newCC).forEach(k => {
          newCC[k] = newCC[k].filter(n => n !== id);
        });
        Object.keys(newMC).forEach(k => {
          newMC[k] = newMC[k].filter(n => n !== id);
        });
      } else {
        delete newMC[id];
      }

      if (id.startsWith('m')) {
        setPivotNodesByMessage(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
      
      setNodes(newNodes);
      setClusterConnections(newCC);
      setMessageConnections(newMC);
      setStatus(`Deleted node ${id}`);
      setSelectedNode(null);
      return;
    }

    if (['connect_cc', 'connect_mc', 'delete_link'].includes(mode)) {
      if (!selectedNode) {
        setSelectedNode(id);
        setStatus(`Selected ${id}. Select second node.`);
      } else {
        if (selectedNode === id) {
          setStatus(`Cannot connect/select node to itself.`);
          setSelectedNode(null);
          return;
        }
        
        const first = selectedNode;
        const second = id;
        setSelectedNode(null);
        
        const t1 = nodes[first].type;
        const t2 = nodes[second].type;
        
        if (mode === 'connect_cc') {
          if (t1 !== 'cluster' || t2 !== 'cluster') {
            setStatus("Error: C-C connection requires two clusters.");
            return;
          }
          setClusterConnections(prev => {
            const upd = { ...prev };
            if (!upd[first].includes(second)) upd[first] = [...upd[first], second];
            if (!upd[second].includes(first)) upd[second] = [...upd[second], first];
            return upd;
          });
          setStatus(`Connected C-C: ${first} - ${second}`);
        } 
        else if (mode === 'connect_mc') {
          if ((t1 === 'cluster' && t2 === 'cluster') || (t1 === 'message' && t2 === 'message')) {
            setStatus("Error: M-C requires one message and one cluster.");
            return;
          }
          const mNode = t1 === 'message' ? first : second;
          const cNode = t1 === 'message' ? second : first;
          setMessageConnections(prev => {
            const upd = { ...prev };
            if (!upd[mNode].includes(cNode)) upd[mNode] = [...upd[mNode], cNode];
            return upd;
          });
          setStatus(`Connected M-C: ${mNode} - ${cNode}`);
        }
        else if (mode === 'delete_link') {
          if (t1 === 'cluster' && t2 === 'cluster') {
            setClusterConnections(prev => {
              const upd = { ...prev };
              upd[first] = upd[first].filter(n => n !== second);
              upd[second] = upd[second].filter(n => n !== first);
              return upd;
            });
          } else if (t1 !== t2) {
             const mNode = t1 === 'message' ? first : second;
             const cNode = t1 === 'message' ? second : first;
             setMessageConnections(prev => {
               const upd = { ...prev };
               upd[mNode] = upd[mNode].filter(n => n !== cNode);
               return upd;
             });
          }
          setStatus(`Deleted link between ${first} and ${second}`);
        }
      }
    }
  };

  const handlePointerDown = (e, id) => {
    if (mode === 'move') {
      const { x, y } = getCanvasCoords(e);
      setDraggingNode(id);
      setDragOffset({ x: nodes[id].x - x, y: nodes[id].y - y });
      e.currentTarget.setPointerCapture(e.pointerId);
      pointerCaptureTargetRef.current = e.currentTarget;
      pointerCaptureIdRef.current = e.pointerId;
    }
  };

  const handlePointerMove = (e) => {
    if (draggingNode && mode === 'move') {
      const { x, y } = getCanvasCoords(e);
      setNodes(prev => ({
        ...prev,
        [draggingNode]: {
          ...prev[draggingNode],
          x: x + dragOffset.x,
          y: y + dragOffset.y
        }
      }));
    }
  };

  const handlePointerUp = (e) => {
    if (draggingNode) {
      const captureTarget = pointerCaptureTargetRef.current;
      const pointerId = pointerCaptureIdRef.current;
      if (captureTarget && pointerId != null && captureTarget.hasPointerCapture(pointerId)) {
        captureTarget.releasePointerCapture(pointerId);
      }
      pointerCaptureTargetRef.current = null;
      pointerCaptureIdRef.current = null;
      setDraggingNode(null);
      setStatus(`Moved ${draggingNode}`);
    }
  };

  const handleNodeKeyDown = (e, id) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleNodeClick(e, id);
    }
  };

  // ------------------------------------
  // Matrix Generation API
  // ------------------------------------
  const formatResult = (res) => {
    let out = [];
    out.push("-".repeat(40));
    out.push("STABILIZER GENERATORS:");
    (res.stabilizer_operators || []).forEach(op => out.push(`  ${op}`));

    const codeType = (res["What code it is"] || '').toLowerCase();
    if (codeType) {
      out.push(`CODE TYPE: ${res["What code it is"]}`);
    }
    
    if (res.distance !== undefined) {
      out.push(`\nMINIMUM DISTANCE: ${res.distance}`);
    }
    
    out.push("-".repeat(40));
    return out.join('\n');
  };

  const deriveBareCodeStatus = (data) => {
    const firstResult = data?.results?.[0] || data?.single_result || null;
    if (!firstResult) return 'Unknown';
    const codeType = String(firstResult["What code it is"] || '').toLowerCase();
    if (!codeType) return 'Unknown';
    const isBare = codeType.includes('bare code') && !codeType.includes('not a bare');
    return isBare ? 'Yes' : 'No';
  };

  const computeMatricesInBrowser = async (payload) => computeMatrices(payload);

  const matrixToString = (mat) => {
    if (!mat || mat.length === 0) return "[]";
    const rows = mat.map(row => `    [${row.join(', ')}]`);
    return `[\n${rows.join(',\n')}\n]`;
  };

  const mapConnectionsAPI = () => {
    const cDict = {};
    Object.keys(clusterConnections).sort(sortKey).forEach(k => {
      cDict[k] = [...clusterConnections[k]].sort(sortKey);
    });
    
    const mDict = {};
    Object.keys(messageConnections).sort(sortKey).forEach(k => {
      mDict[k] = [...messageConnections[k]].sort(sortKey);
    });
    
    return { cluster_connections: cDict, message_connections: mDict };
  };

  const getPivotNodesPayload = () => {
    const messageNodesSorted = Object.keys(messageConnections).sort(sortKey);
    const clusterSet = new Set(Object.keys(clusterConnections));
    const payload = {};

    messageNodesSorted.forEach((m) => {
      const selected = pivotNodesByMessage[m];
      if (selected && selected !== 'auto' && clusterSet.has(selected)) {
        payload[m] = selected;
      }
    });

    return payload;
  };

  const triggerTransferWave = () => {
    if (prefersReducedMotion) return;

    const edges = [];

    Object.entries(messageConnections).forEach(([m, neighbors]) => {
      const src = nodes[m];
      if (!src) return;

      neighbors.forEach((c, idx) => {
        const dst = nodes[c];
        if (!dst) return;
        edges.push({
          key: `${m}-${c}-${idx}`,
          from: m,
          to: c,
          x1: src.x,
          y1: src.y,
          x2: dst.x,
          y2: dst.y,
        });
      });
    });

    if (edges.length === 0) return;

    const t0 = window.performance.now();
    setTransferWave({ active: true, start: t0, now: t0, edges });
  };

  const triggerMessageBurst = () => {
    if (prefersReducedMotion) return;

    const visibleMessages = Object.entries(nodes)
      .filter(([, n]) => n.type === 'message')
      .map(([id]) => id)
      .sort(sortKey);

    if (visibleMessages.length === 0) return;

    const t0 = window.performance.now();
    setMessageBurst({ active: true, start: t0, now: t0, nodeIds: visibleMessages });
  };

  const generateMatrices = async () => {
    if (Object.keys(clusterConnections).length === 0) {
      setStatus("Error: Add at least one cluster node first.");
      return;
    }

    triggerTransferWave();
    triggerMessageBurst();
    
    setTerminalOutput('Computing matrices...');
    setStatus('Running in-browser quantum engine...');

    const pivotPayload = getPivotNodesPayload();
    const payload = {
      ...mapConnectionsAPI(),
      d: parseInt(distance, 10),
      pivot_nodes: pivotPayload
    };

    try {
      const data = await computeMatricesInBrowser(payload);
      setBareCodeStatus(deriveBareCodeStatus(data));
      
      setLastData({ request: payload, response: data });
      
      let lines = [];
      lines.push("");
      lines.push("Adjacency Matrix of Cluster Nodes (A_cc):");
      lines.push(matrixToString(data.A_cc));
      lines.push("");

      if (data.k === 0) {
        lines.push("results = []");
        lines.push(data.message);
        setStatus("Matrices generated. Add message node to compute stabilizers.");
      } else {
        if (data.results && data.results.length > 0) {
          lines.push("Parity Check Matrix:");
          lines.push(matrixToString(data.parity_check_matrix));
          lines.push("");
          data.results.forEach((r) => {
            lines.push(formatResult(r));
            lines.push("");
          });
          setStatus("Matrices and stabilizer results generated.");
        } else if (data.single_result) {
          lines.push("Parity Check Matrix:");
          lines.push(matrixToString(data.parity_check_matrix));
          lines.push("");
          lines.push(formatResult(data.single_result));
          setStatus(`Matrices generated. Exact distance ${data.single_result.distance}. No match for d=${data.d}`);
        }
      }
      
      setTerminalOutput(lines.join("\n"));
    } catch (err) {
      const errMsg = err.message || String(err);
      setBareCodeStatus('Unknown');
      setTerminalOutput(`Error computing matrices:\n${errMsg}`);
      setStatus(`Failed: ${errMsg}`);
    }
  };

  const clearAll = () => {
    setNodes({});
    setClusterConnections({});
    setMessageConnections({});
    setClusterCounter(0);
    setMessageCounter(0);
    setPivotNodesByMessage({});
    setBareCodeStatus('Unknown');
    setTerminalOutput('');
    setStatus('Cleared all.');
    setSelectedNode(null);
    setLastData(null);
    setMessageBurst({ active: false, start: 0, now: 0, nodeIds: [] });
  };

  const handleSaveJson = () => {
    if (!lastData) {
      setStatus("Error: Generate matrices first before saving.");
      return;
    }
    const exportData = {
      graph: {
        nodes,
        clusterConnections,
        messageConnections
      },
      computedData: lastData
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `graph_code_results_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setStatus("Results successfully saved to JSON.");
  };

  // Grid removed: CSS background-image handles this with zero DOM nodes

  const drawnEdges = new Set();
  const messageNodesSorted = Object.keys(messageConnections).sort(sortKey);
  const clusterNodesSorted = Object.keys(clusterConnections).sort(sortKey);
  const manualPivotCount = messageNodesSorted.reduce((count, m) => {
    const value = pivotNodesByMessage[m];
    return count + (value && value !== 'auto' ? 1 : 0);
  }, 0);

  const WAVE_BASE_MS = 820;
  const WAVE_STAGGER_MS = 75;
  const transferEdgeVisuals = [];
  const clusterGlowById = {};
  const BURST_MS = 860;
  const BURST_STAGGER_MS = 90;
  const burstProgressByMessage = {};
  const messageFragments = [];

  if (transferWave.active) {
    const elapsed = transferWave.now - transferWave.start;

    transferWave.edges.forEach((edge, idx) => {
      const local = (elapsed - idx * WAVE_STAGGER_MS) / WAVE_BASE_MS;
      if (local < -0.15 || local > 1.25) return;

      const clamped = Math.min(1, Math.max(0, local));
      const intensity = local < 0
        ? 0
        : (local <= 1
          ? Math.sin(local * Math.PI)
          : Math.max(0, 1 - (local - 1) * 4));

      const dotX = edge.x1 + (edge.x2 - edge.x1) * clamped;
      const dotY = edge.y1 + (edge.y2 - edge.y1) * clamped;

      transferEdgeVisuals.push({
        ...edge,
        idx,
        intensity,
        dotX,
        dotY,
      });

      if (local >= 0.82 && local <= 1.18) {
        const receiveGlow = 1 - Math.min(1, Math.abs(local - 1) / 0.18);
        clusterGlowById[edge.to] = Math.max(clusterGlowById[edge.to] || 0, receiveGlow);
      }
    });
  }

  if (messageBurst.active) {
    const elapsed = messageBurst.now - messageBurst.start;
    messageBurst.nodeIds.forEach((mId, idx) => {
      const local = (elapsed - idx * BURST_STAGGER_MS) / BURST_MS;
      if (local < 0 || local > 1.25) return;
      const progress = Math.min(1, Math.max(0, local));
      burstProgressByMessage[mId] = progress;

      const node = nodes[mId];
      if (!node) return;

      const pieceCount = 14;
      for (let p = 0; p < pieceCount; p += 1) {
        const angle = (p / pieceCount) * Math.PI * 2 + idx * 0.61;
        const speed = 24 + (p % 5) * 7;
        const spread = speed * progress + progress * progress * 38;
        const drift = progress * progress * 24;
        const x = node.x + Math.cos(angle) * spread;
        const y = node.y + Math.sin(angle) * spread + drift;
        const opacity = Math.max(0, 1 - progress * 1.35);
        const size = Math.max(0.8, 2.8 - progress * 1.9 + (p % 3) * 0.15);
        messageFragments.push({ id: `${mId}-${p}`, x, y, opacity, size });
      }
    });
  }

  return (
    <>
      <div className="app-content">
        <header className="glass-panel">
          <div className="toolbar-group">
            <a href="../index.html" className="home-link" aria-label="Go to homepage">
               &larr; Home
            </a>
            <div className="separator toolbar-separator" />
            <div className="editor-title">Graph Code Editor</div>
            
            <button className={classNames(mode === 'add_cluster' && 'active-mode')} onClick={() => handleModeChange('add_cluster')}>
              <PlusCircle size={16} /> Cluster
            </button>
            <button className={classNames(mode === 'add_message' && 'active-mode')} onClick={() => handleModeChange('add_message')}>
              <PlusSquare size={16} /> Message
            </button>
            
            <div className="separator" />
            
            <button className={classNames(mode === 'move' && 'active-mode')} onClick={() => handleModeChange('move')}>
              <Move size={16} /> Move
            </button>
            <button className={classNames(mode === 'connect_cc' && 'active-mode')} onClick={() => handleModeChange('connect_cc')}>
              <LinkIcon size={16} /> C-C
            </button>
            <button className={classNames(mode === 'connect_mc' && 'active-mode')} onClick={() => handleModeChange('connect_mc')}>
              <LinkIcon size={16} /> M-C
            </button>
            
            <div className="separator" />
            
            <button className={classNames(mode === 'delete_node' && 'active-mode')} onClick={() => handleModeChange('delete_node')}>
              <Trash2 size={16} /> Node
            </button>
            <button className={classNames(mode === 'delete_link' && 'active-mode')} onClick={() => handleModeChange('delete_link')}>
              <Unlink size={16} /> Link
            </button>

            <div className="separator" />
            <label htmlFor="distance-input" className="distance-label">d</label>
            <input
              id="distance-input"
              type="number"
              min="1"
              max="50"
              value={distance}
              onChange={(e) => {
                const val = Number.parseInt(e.target.value, 10);
                if (Number.isNaN(val)) {
                  setDistance(1);
                } else {
                  setDistance(Math.min(50, Math.max(1, val)));
                }
              }}
              title="Target code distance"
            />
          </div>

          <div className="toolbar-group">
            <button className="primary generate-btn" onClick={generateMatrices}>
              <Play size={16} /> Generate Matrices
            </button>
            <div
              style={{
                marginLeft: 10,
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.2)',
                background: bareCodeStatus === 'Yes'
                  ? 'rgba(34, 197, 94, 0.25)'
                  : bareCodeStatus === 'No'
                    ? 'rgba(239, 68, 68, 0.25)'
                    : 'rgba(148, 163, 184, 0.25)',
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.02em',
                whiteSpace: 'nowrap'
              }}
              title="Bare code classification from in-browser engine"
            >
              Bare Code: {bareCodeStatus}
            </div>
            <button onClick={handleSaveJson} className="save-btn" title="Save Results to JSON">
              <Save size={16} /> Save JSON
            </button>
            <div className="separator" />
            <button onClick={clearAll} title="Clear All">
              <RefreshCw size={16} />
            </button>
          </div>
        </header>

        <div className="workspace">
          <div className="canvas-container glass-panel" style={{backgroundImage: 'repeating-linear-gradient(rgba(255,255,255,0.05) 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 40px)', backgroundSize: '40px 40px'}}>
            <canvas ref={bgCanvasRef} className="quantum-bg-canvas" aria-hidden="true" />
            <svg 
              ref={svgRef} 
              onClick={handleSvgClick}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              
              {/* Marged C-C Edges */}
              {Object.entries(clusterConnections).map(([c1, nbs]) => (
                nbs.map(c2 => {
                  const edgeKey = [c1, c2].sort().join('-');
                  if (drawnEdges.has(edgeKey)) return null;
                  drawnEdges.add(edgeKey);
                  const n1 = nodes[c1]; const n2 = nodes[c2];
                  if (!n1 || !n2) return null;
                  return <line key={edgeKey} x1={n1.x} y1={n1.y} x2={n2.x} y2={n2.y} stroke="var(--line-cluster)" strokeWidth="4" strokeLinecap="round" />
                })
              ))}

              {/* M-C Edges */}
              {Object.entries(messageConnections).map(([m, nbs]) => (
                nbs.map(c => {
                  const key = `${m}-${c}`;
                  const n1 = nodes[m]; const n2 = nodes[c];
                  if (!n1 || !n2) return null;
                  return <line key={key} x1={n1.x} y1={n1.y} x2={n2.x} y2={n2.y} stroke="var(--line-message)" strokeWidth="3" strokeDasharray="8 6" strokeLinecap="round" />
                })
              ))}

              {/* Generate-click transfer wave: message -> cluster */}
              {transferWave.active && (
                <g className="transfer-wave-layer">
                  {transferEdgeVisuals.map((edge) => (
                    <line
                      key={`wave-path-${edge.key}`}
                      className="transfer-wave-path"
                      x1={edge.x1}
                      y1={edge.y1}
                      x2={edge.x2}
                      y2={edge.y2}
                      stroke={`rgba(125, 211, 252, ${0.12 + edge.intensity * 0.55})`}
                      strokeWidth={2 + edge.intensity * 3}
                      strokeLinecap="round"
                    />
                  ))}

                  {Object.entries(clusterGlowById).map(([clusterId, glow]) => {
                    const clusterNode = nodes[clusterId];
                    if (!clusterNode) return null;
                    return (
                      <circle
                        key={`receive-${clusterId}`}
                        className="cluster-receive-glow"
                        cx={clusterNode.x}
                        cy={clusterNode.y}
                        r={RADIUS + 10 + glow * 14}
                        fill="none"
                        stroke={`rgba(147, 197, 253, ${0.2 + glow * 0.6})`}
                        strokeWidth={1.5 + glow * 3}
                      />
                    );
                  })}

                  {transferEdgeVisuals.map((edge) => (
                    <circle
                      key={`wave-dot-${edge.key}`}
                      className="transfer-wave-dot"
                      cx={edge.dotX}
                      cy={edge.dotY}
                      r={3 + edge.intensity * 2.5}
                      fill={`rgba(224, 242, 254, ${0.6 + edge.intensity * 0.4})`}
                    />
                  ))}
                </g>
              )}

              {/* Message disintegration fragments on Generate click */}
              {messageBurst.active && (
                <g className="message-burst-layer">
                  {messageFragments.map((frag) => (
                    <circle
                      key={`frag-${frag.id}`}
                      cx={frag.x}
                      cy={frag.y}
                      r={frag.size}
                      fill={`rgba(251, 191, 120, ${frag.opacity})`}
                    />
                  ))}
                </g>
              )}

              {/* Nodes — memoized, skip re-render if props unchanged */}
              {Object.entries(nodes).map(([id, n]) => (
                <GraphNode
                  key={id}
                  id={id}
                  x={n.x}
                  y={n.y}
                  type={n.type}
                  selected={selectedNode === id}
                  RADIUS={RADIUS}
                  onNodeClick={handleNodeClick}
                  onPointerDown={handlePointerDown}
                  onNodeKeyDown={handleNodeKeyDown}
                  clusterDimmed={false}
                  disintegratingProgress={n.type === 'message' ? burstProgressByMessage[id] : null}
                  reducedMotion={prefersReducedMotion}
                />
              ))}
            </svg>
          </div>

          <div className="terminal-panel glass-panel">
            {messageNodesSorted.length > 0 && (
              <div style={{ padding: '12px 14px 8px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>
                  Pivot Selection
                </div>
                <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 8 }}>
                  {messageNodesSorted.length === 1
                    ? 'One message qubit detected: select one pivot node (or Auto).'
                    : 'Select one pivot node per message qubit (or Auto).'}
                </div>
                <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 10 }}>
                  Manual overrides: {manualPivotCount}/{messageNodesSorted.length}
                </div>
                {messageNodesSorted.map((m) => (
                  <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <label htmlFor={`pivot-${m}`} style={{ minWidth: 38, fontSize: 13 }}>{m}</label>
                    <select
                      id={`pivot-${m}`}
                      value={pivotNodesByMessage[m] || 'auto'}
                      onChange={(e) => {
                        const value = e.target.value;
                        setPivotNodesByMessage(prev => ({
                          ...prev,
                          [m]: value,
                        }));
                      }}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 6,
                        minWidth: 120,
                        backgroundColor: '#f8fafc',
                        color: '#0f172a',
                        border: '1px solid #94a3b8'
                      }}
                    >
                      <option value="auto" style={{ color: '#0f172a', backgroundColor: '#f8fafc' }}>Auto</option>
                      {clusterNodesSorted.map((c) => (
                        <option
                          key={`${m}-${c}`}
                          value={c}
                          style={{ color: '#0f172a', backgroundColor: '#f8fafc' }}
                        >
                          {c}
                        </option>
                      ))}
                    </select>
                    <span
                      style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 999,
                        border: '1px solid rgba(255,255,255,0.2)',
                        background: (pivotNodesByMessage[m] && pivotNodesByMessage[m] !== 'auto')
                          ? 'rgba(34, 197, 94, 0.25)'
                          : 'rgba(148, 163, 184, 0.25)',
                        color: '#fff',
                        letterSpacing: '0.02em'
                      }}
                    >
                      {(pivotNodesByMessage[m] && pivotNodesByMessage[m] !== 'auto') ? 'Manual' : 'Auto'}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="terminal-header">
              <Zap size={18} color="var(--primary-accent)" /> OUTPUT TERMINAL
            </div>
            <div className="terminal-output">
              <canvas ref={terminalBgCanvasRef} className="quantum-bg-canvas quantum-bg-canvas-soft" aria-hidden="true" />
              <div className="terminal-output-content">{terminalOutput}</div>
            </div>
            <div className="status-bar">
              {status}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
