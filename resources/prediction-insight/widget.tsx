import {
  McpUseProvider,
  useCallTool,
  useWidget,
  type WidgetMetadata,
} from "mcp-use/react";
import React from "react";
import { propSchema, type InsightProps, type KalshiData, type PolymarketData } from "./types";
import {
  ActionButton,
  ProbBar,
  SkeletonBar,
  formatDate,
  formatVolume,
  useColors,
  type Colors,
} from "../../shared";

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
        "https://api.elections.kalshi.com",
        "https://api.x.ai",
      ],
    },
  },
};

type WidgetState = {
  selectedPmIndex?: number;
  selectedKalshiIndex?: number;
  grokExpanded?: boolean;
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
    if (totalVolume <= 0) {
      return (polymarket.probability + kalshi.probability) / 2;
    }
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
        style={{
          margin: 0,
          fontSize: 18,
          lineHeight: 1.3,
          color: colors.text,
        }}
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

function ConsensusCard({
  probability,
  colors,
}: {
  probability: number | null;
  colors: Colors;
}) {
  if (probability === null) {
    return (
      <div
        style={{
          border: `1px dashed ${colors.border}`,
          borderRadius: 12,
          padding: 14,
          color: colors.textSecondary,
          fontSize: 12,
        }}
      >
        No confident market match yet.
      </div>
    );
  }

  const pct = probability * 100;

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
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 30, fontWeight: 700, color: colors.yes }}>
          {pct.toFixed(1)}%
        </span>
        <span style={{ fontSize: 11, color: colors.textSecondary }}>market-implied</span>
      </div>
      <ProbBar
        label="YES"
        pct={pct}
        barColor={colors.yesBar}
        trackColor={colors.barTrack}
        textColor={colors.yes}
      />
      <ProbBar
        label="NO"
        pct={100 - pct}
        barColor={colors.noBar}
        trackColor={colors.barTrack}
        textColor={colors.no}
      />
    </div>
  );
}

function SourceComparisonCard({
  polymarket,
  kalshi,
  colors,
}: {
  polymarket: PolymarketData | null;
  kalshi: KalshiData | null;
  colors: Colors;
}) {
  if (!polymarket && !kalshi) return null;

  return (
    <div
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding: 14,
        backgroundColor: colors.bgSurface,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: colors.textSecondary,
        }}
      >
        Market Snapshot
      </span>
      {polymarket ? (
        <ProbBar
          label="PM"
          pct={polymarket.probability * 100}
          barColor={colors.pmBadge}
          trackColor={colors.barTrack}
          textColor={colors.pmBadge}
        />
      ) : null}
      {kalshi ? (
        <ProbBar
          label="K"
          pct={kalshi.probability * 100}
          barColor={colors.kBadge}
          trackColor={colors.barTrack}
          textColor={colors.kBadge}
        />
      ) : null}
    </div>
  );
}

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
  const badgeColor = isKalshi ? colors.kBadge : colors.pmBadge;
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
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
            {options.map((option, idx) => (
              <option key={`${title}-${idx}`} value={idx}>
                {idx === 0 ? "Top match" : `Alt ${idx}`}
              </option>
            ))}
          </select>
        )}
      </div>

      <p
        style={{
          margin: 0,
          color: colors.text,
          fontSize: 13,
          lineHeight: 1.4,
        }}
      >
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

      <div style={{ fontSize: 11, color: colors.textSecondary, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <span>Score {selected.score.toFixed(2)}</span>
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
        Open market
      </a>
    </div>
  );
}

function GrokCard({
  text,
  expanded,
  onToggle,
  colors,
}: {
  text: string;
  expanded: boolean;
  onToggle: () => void;
  colors: Colors;
}) {
  const isLong = text.length > 520;
  const visible = expanded || !isLong ? text : `${text.slice(0, 520)}...`;

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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
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

      <div style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.6, color: colors.text }}>
        {visible}
      </div>
    </div>
  );
}

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

const PredictionInsight: React.FC = () => {
  const { props, isPending, sendFollowUpMessage, state, setState } =
    useWidget<InsightProps>();
  const colors = useColors();
  const { callTool, isPending: isRefreshing } = useCallTool("get-prediction-insight");

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

  const selectedPolymarket =
    insight.polymarketCandidates[pmIndex] ?? insight.polymarket;
  const selectedKalshi = insight.kalshiCandidates[kalshiIndex] ?? insight.kalshi;
  const visibleSources =
    Number(Boolean(selectedPolymarket)) + Number(Boolean(selectedKalshi));

  const liveConsensus = computeConsensus(selectedPolymarket, selectedKalshi);

  const patchState = (patch: Partial<WidgetState>) => {
    setState({ ...widgetState, ...patch });
  };

  return (
    <McpUseProvider autoSize>
      <div
        style={{
          borderRadius: 16,
          backgroundColor: colors.bg,
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        <Header
          eventTitle={insight.eventTitle}
          query={insight.query}
          generatedAt={insight.generatedAt}
          colors={colors}
        />

        <ConsensusCard probability={liveConsensus} colors={colors} />
        <SourceComparisonCard
          polymarket={selectedPolymarket}
          kalshi={selectedKalshi}
          colors={colors}
        />

        {visibleSources > 0 ? (
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
                onSelect={(nextIndex) => patchState({ selectedPmIndex: nextIndex })}
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
                onSelect={(nextIndex) => patchState({ selectedKalshiIndex: nextIndex })}
                options={insight.kalshiCandidates}
                selected={selectedKalshi}
                colors={colors}
                isKalshi
              />
            ) : null}
          </div>
        ) : null}

        <GrokCard
          text={insight.grokAnalysis}
          expanded={grokExpanded}
          onToggle={() => patchState({ grokExpanded: !grokExpanded })}
          colors={colors}
        />

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <ActionButton
            label={isRefreshing ? "Refreshing..." : "Refresh"}
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
        </div>
      </div>
    </McpUseProvider>
  );
};

export default PredictionInsight;
