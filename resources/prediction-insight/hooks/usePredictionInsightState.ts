import { clampedIndex, computeConsensus, type WidgetState } from "../state";
import type { InsightProps } from "../types";

export function usePredictionInsightState(
  props: InsightProps,
  state: unknown,
  setState: (nextState: WidgetState) => void
) {
  const widgetState = (state ?? {}) as WidgetState;
  const insight = props.insight;

  const pmIndex = clampedIndex(widgetState.selectedPmIndex, insight.polymarketCandidates.length);
  const kalshiIndex = clampedIndex(widgetState.selectedKalshiIndex, insight.kalshiCandidates.length);

  const selectedPolymarket = insight.polymarketCandidates[pmIndex] ?? insight.polymarket;
  const selectedKalshi = insight.kalshiCandidates[kalshiIndex] ?? insight.kalshi;

  const patchState = (patch: Partial<WidgetState>) => {
    setState({ ...widgetState, ...patch });
  };

  const watchlist = widgetState.watchlist ?? [];

  return {
    insight,
    pmIndex,
    kalshiIndex,
    selectedPolymarket,
    selectedKalshi,
    liveConsensus: computeConsensus(selectedPolymarket, selectedKalshi),
    watchlist,
    showWatchlist: widgetState.showWatchlist ?? false,
    patchState,
  };
}
