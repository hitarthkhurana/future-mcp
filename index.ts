import { MCPServer, error, text, widget } from "mcp-use/server";
import { z } from "zod";
import { getPredictionInsight } from "./api.js";

const server = new MCPServer({
  name: "future-mcp",
  title: "Future Insight",
  version: "1.0.0",
  description:
    "One query gives you live prediction market odds from Polymarket and Kalshi plus Grok's real-time X analysis in one unified widget. " +
    "Automatically invoke this whenever a user asks about: odds, probabilities, chances of future events; " +
    "elections, political outcomes, who will win; crypto prices, IPOs, economic indicators; " +
    "sports outcomes, AI developments, geopolitics, or anything phrased as 'will X happen?' or 'what are the chances of Y?'",
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

function pct(raw: number): string {
  return `${(raw * 100).toFixed(1)}%`;
}

function compactVolume(raw: number): string {
  if (raw >= 1_000_000) return `$${(raw / 1_000_000).toFixed(1)}M`;
  if (raw >= 1_000) return `$${(raw / 1_000).toFixed(1)}K`;
  return `$${raw.toFixed(0)}`;
}

server.tool(
  {
    name: "get-prediction-insight",
    description:
      "For any future event question, fetches the best matching prediction market from Polymarket and Kalshi (showing live odds) plus a Grok analysis grounded in real-time X search. " +
      "Use this whenever someone asks about odds, probabilities, or likelihood of future events — elections, crypto, sports, IPOs, AI, geopolitics, policy — or phrases like 'will X happen?' or 'what do markets think about Y?'",
    schema: z.object({
      query: z
        .string()
        .min(3)
        .describe(
          "Natural language event question, e.g. 'Who will Trump nominate as Fed Chair?'"
        ),
    }),
    widget: {
      name: "prediction-insight",
      invoking: "Building prediction insight...",
      invoked: "Insight ready",
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ query }) => {
    try {
      const insight = await getPredictionInsight(query);

      const lines: string[] = [];
      lines.push(`Query: ${insight.query}`);
      lines.push(`Event: ${insight.eventTitle}`);

      if (insight.consensusProbability !== null) {
        lines.push(`Consensus: ${pct(insight.consensusProbability)}`);
      } else {
        lines.push("Consensus: unavailable (no confident market match)");
      }

      if (insight.polymarket) {
        lines.push(
          `Polymarket: ${pct(insight.polymarket.probability)} ${
            insight.polymarket.probabilityLabel
          } | vol ${compactVolume(insight.polymarket.volume)}`
        );
      } else {
        lines.push("Polymarket: no confident match");
      }

      if (insight.kalshi) {
        lines.push(
          `Kalshi: ${pct(insight.kalshi.probability)} ${insight.kalshi.probabilityLabel} | vol ${insight.kalshi.volume.toLocaleString()} contracts`
        );
      } else {
        lines.push("Kalshi: no confident match");
      }

      lines.push("");
      lines.push(`Grok: ${insight.grokAnalysis.slice(0, 420)}${insight.grokAnalysis.length > 420 ? "..." : ""}`);

      return widget({
        props: { insight },
        output: text(lines.join("\n")),
      });
    } catch (e) {
      return error(
        `Failed to generate prediction insight: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
);

server.listen().then(() => {
  console.log("Server running");
});
