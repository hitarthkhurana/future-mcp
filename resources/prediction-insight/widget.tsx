import {
  McpUseProvider,
  useCallTool,
  useWidget,
  type WidgetMetadata,
} from "mcp-use/react";
import React, { useState, useEffect } from "react";
import {
  propSchema,
  type InsightProps,
  type KalshiData,
  type PolymarketData,
} from "./types";
import {
  ActionButton,
  ProbArc,
  ProbBar,
  SkeletonBar,
  formatDate,
  formatVolume,
  useColors,
  type Colors,
} from "../../shared";

// Official brand colors
const PM_BLUE = "#2E5CFF";
const PM_BLUE_DARK = "#6b87ff";
const K_GREEN = "#26C485";
const K_GREEN_DARK = "#4dd9a0";

const GAMMA = "https://gamma-api.polymarket.com";
const CLOB = "https://clob.polymarket.com";

export const widgetMetadata: WidgetMetadata = {
  description:
    "Single-view prediction insight with top Polymarket + Kalshi matches and Grok analysis powered by X search.",
  props: propSchema,
  exposeAsTool: false,
  metadata: {
    invoking: "Building prediction insight...",
    invoked: "Insight ready",
    csp: {
      connectDomains: [
        "https://gamma-api.polymarket.com",
        "https://clob.polymarket.com",
        "https://api.elections.kalshi.com",
        "https://api.x.ai",
      ],
    },
  },
};

type OrderLevel = { price: string; size: string };

type WatchlistItem = {
  query: string;
  eventTitle: string;
  consensus: number | null;
};

type WidgetState = {
  selectedPmIndex?: number;
  selectedKalshiIndex?: number;
  grokExpanded?: boolean;
  watchlist?: WatchlistItem[];
  showWatchlist?: boolean;
};

function clampedIndex(index: number | undefined, size: number): number {
  if (!size) return 0;
  if (typeof index !== "number") return 0;
  if (index < 0) return 0;
  if (index >= size) return size - 1;
  return index;
}

function computeConsensus(
  polymarket: PolymarketData | null,
  kalshi: KalshiData | null
): number | null {
  if (polymarket && kalshi) {
    const totalVolume = polymarket.volume + kalshi.volume;
    if (totalVolume <= 0)
      return (polymarket.probability + kalshi.probability) / 2;
    return (
      (polymarket.probability * polymarket.volume +
        kalshi.probability * kalshi.volume) /
      totalVolume
    );
  }
  if (polymarket) return polymarket.probability;
  if (kalshi) return kalshi.probability;
  return null;
}

// ─── Orderbook section ────────────────────────────────────────────────────────

function OrderbookSection({
  bids,
  asks,
  colors,
}: {
  bids: OrderLevel[];
  asks: OrderLevel[];
  colors: Colors;
}) {
  const dark = colors.bg === "#1a1a1a";
  const pmColor = dark ? PM_BLUE_DARK : PM_BLUE;

  const rows = Math.max(bids.length, asks.length);
  if (!rows) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          color: colors.textSecondary,
        }}
      >
        Live Orderbook (YES token)
      </span>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          fontSize: 11,
        }}
      >
        {/* Bids */}
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span
            style={{ fontWeight: 600, color: colors.yes, fontSize: 10 }}
          >
            Bids
          </span>
          {bids.slice(0, 5).map((b, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                color: colors.yes,
              }}
            >
              <span>{parseFloat(b.price).toFixed(3)}</span>
              <span style={{ color: colors.textSecondary }}>
                {parseFloat(b.size).toFixed(0)}
              </span>
            </div>
          ))}
        </div>
        {/* Asks */}
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span
            style={{ fontWeight: 600, color: colors.no, fontSize: 10 }}
          >
            Asks
          </span>
          {asks.slice(0, 5).map((a, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                color: colors.no,
              }}
            >
              <span>{parseFloat(a.price).toFixed(3)}</span>
              <span style={{ color: colors.textSecondary }}>
                {parseFloat(a.size).toFixed(0)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Inline detail panel ──────────────────────────────────────────────────────

function DetailPanel({
  side,
  pm,
  kalshi,
  onClose,
  onTrade,
  colors,
}: {
  side: "pm" | "kalshi";
  pm: PolymarketData | null;
  kalshi: KalshiData | null;
  onClose: () => void;
  onTrade: (url: string) => void;
  colors: Colors;
}) {
  const dark = colors.bg === "#1a1a1a";
  const [bids, setBids] = useState<OrderLevel[]>([]);
  const [asks, setAsks] = useState<OrderLevel[]>([]);
  const [obLoading, setObLoading] = useState(false);

  // Fetch Polymarket orderbook when PM detail is shown
  useEffect(() => {
    if (side !== "pm" || !pm) return;
    setObLoading(true);
    setBids([]);
    setAsks([]);

    fetch(`${GAMMA}/markets?slug=${encodeURIComponent(pm.slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((markets: Array<{ tokens?: Array<{ token_id: string }> }> | null) => {
        const tokens = markets?.[0]?.tokens;
        if (!tokens?.length) return null;
        return fetch(`${CLOB}/book?token_id=${tokens[0].token_id}`).then(
          (r) => (r.ok ? r.json() : null)
        );
      })
      .then(
        (data: { bids?: OrderLevel[]; asks?: OrderLevel[] } | null) => {
          if (data) {
            setBids(data.bids ?? []);
            setAsks(data.asks ?? []);
          }
        }
      )
      .catch(() => {})
      .finally(() => setObLoading(false));
  }, [side, pm?.slug]);

  if (side === "pm" && pm) {
    const pmColor = dark ? PM_BLUE_DARK : PM_BLUE;
    return (
      <div
        style={{
          border: `1px solid ${pmColor}40`,
          borderRadius: 12,
          padding: 16,
          backgroundColor: dark ? "rgba(46,92,255,0.05)" : "rgba(46,92,255,0.03)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: pmColor,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Polymarket · Detail
            </span>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 600,
                color: colors.text,
                lineHeight: 1.4,
              }}
            >
              {pm.title}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: `1px solid ${colors.border}`,
              borderRadius: 6,
              padding: "3px 8px",
              cursor: "pointer",
              color: colors.textSecondary,
              fontSize: 12,
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Probability bars */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <ProbBar
            label="YES"
            pct={pm.probability * 100}
            barColor={colors.yesBar}
            trackColor={colors.barTrack}
            textColor={colors.yes}
          />
          <ProbBar
            label="NO"
            pct={(1 - pm.probability) * 100}
            barColor={colors.noBar}
            trackColor={colors.barTrack}
            textColor={colors.no}
          />
        </div>

        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 8,
          }}
        >
          {[
            { label: "Volume", value: formatVolume(pm.volume) },
            { label: "Liquidity", value: formatVolume(pm.liquidity) },
            { label: "Ends", value: formatDate(pm.endDate) },
          ].map(({ label, value }) => (
            <div
              key={label}
              style={{
                backgroundColor: colors.bgSurface,
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                padding: "8px 10px",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  margin: "0 0 2px",
                  fontSize: 10,
                  color: colors.textSecondary,
                }}
              >
                {label}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
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
        {obLoading ? (
          <p style={{ fontSize: 11, color: colors.textSecondary, margin: 0 }}>
            Loading orderbook…
          </p>
        ) : (
          <OrderbookSection bids={bids} asks={asks} colors={colors} />
        )}

        {/* Trade CTA */}
        <button
          onClick={() => onTrade(pm.url)}
          style={{
            padding: "9px 16px",
            borderRadius: 10,
            border: "none",
            backgroundColor: pmColor,
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            textAlign: "center",
          }}
        >
          Trade on Polymarket ↗
        </button>
      </div>
    );
  }

  if (side === "kalshi" && kalshi) {
    const kColor = dark ? K_GREEN_DARK : K_GREEN;
    const bid = parseFloat(kalshi.yesBid);
    const ask = parseFloat(kalshi.yesAsk);
    const spread = ask > 0 && bid > 0 ? (ask - bid).toFixed(3) : "—";

    return (
      <div
        style={{
          border: `1px solid ${kColor}40`,
          borderRadius: 12,
          padding: 16,
          backgroundColor: dark ? "rgba(38,196,133,0.05)" : "rgba(38,196,133,0.03)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: kColor,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Kalshi · Detail
            </span>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 600,
                color: colors.text,
                lineHeight: 1.4,
              }}
            >
              {kalshi.title}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: `1px solid ${colors.border}`,
              borderRadius: 6,
              padding: "3px 8px",
              cursor: "pointer",
              color: colors.textSecondary,
              fontSize: 12,
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Probability bars */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <ProbBar
            label="YES"
            pct={kalshi.probability * 100}
            barColor={kColor}
            trackColor={colors.barTrack}
            textColor={kColor}
          />
          <ProbBar
            label="NO"
            pct={(1 - kalshi.probability) * 100}
            barColor={colors.noBar}
            trackColor={colors.barTrack}
            textColor={colors.no}
          />
        </div>

        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 8,
          }}
        >
          {[
            { label: "Volume", value: formatVolume(kalshi.volume) },
            { label: "24h Volume", value: formatVolume(kalshi.volume24h) },
            { label: "Open Interest", value: kalshi.openInterest.toLocaleString() },
            { label: "Closes", value: formatDate(kalshi.closeTime) },
          ].map(({ label, value }) => (
            <div
              key={label}
              style={{
                backgroundColor: colors.bgSurface,
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                padding: "8px 10px",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  margin: "0 0 2px",
                  fontSize: 10,
                  color: colors.textSecondary,
                }}
              >
                {label}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  fontWeight: 600,
                  color: colors.text,
                }}
              >
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Bid / Ask spread */}
        <div
          style={{
            border: `1px solid ${colors.border}`,
            borderRadius: 8,
            padding: 10,
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            textAlign: "center",
            gap: 4,
          }}
        >
          {[
            { label: "Best Bid", value: bid > 0 ? bid.toFixed(3) : "—", color: colors.yes },
            { label: "Spread", value: spread, color: colors.textSecondary },
            { label: "Best Ask", value: ask > 0 ? ask.toFixed(3) : "—", color: colors.no },
          ].map(({ label, value, color: c }) => (
            <div key={label}>
              <p style={{ margin: "0 0 2px", fontSize: 10, color: colors.textSecondary }}>
                {label}
              </p>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: c }}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Trade CTA */}
        <button
          onClick={() => onTrade(kalshi.url)}
          style={{
            padding: "9px 16px",
            borderRadius: 10,
            border: "none",
            backgroundColor: kColor,
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            textAlign: "center",
          }}
        >
          Trade on Kalshi ↗
        </button>
      </div>
    );
  }

  return null;
}

// ─── Arc panel: Polymarket (blue) left, Kalshi (green) right ─────────────────

function ArcPanel({
  polymarket,
  kalshi,
  consensus,
  colors,
  onTrade,
  expandedDetail,
  onSelectDetail,
}: {
  polymarket: PolymarketData | null;
  kalshi: KalshiData | null;
  consensus: number | null;
  colors: Colors;
  onTrade: (url: string) => void;
  expandedDetail: "pm" | "kalshi" | null;
  onSelectDetail: (side: "pm" | "kalshi" | null) => void;
}) {
  const dark = colors.bg === "#1a1a1a";
  const pmColor = dark ? PM_BLUE_DARK : PM_BLUE;
  const kColor = dark ? K_GREEN_DARK : K_GREEN;
  const pmTrack = dark ? "rgba(107,135,255,0.18)" : "rgba(46,92,255,0.1)";
  const kTrack = dark ? "rgba(77,217,160,0.18)" : "rgba(38,196,133,0.1)";
  const cols = polymarket && kalshi ? 2 : 1;

  if (!polymarket && !kalshi) {
    return (
      <div
        style={{
          border: `1px dashed ${colors.border}`,
          borderRadius: 12,
          padding: 16,
          color: colors.textSecondary,
          fontSize: 12,
          textAlign: "center",
        }}
      >
        No confident market match found for this query.
      </div>
    );
  }

  const cardBase: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    cursor: "pointer",
    transition: "background-color 0.15s",
  };

  return (
    <div
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding: 16,
        backgroundColor: colors.bgSurface,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Consensus badge */}
      {consensus !== null && (
        <div style={{ textAlign: "center" }}>
          <span style={{ fontSize: 26, fontWeight: 700, color: colors.text }}>
            {(consensus * 100).toFixed(1)}%
          </span>
          <span
            style={{
              fontSize: 11,
              color: colors.textSecondary,
              marginLeft: 6,
            }}
          >
            market consensus
          </span>
        </div>
      )}

      {/* Arcs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 12,
        }}
      >
        {polymarket && (
          <div
            role="button"
            tabIndex={0}
            onClick={() =>
              onSelectDetail(expandedDetail === "pm" ? null : "pm")
            }
            onKeyDown={(e) =>
              e.key === "Enter" &&
              onSelectDetail(expandedDetail === "pm" ? null : "pm")
            }
            style={{
              ...cardBase,
              backgroundColor:
                expandedDetail === "pm"
                  ? dark
                    ? "rgba(46,92,255,0.12)"
                    : "rgba(46,92,255,0.06)"
                  : "transparent",
              outline: expandedDetail === "pm" ? `2px solid ${pmColor}` : "none",
              outlineOffset: -2,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor =
                dark ? "rgba(46,92,255,0.1)" : "rgba(46,92,255,0.05)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor =
                expandedDetail === "pm"
                  ? dark ? "rgba(46,92,255,0.12)" : "rgba(46,92,255,0.06)"
                  : "transparent";
            }}
          >
            <ProbArc
              pct={polymarket.probability * 100}
              color={pmColor}
              trackColor={pmTrack}
              label={polymarket.probabilityLabel}
              size={108}
            />
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.06em",
                color: pmColor,
                textTransform: "uppercase",
              }}
            >
              Polymarket
            </span>
            <span
              style={{
                fontSize: 11,
                color: colors.textSecondary,
                textAlign: "center",
                lineHeight: 1.35,
                maxWidth: 140,
              }}
            >
              {polymarket.title.length > 55
                ? `${polymarket.title.slice(0, 55)}…`
                : polymarket.title}
            </span>
            <span style={{ fontSize: 10, color: colors.textSecondary }}>
              Vol {formatVolume(polymarket.volume)}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTrade(polymarket.url);
                }}
                style={{
                  padding: "5px 10px",
                  borderRadius: 7,
                  border: "none",
                  backgroundColor: pmColor,
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Trade ↗
              </button>
              <span
                style={{
                  fontSize: 10,
                  color: pmColor,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {expandedDetail === "pm" ? "▲ Hide" : "Details ▼"}
              </span>
            </div>
          </div>
        )}

        {kalshi && (
          <div
            role="button"
            tabIndex={0}
            onClick={() =>
              onSelectDetail(expandedDetail === "kalshi" ? null : "kalshi")
            }
            onKeyDown={(e) =>
              e.key === "Enter" &&
              onSelectDetail(expandedDetail === "kalshi" ? null : "kalshi")
            }
            style={{
              ...cardBase,
              backgroundColor:
                expandedDetail === "kalshi"
                  ? dark
                    ? "rgba(38,196,133,0.12)"
                    : "rgba(38,196,133,0.06)"
                  : "transparent",
              outline:
                expandedDetail === "kalshi"
                  ? `2px solid ${kColor}`
                  : "none",
              outlineOffset: -2,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor =
                dark ? "rgba(38,196,133,0.1)" : "rgba(38,196,133,0.05)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor =
                expandedDetail === "kalshi"
                  ? dark ? "rgba(38,196,133,0.12)" : "rgba(38,196,133,0.06)"
                  : "transparent";
            }}
          >
            <ProbArc
              pct={kalshi.probability * 100}
              color={kColor}
              trackColor={kTrack}
              label={kalshi.probabilityLabel}
              size={108}
            />
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.06em",
                color: kColor,
                textTransform: "uppercase",
              }}
            >
              Kalshi
            </span>
            <span
              style={{
                fontSize: 11,
                color: colors.textSecondary,
                textAlign: "center",
                lineHeight: 1.35,
                maxWidth: 140,
              }}
            >
              {kalshi.title.length > 55
                ? `${kalshi.title.slice(0, 55)}…`
                : kalshi.title}
            </span>
            <span style={{ fontSize: 10, color: colors.textSecondary }}>
              OI {kalshi.openInterest.toLocaleString()}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTrade(kalshi.url);
                }}
                style={{
                  padding: "5px 10px",
                  borderRadius: 7,
                  border: "none",
                  backgroundColor: kColor,
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Trade ↗
              </button>
              <span
                style={{
                  fontSize: 10,
                  color: kColor,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {expandedDetail === "kalshi" ? "▲ Hide" : "Details ▼"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

function Header({
  eventTitle,
  query,
  generatedAt,
  colors,
}: {
  eventTitle: string;
  query: string;
  generatedAt: string;
  colors: Colors;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: colors.textSecondary,
        }}
      >
        Prediction Insight
      </span>
      <h2
        style={{ margin: 0, fontSize: 18, lineHeight: 1.3, color: colors.text }}
      >
        {eventTitle}
      </h2>
      <p style={{ margin: 0, fontSize: 12, color: colors.textSecondary }}>
        Query: {query}
      </p>
      <p style={{ margin: 0, fontSize: 11, color: colors.textSecondary }}>
        Updated {formatDate(generatedAt)}
      </p>
    </div>
  );
}

// ─── Watchlist view ───────────────────────────────────────────────────────────

function WatchlistView({
  items,
  onView,
  onRemove,
  isLoading,
  colors,
}: {
  items: WatchlistItem[];
  onView: (query: string) => void;
  onRemove: (query: string) => void;
  isLoading: boolean;
  colors: Colors;
}) {
  if (items.length === 0) {
    return (
      <div
        style={{
          padding: "32px 16px",
          textAlign: "center",
          color: colors.textSecondary,
          fontSize: 13,
        }}
      >
        No starred markets yet. Hit ☆ on any insight to add it here.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((item) => (
        <div
          key={item.query}
          style={{
            border: `1px solid ${colors.border}`,
            borderRadius: 10,
            padding: "10px 14px",
            backgroundColor: colors.bgSurface,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                margin: "0 0 3px",
                fontSize: 13,
                fontWeight: 500,
                color: colors.text,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {item.eventTitle}
            </p>
            {item.consensus !== null && (
              <span style={{ fontSize: 12, color: colors.yes, fontWeight: 600 }}>
                {(item.consensus * 100).toFixed(1)}% consensus
              </span>
            )}
          </div>
          <button
            onClick={() => onView(item.query)}
            disabled={isLoading}
            style={{
              padding: "5px 10px",
              borderRadius: 7,
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.actionBtn,
              color: colors.actionBtnText,
              fontSize: 11,
              fontWeight: 500,
              cursor: isLoading ? "default" : "pointer",
              opacity: isLoading ? 0.5 : 1,
              flexShrink: 0,
            }}
          >
            View
          </button>
          <button
            onClick={() => onRemove(item.query)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: colors.textSecondary,
              fontSize: 13,
              flexShrink: 0,
              padding: "4px 6px",
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Source card ──────────────────────────────────────────────────────────────

function SourceCard({
  title,
  selectedIndex,
  onSelect,
  options,
  selected,
  colors,
  isKalshi,
}: {
  title: string;
  selectedIndex: number;
  onSelect: (nextIndex: number) => void;
  options: PolymarketData[] | KalshiData[];
  selected: PolymarketData | KalshiData;
  colors: Colors;
  isKalshi: boolean;
}) {
  const dark = colors.bg === "#1a1a1a";
  const badgeColor = isKalshi
    ? dark ? K_GREEN_DARK : K_GREEN
    : dark ? PM_BLUE_DARK : PM_BLUE;
  const badgeBg = isKalshi ? colors.kBadgeBg : colors.pmBadgeBg;

  return (
    <div
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding: 14,
        backgroundColor: colors.bgSurface,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: badgeColor,
            backgroundColor: badgeBg,
            borderRadius: 999,
            padding: "3px 8px",
          }}
        >
          {title}
        </span>
        {options.length > 1 && (
          <select
            value={selectedIndex}
            onChange={(event) => onSelect(Number(event.target.value))}
            style={{
              border: `1px solid ${colors.border}`,
              borderRadius: 6,
              backgroundColor: colors.bg,
              color: colors.text,
              padding: "4px 6px",
              fontSize: 12,
            }}
          >
            {options.map((_, idx) => (
              <option key={`${title}-${idx}`} value={idx}>
                {idx === 0 ? "Top match" : `Alt ${idx}`}
              </option>
            ))}
          </select>
        )}
      </div>

      <p style={{ margin: 0, color: colors.text, fontSize: 13, lineHeight: 1.4 }}>
        {selected.title}
      </p>

      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: badgeColor }}>
          {(selected.probability * 100).toFixed(1)}%
        </span>
        <span style={{ fontSize: 11, color: colors.textSecondary }}>
          {selected.probabilityLabel}
        </span>
      </div>

      <div
        style={{
          fontSize: 11,
          color: colors.textSecondary,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {selected.score < 0.5 && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "#f59e0b",
              backgroundColor: "rgba(245,158,11,0.12)",
              borderRadius: 999,
              padding: "2px 7px",
            }}
          >
            Weak match
          </span>
        )}
        <span>Vol {formatVolume(selected.volume)}</span>
        {isKalshi && "openInterest" in selected ? (
          <span>OI {selected.openInterest.toLocaleString()}</span>
        ) : null}
      </div>

      <a
        href={selected.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-block",
          width: "fit-content",
          padding: "6px 10px",
          borderRadius: 8,
          textDecoration: "none",
          backgroundColor: badgeColor,
          color: "#fff",
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        Open market ↗
      </a>
    </div>
  );
}

// ─── Grok card ────────────────────────────────────────────────────────────────

// Renders Grok's markdown-ish output: **bold** and strips [[N]](url) citations
// Parse a single line into React nodes: handles **bold** and [[N]](url) citations
function parseLine(
  line: string,
  colors: Colors,
  onLink: (url: string) => void
): React.ReactNode[] {
  // Tokenise by either **bold** or [[N]](url)
  const tokenRe = /\*\*([^*]+)\*\*|\[\[(\d+)\]\]\(([^)]+)\)/g;
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;

  while ((m = tokenRe.exec(line)) !== null) {
    if (m.index > last) nodes.push(line.slice(last, m.index));

    if (m[1] !== undefined) {
      // **bold**
      nodes.push(
        <strong key={i++} style={{ color: colors.text, fontWeight: 600 }}>
          {m[1]}
        </strong>
      );
    } else if (m[3] !== undefined) {
      // [[N]](url) — render as a small superscript link
      const url = m[3];
      const num = m[2];
      nodes.push(
        <sup key={i++}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.preventDefault();
              onLink(url);
            }}
            style={{
              color: colors.link,
              textDecoration: "none",
              fontSize: "0.75em",
              fontWeight: 600,
            }}
          >
            [{num}]
          </a>
        </sup>
      );
    }

    last = m.index + m[0].length;
  }
  if (last < line.length) nodes.push(line.slice(last));
  return nodes;
}

function renderGrokText(
  raw: string,
  colors: Colors,
  onLink: (url: string) => void
): React.ReactNode {
  return raw.split("\n").map((line, li) => (
    <React.Fragment key={li}>
      {parseLine(line, colors, onLink)}
      {"\n"}
    </React.Fragment>
  ));
}

function GrokCard({
  text,
  expanded,
  onToggle,
  onLink,
  colors,
}: {
  text: string;
  expanded: boolean;
  onToggle: () => void;
  onLink: (url: string) => void;
  colors: Colors;
}) {
  // Measure length on raw text, but truncate before rendering
  const isLong = text.length > 520;
  const visible = expanded || !isLong ? text : `${text.slice(0, 520)}…`;

  return (
    <div
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding: 14,
        backgroundColor: colors.bgSurface,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: colors.link }}>
          GROK ANALYSIS (X SEARCH)
        </span>
        {isLong ? (
          <button
            onClick={onToggle}
            style={{
              border: `1px solid ${colors.border}`,
              background: "transparent",
              color: colors.textSecondary,
              borderRadius: 6,
              fontSize: 11,
              padding: "4px 8px",
              cursor: "pointer",
            }}
          >
            {expanded ? "Collapse" : "Expand"}
          </button>
        ) : null}
      </div>
      <div
        style={{
          margin: 0,
          whiteSpace: "pre-wrap",
          fontSize: 13,
          lineHeight: 1.6,
          color: colors.text,
        }}
      >
        {renderGrokText(visible, colors, onLink)}
      </div>
    </div>
  );
}

// ─── Pending skeleton ─────────────────────────────────────────────────────────

function Pending({ colors }: { colors: Colors }) {
  return (
    <McpUseProvider autoSize>
      <div
        style={{
          borderRadius: 16,
          backgroundColor: colors.bg,
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <SkeletonBar width="70%" height={18} colors={colors} />
        <SkeletonBar width="100%" height={90} colors={colors} />
        <SkeletonBar width="100%" height={130} colors={colors} />
      </div>
    </McpUseProvider>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function FullscreenIcon({ isFullscreen }: { isFullscreen: boolean }) {
  if (isFullscreen) {
    return (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 2 6 6 2 6" /><polyline points="10 14 10 10 14 10" />
        <line x1="2" y1="2" x2="6" y2="6" /><line x1="14" y1="14" x2="10" y2="10" />
      </svg>
    );
  }
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="10 2 14 2 14 6" /><polyline points="6 14 2 14 2 10" />
      <line x1="14" y1="2" x2="10" y2="6" /><line x1="2" y1="14" x2="6" y2="10" />
    </svg>
  );
}

// ─── Main widget ──────────────────────────────────────────────────────────────

const PredictionInsight: React.FC = () => {
  const {
    props,
    isPending,
    sendFollowUpMessage,
    state,
    setState,
    displayMode,
    requestDisplayMode,
    openExternal,
    isAvailable,
  } = useWidget<InsightProps>();
  const colors = useColors();
  const { callTool, isPending: isRefreshing } = useCallTool(
    "get-prediction-insight"
  );

  // Local UI state (doesn't need to persist)
  const [expandedDetail, setExpandedDetail] = useState<"pm" | "kalshi" | null>(
    null
  );

  if (isPending) return <Pending colors={colors} />;

  const widgetState = (state ?? {}) as WidgetState;
  const insight = props.insight;

  const pmIndex = clampedIndex(
    widgetState.selectedPmIndex,
    insight.polymarketCandidates.length
  );
  const kalshiIndex = clampedIndex(
    widgetState.selectedKalshiIndex,
    insight.kalshiCandidates.length
  );
  const grokExpanded = widgetState.grokExpanded ?? false;
  const watchlist = widgetState.watchlist ?? [];
  const showWatchlist = widgetState.showWatchlist ?? false;

  const selectedPolymarket =
    insight.polymarketCandidates[pmIndex] ?? insight.polymarket;
  const selectedKalshi =
    insight.kalshiCandidates[kalshiIndex] ?? insight.kalshi;
  const visibleSources =
    Number(Boolean(selectedPolymarket)) + Number(Boolean(selectedKalshi));

  const liveConsensus = computeConsensus(selectedPolymarket, selectedKalshi);

  const isStarred = watchlist.some((w) => w.query === insight.query);
  const isFullscreen = displayMode === "fullscreen" && !!isAvailable;

  const patchState = (patch: Partial<WidgetState>) => {
    setState({ ...widgetState, ...patch });
  };

  const toggleStar = () => {
    const next = isStarred
      ? watchlist.filter((w) => w.query !== insight.query)
      : [
          ...watchlist,
          {
            query: insight.query,
            eventTitle: insight.eventTitle,
            consensus: liveConsensus,
          },
        ];
    patchState({ watchlist: next });
  };

  const toggleFullscreen = () => {
    requestDisplayMode(isFullscreen ? "inline" : "fullscreen").catch(() => {});
  };

  const iconBtnStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 30,
    height: 30,
    borderRadius: 7,
    border: `1px solid ${colors.border}`,
    backgroundColor: "transparent",
    cursor: "pointer",
    color: colors.textSecondary,
    flexShrink: 0,
  };

  return (
    <McpUseProvider autoSize={!isFullscreen}>
      <div
        style={{
          borderRadius: isFullscreen ? 0 : 16,
          backgroundColor: colors.bg,
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          ...(isFullscreen
            ? { width: "100vw", minHeight: "100vh", boxSizing: "border-box" as const }
            : {}),
        }}
      >
        {/* Header row: title + watchlist toggle + star + fullscreen */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Header
              eventTitle={insight.eventTitle}
              query={insight.query}
              generatedAt={insight.generatedAt}
              colors={colors}
            />
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0, paddingTop: 2 }}>
            {/* Watchlist toggle — shows count, opens watchlist view */}
            {watchlist.length > 0 && (
              <button
                onClick={() => patchState({ showWatchlist: !showWatchlist })}
                title="View watchlist"
                style={{
                  ...iconBtnStyle,
                  width: "auto",
                  padding: "0 8px",
                  fontSize: 11,
                  color: showWatchlist ? "#f59e0b" : colors.textSecondary,
                  borderColor: showWatchlist ? "#f59e0b" : colors.border,
                  gap: 4,
                }}
              >
                ★ {watchlist.length}
              </button>
            )}
            {/* Star current market */}
            <button
              onClick={toggleStar}
              title={isStarred ? "Remove from watchlist" : "Add to watchlist"}
              style={{
                ...iconBtnStyle,
                fontSize: 16,
                color: isStarred ? "#f59e0b" : colors.textSecondary,
                borderColor: isStarred ? "#f59e0b" : colors.border,
              }}
            >
              {isStarred ? "★" : "☆"}
            </button>
            {/* Fullscreen */}
            {isAvailable && (
              <button
                onClick={toggleFullscreen}
                title={isFullscreen ? "Exit fullscreen" : "Expand"}
                style={iconBtnStyle}
              >
                <FullscreenIcon isFullscreen={isFullscreen} />
              </button>
            )}
          </div>
        </div>

        {/* Watchlist panel — shown when watchlist toggle is active */}
        {showWatchlist && (
          <div
            style={{
              border: `1px solid #f59e0b40`,
              borderRadius: 12,
              padding: 14,
              backgroundColor:
                colors.bg === "#1a1a1a"
                  ? "rgba(245,158,11,0.06)"
                  : "rgba(245,158,11,0.04)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#f59e0b",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Watchlist
              </span>
              <span style={{ fontSize: 11, color: colors.textSecondary }}>
                Tap View to reload any market
              </span>
            </div>
            <WatchlistView
              items={watchlist}
              onView={(query) => {
                patchState({ showWatchlist: false });
                callTool({ query });
              }}
              onRemove={(query) =>
                patchState({
                  watchlist: watchlist.filter((w) => w.query !== query),
                })
              }
              isLoading={isRefreshing}
              colors={colors}
            />
          </div>
        )}

        {/* Arc panel */}
        <ArcPanel
          polymarket={selectedPolymarket}
          kalshi={selectedKalshi}
          consensus={liveConsensus}
          colors={colors}
          onTrade={(url) => openExternal(url)}
          expandedDetail={expandedDetail}
          onSelectDetail={setExpandedDetail}
        />

        {/* Inline detail panel — shown when a market arc is clicked */}
        {expandedDetail && (
          <DetailPanel
            side={expandedDetail}
            pm={selectedPolymarket}
            kalshi={selectedKalshi}
            onClose={() => setExpandedDetail(null)}
            onTrade={(url) => openExternal(url)}
            colors={colors}
          />
        )}

        {/* Per-platform detail cards with alternate market dropdown */}
        {visibleSources > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: visibleSources === 1 ? "1fr" : "1fr 1fr",
              gap: 12,
            }}
          >
            {selectedPolymarket ? (
              <SourceCard
                title="Polymarket"
                selectedIndex={pmIndex}
                onSelect={(nextIndex) =>
                  patchState({ selectedPmIndex: nextIndex })
                }
                options={insight.polymarketCandidates}
                selected={selectedPolymarket}
                colors={colors}
                isKalshi={false}
              />
            ) : null}
            {selectedKalshi ? (
              <SourceCard
                title="Kalshi"
                selectedIndex={kalshiIndex}
                onSelect={(nextIndex) =>
                  patchState({ selectedKalshiIndex: nextIndex })
                }
                options={insight.kalshiCandidates}
                selected={selectedKalshi}
                colors={colors}
                isKalshi
              />
            ) : null}
          </div>
        )}

        {/* Grok analysis */}
        <GrokCard
          text={insight.grokAnalysis}
          expanded={grokExpanded}
          onToggle={() => patchState({ grokExpanded: !grokExpanded })}
          onLink={(url) => openExternal(url)}
          colors={colors}
        />

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <ActionButton
            label={isRefreshing ? "Refreshing…" : "Refresh"}
            onClick={() => callTool({ query: insight.query })}
            disabled={isRefreshing}
            colors={colors}
          />
          <ActionButton
            label="Why moving?"
            onClick={() =>
              sendFollowUpMessage(
                `Why is "${insight.eventTitle}" moving right now? Focus on the strongest catalysts from X.`
              )
            }
            colors={colors}
          />
          <ActionButton
            label="Explain spread"
            onClick={() =>
              sendFollowUpMessage(
                `Explain the spread between Polymarket and Kalshi for "${insight.eventTitle}" and whether it is actionable.`
              )
            }
            colors={colors}
          />
          <ActionButton
            label="Deeper analysis"
            onClick={() =>
              sendFollowUpMessage(
                `Give me a deep-dive analysis of "${insight.eventTitle}": key risks, upcoming catalysts, historical base rates, and what would need to happen for the market to move by more than 10% in either direction.`
              )
            }
            colors={colors}
          />
        </div>
      </div>
    </McpUseProvider>
  );
};

export default PredictionInsight;
