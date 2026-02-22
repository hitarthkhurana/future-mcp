import { formatVolume, type Colors } from "../../../shared";
import { K_GREEN, K_GREEN_DARK, PM_BLUE, PM_BLUE_DARK } from "../constants";
import type { KalshiData, PolymarketData } from "../types";

export function SourceCard({
  title,
  selectedIndex,
  onSelect,
  options,
  selected,
  colors,
  isKalshi,
}: {
  title: string;
  selectedIndex: number;
  onSelect: (nextIndex: number) => void;
  options: PolymarketData[] | KalshiData[];
  selected: PolymarketData | KalshiData;
  colors: Colors;
  isKalshi: boolean;
}) {
  const dark = colors.bg === "#1a1a1a";
  const badgeColor = isKalshi
    ? dark
      ? K_GREEN_DARK
      : K_GREEN
    : dark
      ? PM_BLUE_DARK
      : PM_BLUE;

  const badgeBg = isKalshi ? colors.kBadgeBg : colors.pmBadgeBg;

  return (
    <div
      className="flex flex-col gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5"
      style={{
        ["--border" as string]: colors.border,
        ["--surface" as string]: colors.bgSurface,
        ["--bg" as string]: colors.bg,
        ["--text" as string]: colors.text,
        ["--muted" as string]: colors.textSecondary,
        ["--badge" as string]: badgeColor,
        ["--badge-bg" as string]: badgeBg,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-[var(--badge-bg)] px-2 py-[3px] text-[11px] font-bold uppercase tracking-[0.04em] text-[var(--badge)]">
          {title}
        </span>

        {options.length > 1 && (
          <select
            value={selectedIndex}
            onChange={(event) => onSelect(Number(event.target.value))}
            className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-1.5 py-1 text-xs text-[var(--text)]"
          >
            {options.map((_, idx) => (
              <option key={`${title}-${idx}`} value={idx}>
                {idx === 0 ? "Top match" : `Alt ${idx}`}
              </option>
            ))}
          </select>
        )}
      </div>

      <p className="m-0 text-[13px] leading-[1.4] text-[var(--text)]">{selected.title}</p>

      <div className="flex items-baseline gap-1.5">
        <span className="text-[22px] font-bold text-[var(--badge)]">
          {(selected.probability * 100).toFixed(1)}%
        </span>
        <span className="text-[11px] text-[var(--muted)]">{selected.probabilityLabel}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-[var(--muted)]">
        {selected.score < 0.5 && (
          <span className="rounded-full bg-amber-500/10 px-[7px] py-[2px] text-[10px] font-semibold text-amber-500">
            Weak match
          </span>
        )}
        <span>Vol {formatVolume(selected.volume)}</span>
        {isKalshi && "openInterest" in selected ? (
          <span>OI {selected.openInterest.toLocaleString()}</span>
        ) : null}
      </div>

      <a
        href={selected.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block w-fit rounded-lg bg-[var(--badge)] px-2.5 py-1.5 text-xs font-semibold text-white no-underline"
      >
        Open market ↗
      </a>
    </div>
  );
}
