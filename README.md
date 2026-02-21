# future-mcp — Polymarket MCP Server

Live prediction market data from [Polymarket](https://polymarket.com) served as interactive React widgets inside ChatGPT and other MCP-compatible clients.

## Tools

| Tool | Description |
|------|-------------|
| `search-markets` | Search active Polymarket markets by topic — returns live Yes/No prices |
| `get-trending-markets` | Top markets by 24hr trading volume |
| `get-market-detail` | Full detail for a specific market: probability bars, live orderbook, stats |

## Widgets

| Widget | Description |
|--------|-------------|
| `market-list` | Card grid with Yes/No price pills, probability bar, volume, end date |
| `market-detail` | Full view with probability bars, top-5 orderbook, stats, Polymarket link |

## Running locally

```bash
npm install
npm run dev
```

Inspector at: `http://localhost:3000/inspector`

## APIs used

- **Gamma API** (`gamma-api.polymarket.com`) — market discovery & search
- **CLOB API** (`clob.polymarket.com`) — live orderbook data

No authentication required for any of these endpoints.
