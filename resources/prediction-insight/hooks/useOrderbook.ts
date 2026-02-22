import { useEffect, useState } from "react";
import { CLOB, GAMMA } from "../constants";

export type OrderLevel = { price: string; size: string };

export function useOrderbook(side: "pm" | "kalshi", slug?: string) {
  const [bids, setBids] = useState<OrderLevel[]>([]);
  const [asks, setAsks] = useState<OrderLevel[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (side !== "pm" || !slug) {
      setBids([]);
      setAsks([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setBids([]);
      setAsks([]);

      try {
        const marketsRes = await fetch(`${GAMMA}/markets?slug=${encodeURIComponent(slug)}`);
        if (!marketsRes.ok) return;

        const markets = (await marketsRes.json()) as Array<{
          tokens?: Array<{ token_id: string }>;
        }>;
        const tokenId = markets?.[0]?.tokens?.[0]?.token_id;
        if (!tokenId) return;

        const bookRes = await fetch(`${CLOB}/book?token_id=${tokenId}`);
        if (!bookRes.ok) return;

        const data = (await bookRes.json()) as {
          bids?: OrderLevel[];
          asks?: OrderLevel[];
        };

        if (!cancelled) {
          setBids(data.bids ?? []);
          setAsks(data.asks ?? []);
        }
      } catch {
        if (!cancelled) {
          setBids([]);
          setAsks([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [side, slug]);

  return { bids, asks, isLoading };
}
