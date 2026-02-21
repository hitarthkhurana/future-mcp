import { z } from "zod";

export const propSchema = z.object({
  market: z
    .record(z.unknown())
    .describe("Polymarket market object from Gamma API"),
  orderbook: z
    .record(z.unknown())
    .nullable()
    .optional()
    .describe("CLOB orderbook data (bids/asks) for the YES outcome token"),
});

export type MarketDetailProps = z.infer<typeof propSchema>;
