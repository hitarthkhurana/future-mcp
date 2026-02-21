export interface PolymarketRawMarket {
  slug?: string;
  question?: string;
  description?: string;
  outcomes?: string;
  outcomePrices?: string;
  volume?: string | number;
  liquidity?: string | number | null;
  endDate?: string;
  active?: boolean;
  closed?: boolean;
  [key: string]: unknown;
}

export interface KalshiRawMarket {
  ticker: string;
  event_ticker: string;
  title: string;
  subtitle?: string;
  yes_sub_title?: string;
  no_sub_title?: string;
  status: string;
  close_time?: string;
  expected_expiration_time?: string;
  yes_bid_dollars?: string;
  yes_ask_dollars?: string;
  last_price_dollars?: string;
  volume?: number;
  volume_24h?: number;
  open_interest?: number;
  [key: string]: unknown;
}

export interface KalshiRawEvent {
  event_ticker: string;
  title: string;
  sub_title?: string;
  category?: string;
  markets?: KalshiRawMarket[];
  [key: string]: unknown;
}

export interface PolymarketMatch {
  title: string;
  slug: string;
  probability: number;
  probabilityLabel: string;
  volume: number;
  liquidity: number;
  endDate: string | null;
  url: string;
  score: number;
}

export interface KalshiMatch {
  title: string;
  ticker: string;
  eventTicker: string;
  probability: number;
  probabilityLabel: string;
  volume: number;
  volume24h: number;
  openInterest: number;
  closeTime: string | null;
  yesBid: string;
  yesAsk: string;
  url: string;
  score: number;
}

export interface PredictionInsight {
  query: string;
  eventTitle: string;
  generatedAt: string;
  consensusProbability: number | null;
  polymarket: PolymarketMatch | null;
  kalshi: KalshiMatch | null;
  polymarketCandidates: PolymarketMatch[];
  kalshiCandidates: KalshiMatch[];
  grokAnalysis: string;
}
