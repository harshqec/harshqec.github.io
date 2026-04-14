import React, { useState, useRef, useEffect, MouseEvent } from 'react';
import axios from 'axios';
import { 
  PlusCircle, PlusSquare, Move, Link as LinkIcon, 
  Unlink, Trash2, Zap, Play, Upload, Save, RefreshCw 
} from 'lucide-react';

// A simple utility to merge class names
function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

const API_URL = 'http://127.0.0.1:5000/api/compute';

export default function App() {
  const [nodes, setNodes] = useState({});
  const [clusterConnections, setClusterConnections] = useState({});
  const [messageConnections, setMessageConnections] = useState({});
  
  const [clusterCounter, setClusterCounter] = useState(0);
  const [messageCounter, setMessageCounter] = useState(0);
  
  const [mode, setMode] = useState('move');
  const [selectedNode, setSelectedNode] = useState(null);
  
  const [distance, setDistance] = useState(2);
  const [terminalOutput, setTerminalOutput] = useState('Ready to compute matrices...\n\nDraw your parity check graph on the left and click Generate Matrices.');
  const [status, setStatus] = useState('Mode: Move nodes');
  const [lastData, setLastData] = useState(null);
  
  const svgRef = useRef(null);
  
  // Dragging state
  const [draggingNode, setDraggingNode] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const RADIUS = 26;

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
    if (e.target.tagName !== 'svg' && e.target.tagName !== 'line') return; 

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
      e.target.setPointerCapture(e.pointerId);
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
      e.target.releasePointerCapture(e.pointerId);
      setDraggingNode(null);
      setStatus(`Moved ${draggingNode}`);
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
    
    if (res.distance !== undefined) {
      out.push(`\nMINIMUM DISTANCE: ${res.distance}`);
    }
    
    out.push("-".repeat(40));
    return out.join('\n');
  };

  const matrixToString = (mat) => {
    if (!mat || mat.length === 0) return "[]";
    const rows = mat.map(row => `    [${row.join(', ')}]`);
    return `[\n${rows.join(',\n')}\n]`;
  };

  const mapConnectionsAPI = () => {
    // Sort keys just like python does: node_sort_key
    const sortKey = (a, b) => {
      const numA = parseInt(a.slice(1));
      const numB = parseInt(b.slice(1));
      return numA - numB;
    };
    
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

  const generateMatrices = async () => {
    if (Object.keys(clusterConnections).length === 0) {
      setStatus("Error: Add at least one cluster node first.");
      return;
    }
    
    setTerminalOutput('Computing matrices...');
    setStatus('Sending request to Python engine...');

    const payload = {
      ...mapConnectionsAPI(),
      d: parseInt(distance, 10)
    };

    try {
      const response = await axios.post(API_URL, payload);
      const data = response.data;
      
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
          data.results.forEach((r, idx) => {
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
      const errMsg = err.response?.data?.error || err.message;
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
    setTerminalOutput('');
    setStatus('Cleared all.');
    setSelectedNode(null);
    setLastData(null);
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

  // ------------------------------------
  // Drawing Helpers
  // ------------------------------------
  const renderGrid = () => {
    const lines = [];
    for(let i=0; i<1500; i+=40) {
      lines.push(<line key={`v${i}`} x1={i} y1={0} x2={i} y2={1000} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />);
      lines.push(<line key={`h${i}`} x1={0} y1={i} x2={1500} y2={i} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />);
    }
    return lines;
  };

  const drawnEdges = new Set();

  return (
    <>
      <header className="glass-panel">
        <div className="toolbar-group">
          <a href="../index.html" className="mr-4 hover:underline flex items-center gap-1" style={{color: 'var(--primary-accent)', fontWeight: '600'}}>
             &larr; Home
          </a>
          <div className="separator" style={{height: '24px', margin: '0 12px'}} />
          <div className="font-bold text-lg mr-4">Graph Code Editor</div>
          
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
        </div>

        <div className="toolbar-group">
          Target d:
          <input 
            type="number" 
            value={distance} 
            onChange={(e) => setDistance(e.target.value)} 
          />
          <button className="primary shadow-lg ml-2" onClick={generateMatrices}>
            <Play size={16} /> Generate Matrices
          </button>
          <button onClick={handleSaveJson} className="ml-2" title="Save Results to JSON">
            <Save size={16} /> Save JSON
          </button>
          <div className="separator" />
          <button onClick={clearAll} title="Clear All">
            <RefreshCw size={16} />
          </button>
        </div>
      </header>

      <div className="workspace">
        <div className="canvas-container glass-panel">
          <svg 
            ref={svgRef} 
            onClick={handleSvgClick}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            {renderGrid()}
            
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

            {/* Nodes */}
            {Object.entries(nodes).map(([id, n]) => {
              const selected = selectedNode === id;
              const sColor = selected ? "#FFF" : "none";
              const sWidth = selected ? 3 : 0;
              
              return (
                <g 
                  key={id} 
                  className="node node-group" 
                  data-selected={selected}
                  transform={`translate(${n.x}, ${n.y})`}
                  onClick={(e) => handleNodeClick(e, id)}
                  onPointerDown={(e) => handlePointerDown(e, id)}
                >
                  {n.type === 'cluster' ? (
                    <circle cx="0" cy="0" r={RADIUS} fill="var(--node-cluster)" stroke={sColor} strokeWidth={sWidth} />
                  ) : (
                    <rect x={-RADIUS} y={-RADIUS} width={RADIUS*2} height={RADIUS*2} rx="6" fill="var(--node-message)" stroke={sColor} strokeWidth={sWidth} />
                  )}
                  <text className="node-text">{id}</text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="terminal-panel glass-panel">
          <div className="terminal-header">
            <Zap size={18} color="var(--primary-accent)" /> OUTPUT TERMINAL
          </div>
          <div className="terminal-output">
            {terminalOutput}
          </div>
          <div className="status-bar">
             {status}
          </div>
        </div>
      </div>
    </>
  );
}
