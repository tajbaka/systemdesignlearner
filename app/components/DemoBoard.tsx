"use client";
import React, { useState, useCallback } from 'react';
import { PlacedNode, Edge } from './types';
import { COMPONENT_LIBRARY } from './data';
import { uid } from './utils';
import ReactFlowBoard from './ReactFlowBoard';

// Demo board preset with URL shortener architecture
export default function DemoBoard() {
  // Initial demo nodes positioned exactly as user arranged them
  const initialNodes: PlacedNode[] = [
    // Web Client - top left
    {
      id: 'demo-web',
      spec: COMPONENT_LIBRARY.find(c => c.kind === 'Web')!,
      x: 36, // Rounded from 35.517241379310335
      y: 80,
    },
    // API Gateway - middle left
    {
      id: 'demo-gateway',
      spec: COMPONENT_LIBRARY.find(c => c.kind === 'API Gateway')!,
      x: 56, // Rounded from 56.29310344827586
      y: 257, // Rounded from 257.3275862068966
    },
    // URL Shortening Service - middle right
    {
      id: 'demo-shortener',
      spec: COMPONENT_LIBRARY.find(c => c.kind === 'Service')!,
      x: 325, // Rounded from 324.7413793103449
      y: 318, // Rounded from 318.1788793103448
      customLabel: 'URL Shortening',
    },
    // URL Redirection Service - top right
    {
      id: 'demo-redirection',
      spec: COMPONENT_LIBRARY.find(c => c.kind === 'Service')!,
      x: 333, // Rounded from 333.1034482758621
      y: 99, // Rounded from 98.53448275862068
      customLabel: 'URL Redirection',
    },
    // Cache - top far right
    {
      id: 'demo-cache',
      spec: COMPONENT_LIBRARY.find(c => c.kind === 'Cache (Redis)')!,
      x: 586, // Rounded from 586.2931034482758
      y: 100,
    },
    // Database - bottom right
    {
      id: 'demo-db',
      spec: COMPONENT_LIBRARY.find(c => c.kind === 'DB (Postgres)')!,
      x: 600, // Rounded from 600.3340517241382
      y: 233, // Rounded from 232.75862068965515
    },
  ];

  // Initial edges matching user's connected layout
  const initialEdges: Edge[] = [
    // API Gateway (top) → Web Client (bottom)
    {
      id: '8hxqfvq',
      from: 'demo-gateway',
      to: 'demo-web',
      sourceHandle: 'top',
      targetHandle: 'bottom',
      linkLatencyMs: 10,
    },
    // URL Shortening (left) → API Gateway (right)
    {
      id: 'rs5q37n',
      from: 'demo-shortener',
      to: 'demo-gateway',
      sourceHandle: 'left',
      targetHandle: 'right',
      linkLatencyMs: 10,
    },
    // URL Redirection (left) → API Gateway (right)
    {
      id: 'p2dtarq',
      from: 'demo-redirection',
      to: 'demo-gateway',
      sourceHandle: 'left',
      targetHandle: 'right',
      linkLatencyMs: 10,
    },
    // Cache (left) → URL Redirection (right)
    {
      id: 'zg8f0l4',
      from: 'demo-cache',
      to: 'demo-redirection',
      sourceHandle: 'left',
      targetHandle: 'right',
      linkLatencyMs: 10,
    },
    // Database (left) → URL Shortening (right)
    {
      id: 'rf54uee',
      from: 'demo-db',
      to: 'demo-shortener',
      sourceHandle: 'left',
      targetHandle: 'right',
      linkLatencyMs: 10,
    },
    // Database (left) → URL Redirection (bottom)
    {
      id: 'zenrczj',
      from: 'demo-db',
      to: 'demo-redirection',
      sourceHandle: 'left',
      targetHandle: 'bottom',
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
    setEdges(prev => [...prev, edgeWithId]);
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
          backgroundColor: 'transparent',
        }}
        showMiniMap={false}
      />
      {/* Overlay to prevent interaction - demo is read-only */}
      <div className="absolute inset-0 bg-transparent pointer-events-none cursor-default" />
    </div>
  );
}
