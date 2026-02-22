import type { KalshiData, PolymarketData } from "./types";

export type WatchlistItem = {
  query: string;
  eventTitle: string;
  consensus: number | null;
};

export type WidgetState = {
  selectedPmIndex?: number;
  selectedKalshiIndex?: number;
  watchlist?: WatchlistItem[];
  showWatchlist?: boolean;
};

export function clampedIndex(index: number | undefined, size: number): number {
  if (!size) return 0;
  if (typeof index !== "number") return 0;
  if (index < 0) return 0;
  if (index >= size) return size - 1;
  return index;
}

export function computeConsensus(
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
