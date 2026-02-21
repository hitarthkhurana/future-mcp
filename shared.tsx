import { useWidgetTheme } from "mcp-use/react";
import React, { useState, useEffect } from "react";

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

// ─── Probability arc (SVG gauge with animated fill + spark tip) ──────────────

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
  // Stable filter/animation ID per instance
  const [uid] = useState(
    () => `arc${Math.random().toString(36).slice(2, 7)}`
  );

  // Animate from 0 → pct on mount (and on pct change)
  const [animPct, setAnimPct] = useState(0);
  useEffect(() => {
    setAnimPct(0);
    const t = setTimeout(() => setAnimPct(pct), 60);
    return () => clearTimeout(t);
  }, [pct]);

  const radius = 38;
  const cx = 50;
  const cy = 50;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, animPct));
  const offset = circumference * (1 - clamped / 100);

  // The tip dot lives at the top of the circle (12 o'clock) inside a <g>
  // that we rotate by clamped/100*360 deg — same easing as the arc fill.
  const tipDeg = (clamped / 100) * 360;
  const tipX = cx;          // top of circle, x unchanged
  const tipY = cy - radius; // top of circle, y = center - radius

  const showTip = clamped > 2 && clamped < 99;
  const ff = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  const easing = "1.4s cubic-bezier(0.34, 1.2, 0.64, 1)";

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      style={{ display: "block", flexShrink: 0, overflow: "visible" }}
    >
      <defs>
        {/* Glow filter for the arc stroke */}
        <filter id={uid} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Stronger glow for the tip dot */}
        <filter id={`${uid}t`} x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Track circle */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke={trackColor}
        strokeWidth={8.5}
      />

      {/* Glowing arc — fills from 0 via CSS transition */}
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
        filter={`url(#${uid})`}
        style={{
          transform: "rotate(-90deg)",
          transformOrigin: `${cx}px ${cy}px`,
          transition: `stroke-dashoffset ${easing}`,
        }}
      />

      {/* Spark tip — a <g> that rotates in sync with the arc fill */}
      {showTip && (
        <g
          style={{
            transform: `rotate(${tipDeg}deg)`,
            transformOrigin: `${cx}px ${cy}px`,
            transition: `transform ${easing}`,
          }}
        >
          {/* Outer halo pulse */}
          <circle cx={tipX} cy={tipY} r={8} fill={color} opacity={0.18} filter={`url(#${uid}t)`}>
            <animate attributeName="r" values="7;11;7" dur="1.8s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.18;0.06;0.18" dur="1.8s" repeatCount="indefinite" />
          </circle>
          {/* Bright core dot */}
          <circle cx={tipX} cy={tipY} r={4.5} fill={color} filter={`url(#${uid}t)`}>
            <animate attributeName="r" values="4;5.5;4" dur="1.8s" repeatCount="indefinite" />
          </circle>
        </g>
      )}

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
        {animPct > 0 ? clamped.toFixed(1) : "—"}%
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
