"use client";
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

function IconObjectStore({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <rect x="4" y="5" width="16" height="14" rx="2" {...common} />
      <path d="M7 9h10M7 13h10M7 17h6" {...common} />
    </svg>
  );
}

function IconKafka({ className, size = 18 }: IconProps) {
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

export function IconLinkedIn({ className, size = 18 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="currentColor"
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

export function IconX({ className, size = 18 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="currentColor"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function iconFor(kind: ComponentKind) {
  switch (kind) {
    case "DB (Postgres)":
      return IconDatabase;
    case "Cache (Redis)":
      return IconRedis;
    case "Client":
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
