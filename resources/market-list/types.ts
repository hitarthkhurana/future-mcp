import { z } from "zod";

export const propSchema = z.object({
  markets: z
    .array(z.record(z.unknown()))
    .describe("Array of Polymarket market objects from Gamma API"),
  title: z.string().describe("Widget heading, e.g. 'Trending Markets'"),
});

export type MarketListProps = z.infer<typeof propSchema>;
