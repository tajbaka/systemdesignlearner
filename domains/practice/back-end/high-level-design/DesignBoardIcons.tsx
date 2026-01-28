"use client";
import React from "react";

type IconProps = {
  className?: string;
  size?: number;
};

const stroke = "currentColor";
const common = {
  fill: "none",
  stroke,
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconDatabase({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <ellipse cx="12" cy="6" rx="7" ry="3" {...common} />
      <path d="M5 6v6c0 1.657 3.134 3 7 3s7-1.343 7-3V6" {...common} />
      <path d="M5 12v6c0 1.657 3.134 3 7 3s7-1.343 7-3v-6" {...common} />
    </svg>
  );
}

function IconRedis({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M3 9l9-3 9 3-9 3-9-3z" {...common} />
      <path d="M3 13l9 3 9-3" {...common} />
      <path d="M3 17l9 3 9-3" {...common} />
    </svg>
  );
}

function IconService({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <rect x="5" y="5" width="14" height="14" rx="2" {...common} />
      <path d="M9 9h6M9 12h6M9 15h6" {...common} />
    </svg>
  );
}

function IconWeb({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <rect x="3" y="4" width="18" height="14" rx="2" {...common} />
      <path d="M3 8h18" {...common} />
      <circle cx="6" cy="6" r=".5" fill="currentColor" />
      <circle cx="8" cy="6" r=".5" fill="currentColor" />
      <circle cx="10" cy="6" r=".5" fill="currentColor" />
    </svg>
  );
}

function IconCDN({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="8" {...common} />
      <path d="M4 12h16M12 4a8 8 0 010 16" {...common} />
    </svg>
  );
}

function IconAPIGateway({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M3 12h5l3-4 3 8 3-4h4" {...common} />
      <circle cx="3" cy="12" r=".75" fill="currentColor" />
      <circle cx="21" cy="12" r=".75" fill="currentColor" />
    </svg>
  );
}

function IconLoadBalancer({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="6" r="3" {...common} />
      <path d="M12 9v6" {...common} />
      <circle cx="6" cy="18" r="3" {...common} />
      <circle cx="18" cy="18" r="3" {...common} />
      <path d="M12 15L8.5 16.5M12 15l3.5 1.5" {...common} />
    </svg>
  );
}

function IconNoSqlDb({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="2" {...common} />
      <path d="M4 9h16M4 14h16M9 9v10M14 9v10" {...common} />
    </svg>
  );
}

function IconBucket({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M4 8h16l-2 12H6L4 8z" {...common} />
      <ellipse cx="12" cy="8" rx="8" ry="2" {...common} />
    </svg>
  );
}

function IconQueue({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="2" {...common} />
      <circle cx="6" cy="8" r="2" {...common} />
      <circle cx="6" cy="16" r="2" {...common} />
      <circle cx="18" cy="8" r="2" {...common} />
      <circle cx="18" cy="16" r="2" {...common} />
      <path d="M8 9.2l2.5 1.4M8 14.8l2.5-1.4M16 9.2l-2.5 1.4M16 14.8l-2.5-1.4" {...common} />
    </svg>
  );
}

/**
 * Get icon component by string identifier
 * Valid identifiers: sql, nosql, cache, client, cdn, api-gateway, load-balancer, service, bucket, queue
 */
export function getIcon(iconId: string) {
  switch (iconId) {
    case "sql":
      return IconDatabase;
    case "nosql":
      return IconNoSqlDb;
    case "cache":
      return IconRedis;
    case "client":
      return IconWeb;
    case "cdn":
      return IconCDN;
    case "api-gateway":
      return IconAPIGateway;
    case "load-balancer":
      return IconLoadBalancer;
    case "service":
      return IconService;
    case "bucket":
      return IconBucket;
    case "queue":
      return IconQueue;
    default:
      return IconService; // Default fallback
  }
}

export type IconComponent = React.ComponentType<IconProps>;
