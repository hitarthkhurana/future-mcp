import { useState, useEffect } from "react";
import { formatVolume, type Colors } from "../../../shared";
import { K_GREEN, K_GREEN_DARK, PM_BLUE, PM_BLUE_DARK } from "../constants";
import { PM_LOGO, KA_LOGO } from "../logos";
import type { KalshiData, PolymarketData } from "../types";

function ProbBar({
  pct,
  color,
  trackColor,
  label,
}: {
  pct: number;
  color: string;
  trackColor: string;
  label: string;
}) {
  const [animPct, setAnimPct] = useState(0);
  useEffect(() => {
    setAnimPct(0);
    const t = setTimeout(() => setAnimPct(pct), 60);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex items-baseline justify-between">
        <span
          className="text-[28px] font-bold leading-none"
          style={{ color }}
        >
          {animPct > 0 ? animPct.toFixed(1) : pct.toFixed(1)}%
        </span>
        <span
          className="text-[11px] font-semibold uppercase tracking-wide"
          style={{ color, opacity: 0.7 }}
        >
          {label}
        </span>
      </div>
      <div
        className="h-[10px] w-full overflow-hidden rounded-full"
        style={{ backgroundColor: trackColor }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.max(2, Math.min(98, animPct))}%`,
            backgroundColor: color,
            transition: "width 1.4s cubic-bezier(0.34, 1.2, 0.64, 1)",
          }}
        />
      </div>
    </div>
  );
}

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

  return (
    <div
      className="flex flex-col gap-3 rounded-[10px] p-3.5 transition-colors"
      style={{
        ["--accent" as string]: color,
        backgroundColor: isExpanded ? activeBg : "transparent",
        outline: isExpanded ? `2px solid ${color}` : "none",
        outlineOffset: "-2px",
      }}
      onMouseEnter={(e) => {
        if (!isExpanded) (e.currentTarget as HTMLDivElement).style.backgroundColor = hoverBg;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.backgroundColor = isExpanded ? activeBg : "transparent";
      }}
    >
      {/* Top row: logo + candidate switcher */}
      <div className="flex items-center justify-between">
        <img
          src={logoSrc}
          alt={sourceName}
          style={{ height: 20, objectFit: "contain", opacity: 0.9 }}
        />
        {candidates.length > 1 && (
          <select
            value={selectedIndex}
            onChange={(e) => { e.stopPropagation(); onSelectIndex(Number(e.target.value)); }}
            onClick={(e) => e.stopPropagation()}
            className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-1.5 py-[3px] text-[10px] text-[var(--text)]"
          >
            {candidates.map((_, idx) => (
              <option key={idx} value={idx}>
                {idx === 0 ? "Top match" : `Alt ${idx}`}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Probability bar */}
      <ProbBar pct={pct} color={color} trackColor={trackColor} label={label} />

      {/* Market title */}
      <p className="m-0 text-[11px] leading-[1.4] text-[var(--muted)]">
        {selected.title.length > 65 ? `${selected.title.slice(0, 65)}…` : selected.title}
      </p>

      {/* Stat */}
      <p className="m-0 text-[10px] text-[var(--muted)]">{stat}</p>

      {/* Buttons */}
      <div className="flex items-center gap-1.5">
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
          className="text-[10px] text-[var(--accent)]"
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
  const pmTrack = dark ? "rgba(107,135,255,0.15)" : "rgba(46,92,255,0.1)";
  const kTrack = dark ? "rgba(77,217,160,0.15)" : "rgba(38,196,133,0.1)";

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
            logoSrc={PM_LOGO}
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
            logoSrc={KA_LOGO}
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
