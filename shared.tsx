import { useWidgetTheme } from "mcp-use/react";
import React from "react";

// ─── Theme-aware colors ──────────────────────────────────────────────────────

export function useColors() {
  const theme = useWidgetTheme();
  const dark = theme === "dark";
  return {
    bg: dark ? "#1a1a1a" : "#ffffff",
    bgCard: dark ? "#242424" : "#f9fafb",
    bgCardHover: dark ? "#2a2a2a" : "#f0f4ff",
    bgSurface: dark ? "#242424" : "#f9fafb",
    border: dark ? "#333" : "#e5e7eb",
    text: dark ? "#f0f0f0" : "#111827",
    textSecondary: dark ? "#9ca3af" : "#6b7280",
    yes: dark ? "#34d399" : "#059669",
    yesBg: dark ? "rgba(52,211,153,0.15)" : "rgba(5,150,105,0.1)",
    yesBar: dark ? "#34d399" : "#059669",
    no: dark ? "#f87171" : "#dc2626",
    noBg: dark ? "rgba(248,113,113,0.15)" : "rgba(220,38,38,0.1)",
    noBar: dark ? "#f87171" : "#dc2626",
    barTrack: dark ? "#2a2a2a" : "#f3f4f6",
    link: dark ? "#60a5fa" : "#2563eb",
    ctaBg: dark ? "#3b82f6" : "#2563eb",
    ctaText: "#ffffff",
    // Official brand colors: Polymarket #2E5CFF, Kalshi #26C485
    pmBadge: dark ? "#6b87ff" : "#2E5CFF",
    pmBadgeBg: dark ? "rgba(46,92,255,0.18)" : "rgba(46,92,255,0.1)",
    kBadge: dark ? "#4dd9a0" : "#26C485",
    kBadgeBg: dark ? "rgba(38,196,133,0.18)" : "rgba(38,196,133,0.1)",
    fusedBadge: dark ? "#8b5cf6" : "#7c3aed",
    fusedBadgeBg: dark ? "rgba(139,92,246,0.15)" : "rgba(124,58,237,0.1)",
    actionBtn: dark ? "#374151" : "#f3f4f6",
    actionBtnHover: dark ? "#4b5563" : "#e5e7eb",
    actionBtnText: dark ? "#d1d5db" : "#374151",
  };
}

export type Colors = ReturnType<typeof useColors>;

// ─── Formatting helpers ──────────────────────────────────────────────────────

export function formatVolume(raw: unknown): string {
  const n = parseFloat(String(raw ?? "0"));
  if (isNaN(n)) return "\u2014";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export function formatDate(raw: unknown): string {
  if (!raw) return "\u2014";
  try {
    return new Date(String(raw)).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "\u2014";
  }
}

export function formatPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

// ─── Probability arc (SVG gauge) ─────────────────────────────────────────────

export function ProbArc({
  pct,
  color,
  trackColor,
  label,
  size = 100,
}: {
  pct: number;
  color: string;
  trackColor: string;
  label?: string;
  size?: number;
}) {
  const radius = 38;
  const cx = 50;
  const cy = 50;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, pct));
  const offset = circumference * (1 - clamped / 100);
  const ff = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      style={{ display: "block", flexShrink: 0 }}
    >
      {/* Track */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke={trackColor}
        strokeWidth={8.5}
      />
      {/* Progress */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={8.5}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{
          transform: "rotate(-90deg)",
          transformOrigin: "50% 50%",
          transition: "stroke-dashoffset 0.75s cubic-bezier(0.4,0,0.2,1)",
        }}
      />
      {/* Center: percentage */}
      <text
        x={cx}
        y={label ? cy - 4 : cy + 6}
        textAnchor="middle"
        fontSize={17}
        fontWeight="700"
        fill={color}
        fontFamily={ff}
      >
        {clamped.toFixed(1)}%
      </text>
      {/* Center: outcome label */}
      {label && (
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          fontSize={9}
          fontWeight="600"
          fill={color}
          opacity={0.75}
          fontFamily={ff}
        >
          {label.toUpperCase()}
        </text>
      )}
    </svg>
  );
}

// ─── Probability bar ─────────────────────────────────────────────────────────

export function ProbBar({
  label,
  pct,
  barColor,
  trackColor,
  textColor,
}: {
  label: string;
  pct: number;
  barColor: string;
  trackColor: string;
  textColor: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: textColor,
          width: 28,
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: 20,
          borderRadius: 999,
          backgroundColor: trackColor,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.max(2, Math.min(98, pct))}%`,
            borderRadius: 999,
            backgroundColor: barColor,
            transition: "width 0.4s ease",
          }}
        />
      </div>
      <span
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: textColor,
          width: 48,
          textAlign: "right",
          flexShrink: 0,
        }}
      >
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

// ─── Source badge ─────────────────────────────────────────────────────────────

export function SourceBadge({
  source,
  colors,
}: {
  source: "polymarket" | "kalshi" | "fused";
  colors: Colors;
}) {
  const config = {
    polymarket: { label: "Polymarket", bg: colors.pmBadgeBg, color: colors.pmBadge },
    kalshi: { label: "Kalshi", bg: colors.kBadgeBg, color: colors.kBadge },
    fused: { label: "Multi-Platform", bg: colors.fusedBadgeBg, color: colors.fusedBadge },
  }[source];

  return (
    <span
      style={{
        padding: "2px 8px",
        fontSize: 10,
        fontWeight: 600,
        borderRadius: 999,
        backgroundColor: config.bg,
        color: config.color,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}
    >
      {config.label}
    </span>
  );
}

// ─── Action button ───────────────────────────────────────────────────────────

export function ActionButton({
  label,
  onClick,
  colors,
  disabled,
}: {
  label: string;
  onClick: () => void;
  colors: Colors;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "6px 12px",
        fontSize: 12,
        fontWeight: 500,
        borderRadius: 8,
        border: `1px solid ${colors.border}`,
        backgroundColor: colors.actionBtn,
        color: colors.actionBtnText,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "background-color 0.15s",
      }}
      onMouseEnter={(e) => {
        if (!disabled)
          (e.currentTarget as HTMLElement).style.backgroundColor =
            colors.actionBtnHover;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor =
          colors.actionBtn;
      }}
    >
      {label}
    </button>
  );
}

// ─── Skeleton helpers ────────────────────────────────────────────────────────

export function SkeletonBar({
  width,
  height = 14,
  colors,
}: {
  width: string;
  height?: number;
  colors: Colors;
}) {
  return (
    <div
      style={{
        height,
        width,
        backgroundColor: colors.border,
        borderRadius: 4,
        opacity: 0.5,
      }}
    />
  );
}
