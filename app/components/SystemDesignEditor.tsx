"use client";
import React, { useState, useMemo, useEffect } from "react";
import { ComponentKind, PlacedNode, Edge } from "./types";
import { COMPONENT_LIBRARY } from "./data";
import { uid } from "./utils";
import { SCENARIOS } from "@/lib/scenarios";
import type { Scenario } from "@/lib/scenarios";
import ReactFlowBoard from "./ReactFlowBoard";
import DesktopLayout from "./layout/DesktopLayout";
import DesktopSidebar from "./layout/DesktopSidebar";
import MobileLayout from "./layout/MobileLayout";
import MobileTopBar from "./mobile/MobileTopBar";
import { decodeDesign } from "@/lib/shareLink";
import { logger } from "@/lib/logger";

// Main Component
export default function SystemDesignEditor() {
  const [nodes, setNodes] = useState<PlacedNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState(SCENARIOS[0].id);

  const selectedScenario = useMemo(
    () => SCENARIOS.find((s: Scenario) => s.id === selectedScenarioId)!,
    [selectedScenarioId]
  );
  const specsByKind = useMemo(() => {
    const map = new Map<ComponentKind, (typeof COMPONENT_LIBRARY)[number]>();
    for (const spec of COMPONENT_LIBRARY) {
      map.set(spec.kind, spec);
    }
    return map;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const shared = params.get("s");
    if (!shared) return;

    type SandboxSharePayload = {
      scenarioId?: string;
      nodes?: Array<{
        id: string;
        kind: ComponentKind;
        x: number;
        y: number;
        replicas?: number;
        customLabel?: string;
      }>;
      edges?: Array<{
        id?: string;
        from: string;
        to: string;
        linkLatencyMs?: number;
        sourceHandle?: string;
        targetHandle?: string;
      }>;
    };

    try {
      const payload = decodeDesign<SandboxSharePayload>(shared);
      if (payload.scenarioId && SCENARIOS.some((s) => s.id === payload.scenarioId)) {
        setSelectedScenarioId(payload.scenarioId);
      }

      if (payload.nodes && payload.nodes.length > 0) {
        const resolvedNodes = payload.nodes.reduce<PlacedNode[]>((acc, node) => {
          const spec = specsByKind.get(node.kind);
          if (!spec) {
            return acc;
          }
          acc.push({
            id: node.id,
            spec,
            x: node.x,
            y: node.y,
            replicas: node.replicas ?? 1,
            customLabel: node.customLabel,
          });
          return acc;
        }, []);
        setNodes(resolvedNodes);
      }

      if (payload.edges) {
        const resolvedEdges: Edge[] = payload.edges.map((edge) => ({
          id: edge.id ?? uid(),
          from: edge.from,
          to: edge.to,
          linkLatencyMs: edge.linkLatencyMs ?? 10,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
        }));
        setEdges(resolvedEdges);
      }
    } catch (error) {
      logger.warn("Failed to decode sandbox share payload", error);
    }
  }, [specsByKind]);

  const canvas = <ReactFlowBoard nodes={nodes} edges={edges} className="w-full h-full" />;

  // Desktop components
  const desktopSidebar = (
    <DesktopSidebar scenario={selectedScenario} componentCount={nodes.length} />
  );

  // Mobile components
  const mobileBottomBar = (
    <MobileTopBar
      componentCount={nodes.length}
      isReadOnly={true}
      selectedNode={null}
      selectedScenario={selectedScenario}
      canDelete={false}
    />
  );

  return (
    <>
      {/* Desktop Layout */}
      <div className="hidden lg:block">
        <DesktopLayout sidebar={desktopSidebar} canvas={canvas} />
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden">
        <MobileLayout bottomBar={mobileBottomBar} canvas={canvas} />
      </div>
    </>
  );
}
