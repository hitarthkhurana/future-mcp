import { ProbBar, formatDate, formatVolume, type Colors } from "../../../shared";
import { K_GREEN, K_GREEN_DARK, PM_BLUE, PM_BLUE_DARK } from "../constants";
import { useOrderbook } from "../hooks/useOrderbook";
import type { KalshiData, PolymarketData } from "../types";

function OrderbookSection({
  bids,
  asks,
  colors,
}: {
  bids: Array<{ price: string; size: string }>;
  asks: Array<{ price: string; size: string }>;
  colors: Colors;
}) {
  if (!Math.max(bids.length, asks.length)) return null;

  return (
    <div
      className="flex flex-col gap-1.5"
      style={{
        ["--yes" as string]: colors.yes,
        ["--no" as string]: colors.no,
        ["--muted" as string]: colors.textSecondary,
      }}
    >
      <span className="text-[10px] font-bold uppercase tracking-[0.04em] text-[var(--muted)]">
        Live Orderbook (YES token)
      </span>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="flex flex-col gap-[3px]">
          <span className="text-[10px] font-semibold text-[var(--yes)]">Bids</span>
          {bids.slice(0, 5).map((bid, idx) => (
            <div key={`bid-${idx}`} className="flex justify-between text-[var(--yes)]">
              <span>{parseFloat(bid.price).toFixed(3)}</span>
              <span className="text-[var(--muted)]">{parseFloat(bid.size).toFixed(0)}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-[3px]">
          <span className="text-[10px] font-semibold text-[var(--no)]">Asks</span>
          {asks.slice(0, 5).map((ask, idx) => (
            <div key={`ask-${idx}`} className="flex justify-between text-[var(--no)]">
              <span>{parseFloat(ask.price).toFixed(3)}</span>
              <span className="text-[var(--muted)]">{parseFloat(ask.size).toFixed(0)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatGrid({
  items,
  cols,
  colors,
}: {
  items: Array<{ label: string; value: string }>;
  cols: "two" | "three";
  colors: Colors;
}) {
  return (
    <div
      className={`grid gap-2 ${cols === "three" ? "grid-cols-3" : "grid-cols-2"}`}
      style={{
        ["--border" as string]: colors.border,
        ["--surface" as string]: colors.bgSurface,
        ["--text" as string]: colors.text,
        ["--muted" as string]: colors.textSecondary,
      }}
    >
      {items.map(({ label, value }) => (
        <div
          key={label}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-center"
        >
          <p className="mb-0.5 mt-0 text-[10px] text-[var(--muted)]">{label}</p>
          <p className="m-0 text-[13px] font-semibold text-[var(--text)]">{value}</p>
        </div>
      ))}
    </div>
  );
}

export function DetailPanel({
  side,
  pm,
  kalshi,
  onClose,
  onTrade,
  colors,
}: {
  side: "pm" | "kalshi";
  pm: PolymarketData | null;
  kalshi: KalshiData | null;
  onClose: () => void;
  onTrade: (url: string) => void;
  colors: Colors;
}) {
  const dark = colors.bg === "#1a1a1a";
  const { bids, asks, isLoading } = useOrderbook(side, pm?.slug);

  if (side === "pm" && pm) {
    const pmColor = dark ? PM_BLUE_DARK : PM_BLUE;

    return (
      <div
        className="flex flex-col gap-3 rounded-xl border p-4"
        style={{
          borderColor: `${pmColor}40`,
          backgroundColor: dark ? "rgba(46,92,255,0.05)" : "rgba(46,92,255,0.03)",
          ["--accent" as string]: pmColor,
          ["--text" as string]: colors.text,
          ["--muted" as string]: colors.textSecondary,
          ["--border" as string]: colors.border,
          ["--yes" as string]: colors.yes,
          ["--no" as string]: colors.no,
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--accent)]">
              Polymarket · Detail
            </span>
            <p className="m-0 text-[13px] font-semibold leading-[1.4] text-[var(--text)]">{pm.title}</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-md border border-[var(--border)] px-2 py-[3px] text-xs text-[var(--muted)]"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <ProbBar
            label="YES"
            pct={pm.probability * 100}
            barColor={colors.yesBar}
            trackColor={colors.barTrack}
            textColor={colors.yes}
          />
          <ProbBar
            label="NO"
            pct={(1 - pm.probability) * 100}
            barColor={colors.noBar}
            trackColor={colors.barTrack}
            textColor={colors.no}
          />
        </div>

        <StatGrid
          cols="three"
          colors={colors}
          items={[
            { label: "Volume", value: formatVolume(pm.volume) },
            { label: "Liquidity", value: formatVolume(pm.liquidity) },
            { label: "Ends", value: formatDate(pm.endDate) },
          ]}
        />

        {isLoading ? (
          <p className="m-0 text-[11px] text-[var(--muted)]">Loading orderbook…</p>
        ) : (
          <OrderbookSection bids={bids} asks={asks} colors={colors} />
        )}

        <button
          onClick={() => onTrade(pm.url)}
          className="rounded-[10px] bg-[var(--accent)] px-4 py-[9px] text-[13px] font-semibold text-white"
        >
          Trade on Polymarket ↗
        </button>
      </div>
    );
  }

  if (side === "kalshi" && kalshi) {
    const kColor = dark ? K_GREEN_DARK : K_GREEN;
    const bid = parseFloat(kalshi.yesBid);
    const ask = parseFloat(kalshi.yesAsk);
    const spread = ask > 0 && bid > 0 ? (ask - bid).toFixed(3) : "—";

    return (
      <div
        className="flex flex-col gap-3 rounded-xl border p-4"
        style={{
          borderColor: `${kColor}40`,
          backgroundColor: dark ? "rgba(38,196,133,0.05)" : "rgba(38,196,133,0.03)",
          ["--accent" as string]: kColor,
          ["--text" as string]: colors.text,
          ["--muted" as string]: colors.textSecondary,
          ["--border" as string]: colors.border,
          ["--yes" as string]: colors.yes,
          ["--no" as string]: colors.no,
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--accent)]">
              Kalshi · Detail
            </span>
            <p className="m-0 text-[13px] font-semibold leading-[1.4] text-[var(--text)]">{kalshi.title}</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-md border border-[var(--border)] px-2 py-[3px] text-xs text-[var(--muted)]"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <ProbBar
            label="YES"
            pct={kalshi.probability * 100}
            barColor={kColor}
            trackColor={colors.barTrack}
            textColor={kColor}
          />
          <ProbBar
            label="NO"
            pct={(1 - kalshi.probability) * 100}
            barColor={colors.noBar}
            trackColor={colors.barTrack}
            textColor={colors.no}
          />
        </div>

        <StatGrid
          cols="two"
          colors={colors}
          items={[
            { label: "Volume", value: formatVolume(kalshi.volume) },
            { label: "24h Volume", value: formatVolume(kalshi.volume24h) },
            { label: "Open Interest", value: kalshi.openInterest.toLocaleString() },
            { label: "Closes", value: formatDate(kalshi.closeTime) },
          ]}
        />

        <div className="grid grid-cols-3 gap-1 rounded-lg border border-[var(--border)] p-2.5 text-center">
          {[
            { label: "Best Bid", value: bid > 0 ? bid.toFixed(3) : "—", color: colors.yes },
            { label: "Spread", value: spread, color: colors.textSecondary },
            { label: "Best Ask", value: ask > 0 ? ask.toFixed(3) : "—", color: colors.no },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <p className="mb-0.5 mt-0 text-[10px] text-[var(--muted)]">{label}</p>
              <p className="m-0 text-[13px] font-bold" style={{ color }}>
                {value}
              </p>
            </div>
          ))}
        </div>

        <button
          onClick={() => onTrade(kalshi.url)}
          className="rounded-[10px] bg-[var(--accent)] px-4 py-[9px] text-[13px] font-semibold text-white"
        >
          Trade on Kalshi ↗
        </button>
      </div>
    );
  }

  return null;
}
