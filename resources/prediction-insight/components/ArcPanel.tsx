import { ProbArc, formatVolume, type Colors } from "../../../shared";
import { K_GREEN, K_GREEN_DARK, PM_BLUE, PM_BLUE_DARK } from "../constants";
import type { KalshiData, PolymarketData } from "../types";

function MarketArcCard({
  color,
  trackColor,
  logoSrc,
  sourceName,
  candidates,
  selectedIndex,
  onSelectIndex,
  selected,
  pct,
  label,
  isExpanded,
  onToggleDetail,
  onTrade,
  activeBg,
  hoverBg,
}: {
  color: string;
  trackColor: string;
  logoSrc: string;
  sourceName: string;
  candidates: Array<{ title: string }>;
  selectedIndex: number;
  onSelectIndex: (i: number) => void;
  selected: PolymarketData | KalshiData;
  pct: number;
  label: string;
  isExpanded: boolean;
  onToggleDetail: () => void;
  onTrade: () => void;
  activeBg: string;
  hoverBg: string;
}) {
  const isKalshi = "openInterest" in selected;
  const stat = isKalshi
    ? `OI ${(selected as KalshiData).openInterest.toLocaleString()}`
    : `Vol ${formatVolume((selected as PolymarketData).volume)}`;
  const isWeak = selected.score < 0.5;

  return (
    <div
      className="flex flex-col items-center gap-2 rounded-[10px] p-3 text-center transition-colors"
      style={{
        ["--accent" as string]: color,
        backgroundColor: isExpanded ? activeBg : "transparent",
        outline: isExpanded ? `2px solid ${color}` : "none",
        outlineOffset: "-2px",
      }}
    >
      {/* Logo */}
      <img
        src={logoSrc}
        alt={sourceName}
        style={{ height: 18, objectFit: "contain", opacity: 0.85 }}
      />

      {/* Arc */}
      <button
        type="button"
        onClick={onToggleDetail}
        className="cursor-pointer"
        title={isExpanded ? "Hide details" : "Show details"}
        onMouseEnter={(e) => {
          if (!isExpanded) (e.currentTarget.parentElement as HTMLDivElement).style.backgroundColor = hoverBg;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget.parentElement as HTMLDivElement).style.backgroundColor = isExpanded ? activeBg : "transparent";
        }}
      >
        <ProbArc pct={pct} color={color} trackColor={trackColor} label={label} size={108} />
      </button>

      {/* Market title */}
      <span className="max-w-[150px] text-center text-[11px] leading-[1.35] text-[var(--muted)]">
        {selected.title.length > 60 ? `${selected.title.slice(0, 60)}…` : selected.title}
      </span>

      {/* Stat + weak match */}
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {isWeak && (
          <span className="rounded-full bg-amber-500/10 px-[6px] py-[2px] text-[10px] font-semibold text-amber-500">
            Weak match
          </span>
        )}
        <span className="text-[10px] text-[var(--muted)]">{stat}</span>
      </div>

      {/* Candidate switcher */}
      {candidates.length > 1 && (
        <select
          value={selectedIndex}
          onChange={(e) => onSelectIndex(Number(e.target.value))}
          onClick={(e) => e.stopPropagation()}
          className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-1.5 py-1 text-[11px] text-[var(--text)]"
        >
          {candidates.map((_, idx) => (
            <option key={idx} value={idx}>
              {idx === 0 ? "Top match" : `Alt ${idx}`}
            </option>
          ))}
        </select>
      )}

      {/* Buttons */}
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onTrade(); }}
          className="rounded-[7px] bg-[var(--accent)] px-2.5 py-[5px] text-[11px] font-semibold text-white"
        >
          Trade ↗
        </button>
        <button
          type="button"
          onClick={onToggleDetail}
          className="flex items-center text-[10px] text-[var(--accent)]"
        >
          {isExpanded ? "▲ Hide" : "Details ▼"}
        </button>
      </div>
    </div>
  );
}

export function ArcPanel({
  polymarket,
  kalshi,
  polymarketCandidates,
  kalshiCandidates,
  pmIndex,
  kalshiIndex,
  onSelectPmIndex,
  onSelectKalshiIndex,
  consensus,
  colors,
  onTrade,
  expandedDetail,
  onSelectDetail,
}: {
  polymarket: PolymarketData | null;
  kalshi: KalshiData | null;
  polymarketCandidates: PolymarketData[];
  kalshiCandidates: KalshiData[];
  pmIndex: number;
  kalshiIndex: number;
  onSelectPmIndex: (i: number) => void;
  onSelectKalshiIndex: (i: number) => void;
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
        ["--bg" as string]: colors.bg,
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
            color={pmColor}
            trackColor={pmTrack}
            logoSrc="/polymarket.png"
            sourceName="Polymarket"
            candidates={polymarketCandidates}
            selectedIndex={pmIndex}
            onSelectIndex={onSelectPmIndex}
            selected={polymarket}
            pct={polymarket.probability * 100}
            label={polymarket.probabilityLabel}
            isExpanded={expandedDetail === "pm"}
            onToggleDetail={() => onSelectDetail(expandedDetail === "pm" ? null : "pm")}
            onTrade={() => onTrade(polymarket.url)}
            activeBg={dark ? "rgba(46,92,255,0.12)" : "rgba(46,92,255,0.06)"}
            hoverBg={dark ? "rgba(46,92,255,0.1)" : "rgba(46,92,255,0.05)"}
          />
        )}

        {kalshi && (
          <MarketArcCard
            color={kColor}
            trackColor={kTrack}
            logoSrc="/kalshi.png"
            sourceName="Kalshi"
            candidates={kalshiCandidates}
            selectedIndex={kalshiIndex}
            onSelectIndex={onSelectKalshiIndex}
            selected={kalshi}
            pct={kalshi.probability * 100}
            label={kalshi.probabilityLabel}
            isExpanded={expandedDetail === "kalshi"}
            onToggleDetail={() => onSelectDetail(expandedDetail === "kalshi" ? null : "kalshi")}
            onTrade={() => onTrade(kalshi.url)}
            activeBg={dark ? "rgba(38,196,133,0.12)" : "rgba(38,196,133,0.06)"}
            hoverBg={dark ? "rgba(38,196,133,0.1)" : "rgba(38,196,133,0.05)"}
          />
        )}
      </div>
    </div>
  );
}
