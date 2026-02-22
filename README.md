# Future Insight — LLMs Can Now See the Future

> **What are the odds Trump gets impeached? Will OpenAI IPO before Anthropic? What does the market think about a Fed rate cut?**
>
> Before Future Insight, LLMs gave you a cautious non-answer. Now they give you live odds, market consensus, and real-time signals from X — all in one interactive widget.

Future Insight is an MCP app that gives LLMs what they usually lack: up-to-date world-state, social/cultural signal, and quantified event expectations in one interactive response.

## Why This Matters

LLMs are strong at reasoning, but weak at staying synced to live reality. Users asking about politics, products, creators, media moments, or macro events need three things together:

1. Fresh event context from the open web and X.
2. Real-time social and culture signal (what people are actually reacting to now).
3. A quantified expectation layer to anchor interpretation.

Future Insight combines those signals into one MCP tool call and one widget so responses are timely, explainable, continuously interactive, and materially more useful.

## App Interactivity

This is not a static report UI. The widget is designed for continuous interaction with minimal friction: users can refresh in place, inspect alternates, and trigger follow-up model reasoning directly from the interface (`useCallTool()` + `sendFollowUpMessage()`), instead of restarting the workflow each turn.

---

## The Problem

LLMs have a knowledge cutoff. When users ask about future events, models either hallucinate, hedge, or refuse entirely. They have no way to access:

- **Live prediction market odds** (what crowds are actually betting)
- **Real-time news and social signal** (what's moving markets right now)
- **Cross-market consensus** (do Polymarket and Kalshi agree?)

This leaves users with a safe, boring, incomplete answer.

## The Fix

Future Insight is an MCP server that plugs directly into ChatGPT (and any MCP-compatible LLM client). When a user asks anything about the future, the LLM calls our tool and renders a rich widget inline — no tab switching, no Googling, no guessing.

**One question. One widget. Complete picture.**

```
User: "What are the chances OpenAI IPOs before Anthropic?"

→ Polymarket: "Will Anthropic or OpenAI IPO first?" — 67.5% Anthropic
→ Kalshi:     "Will Open AI or Anthropic IPO first?" — 66.0% Anthropic  
→ Consensus:  66.8%
→ Grok:       Latest X posts, news headlines, and upcoming catalysts
```

---

## How It Works

### 1. LLM Auto-Detection
The server description is engineered so ChatGPT automatically invokes the tool whenever a user asks about odds, probabilities, elections, crypto, sports, IPOs, AI, or anything phrased as *"will X happen?"* or *"what are the chances of Y?"*

### 2. Smart Market Matching
We fetch the **top 500 Polymarket events** (~4,800 markets) and **all 200 Kalshi events** (~1,000 markets) and score them locally using token overlap, Jaccard similarity, and volume weighting. No brittle keyword search — full natural language queries work natively.

### 3. Real-Time X Intelligence via Grok
We call xAI's Grok with live X search to surface the freshest signal: relevant posts, breaking news, and upcoming catalysts that could move the market. Grok's job is news and sentiment — not market analysis, which the user can already see.

### 4. Interactive Widget
The widget renders inline inside ChatGPT with:
- Animated probability bars for Polymarket (blue) and Kalshi (green)
- Market consensus across both platforms
- Candidate switcher (Top match / Alt 1 / Alt 2) per source
- Clickable detail panels with full orderbook and stats
- Follow-up actions: **Why moving?**, **Explain spread**, **Deeper analysis**
- Fullscreen mode, star/watchlist, and refresh

---

## Architecture

```
User asks about future event
         │
         ▼
  ChatGPT calls get-prediction-insight(query)
         │
    ┌────┴──────────────────────────────────┐
    │                                       │
    ▼                                       ▼
Polymarket                              Kalshi
Top 500 events cached (5 min)      200 events cached (5 min)
+ keyword search fallback          Local scoring via matchScore()
Local scoring via matchScore()
    │                                       │
    └────────────────┬──────────────────────┘
                     │
                     ▼
              xAI Grok (x_search)
         X pulse + news + catalysts
                     │
                     ▼
           Widget rendered inline
    Polymarket bar | Kalshi bar | Grok analysis
```

---

## Tool

### `get-prediction-insight`

**Input:**
```ts
{ query: string }
```

**Output widget props:**
```ts
{
  insight: {
    query: string
    eventTitle: string
    generatedAt: string
    consensusProbability: number | null
    polymarket: PolymarketMatch | null        // best match
    kalshi: KalshiMatch | null               // best match
    polymarketCandidates: PolymarketMatch[]  // top 3
    kalshiCandidates: KalshiMatch[]          // top 3
    grokAnalysis: string                     // real-time X analysis
  }
}
```

---

## Setup

### Environment
```bash
# Required
XAI_API_KEY=your_key_here

# Optional
XAI_MODEL=grok-4-1-fast-non-reasoning
MCP_URL=https://your-tunnel-url  # for ngrok/cloudflare tunnel
```

### Run Locally
```bash
npm install
npm run dev
# Inspector: http://localhost:3000/inspector
```

### Add to ChatGPT
1. Deploy to a public URL (e.g. Railway, Render, Fly.io)
2. In ChatGPT → Settings → Connected Apps → Add MCP Server
3. Enter your server URL
4. Ask anything about the future

---

## Data Sources

| Source | Endpoint | Cache |
|---|---|---|
| Polymarket | `gamma-api.polymarket.com/events` | 5 min |
| Kalshi | `api.elections.kalshi.com/trade-api/v2/events` | 5 min |
| xAI Grok | `api.x.ai/v1/responses` (with `x_search`) | None (always live) |

No API keys needed for Polymarket or Kalshi. Only `XAI_API_KEY` is required.

---

## Why Prediction Markets?

Prediction markets are the most information-dense signal available for future events. Unlike polls or pundit takes, they aggregate real money — people putting stakes on their actual beliefs. Combined with Grok's live X search, Future Insight gives LLMs something they've never had: **grounded, quantified, real-time context about the future**.

LLMs don't have to say *"I don't know"* anymore.
