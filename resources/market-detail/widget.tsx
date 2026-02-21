import {
  McpUseProvider,
  useWidget,
  useWidgetTheme,
  type WidgetMetadata,
} from "mcp-use/react";
import React from "react";
import { propSchema, type MarketDetailProps } from "./types";

export const widgetMetadata: WidgetMetadata = {
  description:
    "Full detail view for a Polymarket prediction market: probability bars, live orderbook, stats, and a trade link.",
  props: propSchema,
  exposeAsTool: false,
  metadata: {
    invoking: "Loading market details…",
    invoked: "Market loaded",
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
    bgSurface: dark ? "#242424" : "#f9fafb",
    border: dark ? "#333" : "#e5e7eb",
    text: dark ? "#f0f0f0" : "#111827",
    textSecondary: dark ? "#9ca3af" : "#6b7280",
    yes: dark ? "#34d399" : "#059669",
    yesBg: dark ? "rgba(52,211,153,0.12)" : "rgba(5,150,105,0.08)",
    yesBar: dark ? "#34d399" : "#059669",
    no: dark ? "#f87171" : "#dc2626",
    noBg: dark ? "rgba(248,113,113,0.12)" : "rgba(220,38,38,0.08)",
    noBar: dark ? "#f87171" : "#dc2626",
    ctaBg: dark ? "#3b82f6" : "#2563eb",
    ctaText: "#ffffff",
  };
}

type OrderLevel = { price: string; size: string };

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

  const rows = (
    items: OrderLevel[],
    priceColor: string,
    emptyMsg: string
  ) => {
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

function SkeletonDetail({ colors }: { colors: ReturnType<typeof useColors> }) {
  const bar = (w: string, h = 14, mb = 8) => (
    <div
      style={{
        height: h,
        width: w,
        backgroundColor: colors.border,
        borderRadius: 4,
        marginBottom: mb,
        opacity: 0.5,
      }}
    />
  );
  return (
    <McpUseProvider autoSize>
      <div
        style={{
          backgroundColor: colors.bg,
          borderRadius: 16,
          padding: 24,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        {bar("75%", 20, 10)}
        {bar("100%")}
        {bar("85%", 14, 20)}
        {bar("100%", 20, 8)}
        {bar("100%", 20, 20)}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                height: 56,
                borderRadius: 10,
                backgroundColor: colors.border,
                opacity: 0.4,
              }}
            />
          ))}
        </div>
      </div>
    </McpUseProvider>
  );
}

const MarketDetail: React.FC = () => {
  const { props, isPending } = useWidget<MarketDetailProps>();
  const colors = useColors();

  if (isPending) {
    return <SkeletonDetail colors={colors} />;
  }

  const { market, orderbook } = props;

  const [yes, no] = parsePrices(market.outcomePrices);
  const slug = String(market.slug ?? "");
  const polyUrl = slug
    ? `https://polymarket.com/event/${slug}`
    : "https://polymarket.com";

  const ob = orderbook as
    | { bids?: OrderLevel[]; asks?: OrderLevel[] }
    | null
    | undefined;
  const bids = ob?.bids ?? [];
  const asks = ob?.asks ?? [];

  return (
    <McpUseProvider autoSize>
      <div
        style={{
          backgroundColor: colors.bg,
          borderRadius: 16,
          padding: 24,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
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
            {String(market.question ?? market.slug ?? "Unknown market")}
          </h2>
          {market.description && (
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: colors.textSecondary,
                lineHeight: 1.5,
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {String(market.description)}
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
            { label: "Volume", value: formatVolume(market.volume) },
            { label: "Liquidity", value: formatVolume(market.liquidity) },
            { label: "Ends", value: formatDate(market.endDate) },
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
              <p
                style={{
                  margin: "0 0 2px 0",
                  fontSize: 11,
                  color: colors.textSecondary,
                }}
              >
                {label}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 600,
                  color: colors.text,
                }}
              >
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Orderbook */}
        {(bids.length > 0 || asks.length > 0) && (
          <OrderbookSection bids={bids} asks={asks} colors={colors} />
        )}

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
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.opacity = "0.85")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.opacity = "1")
          }
        >
          Open on Polymarket ↗
        </a>
      </div>
    </McpUseProvider>
  );
};

export default MarketDetail;
