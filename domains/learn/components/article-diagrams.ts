export const NODE_W = 190;
export const NODE_H = 90;

// ── Inline icon SVG markup (replaces cross-domain DesignBoardIcons import) ──
const ICON_SVGS: Record<string, string> = {
  sql: `<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.657 3.134 3 7 3s7-1.343 7-3V6"/><path d="M5 12v6c0 1.657 3.134 3 7 3s7-1.343 7-3v-6"/>`,
  nosql: `<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9h16M4 14h16M9 9v10M14 9v10"/>`,
  cache: `<path d="M3 9l9-3 9 3-9 3-9-3z"/><path d="M3 13l9 3 9-3"/><path d="M3 17l9 3 9-3"/>`,
  client: `<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 8h18"/><circle cx="6" cy="6" r=".5" fill="currentColor"/><circle cx="8" cy="6" r=".5" fill="currentColor"/><circle cx="10" cy="6" r=".5" fill="currentColor"/>`,
  cdn: `<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4a8 8 0 010 16"/>`,
  "api-gateway": `<path d="M3 12h5l3-4 3 8 3-4h4"/><circle cx="3" cy="12" r=".75" fill="currentColor"/><circle cx="21" cy="12" r=".75" fill="currentColor"/>`,
  "load-balancer": `<circle cx="12" cy="6" r="3"/><path d="M12 9v6"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/><path d="M12 15L8.5 16.5M12 15l3.5 1.5"/>`,
  service: `<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 9h6M9 12h6M9 15h6"/>`,
  bucket: `<path d="M4 8h16l-2 12H6L4 8z"/><ellipse cx="12" cy="8" rx="8" ry="2"/>`,
  queue: `<circle cx="12" cy="12" r="2"/><circle cx="6" cy="8" r="2"/><circle cx="6" cy="16" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="18" cy="16" r="2"/><path d="M8 9.2l2.5 1.4M8 14.8l2.5-1.4M16 9.2l-2.5 1.4M16 14.8l-2.5-1.4"/>`,
};

export function getIconSvg(iconType: string): string {
  return ICON_SVGS[iconType] ?? "";
}

// ── SVG edge geometry helpers ──

export function getHandlePosition(
  side: string,
  x: number,
  y: number,
  w: number,
  h: number
): { x: number; y: number } {
  switch (side) {
    case "top":
      return { x: x + w / 2, y };
    case "bottom":
      return { x: x + w / 2, y: y + h };
    case "left":
      return { x, y: y + h / 2 };
    case "right":
      return { x: x + w, y: y + h / 2 };
    default:
      return { x: x + w / 2, y };
  }
}

export function computeBezierPath(
  sx: number,
  sy: number,
  sSide: string,
  tx: number,
  ty: number,
  tSide: string
): { path: string; labelX: number; labelY: number } {
  const dist = Math.sqrt((tx - sx) ** 2 + (ty - sy) ** 2);
  const offset = Math.min(dist * 0.5, 100);

  // Control point offsets based on handle direction
  let c1x = sx,
    c1y = sy,
    c2x = tx,
    c2y = ty;
  switch (sSide) {
    case "right":
      c1x = sx + offset;
      break;
    case "left":
      c1x = sx - offset;
      break;
    case "bottom":
      c1y = sy + offset;
      break;
    case "top":
      c1y = sy - offset;
      break;
  }
  switch (tSide) {
    case "right":
      c2x = tx + offset;
      break;
    case "left":
      c2x = tx - offset;
      break;
    case "bottom":
      c2y = ty + offset;
      break;
    case "top":
      c2y = ty - offset;
      break;
  }

  const path = `M${sx},${sy} C${c1x},${c1y} ${c2x},${c2y} ${tx},${ty}`;

  // Label at t=0.5 on cubic bezier
  const labelX = 0.125 * sx + 0.375 * c1x + 0.375 * c2x + 0.125 * tx;
  const labelY = 0.125 * sy + 0.375 * c1y + 0.375 * c2y + 0.125 * ty;

  return { path, labelX, labelY };
}

export interface ArticleDiagramNode {
  id: string;
  type: string;
  name: string;
  icon: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  sublabel?: string;
}

export interface ArticleDiagramEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  edgeType?: "default" | "labeled" | "dashed";
  animated?: boolean;
  sourceHandle?: "top" | "right" | "bottom" | "left";
  targetHandle?: "top" | "right" | "bottom" | "left";
}

export interface ArticleDiagramConfig {
  nodes: ArticleDiagramNode[];
  edges: ArticleDiagramEdge[];
  height?: { base: number; sm: number };
}

export function calculateOptimalHandles(
  sourcePos: { x: number; y: number; w?: number; h?: number },
  targetPos: { x: number; y: number; w?: number; h?: number }
): { sourceHandle: string; targetHandle: string } {
  const sourceX = sourcePos.x + (sourcePos.w ?? NODE_W) / 2;
  const sourceY = sourcePos.y + (sourcePos.h ?? NODE_H) / 2;
  const targetX = targetPos.x + (targetPos.w ?? NODE_W) / 2;
  const targetY = targetPos.y + (targetPos.h ?? NODE_H) / 2;

  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  let sourceHandle: string;
  let targetHandle: string;

  if (angle >= -45 && angle < 45) {
    sourceHandle = "right";
    targetHandle = "left";
  } else if (angle >= 45 && angle < 135) {
    sourceHandle = "bottom";
    targetHandle = "top";
  } else if (angle >= 135 || angle < -135) {
    sourceHandle = "left";
    targetHandle = "right";
  } else {
    sourceHandle = "top";
    targetHandle = "bottom";
  }

  return { sourceHandle, targetHandle };
}

const diagrams: Record<string, ArticleDiagramConfig> = {
  "url-shortener": {
    nodes: [
      { id: "Client-1", type: "client", name: "Client", icon: "client", x: 0, y: 180 },
      {
        id: "API-Gateway-1",
        type: "api-gateway",
        name: "API Gateway",
        icon: "api-gateway",
        x: 280,
        y: 180,
      },
      {
        id: "Service-1",
        type: "read-service",
        name: "Read Service",
        icon: "service",
        x: 560,
        y: 60,
      },
      {
        id: "Service-2",
        type: "write-service",
        name: "Write Service",
        icon: "service",
        x: 560,
        y: 300,
      },
      { id: "DB-1", type: "main-database", name: "SQL Database", icon: "sql", x: 840, y: 180 },
      { id: "Cache-1", type: "cache", name: "Cache", icon: "cache", x: 840, y: 0 },
      {
        id: "Service-3",
        type: "background-service",
        name: "Background Service",
        icon: "service",
        x: 560,
        y: 480,
      },
      {
        id: "DB-2",
        type: "pre-generated-database",
        name: "Pre-Generated URL DB",
        icon: "sql",
        x: 840,
        y: 480,
      },
    ],
    edges: [
      { id: "Client-1-API-Gateway-1", from: "Client-1", to: "API-Gateway-1" },
      { id: "API-Gateway-1-Service-2", from: "API-Gateway-1", to: "Service-2" },
      { id: "Service-2-DB-1", from: "Service-2", to: "DB-1" },
      { id: "API-Gateway-1-Service-1", from: "API-Gateway-1", to: "Service-1" },
      { id: "Service-1-Cache-1", from: "Service-1", to: "Cache-1" },
      { id: "Service-1-DB-1", from: "Service-1", to: "DB-1" },
      { id: "Service-3-DB-2", from: "Service-3", to: "DB-2" },
      { id: "Service-3-DB-1", from: "Service-3", to: "DB-1" },
    ],
  },

  pastebin: {
    nodes: [
      { id: "Client-1", type: "client", name: "Client", icon: "client", x: 0, y: 150 },
      {
        id: "API-Gateway-1",
        type: "api-gateway",
        name: "API Gateway",
        icon: "api-gateway",
        x: 280,
        y: 150,
      },
      {
        id: "Service-1",
        type: "paste-service",
        name: "Paste Service",
        icon: "service",
        x: 560,
        y: 150,
      },
      { id: "DB-1", type: "metadata-db", name: "SQL Database", icon: "sql", x: 840, y: 50 },
      {
        id: "Bucket-1",
        type: "object-storage",
        name: "Object Storage",
        icon: "bucket",
        x: 840,
        y: 250,
      },
      { id: "CDN-1", type: "cdn", name: "CDN", icon: "cdn", x: 1120, y: 250 },
    ],
    edges: [
      { id: "Client-1-API-Gateway-1", from: "Client-1", to: "API-Gateway-1" },
      { id: "API-Gateway-1-Service-1", from: "API-Gateway-1", to: "Service-1" },
      { id: "Service-1-DB-1", from: "Service-1", to: "DB-1" },
      { id: "Service-1-Bucket-1", from: "Service-1", to: "Bucket-1" },
      { id: "Bucket-1-CDN-1", from: "Bucket-1", to: "CDN-1" },
      { id: "Service-1-CDN-1", from: "Service-1", to: "CDN-1" },
    ],
  },

  "rate-limiter": {
    nodes: [
      { id: "Client-1", type: "client", name: "Client", icon: "client", x: 0, y: 150 },
      {
        id: "API-Gateway-1",
        type: "api-gateway",
        name: "API Gateway",
        icon: "api-gateway",
        x: 280,
        y: 150,
      },
      {
        id: "Service-1",
        type: "rate-limiter",
        name: "Rate Limiter",
        icon: "service",
        x: 560,
        y: 50,
      },
      { id: "Cache-1", type: "redis", name: "Redis", icon: "cache", x: 840, y: 50 },
      {
        id: "Service-2",
        type: "api-service",
        name: "API Services",
        icon: "service",
        x: 560,
        y: 280,
      },
    ],
    edges: [
      { id: "Client-1-API-Gateway-1", from: "Client-1", to: "API-Gateway-1" },
      { id: "API-Gateway-1-Service-1", from: "API-Gateway-1", to: "Service-1" },
      { id: "Service-1-Cache-1", from: "Service-1", to: "Cache-1" },
      { id: "API-Gateway-1-Service-2", from: "API-Gateway-1", to: "Service-2" },
    ],
  },

  "notification-system": {
    nodes: [
      {
        id: "Service-0",
        type: "client",
        name: "Client",
        icon: "client",
        x: 0,
        y: 180,
      },
      {
        id: "Service-1",
        type: "notification-service",
        name: "Notification Service",
        icon: "service",
        x: 280,
        y: 180,
      },
      { id: "DB-1", type: "user-prefs", name: "User Prefs DB", icon: "sql", x: 280, y: 0 },
      { id: "Queue-1", type: "kafka", name: "Kafka Queue", icon: "queue", x: 560, y: 180 },
      {
        id: "Service-2",
        type: "workers",
        name: "Notification Workers",
        icon: "service",
        x: 840,
        y: 180,
      },
      {
        id: "Service-3",
        type: "providers",
        name: "Third-Party Providers",
        icon: "service",
        x: 1120,
        y: 180,
      },
      { id: "Queue-2", type: "dlq", name: "Dead Letter Queue", icon: "queue", x: 840, y: 360 },
    ],
    edges: [
      { id: "Service-0-Service-1", from: "Service-0", to: "Service-1" },
      { id: "Service-1-DB-1", from: "Service-1", to: "DB-1" },
      { id: "Service-1-Queue-1", from: "Service-1", to: "Queue-1" },
      { id: "Queue-1-Service-2", from: "Queue-1", to: "Service-2" },
      { id: "Service-2-Service-3", from: "Service-2", to: "Service-3" },
      { id: "Service-2-Queue-2", from: "Service-2", to: "Queue-2" },
      { id: "Queue-1-Queue-2", from: "Queue-1", to: "Queue-2" },
    ],
  },

  whatsapp: {
    nodes: [
      { id: "Client-1", type: "client", name: "Client", icon: "client", x: 0, y: 180 },
      {
        id: "LB-1",
        type: "load-balancer",
        name: "Load Balancer",
        icon: "load-balancer",
        x: 280,
        y: 180,
      },
      { id: "Service-1", type: "ws-gateway", name: "WS Gateway", icon: "service", x: 560, y: 180 },
      {
        id: "Service-2",
        type: "chat-service",
        name: "Chat Service",
        icon: "service",
        x: 840,
        y: 80,
      },
      { id: "DB-1", type: "cassandra", name: "Cassandra", icon: "nosql", x: 1120, y: 0 },
      {
        id: "Cache-1",
        type: "redis-pubsub",
        name: "Redis Pub/Sub",
        icon: "cache",
        x: 1120,
        y: 180,
      },
      {
        id: "Service-3",
        type: "presence-service",
        name: "Presence Service",
        icon: "service",
        x: 840,
        y: 330,
      },
      { id: "Cache-2", type: "redis-presence", name: "Redis", icon: "cache", x: 1120, y: 330 },
    ],
    edges: [
      { id: "Client-1-LB-1", from: "Client-1", to: "LB-1" },
      { id: "LB-1-Service-1", from: "LB-1", to: "Service-1" },
      { id: "Service-1-Service-2", from: "Service-1", to: "Service-2" },
      { id: "Service-2-DB-1", from: "Service-2", to: "DB-1" },
      { id: "Service-2-Cache-1", from: "Service-2", to: "Cache-1" },
      { id: "Service-1-Service-3", from: "Service-1", to: "Service-3" },
      { id: "Service-3-Cache-2", from: "Service-3", to: "Cache-2" },
    ],
  },

  // ── Leaderboard problem ──────────────────────────────────────────────

  leaderboard: {
    nodes: [
      { id: "Client-1", type: "client", name: "Game Client", icon: "client", x: 0, y: 150 },
      {
        id: "LB-1",
        type: "load-balancer",
        name: "Load Balancer",
        icon: "load-balancer",
        x: 280,
        y: 150,
      },
      {
        id: "Service-1",
        type: "score-service",
        name: "Score Service",
        icon: "service",
        x: 560,
        y: 150,
      },
      {
        id: "Cache-1",
        type: "redis-cluster",
        name: "Redis (Sorted Sets)",
        icon: "cache",
        x: 840,
        y: 50,
      },
      { id: "DB-1", type: "persistent-db", name: "SQL/NoSQL DB", icon: "sql", x: 840, y: 280 },
    ],
    edges: [
      { id: "Client-1-LB-1", from: "Client-1", to: "LB-1" },
      { id: "LB-1-Service-1", from: "LB-1", to: "Service-1" },
      { id: "Service-1-Cache-1", from: "Service-1", to: "Cache-1" },
      { id: "Service-1-DB-1", from: "Service-1", to: "DB-1" },
    ],
  },

  // ── Microservices article ──────────────────────────────────────────────

  "ms-tech-layers": {
    nodes: [
      { id: "S1", type: "service", name: "Frontend Service", icon: "service", x: 140, y: 0 },
      { id: "S2", type: "service", name: "Backend Service", icon: "service", x: 140, y: 150 },
      { id: "DB1", type: "database", name: "Database Service", icon: "sql", x: 140, y: 300 },
    ],
    edges: [
      { id: "S1-S2", from: "S1", to: "S2" },
      { id: "S2-DB1", from: "S2", to: "DB1" },
    ],
  },

  "ms-shared-db": {
    nodes: [
      { id: "S1", type: "service", name: "User Service", icon: "service", x: 100, y: 0 },
      { id: "S2", type: "service", name: "Order Service", icon: "service", x: 380, y: 0 },
      { id: "DB1", type: "database", name: "Shared Database", icon: "sql", x: 240, y: 200 },
    ],
    edges: [
      { id: "S1-DB1", from: "S1", to: "DB1" },
      { id: "S2-DB1", from: "S2", to: "DB1" },
    ],
  },

  "ms-independent-db": {
    nodes: [
      { id: "S1", type: "service", name: "User Service", icon: "service", x: 100, y: 0 },
      { id: "S2", type: "service", name: "Order Service", icon: "service", x: 380, y: 0 },
      { id: "DB1", type: "database", name: "Users DB", icon: "sql", x: 100, y: 180 },
      { id: "DB2", type: "database", name: "Orders DB", icon: "sql", x: 380, y: 180 },
    ],
    edges: [
      { id: "S1-DB1", from: "S1", to: "DB1" },
      { id: "S2-DB2", from: "S2", to: "DB2" },
    ],
  },

  "ms-client-discovery": {
    nodes: [
      {
        id: "Registry",
        type: "service",
        name: "Service Registry",
        icon: "service",
        x: 240,
        y: 0,
      },
      { id: "Order", type: "service", name: "Order Service", icon: "service", x: 240, y: 180 },
      {
        id: "Payment",
        type: "service",
        name: "Payment Service",
        icon: "service",
        x: 240,
        y: 360,
      },
    ],
    edges: [
      {
        id: "Order-Registry",
        from: "Order",
        to: "Registry",
        label: "1. Query",
        edgeType: "labeled" as const,
      },
      {
        id: "Order-Payment",
        from: "Order",
        to: "Payment",
        label: "2. Direct call",
        edgeType: "labeled" as const,
      },
    ],
  },

  "ms-server-discovery": {
    nodes: [
      { id: "Order", type: "service", name: "Order Service", icon: "service", x: 0, y: 120 },
      {
        id: "LB",
        type: "load-balancer",
        name: "Load Balancer",
        icon: "load-balancer",
        x: 280,
        y: 120,
      },
      {
        id: "P1",
        type: "service",
        name: "Payment Instance 1",
        icon: "service",
        x: 560,
        y: 30,
      },
      {
        id: "P2",
        type: "service",
        name: "Payment Instance 2",
        icon: "service",
        x: 560,
        y: 210,
      },
    ],
    edges: [
      { id: "Order-LB", from: "Order", to: "LB" },
      { id: "LB-P1", from: "LB", to: "P1" },
      { id: "LB-P2", from: "LB", to: "P2" },
    ],
  },

  // ── Sharding article ──────────────────────────────────────────────────

  "shard-basic": {
    nodes: [
      {
        id: "Router",
        type: "service",
        name: "Shard Router",
        icon: "load-balancer",
        x: 240,
        y: 0,
      },
      { id: "S1", type: "database", name: "Shard 1 (A-F)", icon: "sql", x: 0, y: 180 },
      { id: "S2", type: "database", name: "Shard 2 (G-N)", icon: "sql", x: 240, y: 180 },
      { id: "S3", type: "database", name: "Shard 3 (O-Z)", icon: "sql", x: 480, y: 180 },
    ],
    edges: [
      { id: "Router-S1", from: "Router", to: "S1", sourceHandle: "left", targetHandle: "top" },
      { id: "Router-S2", from: "Router", to: "S2" },
      { id: "Router-S3", from: "Router", to: "S3", sourceHandle: "right", targetHandle: "top" },
    ],
  },

  // ── Redis Sorted Sets article ─────────────────────────────────────────

  "redis-sharding-problem": {
    nodes: [
      { id: "S1", type: "database", name: "Shard 1", icon: "cache", x: 0, y: 0 },
      { id: "S2", type: "database", name: "Shard 2", icon: "cache", x: 250, y: 0 },
      { id: "S3", type: "database", name: "Shard 3", icon: "cache", x: 500, y: 0 },
      {
        id: "T1",
        type: "textNode",
        name: "A: 9500, B: 9200, C: 8800",
        icon: "",
        x: 0,
        y: 130,
        width: 190,
        height: 40,
      },
      {
        id: "T2",
        type: "textNode",
        name: "D: 9800, E: 9100, F: 8900",
        icon: "",
        x: 250,
        y: 130,
        width: 190,
        height: 40,
      },
      {
        id: "T3",
        type: "textNode",
        name: "G: 9200, H: 9100, I: 8700",
        icon: "",
        x: 500,
        y: 130,
        width: 190,
        height: 40,
      },
    ],
    edges: [],
  },

  "redis-score-sharding": {
    nodes: [
      { id: "S1", type: "database", name: "Shard 1", icon: "cache", x: 0, y: 0 },
      { id: "S2", type: "database", name: "Shard 2", icon: "cache", x: 250, y: 0 },
      { id: "S3", type: "database", name: "Shard 3", icon: "cache", x: 500, y: 0 },
      {
        id: "T1",
        type: "textNode",
        name: "Scores: 0–10000 (5M keys)",
        icon: "",
        x: 0,
        y: 130,
        width: 190,
        height: 40,
      },
      {
        id: "T2",
        type: "textNode",
        name: "Scores: 10001–20000 (3M keys)",
        icon: "",
        x: 250,
        y: 130,
        width: 190,
        height: 40,
      },
      {
        id: "T3",
        type: "textNode",
        name: "Scores: 20001+ (200K keys)",
        icon: "",
        x: 500,
        y: 130,
        width: 190,
        height: 40,
      },
    ],
    edges: [],
  },

  "redis-read-replicas": {
    nodes: [
      { id: "Primary", type: "database", name: "Primary", icon: "cache", x: 200, y: 0 },
      { id: "R1", type: "database", name: "Replica 1", icon: "cache", x: 80, y: 200 },
      { id: "R2", type: "database", name: "Replica 2", icon: "cache", x: 320, y: 200 },
    ],
    edges: [
      {
        id: "Primary-R1",
        from: "Primary",
        to: "R1",
        label: "replication",
        edgeType: "dashed" as const,
        sourceHandle: "left",
        targetHandle: "top",
      },
      {
        id: "Primary-R2",
        from: "Primary",
        to: "R2",
        label: "replication",
        sourceHandle: "right",
        targetHandle: "top",
        edgeType: "dashed" as const,
      },
    ],
  },

  // ── Microservices: Business domains (Batch 3) ─────────────────────────

  "ms-business-domains": {
    nodes: [
      { id: "S1", type: "service", name: "User Service", icon: "service", x: 0, y: 0 },
      { id: "DB1", type: "database", name: "Users DB", icon: "sql", x: 0, y: 160 },
      { id: "S2", type: "service", name: "Order Service", icon: "service", x: 240, y: 0 },
      { id: "DB2", type: "database", name: "Orders DB", icon: "sql", x: 240, y: 160 },
      { id: "S3", type: "service", name: "Payment Service", icon: "service", x: 480, y: 0 },
      { id: "DB3", type: "database", name: "Payments DB", icon: "sql", x: 480, y: 160 },
      { id: "S4", type: "service", name: "Notif. Service", icon: "service", x: 720, y: 0 },
      { id: "DB4", type: "database", name: "Notifs DB", icon: "sql", x: 720, y: 160 },
    ],
    edges: [
      { id: "S1-DB1", from: "S1", to: "DB1" },
      { id: "S2-DB2", from: "S2", to: "DB2" },
      { id: "S3-DB3", from: "S3", to: "DB3" },
      { id: "S4-DB4", from: "S4", to: "DB4" },
    ],
  },

  // ── Microservices: Stateless services (Batch 3) ───────────────────────

  "ms-stateless": {
    nodes: [
      {
        id: "LB",
        type: "load-balancer",
        name: "Load Balancer",
        icon: "load-balancer",
        x: 280,
        y: 0,
      },
      { id: "I1", type: "service", name: "Instance 1", icon: "service", x: 80, y: 160 },
      { id: "I2", type: "service", name: "Instance 2", icon: "service", x: 280, y: 160 },
      { id: "I3", type: "service", name: "Instance 3", icon: "service", x: 480, y: 160 },
      { id: "Redis", type: "cache", name: "Redis", icon: "cache", x: 80, y: 340 },
      { id: "DB", type: "database", name: "Database", icon: "sql", x: 280, y: 340 },
      {
        id: "Storage",
        type: "storage",
        name: "Object Storage",
        icon: "bucket",
        x: 480,
        y: 340,
      },
    ],
    edges: [
      { id: "LB-I1", from: "LB", to: "I1", sourceHandle: "left", targetHandle: "top" },
      { id: "LB-I2", from: "LB", to: "I2" },
      { id: "LB-I3", from: "LB", to: "I3", sourceHandle: "right", targetHandle: "top" },
      { id: "I1-Redis", from: "I1", to: "Redis" },
      { id: "I2-DB", from: "I2", to: "DB" },
      { id: "I3-Storage", from: "I3", to: "Storage" },
    ],
  },

  // ── Microservices: Sequence diagrams (Batch 4) ────────────────────────

  "ms-rest": {
    nodes: [
      { id: "Order", type: "service", name: "Order Service", icon: "service", x: 0, y: 80 },
      {
        id: "Payment",
        type: "service",
        name: "Payment Service",
        icon: "service",
        x: 450,
        y: 80,
      },
    ],
    edges: [
      {
        id: "req",
        from: "Order",
        to: "Payment",
        label: "POST /payments (JSON)",
        edgeType: "labeled" as const,
      },
    ],
  },

  "ms-grpc": {
    nodes: [
      { id: "Order", type: "service", name: "Order Service", icon: "service", x: 0, y: 80 },
      {
        id: "Payment",
        type: "service",
        name: "Payment Service",
        icon: "service",
        x: 450,
        y: 80,
      },
    ],
    edges: [
      {
        id: "req",
        from: "Order",
        to: "Payment",
        label: "ProcessPayment (binary)",
        edgeType: "labeled" as const,
      },
    ],
  },

  "ms-async-queue": {
    nodes: [
      { id: "Order", type: "service", name: "Order Service", icon: "service", x: 0, y: 80 },
      { id: "Queue", type: "queue", name: "Message Queue", icon: "queue", x: 280, y: 80 },
      {
        id: "Notif",
        type: "service",
        name: "Notification Service",
        icon: "service",
        x: 560,
        y: 80,
      },
    ],
    edges: [
      {
        id: "Order-Queue",
        from: "Order",
        to: "Queue",
        label: "OrderCompleted",
        edgeType: "labeled" as const,
      },
      {
        id: "Queue-Notif",
        from: "Queue",
        to: "Notif",
        label: "consume",
        edgeType: "labeled" as const,
      },
    ],
  },

  // ── Sharding: Routing comparison (Batch 5) ────────────────────────────

  "shard-routing-comparison": {
    nodes: [
      // Left side: App-Level
      {
        id: "G1",
        type: "groupNode",
        name: "App-Level Routing",
        icon: "",
        x: 130,
        y: 230,
        width: 420,
        height: 400,
      },
      { id: "App1", type: "service", name: "Application", icon: "service", x: 130, y: 110 },
      { id: "A-S1", type: "database", name: "Shard 1", icon: "sql", x: 40, y: 310 },
      { id: "A-S2", type: "database", name: "Shard 2", icon: "sql", x: 220, y: 310 },
      // Right side: Proxy-Level
      {
        id: "G2",
        type: "groupNode",
        name: "Proxy-Level Routing",
        icon: "",
        x: 580,
        y: 300,
        width: 420,
        height: 500,
      },
      { id: "App2", type: "service", name: "Application", icon: "service", x: 580, y: 150 },
      {
        id: "Proxy",
        type: "service",
        name: "Shard Proxy",
        icon: "load-balancer",
        x: 580,
        y: 300,
      },
      { id: "P-S1", type: "database", name: "Shard 1", icon: "sql", x: 490, y: 450 },
      { id: "P-S2", type: "database", name: "Shard 2", icon: "sql", x: 670, y: 450 },
    ],
    edges: [
      { id: "App1-AS1", from: "App1", to: "A-S1", sourceHandle: "left", targetHandle: "top" },
      { id: "App1-AS2", from: "App1", to: "A-S2", sourceHandle: "right", targetHandle: "top" },
      { id: "App2-Proxy", from: "App2", to: "Proxy" },
      { id: "Proxy-PS1", from: "Proxy", to: "P-S1", sourceHandle: "left", targetHandle: "top" },
      { id: "Proxy-PS2", from: "Proxy", to: "P-S2", sourceHandle: "right", targetHandle: "top" },
    ],
  },

  // ── Redis: Dual data structure (Batch 5) ──────────────────────────────

  "redis-dual-structure": {
    nodes: [
      {
        id: "G1",
        type: "groupNode",
        name: "Sorted Set",
        icon: "",
        x: 240,
        y: 110,
        width: 480,
        height: 150,
      },
      { id: "SL", type: "service", name: "Skip List", icon: "service", x: 140, y: 110 },
      { id: "HT", type: "service", name: "Hash Table", icon: "cache", x: 340, y: 110 },
      {
        id: "T1",
        type: "textNode",
        name: "O(log N) rank & range",
        icon: "",
        x: 140,
        y: 210,
        width: 160,
        height: 36,
      },
      {
        id: "T2",
        type: "textNode",
        name: "O(1) score lookup",
        icon: "",
        x: 340,
        y: 210,
        width: 160,
        height: 36,
      },
    ],
    edges: [],
  },

  // ── Redis: Skip list (Batch 7) ────────────────────────────────────────

  "redis-skip-list": {
    nodes: [
      // Level 3 (top)
      {
        id: "L3-H",
        type: "textNode",
        name: "Level 3",
        icon: "",
        x: 0,
        y: 0,
        width: 80,
        height: 36,
      },
      {
        id: "L3-A",
        type: "service",
        name: "10 (Alice)",
        icon: "cache",
        x: 520,
        y: 0,
        width: 150,
        height: 56,
      },
      // Level 2
      {
        id: "L2-H",
        type: "textNode",
        name: "Level 2",
        icon: "",
        x: 0,
        y: 100,
        width: 80,
        height: 36,
      },
      {
        id: "L2-B",
        type: "service",
        name: "5 (Bob)",
        icon: "cache",
        x: 280,
        y: 100,
        width: 150,
        height: 56,
      },
      {
        id: "L2-A",
        type: "service",
        name: "10 (Alice)",
        icon: "cache",
        x: 520,
        y: 100,
        width: 150,
        height: 56,
      },
      // Level 1
      {
        id: "L1-H",
        type: "textNode",
        name: "Level 1",
        icon: "",
        x: 0,
        y: 200,
        width: 80,
        height: 36,
      },
      {
        id: "L1-C",
        type: "service",
        name: "3 (Charlie)",
        icon: "cache",
        x: 150,
        y: 200,
        width: 150,
        height: 56,
      },
      {
        id: "L1-B",
        type: "service",
        name: "5 (Bob)",
        icon: "cache",
        x: 350,
        y: 200,
        width: 150,
        height: 56,
      },
      {
        id: "L1-A",
        type: "service",
        name: "10 (Alice)",
        icon: "cache",
        x: 550,
        y: 200,
        width: 150,
        height: 56,
      },
      {
        id: "L1-D",
        type: "service",
        name: "15 (Diana)",
        icon: "cache",
        x: 750,
        y: 200,
        width: 150,
        height: 56,
      },
    ],
    edges: [
      { id: "L3H-L3A", from: "L3-H", to: "L3-A", edgeType: "dashed" as const },
      { id: "L2H-L2B", from: "L2-H", to: "L2-B", edgeType: "dashed" as const },
      { id: "L2B-L2A", from: "L2-B", to: "L2-A", edgeType: "dashed" as const },
      { id: "L1H-L1C", from: "L1-H", to: "L1-C", edgeType: "dashed" as const },
      { id: "L1C-L1B", from: "L1-C", to: "L1-B", edgeType: "dashed" as const },
      { id: "L1B-L1A", from: "L1-B", to: "L1-A", edgeType: "dashed" as const },
      { id: "L1A-L1D", from: "L1-A", to: "L1-D", edgeType: "dashed" as const },
    ],
  },

  // ── DataStructures: SSTable (Batch 3) ─────────────────────────────────

  "ds-sstable": {
    nodes: [
      { id: "D1", type: "service", name: "Data Blocks", icon: "sql", x: 160, y: 0 },
      { id: "D2", type: "service", name: "Index Block", icon: "service", x: 160, y: 130 },
      { id: "D3", type: "service", name: "Bloom Filter", icon: "service", x: 160, y: 260 },
      { id: "D4", type: "service", name: "Footer", icon: "service", x: 160, y: 390 },
    ],
    edges: [
      { id: "D1-D2", from: "D1", to: "D2" },
      { id: "D2-D3", from: "D2", to: "D3" },
      { id: "D3-D4", from: "D3", to: "D4" },
    ],
  },

  // ── DataStructures: Compaction (Batch 5) ──────────────────────────────

  "ds-compaction": {
    nodes: [
      {
        id: "G1",
        type: "groupNode",
        name: "Before Compaction",
        icon: "",
        x: 170,
        y: 130,
        width: 340,
        height: 130,
      },
      {
        id: "B1",
        type: "textNode",
        name: "L0: SST-1, SST-2",
        icon: "",
        x: 100,
        y: 120,
        width: 140,
        height: 40,
      },
      {
        id: "B2",
        type: "textNode",
        name: "L1: SST-A",
        icon: "",
        x: 240,
        y: 120,
        width: 140,
        height: 40,
      },
      {
        id: "G2",
        type: "groupNode",
        name: "After Compaction",
        icon: "",
        x: 170,
        y: 320,
        width: 340,
        height: 130,
      },
      {
        id: "A1",
        type: "textNode",
        name: "L0: (empty)",
        icon: "",
        x: 100,
        y: 310,
        width: 140,
        height: 40,
      },
      {
        id: "A2",
        type: "textNode",
        name: "L1: SST-merged",
        icon: "",
        x: 240,
        y: 310,
        width: 140,
        height: 40,
      },
    ],
    edges: [
      {
        id: "B-A",
        from: "G1",
        to: "G2",
        label: "merge + sort",
        edgeType: "labeled" as const,
      },
    ],
  },

  // ── DataStructures: Consistent hashing (Batch 6) ──────────────────────

  "ds-consistent-hashing": {
    nodes: [
      { id: "N1", type: "service", name: "Node A", icon: "service", x: 200, y: 0 },
      { id: "N2", type: "service", name: "Node B", icon: "service", x: 400, y: 130 },
      { id: "N3", type: "service", name: "Node C", icon: "service", x: 200, y: 260 },
      { id: "N4", type: "service", name: "Node D", icon: "service", x: 0, y: 130 },
      {
        id: "T1",
        type: "textNode",
        name: "Keys mapped to next clockwise node",
        icon: "",
        x: 200,
        y: 130,
        width: 200,
        height: 40,
      },
    ],
    edges: [
      { id: "N1-N2", from: "N1", to: "N2", edgeType: "dashed" as const },
      { id: "N2-N3", from: "N2", to: "N3", edgeType: "dashed" as const },
      { id: "N3-N4", from: "N3", to: "N4", edgeType: "dashed" as const },
      { id: "N4-N1", from: "N4", to: "N1", edgeType: "dashed" as const },
    ],
  },

  // ── Job Scheduler problem ─────────────────────────────────────────────

  "job-scheduler": {
    nodes: [
      { id: "Client-1", type: "client", name: "Client", icon: "client", x: 0, y: 180 },
      {
        id: "API-Svc",
        type: "api-service",
        name: "Scheduler API",
        icon: "service",
        x: 280,
        y: 180,
      },
      {
        id: "DB-Jobs",
        type: "job-database",
        name: "Job DB (SQL)",
        icon: "sql",
        x: 560,
        y: 60,
      },
      {
        id: "Coordinator",
        type: "coordinator",
        name: "Coordinator/Leader",
        icon: "service",
        x: 560,
        y: 300,
      },
      {
        id: "Message-Queue",
        type: "queue",
        name: "Kafka/SQS",
        icon: "queue",
        x: 840,
        y: 300,
      },
      {
        id: "Workers",
        type: "worker-pool",
        name: "Worker Pool",
        icon: "service",
        x: 1120,
        y: 300,
      },
    ],
    edges: [
      { id: "Client-API", from: "Client-1", to: "API-Svc" },
      { id: "API-DB", from: "API-Svc", to: "DB-Jobs" },
      { id: "Coordinator-DB", from: "Coordinator", to: "DB-Jobs" },
      { id: "Coordinator-Queue", from: "Coordinator", to: "Message-Queue" },
      { id: "Queue-Workers", from: "Message-Queue", to: "Workers" },
    ],
  },

  // ── Payment System problem ──────────────────────────────────────────

  "payment-system": {
    nodes: [
      { id: "Client-1", type: "client", name: "Client", icon: "client", x: 0, y: 150 },
      {
        id: "Payment-Svc",
        type: "payment-service",
        name: "Payment Service",
        icon: "service",
        x: 280,
        y: 150,
      },
      {
        id: "Ledger-DB",
        type: "ledger-database",
        name: "Ledger DB (SQL)",
        icon: "sql",
        x: 560,
        y: 50,
      },
      {
        id: "PSP",
        type: "psp",
        name: "Stripe/PayPal",
        icon: "service",
        x: 560,
        y: 280,
      },
      {
        id: "Reconciler",
        type: "reconciliation",
        name: "Reconciliation Job",
        icon: "service",
        x: 840,
        y: 50,
      },
    ],
    edges: [
      { id: "Client-Payment", from: "Client-1", to: "Payment-Svc" },
      { id: "Payment-Ledger", from: "Payment-Svc", to: "Ledger-DB" },
      { id: "Payment-PSP", from: "Payment-Svc", to: "PSP" },
      { id: "PSP-Payment", from: "PSP", to: "Payment-Svc" },
      { id: "Reconciler-DB", from: "Reconciler", to: "Ledger-DB" },
    ],
  },

  // ── Sharding: Consistent hashing (Batch 6) ───────────────────────────

  // ── Delta Sync: Merkle tree ───────────────────────────────────────

  "merkle-tree": {
    nodes: [
      { id: "Root", type: "service", name: "h(ABCD)", icon: "cache", x: 280, y: 0 },
      { id: "L-AB", type: "service", name: "h(AB)", icon: "cache", x: 120, y: 150 },
      { id: "R-CD", type: "service", name: "h(CD)", icon: "cache", x: 440, y: 150 },
      { id: "L-C0", type: "service", name: "h(chunk0)", icon: "cache", x: 30, y: 300 },
      { id: "L-C1", type: "service", name: "h(chunk1)", icon: "cache", x: 210, y: 300 },
      { id: "R-C2", type: "service", name: "h(chunk2)", icon: "cache", x: 390, y: 300 },
      { id: "R-C3", type: "service", name: "h(chunk3)", icon: "cache", x: 570, y: 300 },
      {
        id: "T0",
        type: "textNode",
        name: "chunk0 (4MB)",
        icon: "",
        x: 30,
        y: 420,
        width: 140,
        height: 36,
      },
      {
        id: "T1",
        type: "textNode",
        name: "chunk1 (4MB)",
        icon: "",
        x: 210,
        y: 420,
        width: 140,
        height: 36,
      },
      {
        id: "T2",
        type: "textNode",
        name: "chunk2 (4MB)",
        icon: "",
        x: 390,
        y: 420,
        width: 140,
        height: 36,
      },
      {
        id: "T3",
        type: "textNode",
        name: "chunk3 (4MB)",
        icon: "",
        x: 570,
        y: 420,
        width: 140,
        height: 36,
      },
    ],
    edges: [
      { id: "Root-LAB", from: "Root", to: "L-AB", sourceHandle: "left", targetHandle: "top" },
      { id: "Root-RCD", from: "Root", to: "R-CD", sourceHandle: "right", targetHandle: "top" },
      { id: "LAB-C0", from: "L-AB", to: "L-C0" },
      { id: "LAB-C1", from: "L-AB", to: "L-C1" },
      { id: "RCD-C2", from: "R-CD", to: "R-C2" },
      { id: "RCD-C3", from: "R-CD", to: "R-C3" },
      { id: "C0-T0", from: "L-C0", to: "T0", edgeType: "dashed" as const },
      { id: "C1-T1", from: "L-C1", to: "T1", edgeType: "dashed" as const },
      { id: "C2-T2", from: "R-C2", to: "T2", edgeType: "dashed" as const },
      { id: "C3-T3", from: "R-C3", to: "T3", edgeType: "dashed" as const },
    ],
  },

  // ── Dropbox problem ────────────────────────────────────────────────

  dropbox: {
    nodes: [
      { id: "Client-1", type: "client", name: "Client (Watcher)", icon: "client", x: 0, y: 180 },
      {
        id: "API-Svc",
        type: "metadata-api",
        name: "Metadata API",
        icon: "service",
        x: 280,
        y: 180,
      },
      {
        id: "Block-Store",
        type: "object-storage",
        name: "Object Storage (S3)",
        icon: "bucket",
        x: 280,
        y: 0,
      },
      {
        id: "Meta-DB",
        type: "metadata-db",
        name: "Metadata DB (SQL)",
        icon: "sql",
        x: 560,
        y: 60,
      },
      {
        id: "Message-Queue",
        type: "queue",
        name: "Kafka/RabbitMQ",
        icon: "queue",
        x: 560,
        y: 300,
      },
      {
        id: "Sync-Svc",
        type: "sync-service",
        name: "Notification/Sync Svc",
        icon: "service",
        x: 840,
        y: 180,
      },
    ],
    edges: [
      { id: "Client-BlockStore", from: "Client-1", to: "Block-Store" },
      { id: "Client-API", from: "Client-1", to: "API-Svc" },
      { id: "API-DB", from: "API-Svc", to: "Meta-DB" },
      { id: "API-Queue", from: "API-Svc", to: "Message-Queue" },
      { id: "Queue-Sync", from: "Message-Queue", to: "Sync-Svc" },
    ],
  },

  // ── Sharding: Consistent hashing (Batch 6) ───────────────────────────

  // ── Web Crawler problem ───────────────────────────────────────────

  "web-crawler": {
    nodes: [
      {
        id: "Frontier",
        type: "url-frontier",
        name: "URL Frontier",
        icon: "queue",
        x: 0,
        y: 180,
      },
      {
        id: "Fetcher",
        type: "fetcher-workers",
        name: "HTML Fetcher Workers",
        icon: "service",
        x: 280,
        y: 180,
      },
      {
        id: "DNS",
        type: "dns-resolver",
        name: "Custom DNS Resolver",
        icon: "cache",
        x: 280,
        y: 0,
      },
      {
        id: "Parser",
        type: "extractor-parser",
        name: "Extractor / Parser",
        icon: "service",
        x: 560,
        y: 180,
      },
      {
        id: "BloomFilter",
        type: "bloom-filter",
        name: "Bloom Filter",
        icon: "cache",
        x: 560,
        y: 360,
      },
      {
        id: "Storage",
        type: "content-storage",
        name: "Blob Storage + DB",
        icon: "bucket",
        x: 840,
        y: 60,
      },
    ],
    edges: [
      { id: "Frontier-Fetcher", from: "Frontier", to: "Fetcher" },
      { id: "Fetcher-DNS", from: "Fetcher", to: "DNS" },
      { id: "Fetcher-Parser", from: "Fetcher", to: "Parser" },
      { id: "Parser-Bloom", from: "Parser", to: "BloomFilter" },
      {
        id: "Parser-Frontier",
        from: "Parser",
        to: "Frontier",
        sourceHandle: "bottom",
        targetHandle: "bottom",
      },
      { id: "Parser-Storage", from: "Parser", to: "Storage" },
    ],
  },

  // ── CDN article diagrams ─────────────────────────────────────────

  "cdn-multi-tier": {
    nodes: [
      { id: "User", type: "client", name: "User", icon: "client", x: 0, y: 120 },
      {
        id: "Edge",
        type: "edge-pop",
        name: "Edge PoP",
        icon: "cdn",
        x: 280,
        y: 120,
        sublabel: "~300 locations",
      },
      {
        id: "Shield",
        type: "regional-shield",
        name: "Origin Shield",
        icon: "cache",
        x: 560,
        y: 120,
        sublabel: "~10-20 regions",
      },
      {
        id: "Origin",
        type: "origin-storage",
        name: "Origin (S3)",
        icon: "bucket",
        x: 840,
        y: 120,
        sublabel: "1 region",
      },
    ],
    edges: [
      { id: "User-Edge", from: "User", to: "Edge" },
      { id: "Edge-Shield", from: "Edge", to: "Shield" },
      { id: "Shield-Origin", from: "Shield", to: "Origin" },
    ],
  },

  // ── Video Streaming article diagrams ────────────────────────────────

  "video-transcoding-dag": {
    nodes: [
      {
        id: "Upload",
        type: "raw-upload",
        name: "Raw Upload",
        icon: "bucket",
        x: 0,
        y: 180,
      },
      {
        id: "Validate",
        type: "validate",
        name: "Validate & Split",
        icon: "service",
        x: 280,
        y: 180,
      },
      {
        id: "Enc-360",
        type: "encode-360p",
        name: "Encode 360p",
        icon: "service",
        x: 560,
        y: 0,
      },
      {
        id: "Enc-720",
        type: "encode-720p",
        name: "Encode 720p",
        icon: "service",
        x: 560,
        y: 130,
      },
      {
        id: "Enc-1080",
        type: "encode-1080p",
        name: "Encode 1080p",
        icon: "service",
        x: 560,
        y: 260,
      },
      {
        id: "Enc-4K",
        type: "encode-4k",
        name: "Encode 4K",
        icon: "service",
        x: 560,
        y: 390,
      },
      {
        id: "Manifest",
        type: "manifest-gen",
        name: "Generate Manifests",
        icon: "service",
        x: 840,
        y: 180,
      },
      {
        id: "Store",
        type: "processed-store",
        name: "Processed Store",
        icon: "bucket",
        x: 1120,
        y: 180,
      },
    ],
    edges: [
      { id: "Upload-Validate", from: "Upload", to: "Validate" },
      { id: "Validate-360", from: "Validate", to: "Enc-360" },
      { id: "Validate-720", from: "Validate", to: "Enc-720" },
      { id: "Validate-1080", from: "Validate", to: "Enc-1080" },
      { id: "Validate-4K", from: "Validate", to: "Enc-4K" },
      { id: "360-Manifest", from: "Enc-360", to: "Manifest" },
      { id: "720-Manifest", from: "Enc-720", to: "Manifest" },
      { id: "1080-Manifest", from: "Enc-1080", to: "Manifest" },
      { id: "4K-Manifest", from: "Enc-4K", to: "Manifest" },
      { id: "Manifest-Store", from: "Manifest", to: "Store" },
    ],
  },

  // ── Async Processing article diagrams ───────────────────────────────

  "async-dag": {
    nodes: [
      {
        id: "Validate",
        type: "validate",
        name: "Validate",
        icon: "service",
        x: 0,
        y: 200,
      },
      {
        id: "Metadata",
        type: "extract-metadata",
        name: "Extract Metadata",
        icon: "service",
        x: 250,
        y: 0,
      },
      {
        id: "Thumbnails",
        type: "thumbnails",
        name: "Thumbnails",
        icon: "service",
        x: 500,
        y: 0,
      },
      {
        id: "Enc-360",
        type: "encode-360p",
        name: "Encode 360p",
        icon: "service",
        x: 250,
        y: 140,
      },
      {
        id: "Enc-720",
        type: "encode-720p",
        name: "Encode 720p",
        icon: "service",
        x: 250,
        y: 260,
      },
      {
        id: "Enc-1080",
        type: "encode-1080p",
        name: "Encode 1080p",
        icon: "service",
        x: 250,
        y: 380,
      },
      {
        id: "Manifest",
        type: "manifest-gen",
        name: "Build Manifest",
        icon: "service",
        x: 500,
        y: 260,
      },
      {
        id: "UpdateDB",
        type: "update-db",
        name: "Update DB",
        icon: "sql",
        x: 750,
        y: 120,
      },
      {
        id: "Notify",
        type: "notify-user",
        name: "Notify User",
        icon: "service",
        x: 750,
        y: 300,
      },
    ],
    edges: [
      { id: "V-Meta", from: "Validate", to: "Metadata", sourceHandle: "top", targetHandle: "left" },
      { id: "V-360", from: "Validate", to: "Enc-360" },
      { id: "V-720", from: "Validate", to: "Enc-720" },
      { id: "V-1080", from: "Validate", to: "Enc-1080" },
      { id: "Meta-Thumb", from: "Metadata", to: "Thumbnails" },
      { id: "360-Man", from: "Enc-360", to: "Manifest" },
      { id: "720-Man", from: "Enc-720", to: "Manifest" },
      { id: "1080-Man", from: "Enc-1080", to: "Manifest" },
      { id: "Thumb-DB", from: "Thumbnails", to: "UpdateDB" },
      { id: "Man-DB", from: "Manifest", to: "UpdateDB" },
      { id: "DB-Notify", from: "UpdateDB", to: "Notify" },
    ],
  },

  "async-event-pipeline": {
    nodes: [
      {
        id: "S3",
        type: "s3-upload",
        name: "S3 Upload",
        icon: "bucket",
        x: 0,
        y: 150,
      },
      {
        id: "EventBridge",
        type: "event-bridge",
        name: "EventBridge",
        icon: "queue",
        x: 250,
        y: 150,
      },
      {
        id: "Validate",
        type: "validate-lambda",
        name: "Validate (Lambda)",
        icon: "service",
        x: 500,
        y: 150,
      },
      {
        id: "SNS",
        type: "sns-topic",
        name: "SNS Topic",
        icon: "queue",
        x: 750,
        y: 150,
      },
      {
        id: "Worker-360",
        type: "worker-360p",
        name: "Worker 360p",
        icon: "service",
        x: 1000,
        y: 0,
      },
      {
        id: "Worker-720",
        type: "worker-720p",
        name: "Worker 720p",
        icon: "service",
        x: 1000,
        y: 130,
      },
      {
        id: "Worker-1080",
        type: "worker-1080p",
        name: "Worker 1080p",
        icon: "service",
        x: 1000,
        y: 260,
      },
      {
        id: "Counter",
        type: "completion-counter",
        name: "DynamoDB Counter",
        icon: "nosql",
        x: 1000,
        y: 400,
      },
    ],
    edges: [
      { id: "S3-EB", from: "S3", to: "EventBridge" },
      { id: "EB-Val", from: "EventBridge", to: "Validate" },
      { id: "Val-SNS", from: "Validate", to: "SNS" },
      { id: "SNS-360", from: "SNS", to: "Worker-360" },
      { id: "SNS-720", from: "SNS", to: "Worker-720" },
      { id: "SNS-1080", from: "SNS", to: "Worker-1080" },
      { id: "360-Counter", from: "Worker-360", to: "Counter" },
      { id: "720-Counter", from: "Worker-720", to: "Counter" },
      { id: "1080-Counter", from: "Worker-1080", to: "Counter" },
    ],
  },

  // ── YouTube problem diagram ─────────────────────────────────────────

  youtube: {
    nodes: [
      { id: "Client", type: "client", name: "Client", icon: "client", x: 0, y: 180 },
      {
        id: "API-Gateway",
        type: "api-gateway",
        name: "API Gateway",
        icon: "api-gateway",
        x: 280,
        y: 180,
      },
      {
        id: "Metadata-DB",
        type: "metadata-db",
        name: "Metadata DB",
        icon: "sql",
        x: 280,
        y: 380,
      },
      {
        id: "Raw-Storage",
        type: "raw-object-store",
        name: "Raw Object Store",
        icon: "bucket",
        x: 560,
        y: 0,
      },
      {
        id: "Transcoding-DAG",
        type: "transcoding-dag",
        name: "Worker Queue / DAG",
        icon: "queue",
        x: 560,
        y: 180,
      },
      {
        id: "Processed-Storage",
        type: "processed-store",
        name: "Transcoded Store",
        icon: "bucket",
        x: 560,
        y: 380,
      },
      { id: "CDN", type: "cdn", name: "CDN", icon: "cdn", x: 840, y: 180 },
    ],
    edges: [
      { id: "Client-API", from: "Client", to: "API-Gateway" },
      { id: "API-Meta", from: "API-Gateway", to: "Metadata-DB" },
      {
        id: "Client-Raw",
        from: "Client",
        to: "Raw-Storage",
        sourceHandle: "top",
        targetHandle: "left",
      },
      { id: "Raw-DAG", from: "Raw-Storage", to: "Transcoding-DAG" },
      { id: "DAG-Processed", from: "Transcoding-DAG", to: "Processed-Storage" },
      { id: "Processed-CDN", from: "Processed-Storage", to: "CDN" },
      { id: "Client-CDN", from: "Client", to: "CDN", sourceHandle: "right", targetHandle: "left" },
    ],
  },

  "shard-consistent-hashing": {
    nodes: [
      { id: "N1", type: "database", name: "Shard A", icon: "sql", x: 200, y: 0 },
      { id: "N2", type: "database", name: "Shard B", icon: "sql", x: 400, y: 130 },
      { id: "N3", type: "database", name: "Shard C", icon: "sql", x: 200, y: 260 },
      { id: "N4", type: "database", name: "Shard D", icon: "sql", x: 0, y: 130 },
      {
        id: "T1",
        type: "textNode",
        name: "Hash ring — keys route to next clockwise shard",
        icon: "",
        x: 200,
        y: 130,
        width: 220,
        height: 40,
      },
    ],
    edges: [
      { id: "N1-N2", from: "N1", to: "N2", edgeType: "dashed" as const },
      { id: "N2-N3", from: "N2", to: "N3", edgeType: "dashed" as const },
      { id: "N3-N4", from: "N3", to: "N4", edgeType: "dashed" as const },
      { id: "N4-N1", from: "N4", to: "N1", edgeType: "dashed" as const },
    ],
  },
};

/**
 * Compute the bounding box of all nodes (using their center-based positions).
 * Returns top-left corner positions and total width/height — used for SVG viewBox.
 */
export function computeDiagramBounds(config: ArticleDiagramConfig): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of config.nodes) {
    const w = node.width ?? NODE_W;
    const h = node.height ?? NODE_H;
    // Node positions in ReactFlow are top-left: (x - w/2, y - h/2)
    const left = node.x - w / 2;
    const top = node.y - h / 2;
    const right = left + w;
    const bottom = top + h;
    if (left < minX) minX = left;
    if (top < minY) minY = top;
    if (right > maxX) maxX = right;
    if (bottom > maxY) maxY = bottom;
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function getDiagramConfig(diagramId: string): ArticleDiagramConfig | null {
  return diagrams[diagramId] ?? null;
}
