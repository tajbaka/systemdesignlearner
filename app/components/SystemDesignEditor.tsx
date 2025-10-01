"use client";
import React, { useEffect, useMemo, useState, useRef } from "react";

// Responsive hook to detect mobile vs desktop
function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const m = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(m.matches);
    m.addEventListener("change", onChange);
    return () => m.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}
import { ComponentKind, Edge, NodeId, PlacedNode } from "./types";
import { COMPONENT_LIBRARY } from "./data";
import { SCENARIOS } from "@/lib/scenarios";
import { uid, findScenarioPath, snapToGrid } from "./utils";
import { simulate } from "./simulation";
import { mulberry32 } from "@/lib/rng";
import { encodeDesign, decodeDesign } from "@/lib/shareLink";
import BottomSheet from "./BottomSheet";
import ScenarioPanel from "./ScenarioPanel";
import SelectedNodePanel from "./SelectedNodePanel";
import Palette from "./Palette";
import Board, { BoardApi } from "./Board";

const GRID_WIDTH = 12000;
const GRID_HEIGHT = 8000;
import { UndoStack } from "@/lib/undo";
import { track } from "@/lib/analytics";
import Tutorial, { useTutorial } from "./Tutorial";
import { iconFor } from "./icons";
import MobileLayout from "./layout/MobileLayout";
import DesktopLayout from "./layout/DesktopLayout";
import MobileTopBar from "./mobile/MobileTopBar";
import MobileSimulationPanel from "./mobile/MobileSimulationPanel";
import DesktopSidebar from "./desktop/DesktopSidebar";

// ------------------------------------------------------------
// System Design Sandbox – modular architecture
// - Grid fills the whole board
// - Create connections by dragging from a node port to another node
// - Added tiny dev tests that run in console
// ------------------------------------------------------------

// Main Component
export default function SystemDesignEditor() {
  const undo = React.useRef(new UndoStack());
  const [nodes, setNodes] = useState<PlacedNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [dragging, setDragging] = useState<NodeId | null>(null);
  const [selectedNode, setSelectedNode] = useState<NodeId | null>(null);
  const [scenarioId, setScenarioId] = useState<string>(SCENARIOS[0].id);
  const [chaosMode, setChaosMode] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof simulate> | null>(null);
  const [lastPath, setLastPath] = useState<NodeId[]>([]);
  const [linkingFrom, setLinkingFrom] = useState<NodeId | null>(null);
  const [linkingFromPort, setLinkingFromPort] = useState<"N" | "E" | "S" | "W" | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [focusCenter, setFocusCenter] = useState<{ x: number; y: number } | null>(null);
  const [failAttemptsByScenario, setFailAttemptsByScenario] = useState<Record<string, number>>({});
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isConnectMode, setIsConnectMode] = useState(false);
  const [undoRedoToggle, setUndoRedoToggle] = useState<"undo" | "redo">("undo");
  const [isSimPanelCollapsed, setIsSimPanelCollapsed] = useState(false);
  const [deletingNode, setDeletingNode] = useState<NodeId | null>(null);
  const boardApiRef = useRef<BoardApi | null>(null);

  const scenario = useMemo(() => SCENARIOS.find((s) => s.id === scenarioId)!, [scenarioId]);
  
  // Tutorial state
  const tutorial = useTutorial();

  // --- Dev tests: run once on mount ---
  useEffect(() => {
    runDevTests();
  }, []);

  // Parse share hash on load → read-only view
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Load persisted fail attempts
    try {
      const raw = localStorage.getItem("sds_fail_attempts");
      if (raw) setFailAttemptsByScenario(JSON.parse(raw));
    } catch {}

    const hash = window.location.hash || "";
    const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
    const d = params.get("d");
    if (!d) return;
    try {
      const parsed = decodeDesign<{ nodes: PlacedNode[]; edges: Edge[]; scenarioId: string }>(d);
      const loadedNodes = parsed.nodes || [];
      const loadedEdges = parsed.edges || [];
      setNodes(loadedNodes);
      setEdges(loadedEdges);
      setScenarioId(parsed.scenarioId || SCENARIOS[0].id);
      setIsReadOnly(true);
      if (loadedNodes.length > 0) {
        const cx = loadedNodes.reduce((s, n) => s + n.x, 0) / loadedNodes.length;
        const cy = loadedNodes.reduce((s, n) => s + n.y, 0) / loadedNodes.length;
        setFocusCenter({ x: cx, y: cy });
      }
      setSelectedNode(null);
      setLinkingFrom(null);
      setLinkingFromPort(null);
      setCursor(null);
    } catch (err) {
      console.error("Failed to parse shared design", err);
    }
  }, []);

  const snapshot = React.useCallback(
    () => ({
      nodes: structuredClone(nodes),
      edges: structuredClone(edges),
    }),
    [nodes, edges]
  );

  // Keyboard shortcuts: Undo / Redo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isReadOnly) return;
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          const next = undo.current.redo(snapshot());
          if (next) {
            setNodes(next.nodes);
            setEdges(next.edges);
          }
        } else {
          const prev = undo.current.undo(snapshot());
          if (prev) {
            setNodes(prev.nodes);
            setEdges(prev.edges);
          }
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [snapshot, isReadOnly]);

  const snap = (v: number) => snapToGrid(v);

  function spawn(kind: ComponentKind) {
    if (isReadOnly) return;

    const spec = COMPONENT_LIBRARY.find((c) => c.kind === kind)!;

    // Spawn at board center coordinates (not viewport center)
    const boardCenter = { x: GRID_WIDTH / 2, y: GRID_HEIGHT / 2 };

    // Add random offset so components don't stack exactly on top of each other
    const offsetX = (Math.random() - 0.5) * 200; // ±100 pixels
    const offsetY = (Math.random() - 0.5) * 200;

    const x = snap(boardCenter.x + offsetX);
    const y = snap(boardCenter.y + offsetY);

    const n: PlacedNode = {
      id: uid(),
      spec,
      x,
      y,
      replicas: 1,
    };

    undo.current.push(snapshot());
    setNodes((prev) => [...prev, n]);
    setIsAddSheetOpen(false);

    // Keep viewport in current position, just select the new node
    setSelectedNode(n.id);

    // Haptic feedback
    if ('vibrate' in navigator) navigator.vibrate(50);
  }

  function spawnAt(kind: ComponentKind, world: { x: number; y: number }) {
    if (isReadOnly) return;
    const spec = COMPONENT_LIBRARY.find((c) => c.kind === kind)!;
    const n: PlacedNode = {
      id: uid(),
      spec,
      x: snap(world.x),
      y: snap(world.y),
      replicas: 1,
    };
    undo.current.push(snapshot());
    setNodes((prev) => [...prev, n]);
  }

  function updateReplicas(nodeId: NodeId, replicas: number) {
    if (isReadOnly) return;
    undo.current.push(snapshot());
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, replicas } : n))
    );
  }

  function onMouseDownNode(e: React.MouseEvent, id: NodeId) {
    e.stopPropagation();
    if (isReadOnly) return;

    // Connect mode: tap to select target
    if (isConnectMode && linkingFrom && linkingFrom !== id) {
      connect(linkingFrom, id);
      setIsConnectMode(false);
      setLinkingFrom(null);
      return;
    }

    // Exit delete mode when clicking elsewhere
    if (deletingNode && deletingNode !== id) {
      setDeletingNode(null);
    }

    setDragging(id);
    setSelectedNode(id);
  }

  function onTouchStartNode(e: React.TouchEvent, id: NodeId) {
    e.stopPropagation();
    if (isReadOnly) return;

    // Connect mode: tap to select target
    if (isConnectMode && linkingFrom && linkingFrom !== id) {
      connect(linkingFrom, id);
      setIsConnectMode(false);
      setLinkingFrom(null);
      if ('vibrate' in navigator) navigator.vibrate([50, 50, 50]);
      return;
    }

    // Exit any existing delete mode first
    if (deletingNode) {
      setDeletingNode(null);
    }

    // Start dragging immediately for mobile (don't wait for long press)
    setDragging(id);
    setSelectedNode(id);
  }

  function onTouchEndNode(e: React.TouchEvent, id: NodeId) {
    e.stopPropagation();
    if (isReadOnly) return;

    // Just a tap (not drag) - select the node and exit delete mode
    if (!dragging) {
      setSelectedNode(id);
      setDeletingNode(null); // Exit delete mode on tap
    }
    setDragging(null);
  }

  function onMouseMoveBoard(_e: React.MouseEvent, world: { x: number; y: number }) {
    const { x, y } = world;
    if (dragging) {
      setNodes((prev) =>
        prev.map((n) => (n.id === dragging ? { ...n, x: snap(x), y: snap(y) } : n))
      );
    }
    if (linkingFrom) {
      setCursor({ x, y });
    }
  }

  function onTouchMoveBoard(_e: React.TouchEvent, world: { x: number; y: number }) {
    const { x, y } = world;
    if (dragging) {
      setNodes((prev) =>
        prev.map((n) => (n.id === dragging ? { ...n, x: snap(x), y: snap(y) } : n))
      );
    }
    if (linkingFrom) {
      setCursor({ x, y });
    }
  }

  function onMouseUpBoard() {
    setDragging(null);
    if (linkingFrom) {
      setLinkingFrom(null);
      setLinkingFromPort(null);
      setCursor(null);
    }
  }

  function onTouchEndBoard() {
    setDragging(null);
    if (linkingFrom) {
      setLinkingFrom(null);
      setLinkingFromPort(null);
      setCursor(null);
    }
  }

  function connect(from: NodeId, to: NodeId) {
    if (isReadOnly) return;
    if (from === to) return;
    const exists = edges.some((e) => e.from === from && e.to === to);
    if (exists) return;
    const e: Edge = {
      id: uid(),
      from,
      to,
      linkLatencyMs: 8 + Math.round(Math.random() * 12), // small jitter
    };
    undo.current.push(snapshot());
    setEdges((prev) => [...prev, e]);
  }

  function removeSelected() {
    if (isReadOnly) return;
    if (!selectedNode) return;
    undo.current.push(snapshot());
    setEdges((prev) => prev.filter((e) => e.from !== selectedNode && e.to !== selectedNode));
    setNodes((prev) => prev.filter((n) => n.id !== selectedNode));
    setSelectedNode(null);
  }

  function shareDesign() {
    const design = { nodes, edges, scenarioId };
    const payload = encodeDesign(design);
    const url = `${location.origin}${location.pathname}#d=${encodeURIComponent(payload)}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(url)
        .then(() => alert("Share URL copied to clipboard"))
        .catch(() => alert(url));
    } else {
      alert(url);
    }

    // Track share event
    track("share_design", {
      scenarioId,
      nodeCount: nodes.length,
      edgeCount: edges.length,
    });
  }

  function forkDesign() {
    setIsReadOnly(false);
    try {
      history.replaceState(null, "", location.pathname + location.search);
    } catch {}

    // Track fork event
    track("fork_design", {
      scenarioId,
      nodeCount: nodes.length,
      edgeCount: edges.length,
    });
  }

  function runSimulation() {
    const { nodeIds, missingKinds } = findScenarioPath(scenario, nodes, edges);
    setLastPath(nodeIds);

    if (missingKinds.length > 0) {
      setResult(null);
      alert(
        `Missing components for this scenario: ${missingKinds.join(", ")}\.\nHint: wire edges in order so requests can flow.`
      );
      return;
    }

    if (nodeIds.length < 2) {
      setResult(null);
      alert("Place and connect at least two components to form a path.");
      return;
    }
    const seed = 12345;
    const rng = mulberry32(seed);
    const r = simulate(scenario, nodeIds, nodes, edges, chaosMode, rng);
    setResult(r);

    // Track simulation run
    track("run_sim", {
      scenarioId,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      chaosMode,
      outcome:
        !r.failedByChaos && r.meetsLatency && r.meetsRps
          ? "pass"
          : r.failedByChaos
            ? "chaos_fail"
            : r.meetsLatency || r.meetsRps
              ? "partial"
              : "fail",
    });

    // Outcome + attempts persistence
    const isPass = !r.failedByChaos && r.meetsLatency && r.meetsRps;
    if (!isPass) {
      setFailAttemptsByScenario((prev) => {
        const next = { ...prev, [scenarioId]: (prev[scenarioId] ?? 0) + 1 };
        try {
          localStorage.setItem("sds_fail_attempts", JSON.stringify(next));
        } catch {}
        return next;
      });
    }
  }

  const selected = nodes.find((n) => n.id === selectedNode) || null;

  const handleUndoRedo = () => {
    if (isReadOnly) return;
    if (undoRedoToggle === "undo") {
      const prev = undo.current.undo(snapshot());
      if (prev) {
        setNodes(prev.nodes);
        setEdges(prev.edges);
      }
      setUndoRedoToggle("redo");
    } else {
      const next = undo.current.redo(snapshot());
      if (next) {
        setNodes(next.nodes);
        setEdges(next.edges);
      }
      setUndoRedoToggle("undo");
    }
  };

  const toggleConnectMode = () => {
    if (isReadOnly) return;
    if (!selectedNode) {
      alert("Select a node first to start connecting");
      return;
    }
    setIsConnectMode(!isConnectMode);
    if (!isConnectMode) {
      setLinkingFrom(selectedNode);
      if ('vibrate' in navigator) navigator.vibrate(50);
    } else {
      setLinkingFrom(null);
    }
  };

  // Single Board instance shared between layouts
  const board = (
    <Board
      ref={boardApiRef}
      nodes={nodes}
      edges={edges}
      lastPath={lastPath}
      linkingFrom={linkingFrom}
      linkingFromPort={linkingFromPort}
      cursor={cursor}
      selectedNode={selectedNode}
      isConnectMode={isConnectMode}
      dragging={dragging}
      deletingNode={deletingNode}
      onMouseMove={onMouseMoveBoard}
      onTouchMove={onTouchMoveBoard}
      onMouseUp={onMouseUpBoard}
      onTouchEnd={onTouchEndBoard}
      onMouseLeave={onMouseUpBoard}
      onMouseDown={() => {
        setSelectedNode(null);
        setIsConnectMode(false);
        setLinkingFrom(null);
        setDeletingNode(null); // Exit delete mode when clicking board
      }}
      onNodeMouseDown={onMouseDownNode}
      onNodeMouseUp={(e, id) => {
        if (linkingFrom && linkingFrom !== id) {
          e.stopPropagation();
          connect(linkingFrom, id);
          setLinkingFrom(null);
          setLinkingFromPort(null);
          setCursor(null);
          setIsConnectMode(false);
        }
      }}
      onNodeTouchStart={onTouchStartNode}
      onNodeTouchEnd={onTouchEndNode}
      onPortMouseDown={(e, id, side) => {
        e.stopPropagation();
        if (isReadOnly) return;
        setSelectedNode(id);
        setLinkingFrom(id);
        setLinkingFromPort(side);
      }}
      onPortTouchStart={(e, id, side) => {
        e.stopPropagation();
        if (isReadOnly) return;
        setSelectedNode(id);
        setLinkingFrom(id);
        setLinkingFromPort(side);
      }}
      focusCenter={focusCenter}
      onDrop={(kind, world) => spawnAt(kind, world)}
      onDeleteNode={(nodeId) => {
        if (isReadOnly) return;
        undo.current.push(snapshot());
        setEdges((prev) => prev.filter((e) => e.from !== nodeId && e.to !== nodeId));
        setNodes((prev) => prev.filter((n) => n.id !== nodeId));
        setSelectedNode(null);
        setDragging(null);
      }}
    />
  );

  // Detect mobile vs desktop
  const isMobile = useMediaQuery("(max-width: 640px)");

  return (
    <>
      {isMobile ? (
        <MobileLayout
          topBar={
            <MobileTopBar
              componentCount={nodes.length}
              isReadOnly={isReadOnly}
              selectedNode={selectedNode}
              isConnectMode={isConnectMode}
              undoRedoToggle={undoRedoToggle}
              onConnectMode={toggleConnectMode}
              onAddComponent={() => setIsAddSheetOpen(true)}
              onUndoRedo={handleUndoRedo}
              onResetView={() => boardApiRef.current?.centerToGrid()}
              onShare={shareDesign}
              onFork={forkDesign}
            />
          }
          canvas={board}
          bottomPanel={
            <MobileSimulationPanel
              isCollapsed={isSimPanelCollapsed}
              onToggle={() => setIsSimPanelCollapsed(!isSimPanelCollapsed)}
              collapsedHeader={
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-semibold text-zinc-100">Simulation</h2>
                  <button
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/30 transition cursor-pointer font-medium flex items-center gap-1.5 text-sm touch-manipulation"
                    onClick={(e) => {
                      e.stopPropagation();
                      runSimulation();
                    }}
                    onTouchStart={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
                    onTouchEnd={(e) => e.stopPropagation()}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                    Run
                  </button>
                </div>
              }
            >
              <ScenarioPanel
                scenarios={SCENARIOS}
                selectedScenarioId={scenarioId}
                onScenarioChange={setScenarioId}
                chaosMode={chaosMode}
                onChaosModeChange={setChaosMode}
                onRunSimulation={runSimulation}
                simulationResult={result}
                failAttempts={failAttemptsByScenario[scenarioId] ?? 0}
                nodes={nodes}
                boardApi={boardApiRef.current}
                hideHeader={false}
              />
            </MobileSimulationPanel>
          }
          addSheet={
            <BottomSheet
              isOpen={isAddSheetOpen}
              onClose={() => setIsAddSheetOpen(false)}
              title="Add Component"
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pb-4">
                {COMPONENT_LIBRARY.map((c) => {
                  const Icon = iconFor(c.kind);
                  return (
                    <button
                      key={c.kind}
                      onClick={() => spawn(c.kind)}
                      className="flex flex-col items-start gap-2 p-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition touch-manipulation text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                        <Icon className="text-blue-300" size={20} />
                      </div>
                      <div className="min-w-0 w-full">
                        <div className="text-sm font-semibold text-zinc-100 truncate">{c.label}</div>
                        <div className="text-[10px] text-zinc-400 mt-0.5">
                          {c.baseLatencyMs}ms · {c.capacityRps} rps
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </BottomSheet>
          }
        />
      ) : (
        <DesktopLayout
          sidebar={
            <DesktopSidebar
              palette={<Palette componentLibrary={COMPONENT_LIBRARY} onSpawn={spawn} />}
              controls={
                <>
                  <button
                    className="px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-xs text-zinc-200 cursor-pointer transition-colors"
                    onClick={() => {
                      if (isReadOnly) return;
                      const prev = undo.current.undo(snapshot());
                      if (prev) {
                        setNodes(prev.nodes);
                        setEdges(prev.edges);
                      }
                    }}
                  >
                    Undo (⌘Z)
                  </button>
                  <button
                    className="px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-xs text-zinc-200 cursor-pointer transition-colors"
                    onClick={() => {
                      if (isReadOnly) return;
                      const next = undo.current.redo(snapshot());
                      if (next) {
                        setNodes(next.nodes);
                        setEdges(next.edges);
                      }
                    }}
                  >
                    Redo (⇧⌘Z)
                  </button>
                  <button
                    className="px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-xs text-zinc-200 cursor-pointer transition-colors"
                    onClick={shareDesign}
                  >
                    Share
                  </button>
                  {isReadOnly && (
                    <button
                      className="px-3 py-1.5 rounded-lg border border-emerald-400/40 bg-emerald-400/10 hover:bg-emerald-400/20 text-xs text-emerald-200 cursor-pointer transition-colors"
                      onClick={forkDesign}
                    >
                      Fork
                    </button>
                  )}
                  {!isReadOnly && (
                    <button
                      className="px-3 py-1.5 rounded-lg border border-blue-400/40 bg-blue-400/10 hover:bg-blue-400/20 text-xs text-blue-200 cursor-pointer transition-colors"
                      onClick={() => {
                        setScenarioId("spotify-play");
                        tutorial.resetTutorial();
                      }}
                    >
                      Tutorial
                    </button>
                  )}
                </>
              }
              scenarioPanel={
                <ScenarioPanel
                  scenarios={SCENARIOS}
                  selectedScenarioId={scenarioId}
                  onScenarioChange={setScenarioId}
                  chaosMode={chaosMode}
                  onChaosModeChange={setChaosMode}
                  onRunSimulation={runSimulation}
                  simulationResult={result}
                  failAttempts={failAttemptsByScenario[scenarioId] ?? 0}
                  nodes={nodes}
                  boardApi={boardApiRef.current}
                />
              }
              selectedNodePanel={
                <SelectedNodePanel
                  selectedNode={selected}
                  nodes={nodes}
                  onDelete={removeSelected}
                  onConnect={connect}
                  onUpdateReplicas={updateReplicas}
                />
              }
              isReadOnly={isReadOnly}
              readOnlyMessage={
                <div className="text-[11px] text-amber-300/90 flex-shrink-0">
                  Read-only view from shared link. Click Fork to edit.
                </div>
              }
            />
          }
          canvas={board}
        />
      )}

      {/* Tutorial Overlay (Shared) */}
      <Tutorial
        isVisible={tutorial.isVisible}
        onClose={tutorial.onClose}
        onStepComplete={tutorial.onStepComplete}
        currentStep={tutorial.currentStep}
      />
    </>
  );
}

// ------------------------
// Tiny Dev Tests (console)
// ------------------------
function runDevTests() {
  const log = (ok: boolean, name: string, extra?: unknown) =>
    console[ok ? "log" : "error"](`${ok ? "PASS" : "FAIL"} - ${name}`, extra ?? "");

  // Build a tiny graph for spotify-search: Web -> API -> Service -> DB
  const node = (kind: ComponentKind): PlacedNode => ({
    id: kind,
    spec: COMPONENT_LIBRARY.find((c) => c.kind === kind)!,
    x: 0,
    y: 0,
  });

  const nodes: PlacedNode[] = [
    node("Web"),
    node("API Gateway"),
    node("Service"),
    node("DB (Postgres)"),
  ];

  const edges: Edge[] = [
    { id: "e1", from: "Web", to: "API Gateway", linkLatencyMs: 10 },
    { id: "e2", from: "API Gateway", to: "Service", linkLatencyMs: 10 },
    { id: "e3", from: "Service", to: "DB (Postgres)", linkLatencyMs: 10 },
  ];

  const scenario = SCENARIOS.find((s) => s.id === "spotify-search")!;
  const p = findScenarioPath(scenario, nodes, edges);
  log(p.missingKinds.length === 0 && p.nodeIds.length >= 4, "Path detection for spotify-search", p);

  const r = simulate(scenario, p.nodeIds, nodes, edges, false);
  log(r.capacityRps === 1200, "Capacity bottleneck is DB(1200 rps)", r);
  log(r.meetsLatency === true, "Latency within budget", r);
  log(r.meetsRps === false, "RPS requirement not met (1500 > 1200)", r);
}
