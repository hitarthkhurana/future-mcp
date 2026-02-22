import { McpUseProvider, useCallTool, useWidget, type WidgetMetadata } from "mcp-use/react";
import { useState } from "react";
import { ActionButton, useColors } from "../../shared";
import { ArcPanel } from "./components/ArcPanel";
import { DetailPanel } from "./components/DetailPanel";
import { FullscreenIcon } from "./components/FullscreenIcon";
import { GrokCard } from "./components/GrokCard";
import { Header } from "./components/Header";
import { Pending } from "./components/Pending";
import { SourceCard } from "./components/SourceCard";
import { WatchlistView } from "./components/WatchlistView";
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
    watchlist,
    showWatchlist,
    patchState,
  } = usePredictionInsightState(props, state, setState as (nextState: WidgetState) => void);

  const visibleSources = Number(Boolean(selectedPolymarket)) + Number(Boolean(selectedKalshi));
  const isStarred = watchlist.some((item) => item.query === insight.query);
  const isFullscreen = displayMode === "fullscreen" && !!isAvailable;

  const toggleStar = () => {
    const next = isStarred
      ? watchlist.filter((item) => item.query !== insight.query)
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

          <div className="flex shrink-0 gap-1.5 pt-0.5">
            {watchlist.length > 0 && (
              <button
                onClick={() => patchState({ showWatchlist: !showWatchlist })}
                title="View watchlist"
                className="flex h-[30px] items-center justify-center gap-1 rounded-[7px] border px-2 text-[11px]"
                style={{
                  color: showWatchlist ? "#f59e0b" : colors.textSecondary,
                  borderColor: showWatchlist ? "#f59e0b" : colors.border,
                }}
              >
                ★ {watchlist.length}
              </button>
            )}

            <button
              onClick={toggleStar}
              title={isStarred ? "Remove from watchlist" : "Add to watchlist"}
              className="flex size-[30px] items-center justify-center rounded-[7px] border text-base"
              style={{
                color: isStarred ? "#f59e0b" : colors.textSecondary,
                borderColor: isStarred ? "#f59e0b" : colors.border,
              }}
            >
              {isStarred ? "★" : "☆"}
            </button>

            {isAvailable && (
              <button
                onClick={() => requestDisplayMode(isFullscreen ? "inline" : "fullscreen").catch(() => {})}
                title={isFullscreen ? "Exit fullscreen" : "Expand"}
                className="flex size-[30px] items-center justify-center rounded-[7px] border text-[var(--muted)]"
                style={{ borderColor: colors.border }}
              >
                <FullscreenIcon isFullscreen={isFullscreen} />
              </button>
            )}
          </div>
        </div>

        {showWatchlist && (
          <div
            className="rounded-xl border p-3.5"
            style={{
              borderColor: "#f59e0b40",
              backgroundColor:
                colors.bg === "#1a1a1a" ? "rgba(245,158,11,0.06)" : "rgba(245,158,11,0.04)",
            }}
          >
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-amber-500">Watchlist</span>
              <span className="text-[11px] text-[var(--muted)]">Tap View to reload any market</span>
            </div>

            <WatchlistView
              items={watchlist}
              onView={(query) => {
                patchState({ showWatchlist: false });
                callTool({ query });
              }}
              onRemove={(query) =>
                patchState({
                  watchlist: watchlist.filter((item) => item.query !== query),
                })
              }
              isLoading={isRefreshing}
              colors={colors}
            />
          </div>
        )}

        <ArcPanel
          polymarket={selectedPolymarket}
          kalshi={selectedKalshi}
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

        {visibleSources > 0 && (
          <div className={`grid gap-3 ${visibleSources === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
            {selectedPolymarket && (
              <SourceCard
                title="Polymarket"
                selectedIndex={pmIndex}
                onSelect={(nextIndex) => patchState({ selectedPmIndex: nextIndex })}
                options={insight.polymarketCandidates}
                selected={selectedPolymarket}
                colors={colors}
                isKalshi={false}
              />
            )}
            {selectedKalshi && (
              <SourceCard
                title="Kalshi"
                selectedIndex={kalshiIndex}
                onSelect={(nextIndex) => patchState({ selectedKalshiIndex: nextIndex })}
                options={insight.kalshiCandidates}
                selected={selectedKalshi}
                colors={colors}
                isKalshi
              />
            )}
          </div>
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
