import type {
  KalshiMatch,
  KalshiRawEvent,
  KalshiRawMarket,
  PolymarketMatch,
  PolymarketRawMarket,
  PredictionInsight,
} from "./types.js";

const GAMMA = "https://gamma-api.polymarket.com";
const KALSHI = "https://api.elections.kalshi.com/trade-api/v2";
const XAI = "https://api.x.ai/v1";
const GROK_SYSTEM_PROMPT =
  "You are a real-time news and social intelligence assistant. " +
  "Your job is to surface fresh signal from X and the web — NOT to analyze market odds or probabilities. " +
  "Use at most 2 search tool calls. Be concise and specific: include real post excerpts, dates, and named sources where possible.";

const cache = new Map<string, { data: unknown; expires: number }>();
const TTL_SHORT = 30_000;
const TTL_LONG = 300_000;

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "have",
  "how",
  "in",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "that",
  "the",
  "their",
  "to",
  "was",
  "what",
  "when",
  "where",
  "who",
  "will",
  "with",
]);

async function cached<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>
): Promise<T> {
  const entry = cache.get(key);
  if (entry && entry.expires > Date.now()) {
    return entry.data as T;
  }
  const data = await fn();
  cache.set(key, { data, expires: Date.now() + ttlMs });
  return data;
}

function toNumber(raw: unknown): number {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  if (typeof raw === "string") {
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): Set<string> {
  const normalized = normalize(text);
  if (!normalized) return new Set();
  return new Set(
    normalized
      .split(" ")
      .filter((token) => token.length > 1 && !STOP_WORDS.has(token))
  );
}

function overlapCount(a: Set<string>, b: Set<string>): number {
  let count = 0;
  for (const token of a) {
    if (b.has(token)) count += 1;
  }
  return count;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  const overlap = overlapCount(a, b);
  const union = new Set([...a, ...b]).size;
  return union > 0 ? overlap / union : 0;
}

function matchScore(query: string, title: string, volume: number): number {
  const queryTokens = tokenize(query);
  const titleTokens = tokenize(title);
  if (!queryTokens.size || !titleTokens.size) return 0;

  const overlap = overlapCount(queryTokens, titleTokens);
  const minOverlap = queryTokens.size >= 4 ? 2 : 1;
  const normalizedQuery = normalize(query);
  const normalizedTitle = normalize(title);
  const phraseHit =
    normalizedQuery.length >= 6 &&
    (normalizedTitle.includes(normalizedQuery) ||
      normalizedQuery.includes(normalizedTitle));

  if (overlap < minOverlap && !phraseHit) return 0;

  const tokenCoverage = overlap / queryTokens.size;
  const jaccardScore = jaccard(queryTokens, titleTokens);
  const phraseBonus = phraseHit ? 0.18 : 0;
  const volumeBoost = Math.min(0.1, Math.log10(1 + Math.max(0, volume)) / 30);

  return tokenCoverage * 0.58 + jaccardScore * 0.24 + phraseBonus + volumeBoost;
}

function isOpenEndedOutcomeQuery(query: string): boolean {
  const normalized = normalize(query);
  return (
    normalized.startsWith("who ") ||
    normalized.includes("who will") ||
    normalized.startsWith("which ") ||
    normalized.includes("which candidate")
  );
}

function parseJsonArray(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((v) => String(v));
  } catch {
    return [];
  }
}

function parsePolymarketProbability(market: PolymarketRawMarket): {
  probability: number;
  label: string;
} | null {
  const prices = parseJsonArray(market.outcomePrices).map((v) => toNumber(v));
  if (!prices.length) return null;

  const outcomes = parseJsonArray(market.outcomes);
  const yesIndex = outcomes.findIndex((outcome) => outcome.toLowerCase() === "yes");

  if (yesIndex >= 0 && yesIndex < prices.length) {
    const prob = prices[yesIndex];
    if (prob >= 0 && prob <= 1) {
      return { probability: prob, label: "YES" };
    }
  }

  let topIndex = 0;
  for (let i = 1; i < prices.length; i += 1) {
    if (prices[i] > prices[topIndex]) topIndex = i;
  }
  const topProb = prices[topIndex];
  if (topProb < 0 || topProb > 1) return null;

  const label = (outcomes[topIndex] ?? "Top outcome").toUpperCase();
  return { probability: topProb, label };
}

async function fetchPolymarketSearch(query: string): Promise<PolymarketRawMarket[]> {
  return cached(`pm:search:${query}`, TTL_SHORT, async () => {
    try {
      const response = await fetch(
        `${GAMMA}/public-search?q=${encodeURIComponent(query)}&limit=8`
      );
      if (!response.ok) return [];
      const data = (await response.json()) as {
        events?: Array<{ markets?: PolymarketRawMarket[] }>;
      };

      const markets: PolymarketRawMarket[] = [];
      for (const event of data.events ?? []) {
        for (const market of event.markets ?? []) {
          if (market.active === true && market.closed === false) {
            markets.push(market);
          }
        }
      }
      return markets;
    } catch {
      return [];
    }
  });
}

function buildPolymarketCandidates(
  query: string,
  markets: PolymarketRawMarket[]
): PolymarketMatch[] {
  const candidates: PolymarketMatch[] = [];

  for (const market of markets) {
    const title = market.question?.trim();
    const slug = market.slug?.trim();
    if (!title || !slug) continue;

    const parsed = parsePolymarketProbability(market);
    if (!parsed) continue;

    const volume = toNumber(market.volume);
    const score = matchScore(query, title, volume);
    if (score <= 0) continue;

    candidates.push({
      title,
      slug,
      probability: parsed.probability,
      probabilityLabel: parsed.label,
      volume,
      liquidity: toNumber(market.liquidity),
      endDate: market.endDate ?? null,
      url: `https://polymarket.com/event/${slug}`,
      score,
    });
  }

  candidates.sort(
    (a, b) =>
      b.score - a.score ||
      b.probability - a.probability ||
      b.volume - a.volume
  );
  return candidates.slice(0, 3);
}

function pickPrimaryPolymarket(
  query: string,
  candidates: PolymarketMatch[]
): PolymarketMatch | null {
  if (!candidates.length) return null;
  const confident = candidates.filter((candidate) => candidate.score >= 0.34);
  if (!confident.length) return null;

  if (isOpenEndedOutcomeQuery(query)) {
    return [...confident].sort(
      (a, b) => b.probability - a.probability || b.score - a.score
    )[0];
  }

  return confident[0];
}

async function fetchKalshiEvents(): Promise<KalshiRawEvent[]> {
  return cached("kalshi:events", TTL_LONG, async () => {
    try {
      const response = await fetch(
        `${KALSHI}/events?with_nested_markets=true&limit=200`
      );
      if (!response.ok) return [];
      const data = (await response.json()) as { events?: KalshiRawEvent[] };
      return data.events ?? [];
    } catch {
      return [];
    }
  });
}

function priceFromKalshiMarket(market: KalshiRawMarket): number {
  const last = toNumber(market.last_price_dollars);
  if (last > 0) return last;

  const bid = toNumber(market.yes_bid_dollars);
  const ask = toNumber(market.yes_ask_dollars);
  if (bid > 0 && ask > 0) return (bid + ask) / 2;
  return 0;
}

function buildKalshiCandidates(
  query: string,
  events: KalshiRawEvent[]
): KalshiMatch[] {
  const candidates: KalshiMatch[] = [];

  for (const event of events) {
    const activeMarkets = (event.markets ?? []).filter(
      (market) => market.status === "active" || market.status === "open"
    );
    if (!activeMarkets.length) continue;
    const eventVolume = activeMarkets.reduce(
      (sum, market) => sum + toNumber(market.volume),
      0
    );
    const eventScore = matchScore(query, event.title, eventVolume);

    for (const market of activeMarkets) {
      if (!market.title || market.title.length > 220) continue;

      const probability = priceFromKalshiMarket(market);
      if (probability <= 0 || probability > 1) continue;

      const marketVolume = toNumber(market.volume);
      const marketScore = matchScore(query, market.title, marketVolume);
      const score = Math.max(eventScore, marketScore);
      if (score <= 0) continue;

      const outcomeLabel =
        activeMarkets.length > 1
          ? (market.yes_sub_title ?? market.subtitle ?? "").trim() || "YES"
          : "YES";

      candidates.push({
        title: market.title,
        ticker: market.ticker,
        eventTicker: event.event_ticker,
        probability,
        probabilityLabel: outcomeLabel,
        volume: marketVolume,
        volume24h: toNumber(market.volume_24h),
        openInterest: toNumber(market.open_interest),
        closeTime: market.close_time ?? market.expected_expiration_time ?? null,
        yesBid: String(market.yes_bid_dollars ?? "0"),
        yesAsk: String(market.yes_ask_dollars ?? "0"),
        url: `https://kalshi.com/markets/${event.event_ticker}`,
        score,
      });
    }
  }

  candidates.sort(
    (a, b) =>
      b.score - a.score ||
      b.probability - a.probability ||
      b.volume - a.volume
  );
  return candidates.slice(0, 3);
}

function pickPrimaryKalshi(
  query: string,
  candidates: KalshiMatch[]
): KalshiMatch | null {
  if (!candidates.length) return null;
  const confident = candidates.filter((candidate) => candidate.score >= 0.34);
  if (!confident.length) return null;

  if (isOpenEndedOutcomeQuery(query)) {
    return [...confident].sort(
      (a, b) => b.probability - a.probability || b.score - a.score
    )[0];
  }

  return confident[0];
}

function computeConsensus(
  polymarket: PolymarketMatch | null,
  kalshi: KalshiMatch | null
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

function buildGrokPrompt(
  query: string,
  polymarket: PolymarketMatch | null,
  kalshi: KalshiMatch | null,
  polymarketCandidates: PolymarketMatch[],
  kalshiCandidates: KalshiMatch[]
): string {
  const lines: string[] = [];
  lines.push(`User query: ${query}`);
  lines.push("");
  lines.push("Prediction market snapshot:");

  if (polymarket) {
    lines.push(
      `- Polymarket primary: ${polymarket.title} | ${(
        polymarket.probability * 100
      ).toFixed(1)}% ${polymarket.probabilityLabel} | volume ${polymarket.volume.toFixed(
        0
      )} | score ${polymarket.score.toFixed(2)}`
    );
  } else {
    lines.push("- Polymarket primary: no confident match");
  }

  if (kalshi) {
    lines.push(
      `- Kalshi primary: ${kalshi.title} | ${(kalshi.probability * 100).toFixed(
        1
      )}% ${kalshi.probabilityLabel} | volume ${kalshi.volume.toFixed(
        0
      )} | score ${kalshi.score.toFixed(2)}`
    );
  } else {
    lines.push("- Kalshi primary: no confident match");
  }

  if (polymarketCandidates.length > 1) {
    lines.push(
      `- Other Polymarket candidates: ${polymarketCandidates
        .slice(1)
        .map((candidate) =>
          `${candidate.title} (${(candidate.probability * 100).toFixed(1)}% ${
            candidate.probabilityLabel
          })`
        )
        .join("; ")}`
    );
  }

  if (kalshiCandidates.length > 1) {
    lines.push(
      `- Other Kalshi candidates: ${kalshiCandidates
        .slice(1)
        .map((candidate) =>
          `${candidate.title} (${(candidate.probability * 100).toFixed(1)}% ${candidate.probabilityLabel})`
        )
        .join("; ")}`
    );
  }

  lines.push("");
  lines.push(
    "Task: Use X search to surface the freshest real-world signal on this question. " +
    "Do NOT interpret or explain the market odds — the user can see those already. " +
    "Focus entirely on what is happening in the real world RIGHT NOW."
  );
  lines.push("Return exactly three short sections:");
  lines.push("1) X pulse: most relevant posts/sentiment on X in the last 48 hours, with approximate dates");
  lines.push("2) Latest news: key headlines or developments driving this question today");
  lines.push("3) Catalysts: specific upcoming events, dates, or triggers that could move this market");

  return lines.join("\n");
}

function parseResponseText(payload: unknown): string {
  const data = payload as {
    output_text?: unknown;
    output?: Array<{
      type?: string;
      role?: string;
      content?: Array<{ type?: string; text?: string }>;
    }>;
    choices?: Array<{ message?: { content?: string } }>;
  };

  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text;
  }

  for (const item of data.output ?? []) {
    if (item.type === "message" && item.role === "assistant") {
      for (const chunk of item.content ?? []) {
        if (chunk.type === "output_text" && typeof chunk.text === "string") {
          if (chunk.text.trim()) return chunk.text;
        }
      }
    }
  }

  const fallback = data.choices?.[0]?.message?.content;
  if (fallback && fallback.trim()) return fallback;

  return "Grok returned no analysis text.";
}

function countInlineCitations(payload: unknown): number {
  const data = payload as {
    output?: Array<{
      type?: string;
      role?: string;
      content?: Array<{ annotations?: Array<{ type?: string }> }>;
    }>;
  };

  let count = 0;
  for (const item of data.output ?? []) {
    if (item.type !== "message" || item.role !== "assistant") continue;
    for (const chunk of item.content ?? []) {
      for (const annotation of chunk.annotations ?? []) {
        if (annotation.type === "url_citation") count += 1;
      }
    }
  }
  return count;
}

function summarizeToolCalls(payload: unknown): string {
  const data = payload as {
    output?: Array<{ type?: string; status?: string; name?: string }>;
  };
  let xSearchCalls = 0;
  let webSearchCalls = 0;
  let otherCustomCalls = 0;

  for (const item of data.output ?? []) {
    if (item.status !== "completed") continue;
    if (item.type === "x_search_call") xSearchCalls += 1;
    if (item.type === "web_search_call") webSearchCalls += 1;
    if (item.type === "custom_tool_call") {
      const toolName = (item.name ?? "").toLowerCase();
      if (toolName.startsWith("x_")) {
        xSearchCalls += 1;
      } else if (toolName.includes("web") || toolName.includes("browse")) {
        webSearchCalls += 1;
      } else {
        otherCustomCalls += 1;
      }
    }
  }

  return `x_search=${xSearchCalls} web_search=${webSearchCalls} other_custom=${otherCustomCalls}`;
}

async function callGrok(
  query: string,
  polymarket: PolymarketMatch | null,
  kalshi: KalshiMatch | null,
  polymarketCandidates: PolymarketMatch[],
  kalshiCandidates: KalshiMatch[]
): Promise<string> {
  const startMs = Date.now();
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return "Grok unavailable: XAI_API_KEY is not configured.";
  }

  const model = process.env.XAI_MODEL || "grok-4-1-fast-non-reasoning";
  const fromDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const prompt = buildGrokPrompt(
    query,
    polymarket,
    kalshi,
    polymarketCandidates,
    kalshiCandidates
  );
  console.info(`[grok] model=${model} tools=x_search,web_search query="${query}"`);

  try {
    const response = await fetch(`${XAI}/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_output_tokens: 500,
        max_tool_calls: 4,
        tools: [{ type: "x_search", from_date: fromDate }, { type: "web_search" }],
        input: [
          { role: "system", content: GROK_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      return `Grok unavailable (${response.status}): ${body.slice(0, 220)}`;
    }

    const payload = (await response.json()) as unknown;
    const inlineCitations = countInlineCitations(payload);
    const toolSummary = summarizeToolCalls(payload);
    console.info(
      `[grok] status=${(payload as { status?: unknown }).status ?? "unknown"} ${toolSummary} citations=${inlineCitations} elapsed_ms=${Date.now() - startMs}`
    );
    return parseResponseText(payload);
  } catch (err) {
    return `Grok unavailable: ${err instanceof Error ? err.message : "unknown error"}`;
  }
}

export async function getPredictionInsight(query: string): Promise<PredictionInsight> {
  const startMs = Date.now();
  console.info(`[insight] start query="${query}"`);

  const sourceStart = Date.now();
  const [polymarketRawMarkets, kalshiRawEvents] = await Promise.all([
    fetchPolymarketSearch(query),
    fetchKalshiEvents(),
  ]);
  console.info(
    `[insight] sources pm_markets=${polymarketRawMarkets.length} kalshi_events=${kalshiRawEvents.length} elapsed_ms=${Date.now() - sourceStart}`
  );

  const rankStart = Date.now();
  const polymarketCandidates = buildPolymarketCandidates(query, polymarketRawMarkets);
  const kalshiCandidates = buildKalshiCandidates(query, kalshiRawEvents);
  console.info(
    `[insight] ranked pm_candidates=${polymarketCandidates.length} kalshi_candidates=${kalshiCandidates.length} elapsed_ms=${Date.now() - rankStart}`
  );

  const polymarket = pickPrimaryPolymarket(query, polymarketCandidates);
  const kalshi = pickPrimaryKalshi(query, kalshiCandidates);
  const consensusProbability = computeConsensus(polymarket, kalshi);

  const grokStart = Date.now();
  const grokAnalysis = await callGrok(
    query,
    polymarket,
    kalshi,
    polymarketCandidates,
    kalshiCandidates
  );
  console.info(`[insight] grok elapsed_ms=${Date.now() - grokStart}`);
  console.info(`[insight] total elapsed_ms=${Date.now() - startMs}`);

  return {
    query,
    eventTitle: polymarket?.title ?? kalshi?.title ?? query,
    generatedAt: new Date().toISOString(),
    consensusProbability,
    polymarket,
    kalshi,
    polymarketCandidates,
    kalshiCandidates,
    grokAnalysis,
  };
}
