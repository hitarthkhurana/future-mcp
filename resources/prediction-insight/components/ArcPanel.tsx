import { ProbArc, formatVolume, type Colors } from "../../../shared";
import { K_GREEN, K_GREEN_DARK, PM_BLUE, PM_BLUE_DARK } from "../constants";
import type { KalshiData, PolymarketData } from "../types";

function MarketArcCard({
  side,
  color,
  trackColor,
  title,
  subtitle,
  stat,
  pct,
  label,
  selected,
  onToggle,
  onTrade,
  activeBg,
  hoverBg,
}: {
  side: "pm" | "kalshi";
  color: string;
  trackColor: string;
  title: string;
  subtitle: string;
  stat: string;
  pct: number;
  label: string;
  selected: boolean;
  onToggle: () => void;
  onTrade: () => void;
  activeBg: string;
  hoverBg: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="group flex flex-col items-center gap-2 rounded-[10px] p-3 text-center transition-colors"
      style={{
        ["--accent" as string]: color,
        ["--active-bg" as string]: activeBg,
        ["--hover-bg" as string]: hoverBg,
        ["--track" as string]: trackColor,
        ["--card-bg" as string]: selected ? activeBg : "transparent",
        ["outline" as string]: selected ? `2px solid ${color}` : "none",
        ["outlineOffset" as string]: "-2px",
        backgroundColor: selected ? activeBg : "transparent",
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.backgroundColor = hoverBg;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = selected ? activeBg : "transparent";
      }}
    >
      <ProbArc pct={pct} color={color} trackColor={trackColor} label={label} size={108} />
      <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--accent)]">
        {title}
      </span>
      <span className="max-w-[140px] text-center text-[11px] leading-[1.35] text-[var(--muted)]">
        {subtitle.length > 55 ? `${subtitle.slice(0, 55)}…` : subtitle}
      </span>
      <span className="text-[10px] text-[var(--muted)]">{stat}</span>

      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTrade();
          }}
          className="rounded-[7px] bg-[var(--accent)] px-2.5 py-[5px] text-[11px] font-semibold text-white"
        >
          Trade ↗
        </button>
        <span className="flex items-center text-[10px] text-[var(--accent)]">
          {selected ? "▲ Hide" : "Details ▼"}
        </span>
      </div>
    </button>
  );
}

export function ArcPanel({
  polymarket,
  kalshi,
  consensus,
  colors,
  onTrade,
  expandedDetail,
  onSelectDetail,
}: {
  polymarket: PolymarketData | null;
  kalshi: KalshiData | null;
  consensus: number | null;
  colors: Colors;
  onTrade: (url: string) => void;
  expandedDetail: "pm" | "kalshi" | null;
  onSelectDetail: (side: "pm" | "kalshi" | null) => void;
}) {
  const dark = colors.bg === "#1a1a1a";
  const pmColor = dark ? PM_BLUE_DARK : PM_BLUE;
  const kColor = dark ? K_GREEN_DARK : K_GREEN;
  const pmTrack = dark ? "rgba(107,135,255,0.18)" : "rgba(46,92,255,0.1)";
  const kTrack = dark ? "rgba(77,217,160,0.18)" : "rgba(38,196,133,0.1)";

  if (!polymarket && !kalshi) {
    return (
      <div
        className="rounded-xl border border-dashed px-4 py-4 text-center text-xs text-[var(--muted)]"
        style={{
          ["--muted" as string]: colors.textSecondary,
          borderColor: colors.border,
        }}
      >
        No confident market match found for this query.
      </div>
    );
  }

  const cols = polymarket && kalshi ? "grid-cols-2" : "grid-cols-1";

  return (
    <div
      className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
      style={{
        ["--border" as string]: colors.border,
        ["--surface" as string]: colors.bgSurface,
        ["--muted" as string]: colors.textSecondary,
        ["--text" as string]: colors.text,
      }}
    >
      {consensus !== null && (
        <div className="text-center">
          <span className="text-[26px] font-bold text-[var(--text)]">{(consensus * 100).toFixed(1)}%</span>
          <span className="ml-1.5 text-[11px] text-[var(--muted)]">market consensus</span>
        </div>
      )}

      <div className={`grid gap-3 ${cols}`}>
        {polymarket && (
          <MarketArcCard
            side="pm"
            color={pmColor}
            trackColor={pmTrack}
            title="Polymarket"
            subtitle={polymarket.title}
            stat={`Vol ${formatVolume(polymarket.volume)}`}
            pct={polymarket.probability * 100}
            label={polymarket.probabilityLabel}
            selected={expandedDetail === "pm"}
            onToggle={() => onSelectDetail(expandedDetail === "pm" ? null : "pm")}
            onTrade={() => onTrade(polymarket.url)}
            activeBg={dark ? "rgba(46,92,255,0.12)" : "rgba(46,92,255,0.06)"}
            hoverBg={dark ? "rgba(46,92,255,0.1)" : "rgba(46,92,255,0.05)"}
          />
        )}

        {kalshi && (
          <MarketArcCard
            side="kalshi"
            color={kColor}
            trackColor={kTrack}
            title="Kalshi"
            subtitle={kalshi.title}
            stat={`OI ${kalshi.openInterest.toLocaleString()}`}
            pct={kalshi.probability * 100}
            label={kalshi.probabilityLabel}
            selected={expandedDetail === "kalshi"}
            onToggle={() => onSelectDetail(expandedDetail === "kalshi" ? null : "kalshi")}
            onTrade={() => onTrade(kalshi.url)}
            activeBg={dark ? "rgba(38,196,133,0.12)" : "rgba(38,196,133,0.06)"}
            hoverBg={dark ? "rgba(38,196,133,0.1)" : "rgba(38,196,133,0.05)"}
          />
        )}
      </div>
    </div>
  );
}
