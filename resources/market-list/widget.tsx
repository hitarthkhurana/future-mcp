import {
  McpUseProvider,
  useWidget,
  useWidgetTheme,
  type WidgetMetadata,
} from "mcp-use/react";
import React from "react";
import { propSchema, type MarketListProps } from "./types";

export const widgetMetadata: WidgetMetadata = {
  description:
    "Displays a card grid of Polymarket prediction markets with live Yes/No prices, volume, and end date.",
  props: propSchema,
  exposeAsTool: false,
  metadata: {
    invoking: "Loading prediction markets…",
    invoked: "Markets loaded",
    csp: {
      connectDomains: [
        "https://gamma-api.polymarket.com",
        "https://clob.polymarket.com",
      ],
    },
  },
};

function useColors() {
  const theme = useWidgetTheme();
  const dark = theme === "dark";
  return {
    bg: dark ? "#1a1a1a" : "#ffffff",
    bgCard: dark ? "#242424" : "#f9fafb",
    bgCardHover: dark ? "#2a2a2a" : "#f0f4ff",
    border: dark ? "#333" : "#e5e7eb",
    text: dark ? "#f0f0f0" : "#111827",
    textSecondary: dark ? "#9ca3af" : "#6b7280",
    yes: dark ? "#34d399" : "#059669",
    yesBg: dark ? "rgba(52,211,153,0.15)" : "rgba(5,150,105,0.1)",
    no: dark ? "#f87171" : "#dc2626",
    noBg: dark ? "rgba(248,113,113,0.15)" : "rgba(220,38,38,0.1)",
    barTrack: dark ? "#2a2a2a" : "#f3f4f6",
    link: dark ? "#60a5fa" : "#2563eb",
  };
}

function formatVolume(raw: unknown): string {
  const n = parseFloat(String(raw ?? "0"));
  if (isNaN(n)) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function formatDate(raw: unknown): string {
  if (!raw) return "—";
  try {
    return new Date(String(raw)).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function parsePrices(raw: unknown): [number, number] {
  if (typeof raw === "string") {
    try {
      const arr = JSON.parse(raw) as string[];
      return [parseFloat(arr[0] ?? "0"), parseFloat(arr[1] ?? "0")];
    } catch {
      /* ignore */
    }
  }
  return [0, 0];
}

function MarketCard({
  m,
  colors,
}: {
  m: Record<string, unknown>;
  colors: ReturnType<typeof useColors>;
}) {
  const [yes, no] = parsePrices(m.outcomePrices);
  const yesPct = (yes * 100).toFixed(0);
  const noPct = (no * 100).toFixed(0);
  const slug = String(m.slug ?? "");
  const polyUrl = slug
    ? `https://polymarket.com/event/${slug}`
    : "https://polymarket.com";

  return (
    <a
      href={polyUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "block",
        backgroundColor: colors.bgCard,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding: 16,
        textDecoration: "none",
        transition: "border-color 0.15s",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor =
          colors.bgCardHover;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = colors.bgCard;
      }}
    >
      {/* Question */}
      <p
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: colors.text,
          lineHeight: 1.4,
          margin: "0 0 12px 0",
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {String(m.question ?? m.slug ?? "Unknown market")}
      </p>

      {/* YES / NO pills */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <span
          style={{
            padding: "3px 10px",
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 999,
            backgroundColor: colors.yesBg,
            color: colors.yes,
          }}
        >
          YES {yesPct}%
        </span>
        <span
          style={{
            padding: "3px 10px",
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 999,
            backgroundColor: colors.noBg,
            color: colors.no,
          }}
        >
          NO {noPct}%
        </span>
      </div>

      {/* Probability bar */}
      <div
        style={{
          height: 6,
          borderRadius: 999,
          backgroundColor: colors.noBg,
          marginBottom: 10,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: 999,
            backgroundColor: colors.yes,
            width: `${Math.max(2, Math.min(98, yes * 100))}%`,
          }}
        />
      </div>

      {/* Volume + date */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: colors.textSecondary,
        }}
      >
        <span>{formatVolume(m.volume)} vol</span>
        <span>Ends {formatDate(m.endDate)}</span>
      </div>
    </a>
  );
}

function SkeletonCard({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <div
      style={{
        backgroundColor: colors.bgCard,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding: 16,
      }}
    >
      <div
        style={{
          height: 14,
          backgroundColor: colors.border,
          borderRadius: 4,
          marginBottom: 8,
          opacity: 0.6,
        }}
      />
      <div
        style={{
          height: 14,
          width: "70%",
          backgroundColor: colors.border,
          borderRadius: 4,
          marginBottom: 14,
          opacity: 0.4,
        }}
      />
      <div
        style={{ display: "flex", gap: 6, marginBottom: 10 }}
      >
        {[0, 1].map((i) => (
          <div
            key={i}
            style={{
              height: 22,
              width: 60,
              borderRadius: 999,
              backgroundColor: colors.border,
              opacity: 0.4,
            }}
          />
        ))}
      </div>
      <div
        style={{
          height: 6,
          borderRadius: 999,
          backgroundColor: colors.border,
          marginBottom: 10,
          opacity: 0.3,
        }}
      />
      <div
        style={{ display: "flex", justifyContent: "space-between" }}
      >
        {[0, 1].map((i) => (
          <div
            key={i}
            style={{
              height: 11,
              width: 60,
              borderRadius: 4,
              backgroundColor: colors.border,
              opacity: 0.3,
            }}
          />
        ))}
      </div>
    </div>
  );
}

const MarketList: React.FC = () => {
  const { props, isPending } = useWidget<MarketListProps>();
  const colors = useColors();

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div
          style={{
            backgroundColor: colors.bg,
            borderRadius: 16,
            padding: 20,
          }}
        >
          <div
            style={{
              height: 18,
              width: 160,
              backgroundColor: colors.border,
              borderRadius: 4,
              marginBottom: 16,
              opacity: 0.5,
            }}
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} colors={colors} />
            ))}
          </div>
        </div>
      </McpUseProvider>
    );
  }

  const { markets, title } = props;

  return (
    <McpUseProvider autoSize>
      <div
        style={{
          backgroundColor: colors.bg,
          borderRadius: 16,
          padding: 20,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 600,
              color: colors.text,
            }}
          >
            {title}
          </h2>
          <a
            href="https://polymarket.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 12,
              color: colors.link,
              textDecoration: "none",
            }}
          >
            polymarket.com ↗
          </a>
        </div>

        {markets.length === 0 ? (
          <p
            style={{
              textAlign: "center",
              color: colors.textSecondary,
              fontSize: 14,
              padding: "32px 0",
              margin: 0,
            }}
          >
            No markets found.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            {markets.map((m, i) => (
              <MarketCard
                key={String(m.id ?? m.slug ?? i)}
                m={m}
                colors={colors}
              />
            ))}
          </div>
        )}
      </div>
    </McpUseProvider>
  );
};

export default MarketList;
