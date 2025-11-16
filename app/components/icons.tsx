"use client";
import React from "react";
import { ComponentKind } from "./types";

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

export function IconDatabase({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <ellipse cx="12" cy="6" rx="7" ry="3" {...common} />
      <path d="M5 6v6c0 1.657 3.134 3 7 3s7-1.343 7-3V6" {...common} />
      <path d="M5 12v6c0 1.657 3.134 3 7 3s7-1.343 7-3v-6" {...common} />
    </svg>
  );
}

export function IconRedis({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M3 9l9-3 9 3-9 3-9-3z" {...common} />
      <path d="M3 13l9 3 9-3" {...common} />
      <path d="M3 17l9 3 9-3" {...common} />
    </svg>
  );
}

export function IconService({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <rect x="5" y="5" width="14" height="14" rx="2" {...common} />
      <path d="M9 9h6M9 12h6M9 15h6" {...common} />
    </svg>
  );
}

export function IconWeb({ className, size = 18 }: IconProps) {
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

export function IconCDN({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="8" {...common} />
      <path d="M4 12h16M12 4a8 8 0 010 16" {...common} />
    </svg>
  );
}

export function IconAPIGateway({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M3 12h5l3-4 3 8 3-4h4" {...common} />
      <circle cx="3" cy="12" r=".75" fill="currentColor" />
      <circle cx="21" cy="12" r=".75" fill="currentColor" />
    </svg>
  );
}

export function IconLoadBalancer({ className, size = 18 }: IconProps) {
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

export function IconObjectStore({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <rect x="4" y="5" width="16" height="14" rx="2" {...common} />
      <path d="M7 9h10M7 13h10M7 17h6" {...common} />
    </svg>
  );
}

export function IconKafka({ className, size = 18 }: IconProps) {
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

export type IconName = ComponentKind;

export function iconFor(kind: ComponentKind) {
  switch (kind) {
    case "DB (Postgres)":
      return IconDatabase;
    case "Cache (Redis)":
      return IconRedis;
    case "Web":
      return IconWeb;
    case "CDN":
      return IconCDN;
    case "API Gateway":
      return IconAPIGateway;
    case "Service":
      return IconService;
    case "Load Balancer":
      return IconLoadBalancer;
    case "Object Store (S3)":
      return IconObjectStore;
    case "Message Queue (Kafka Topic)":
      return IconKafka;
    default:
      return IconService;
  }
}
