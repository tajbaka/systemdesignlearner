"use client";
import React, { useState, useCallback } from "react";
import { PlacedNode, Edge } from "./types";
import { COMPONENT_LIBRARY } from "./data";
import { uid } from "./utils";
import ReactFlowBoard from "./ReactFlowBoard";

// Demo board preset with URL shortener architecture
export default function DemoBoard() {
  // Initial demo nodes positioned exactly as user arranged them
  const initialNodes: PlacedNode[] = [
    // Web Client - top left
    {
      id: "demo-web",
      spec: COMPONENT_LIBRARY.find((c) => c.kind === "Web")!,
      x: -78, // Rounded from -78.04597701149424
      y: 93, // Rounded from 93.19540229885055
    },
    // API Gateway - middle left
    {
      id: "demo-gateway",
      spec: COMPONENT_LIBRARY.find((c) => c.kind === "API Gateway")!,
      x: 68, // Rounded from 68.25287356321836
      y: 230, // Rounded from 229.6666666666667
    },
    // URL Shortening Service - middle right
    {
      id: "demo-shortener",
      spec: COMPONENT_LIBRARY.find((c) => c.kind === "Service")!,
      x: 347, // Rounded from 346.67816091954023
      y: 296, // Rounded from 296.32183908045977
      customLabel: "URL Shortening",
    },
    // URL Redirection Service - top right
    {
      id: "demo-redirection",
      spec: COMPONENT_LIBRARY.find((c) => c.kind === "Service")!,
      x: 328, // Rounded from 328.28735632183907
      y: 95, // Rounded from 95.22988505747128
      customLabel: "URL Redirection",
    },
    // Cache - top far right
    {
      id: "demo-cache",
      spec: COMPONENT_LIBRARY.find((c) => c.kind === "Cache (Redis)")!,
      x: 698, // Rounded from 698.1609195402298
      y: 73, // Rounded from 72.66666666666667
    },
    // Database - bottom right
    {
      id: "demo-db",
      spec: COMPONENT_LIBRARY.find((c) => c.kind === "DB (Postgres)")!,
      x: 709, // Rounded from 709.3333333333331
      y: 241, // Rounded from 240.5402298850575
    },
  ];

  // Initial edges matching user's connected layout
  const initialEdges: Edge[] = [
    // API Gateway (left) → Web Client (bottom)
    {
      id: "16c6l5f",
      from: "demo-gateway",
      to: "demo-web",
      sourceHandle: "left",
      targetHandle: "bottom",
      linkLatencyMs: 10,
    },
    // URL Redirection (left) → API Gateway (right)
    {
      id: "73gio84",
      from: "demo-redirection",
      to: "demo-gateway",
      sourceHandle: "left",
      targetHandle: "right",
      linkLatencyMs: 10,
    },
    // URL Shortening (left) → API Gateway (right)
    {
      id: "evftqdr",
      from: "demo-shortener",
      to: "demo-gateway",
      sourceHandle: "left",
      targetHandle: "right",
      linkLatencyMs: 10,
    },
    // Cache (left) → URL Redirection (right)
    {
      id: "yh2qnhr",
      from: "demo-cache",
      to: "demo-redirection",
      sourceHandle: "left",
      targetHandle: "right",
      linkLatencyMs: 10,
    },
    // Database (left) → URL Shortening (right)
    {
      id: "1mz34fi",
      from: "demo-db",
      to: "demo-shortener",
      sourceHandle: "left",
      targetHandle: "right",
      linkLatencyMs: 10,
    },
    // Database (left) → URL Redirection (right)
    {
      id: "t0357kf",
      from: "demo-db",
      to: "demo-redirection",
      sourceHandle: "left",
      targetHandle: "right",
      linkLatencyMs: 10,
    },
  ];

  const [nodes, setNodes] = useState<PlacedNode[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  const handleNodesChange = useCallback((updatedNodes: PlacedNode[]) => {
    setNodes(updatedNodes);
  }, []);

  const handleEdgesChange = useCallback((updatedEdges: Edge[]) => {
    setEdges(updatedEdges);
  }, []);

  const handleConnect = useCallback((newEdge: Edge) => {
    const edgeWithId: Edge = {
      ...newEdge,
      id: uid(),
      linkLatencyMs: newEdge.linkLatencyMs || 10, // Default latency if not provided
    };
    setEdges((prev) => [...prev, edgeWithId]);
  }, []);

  return (
    <div className="relative w-full h-96 bg-zinc-900/50 border border-zinc-700 rounded-xl overflow-hidden">
      <ReactFlowBoard
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        className="w-full h-full"
        style={{
          backgroundColor: "transparent",
        }}
        showMiniMap={false}
      />
      {/* Overlay to prevent interaction on desktop - allow mobile interaction */}
      <div className="absolute inset-0 bg-transparent pointer-events-none cursor-default hidden lg:block" />
    </div>
  );
}
