import { MCPServer, error, text, widget } from "mcp-use/server";
import { z } from "zod";

const server = new MCPServer({
  name: "future-mcp",
  title: "Polymarket",
  version: "1.0.0",
  description:
    "Live prediction market data from Polymarket. Use when users ask about odds, probabilities, or the likelihood of future events — elections, crypto prices, sports, AI, geopolitics, and more.",
  baseUrl: process.env.MCP_URL || "http://localhost:3000",
  favicon: "favicon.ico",
  websiteUrl: "https://polymarket.com",
  icons: [
    {
      src: "icon.svg",
      mimeType: "image/svg+xml",
      sizes: ["512x512"],
    },
  ],
});

// 30-second in-memory cache
const cache = new Map<string, { data: unknown; expires: number }>();

async function cached<T>(
  key: string,
  ttl: number,
  fn: () => Promise<T>
): Promise<T> {
  const entry = cache.get(key);
  if (entry && entry.expires > Date.now()) return entry.data as T;
  const data = await fn();
  cache.set(key, { data, expires: Date.now() + ttl });
  return data;
}

const GAMMA = "https://gamma-api.polymarket.com";
const CLOB = "https://clob.polymarket.com";
const TTL = 30_000;

// Base filter ensuring we only ever surface live, open markets
const ACTIVE_FILTER = "active=true&closed=false";

// ─── search-markets ───────────────────────────────────────────────────────────

server.tool(
  {
    name: "search-markets",
    description:
      "Search live Polymarket prediction markets by topic and show real-time probabilities. " +
      "Use whenever users ask about the odds or likelihood of a future event — e.g. 'Will Bitcoin hit $200K?', " +
      "'Who will win the election?', 'What are the chances of X happening?', 'What does the market think about Y?'",
    schema: z.object({
      query: z
        .string()
        .describe(
          "The topic or event to search for, e.g. 'bitcoin', 'US election', 'AI regulation'"
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(20)
        .default(6)
        .optional()
        .describe("Max results to return (default 6, max 20)"),
    }),
    widget: {
      name: "market-list",
      invoking: "Searching prediction markets…",
      invoked: "Markets loaded",
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ query, limit = 6 }) => {
    try {
      const markets = await cached(
        `search:${query}:${limit}`,
        TTL,
        async () => {
          // /public-search gives proper relevance-ranked results with nested markets per event
          const res = await fetch(
            `${GAMMA}/public-search?q=${encodeURIComponent(query)}&limit=10`
          );
          if (!res.ok) throw new Error(`Gamma API ${res.status}`);
          const data = (await res.json()) as { events?: Array<{ markets?: Record<string, unknown>[] }> };

          // Flatten markets from all events, keep only open (active=True, closed=False)
          const flat: Record<string, unknown>[] = [];
          for (const event of data.events ?? []) {
            for (const m of event.markets ?? []) {
              if (String(m.active) === "True" && String(m.closed) === "False") {
                flat.push(m);
              }
            }
            if (flat.length >= limit) break;
          }
          return flat.slice(0, limit);
        }
      );
      return widget({
        props: { markets, title: `Prediction Markets: "${query}"` },
        output: text(
          `Found ${(markets as unknown[]).length} active markets for "${query}" on Polymarket`
        ),
      });
    } catch (e) {
      return error(
        `Failed to search markets: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
);

// ─── get-trending-markets ─────────────────────────────────────────────────────

server.tool(
  {
    name: "get-trending-markets",
    description:
      "Get the hottest Polymarket prediction markets right now, ranked by trading volume. " +
      "Use when users ask 'What are people betting on?', 'What are the biggest prediction markets?', " +
      "'What future events are most traded?', or any general curiosity about current market activity.",
    schema: z.object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(20)
        .default(6)
        .optional()
        .describe("Number of markets to return (default 6)"),
    }),
    widget: {
      name: "market-list",
      invoking: "Loading trending prediction markets…",
      invoked: "Trending markets loaded",
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ limit = 6 }) => {
    try {
      const markets = await cached(`trending:${limit}`, TTL, async () => {
          // volume_24hr = currently hot markets, not all-time volume
          const res = await fetch(
            `${GAMMA}/markets?${ACTIVE_FILTER}&order=volume_24hr&ascending=false&limit=${limit}`
          );
        if (!res.ok) throw new Error(`Gamma API ${res.status}`);
        return res.json();
      });
      return widget({
        props: { markets, title: "Trending Prediction Markets" },
        output: text(
          `Top ${(markets as unknown[]).length} prediction markets by trading volume on Polymarket`
        ),
      });
    } catch (e) {
      return error(
        `Failed to fetch trending markets: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
);

// ─── get-market-detail ────────────────────────────────────────────────────────

server.tool(
  {
    name: "get-market-detail",
    description:
      "Get full details for a specific Polymarket market — probability bars, live orderbook, volume, and a trade link. " +
      "Use after search-markets or get-trending-markets when the user wants to drill into a particular market. " +
      "Requires the market's slug (e.g. 'will-btc-reach-200k-in-2025').",
    schema: z.object({
      slug: z
        .string()
        .describe(
          "Market slug from a previous search result, e.g. 'will-btc-reach-200k-in-2025'"
        ),
    }),
    widget: {
      name: "market-detail",
      invoking: "Loading market details…",
      invoked: "Market loaded",
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ slug }) => {
    try {
      const [market, orderbook] = await cached(
        `detail:${slug}`,
        TTL,
        async () => {
          const mRes = await fetch(
            `${GAMMA}/markets?slug=${encodeURIComponent(slug)}`
          );
          if (!mRes.ok) throw new Error(`Gamma API ${mRes.status}`);
          const markets = (await mRes.json()) as Record<string, unknown>[];
          if (!markets.length) throw new Error(`Market not found: ${slug}`);
          const m = markets[0];

          // Fetch live orderbook for the YES outcome token
          const tokens = m.tokens as Array<{ token_id: string }> | undefined;
          let ob: unknown = null;
          if (tokens?.length) {
            const obRes = await fetch(
              `${CLOB}/book?token_id=${tokens[0].token_id}`
            );
            if (obRes.ok) ob = await obRes.json();
          }
          return [m, ob];
        }
      ) as [Record<string, unknown>, unknown];

      const prices = market.outcomePrices
        ? (JSON.parse(market.outcomePrices as string) as string[])
        : [];
      const yesPct = prices[0]
        ? (parseFloat(prices[0]) * 100).toFixed(1)
        : "?";

      return widget({
        props: { market, orderbook },
        output: text(`${market.question ?? market.slug}: YES ${yesPct}%`),
      });
    } catch (e) {
      return error(
        `Failed to fetch market detail: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
);

server.listen().then(() => {
  console.log(`Server running`);
});
