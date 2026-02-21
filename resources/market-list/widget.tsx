import {
  McpUseProvider,
  useWidget,
  useWidgetTheme,
  type WidgetMetadata,
} from "mcp-use/react";
import React, { useState, useEffect } from "react";
import { propSchema, type MarketListProps } from "./types";

export const widgetMetadata: WidgetMetadata = {
  description:
    "Displays a card grid of Polymarket prediction markets with live Yes/No prices, volume, and end date. Click any card to see full detail with live orderbook.",
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
    backBtn: dark ? "#2a2a2a" : "#f3f4f6",
    backBtnText: dark ? "#9ca3af" : "#374151",
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

// ─── Shared sub-components ────────────────────────────────────────────────────

function ProbBar({
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

type OrderLevel = { price: string; size: string };

function OrderbookSection({
  bids,
  asks,
  colors,
}: {
  bids: OrderLevel[];
  asks: OrderLevel[];
  colors: ReturnType<typeof useColors>;
}) {
  const top5 = (rows: OrderLevel[]) => rows.slice(0, 5);

  const colLabel = (label: string, color: string) => (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        color,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        display: "block",
        marginBottom: 6,
      }}
    >
      {label}
    </span>
  );

  const rows = (items: OrderLevel[], priceColor: string, emptyMsg: string) => {
    if (!items.length)
      return (
        <span style={{ fontSize: 12, color: colors.textSecondary }}>
          {emptyMsg}
        </span>
      );
    return items.map((r, i) => (
      <div
        key={i}
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          padding: "2px 0",
        }}
      >
        <span style={{ color: priceColor }}>
          {parseFloat(r.price).toFixed(3)}
        </span>
        <span style={{ color: colors.textSecondary }}>
          {parseFloat(r.size).toFixed(0)}
        </span>
      </div>
    ));
  };

  return (
    <div
      style={{
        backgroundColor: colors.bgSurface,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding: 16,
      }}
    >
      <p
        style={{
          margin: "0 0 12px 0",
          fontSize: 11,
          fontWeight: 600,
          color: colors.textSecondary,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        Live Orderbook (YES token)
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          {colLabel("Bids", colors.yes)}
          {rows(top5(bids), colors.yes, "No bids")}
        </div>
        <div>
          {colLabel("Asks", colors.no)}
          {rows(top5(asks), colors.no, "No asks")}
        </div>
      </div>
    </div>
  );
}

// ─── Inline detail panel (shown when a card is clicked) ───────────────────────

function MarketDetailInline({
  m,
  onBack,
  colors,
}: {
  m: Record<string, unknown>;
  onBack: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const [bids, setBids] = useState<OrderLevel[]>([]);
  const [asks, setAsks] = useState<OrderLevel[]>([]);
  const [obLoading, setObLoading] = useState(false);

  useEffect(() => {
    const tokens = m.tokens as Array<{ token_id: string }> | undefined;
    if (!tokens?.length) return;

    setObLoading(true);
    fetch(`https://clob.polymarket.com/book?token_id=${tokens[0].token_id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          setBids((data.bids ?? []) as OrderLevel[]);
          setAsks((data.asks ?? []) as OrderLevel[]);
        }
      })
      .catch(() => {})
      .finally(() => setObLoading(false));
  }, [m]);

  const [yes, no] = parsePrices(m.outcomePrices);
  const slug = String(m.slug ?? "");
  const polyUrl = slug
    ? `https://polymarket.com/event/${slug}`
    : "https://polymarket.com";

  return (
    <div
      style={{
        backgroundColor: colors.bg,
        borderRadius: 16,
        padding: 24,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          alignSelf: "flex-start",
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px",
          borderRadius: 8,
          border: "none",
          backgroundColor: colors.backBtn,
          color: colors.backBtnText,
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        ← Back to results
      </button>

      {/* Question + description */}
      <div>
        <p
          style={{
            margin: "0 0 4px 0",
            fontSize: 11,
            fontWeight: 600,
            color: colors.textSecondary,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Prediction Market · Polymarket
        </p>
        <h2
          style={{
            margin: "0 0 8px 0",
            fontSize: 17,
            fontWeight: 600,
            color: colors.text,
            lineHeight: 1.35,
          }}
        >
          {String(m.question ?? m.slug ?? "Unknown market")}
        </h2>
        {m.description && (
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: colors.textSecondary,
              lineHeight: 1.5,
            }}
          >
            {String(m.description)}
          </p>
        )}
      </div>

      {/* Probability bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <ProbBar
          label="YES"
          pct={yes * 100}
          barColor={colors.yesBar}
          trackColor={colors.yesBg}
          textColor={colors.yes}
        />
        <ProbBar
          label="NO"
          pct={no * 100}
          barColor={colors.noBar}
          trackColor={colors.noBg}
          textColor={colors.no}
        />
      </div>

      {/* Stats row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 10,
        }}
      >
        {[
          { label: "Volume", value: formatVolume(m.volume) },
          { label: "Liquidity", value: formatVolume(m.liquidity) },
          { label: "Ends", value: formatDate(m.endDate) },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{
              backgroundColor: colors.bgSurface,
              border: `1px solid ${colors.border}`,
              borderRadius: 10,
              padding: "10px 12px",
              textAlign: "center",
            }}
          >
            <p style={{ margin: "0 0 2px 0", fontSize: 11, color: colors.textSecondary }}>
              {label}
            </p>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: colors.text }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Orderbook */}
      {obLoading ? (
        <p style={{ fontSize: 12, color: colors.textSecondary, margin: 0 }}>
          Loading orderbook…
        </p>
      ) : (bids.length > 0 || asks.length > 0) ? (
        <OrderbookSection bids={bids} asks={asks} colors={colors} />
      ) : null}

      {/* Trade CTA */}
      <a
        href={polyUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "block",
          textAlign: "center",
          padding: "11px 20px",
          borderRadius: 10,
          backgroundColor: colors.ctaBg,
          color: colors.ctaText,
          fontSize: 14,
          fontWeight: 600,
          textDecoration: "none",
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLElement).style.opacity = "0.85")
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLElement).style.opacity = "1")
        }
      >
        Trade on Polymarket ↗
      </a>
    </div>
  );
}

// ─── Market card (in list view) ───────────────────────────────────────────────

function MarketCard({
  m,
  colors,
  onClick,
}: {
  m: Record<string, unknown>;
  colors: ReturnType<typeof useColors>;
  onClick: () => void;
}) {
  const [yes, no] = parsePrices(m.outcomePrices);
  const yesPct = (yes * 100).toFixed(0);
  const noPct = (no * 100).toFixed(0);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      style={{
        display: "block",
        backgroundColor: colors.bgCard,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding: 16,
        textDecoration: "none",
        cursor: "pointer",
        transition: "border-color 0.15s",
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
    </div>
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
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
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
      <div style={{ display: "flex", justifyContent: "space-between" }}>
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

// ─── Main widget ──────────────────────────────────────────────────────────────

const MarketList: React.FC = () => {
  const { props, isPending } = useWidget<MarketListProps>();
  const colors = useColors();
  const [selectedMarket, setSelectedMarket] = useState<Record<
    string,
    unknown
  > | null>(null);

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

  // Detail view
  if (selectedMarket) {
    return (
      <McpUseProvider autoSize>
        <MarketDetailInline
          m={selectedMarket}
          onBack={() => setSelectedMarket(null)}
          colors={colors}
        />
      </McpUseProvider>
    );
  }

  // List view
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
                onClick={() => setSelectedMarket(m)}
              />
            ))}
          </div>
        )}
      </div>
    </McpUseProvider>
  );
};

export default MarketList;
