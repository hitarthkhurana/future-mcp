import { MCPServer, error, text, widget } from "mcp-use/server";
import { z } from "zod";
import { getPredictionInsight } from "./api.js";

const server = new MCPServer({
  name: "future-mcp",
  title: "Future Insight",
  version: "1.0.0",
  description:
    "One query gives you the best live Polymarket + Kalshi signal, plus Grok's real-time X analysis in one unified view.",
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
      "For any event question, return the best Polymarket and Kalshi matches (if they exist) and a Grok analysis grounded in live X search.",
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
