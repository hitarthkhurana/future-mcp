import { z } from "zod";

const polymarketSchema = z.object({
  title: z.string(),
  slug: z.string(),
  clobTokenId: z.string().nullable().optional(),
  probability: z.number(),
  probabilityLabel: z.string(),
  volume: z.number(),
  liquidity: z.number(),
  endDate: z.string().nullable(),
  url: z.string(),
  score: z.number(),
});

const kalshiSchema = z.object({
  title: z.string(),
  ticker: z.string(),
  eventTicker: z.string(),
  probability: z.number(),
  probabilityLabel: z.string(),
  previousPrice: z.number().nullable().optional(),
  volume: z.number(),
  volume24h: z.number(),
  openInterest: z.number(),
  closeTime: z.string().nullable(),
  yesBid: z.string(),
  yesAsk: z.string(),
  url: z.string(),
  score: z.number(),
});

const insightSchema = z.object({
  query: z.string(),
  eventTitle: z.string(),
  generatedAt: z.string(),
  consensusProbability: z.number().nullable(),
  polymarket: polymarketSchema.nullable(),
  kalshi: kalshiSchema.nullable(),
  polymarketCandidates: z.array(polymarketSchema),
  kalshiCandidates: z.array(kalshiSchema),
  grokAnalysis: z.string(),
});

export const propSchema = z.object({
  insight: insightSchema.describe(
    "Unified prediction market insight with Polymarket/Kalshi matches and Grok analysis"
  ),
});

export type InsightProps = z.infer<typeof propSchema>;
export type Insight = z.infer<typeof insightSchema>;
export type PolymarketData = z.infer<typeof polymarketSchema>;
export type KalshiData = z.infer<typeof kalshiSchema>;
