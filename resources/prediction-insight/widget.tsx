import { McpUseProvider, useCallTool, useWidget, type WidgetMetadata } from "mcp-use/react";
import { useState } from "react";
import { ActionButton, useColors } from "../../shared";
import { ArcPanel } from "./components/ArcPanel";
import { DetailPanel } from "./components/DetailPanel";
import { FullscreenIcon } from "./components/FullscreenIcon";
import { GrokCard } from "./components/GrokCard";
import { Header } from "./components/Header";
import { Pending } from "./components/Pending";
import { usePredictionInsightState } from "./hooks/usePredictionInsightState";
import { type WidgetState } from "./state";
import { propSchema, type InsightProps } from "./types";

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

const PredictionInsight = () => {
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
  const { callTool, isPending: isRefreshing } = useCallTool("get-prediction-insight");
  const [expandedDetail, setExpandedDetail] = useState<"pm" | "kalshi" | null>(null);

  if (isPending) return <Pending colors={colors} />;

  const {
    insight,
    pmIndex,
    kalshiIndex,
    selectedPolymarket,
    selectedKalshi,
    liveConsensus,
    patchState,
  } = usePredictionInsightState(props, state, setState as (nextState: WidgetState) => void);

  const isFullscreen = displayMode === "fullscreen" && !!isAvailable;

  return (
    <McpUseProvider autoSize={!isFullscreen}>
      <div
        className="flex flex-col gap-3.5 bg-[var(--bg)] p-5"
        style={{
          ["--bg" as string]: colors.bg,
          ["--text" as string]: colors.text,
          ["--muted" as string]: colors.textSecondary,
          ["--border" as string]: colors.border,
          borderRadius: isFullscreen ? 0 : 16,
          width: isFullscreen ? "100vw" : undefined,
          minHeight: isFullscreen ? "100vh" : undefined,
          boxSizing: isFullscreen ? "border-box" : undefined,
        }}
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <Header
              eventTitle={insight.eventTitle}
              query={insight.query}
              generatedAt={insight.generatedAt}
              colors={colors}
            />
          </div>

          {isAvailable && (
            <div className="flex shrink-0 gap-1.5 pt-0.5">
              <button
                onClick={() => requestDisplayMode(isFullscreen ? "inline" : "fullscreen").catch(() => {})}
                title={isFullscreen ? "Exit fullscreen" : "Expand"}
                className="flex size-[30px] items-center justify-center rounded-[7px] border text-[var(--muted)]"
                style={{ borderColor: colors.border }}
              >
                <FullscreenIcon isFullscreen={isFullscreen} />
              </button>
            </div>
          )}
        </div>

        <ArcPanel
          polymarket={selectedPolymarket}
          kalshi={selectedKalshi}
          polymarketCandidates={insight.polymarketCandidates}
          kalshiCandidates={insight.kalshiCandidates}
          pmIndex={pmIndex}
          kalshiIndex={kalshiIndex}
          onSelectPmIndex={(i) => patchState({ selectedPmIndex: i })}
          onSelectKalshiIndex={(i) => patchState({ selectedKalshiIndex: i })}
          consensus={liveConsensus}
          colors={colors}
          onTrade={openExternal}
          expandedDetail={expandedDetail}
          onSelectDetail={setExpandedDetail}
        />

        {expandedDetail && (
          <DetailPanel
            side={expandedDetail}
            pm={selectedPolymarket}
            kalshi={selectedKalshi}
            onClose={() => setExpandedDetail(null)}
            onTrade={openExternal}
            colors={colors}
          />
        )}

        <GrokCard
          text={insight.grokAnalysis}
          onLink={openExternal}
          colors={colors}
        />

        <div className="flex flex-wrap gap-2">
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
