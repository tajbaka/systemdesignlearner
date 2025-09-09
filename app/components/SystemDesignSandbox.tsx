"use client";
import React, { useEffect, useMemo, useState } from "react";
import { ComponentKind, Edge, NodeId, PlacedNode } from "./types";
import { COMPONENT_LIBRARY } from "./data";
import { SCENARIOS } from "@/lib/scenarios";
import { uid, findScenarioPath } from "./utils";
import { simulate } from "./simulation";
import { mulberry32 } from "@/lib/rng";
import Palette from "./Palette";
import ScenarioPanel from "./ScenarioPanel";
import SelectedNodePanel from "./SelectedNodePanel";
import Board from "./Board";
import { UndoStack } from "@/lib/undo";

// ------------------------------------------------------------
// System Design Sandbox – modular architecture
// - Grid fills the whole board
// - Create connections by dragging from a node port to another node
// - Added tiny dev tests that run in console
// ------------------------------------------------------------

// Main Component
export default function SystemDesignSandbox() {
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
  const [worldCenter, setWorldCenter] = useState<{ x: number; y: number } | null>(null);

  const scenario = useMemo(
    () => SCENARIOS.find((s) => s.id === scenarioId)!,
    [scenarioId]
  );

  // --- Dev tests: run once on mount ---
  useEffect(() => {
    runDevTests();
  }, []);

  const snapshot = React.useCallback(() => ({
    nodes: structuredClone(nodes),
    edges: structuredClone(edges),
  }), [nodes, edges]);

  // Keyboard shortcuts: Undo / Redo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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
  }, [snapshot]);

  const snap = (v: number) => Math.round(v / 24) * 24;

  function spawn(kind: ComponentKind) {
    const spec = COMPONENT_LIBRARY.find((c) => c.kind === kind)!;
    const n: PlacedNode = {
      id: uid(),
      spec,
      x: snap(worldCenter?.x ?? 400),
      y: snap(worldCenter?.y ?? 300),
    };
    undo.current.push(snapshot());
    setNodes((prev) => [...prev, n]);
  }

  function onMouseDownNode(e: React.MouseEvent, id: NodeId) {
    e.stopPropagation();
    setDragging(id);
    setSelectedNode(id);
  }

  function onMouseMoveBoard(_e: React.MouseEvent, world: { x: number; y: number }) {
    const { x, y } = world;
    if (dragging) {
      setNodes((prev) => prev.map((n) => (n.id === dragging ? { ...n, x: snap(x), y: snap(y) } : n)));
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

  function connect(from: NodeId, to: NodeId) {
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
    if (!selectedNode) return;
    undo.current.push(snapshot());
    setEdges((prev) => prev.filter((e) => e.from !== selectedNode && e.to !== selectedNode));
    setNodes((prev) => prev.filter((n) => n.id !== selectedNode));
    setSelectedNode(null);
  }

  function runSimulation() {
    const { nodeIds, missingKinds } = findScenarioPath(scenario, nodes, edges);
    setLastPath(nodeIds);

    if (missingKinds.length > 0) {
      setResult(null);
      alert(
        `Missing components for this scenario: ${missingKinds.join(", ")}.\nHint: wire edges in order so requests can flow.`
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
  }

  const selected = nodes.find((n) => n.id === selectedNode) || null;

  return (
    <div className="w-full h-full grid grid-cols-[280px_1fr] gap-4 p-4 bg-zinc-950">
      {/* Sidebar */}
      <div className="flex flex-col gap-3">
        <Palette componentLibrary={COMPONENT_LIBRARY} onSpawn={spawn} />
        <div className="flex gap-2">
          <button
            className="px-3 py-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs text-zinc-200"
            onClick={() => {
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
            className="px-3 py-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs text-zinc-200"
            onClick={() => {
              const next = undo.current.redo(snapshot());
              if (next) {
                setNodes(next.nodes);
                setEdges(next.edges);
              }
            }}
          >
            Redo (⇧⌘Z)
          </button>
        </div>
        <ScenarioPanel
          scenarios={SCENARIOS}
          selectedScenarioId={scenarioId}
          onScenarioChange={setScenarioId}
          chaosMode={chaosMode}
          onChaosModeChange={setChaosMode}
          onRunSimulation={runSimulation}
          simulationResult={result}
        />
        <SelectedNodePanel
          selectedNode={selected}
          nodes={nodes}
          onDelete={removeSelected}
          onConnect={connect}
        />
      </div>

      {/* Board */}
      <Board
        nodes={nodes}
        edges={edges}
        lastPath={lastPath}
        linkingFrom={linkingFrom}
        linkingFromPort={linkingFromPort}
        cursor={cursor}
        onMouseMove={onMouseMoveBoard}
        onMouseUp={onMouseUpBoard}
        onMouseLeave={onMouseUpBoard}
        onMouseDown={() => setSelectedNode(null)}
        onNodeMouseDown={onMouseDownNode}
        onNodeMouseUp={(e, id) => {
          if (linkingFrom && linkingFrom !== id) {
            e.stopPropagation();
            connect(linkingFrom, id);
            setLinkingFrom(null);
            setLinkingFromPort(null);
            setCursor(null);
          }
        }}
        onPortMouseDown={(e, id, side) => {
          e.stopPropagation();
          setSelectedNode(id);
          setLinkingFrom(id);
          setLinkingFromPort(side);
        }}
        onWorldCenterChange={(c) => setWorldCenter(c)}
      />
    </div>
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
