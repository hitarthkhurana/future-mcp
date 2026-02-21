# Future Insight

One prompt. One prediction view.

`Future Insight` turns any event question into one fused snapshot: best-match Polymarket + Kalshi odds, plus one Grok analysis grounded in live X search.

## What This MCP App Does

- Exposes one tool: `get-prediction-insight`
- Input: natural language event question (example: `Who will Trump nominate as Fed Chair?`)
- Output: one unified widget with:
  - best Polymarket market (if found)
  - best Kalshi market (if found)
  - cross-market implied probability
  - Grok analysis using X search

## Why This Design

- Minimal cognitive load: users ask once and get the full view in one tool call.
- Practical workflow: market data + narrative explanation in one place.
- Demo clarity: no multi-step search/detail flow.

## Tool Contract

### `get-prediction-insight`

Input schema:

```ts
{
  query: string
}
```

Return payload (widget props):

```ts
{
  insight: {
    query: string
    eventTitle: string
    generatedAt: string
    consensusProbability: number | null
    polymarket: PolymarketMatch | null
    kalshi: KalshiMatch | null
    polymarketCandidates: PolymarketMatch[]
    kalshiCandidates: KalshiMatch[]
    grokAnalysis: string
  }
}
```

## Under-the-Hood Call Budget

Per invocation, the server targets exactly:

- 1 Polymarket call (`/public-search`)
- 1 Kalshi call (`/events?with_nested_markets=true&limit=200`)
- 1 xAI Grok call (`/responses` with `x_search`)

No news API calls. No second detail tool.

## Matching + Ranking (Simple and Deterministic)

- Normalize and tokenize query/title text.
- Score candidates using token overlap, jaccard similarity, phrase hit, and light volume boost.
- Keep top 3 candidates per source.
- Use a confidence threshold for the primary market; otherwise return `null` for that source.

## Widget UX

Widget: `prediction-insight`

- Consensus card (computed from selected source candidates)
- Side-by-side Polymarket and Kalshi cards
- Local source switching (Top match / alternatives) using widget state
- Grok analysis panel with expand/collapse
- Follow-up buttons (`Why moving?`, `Explain spread`)

## Environment

Required:

- `XAI_API_KEY` in `.env`

Optional:

- `XAI_MODEL` (defaults to `grok-4-1-fast-non-reasoning`)
- `MCP_URL`

## Run Locally

```bash
npm install
npm run dev
```

Inspector:

- `http://localhost:3000/inspector`

## APIs Used

- Polymarket Gamma API: `https://gamma-api.polymarket.com`
- Kalshi API: `https://api.elections.kalshi.com/trade-api/v2`
- xAI API: `https://api.x.ai/v1`
