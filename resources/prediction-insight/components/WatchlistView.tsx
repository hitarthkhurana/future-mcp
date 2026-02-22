import { type Colors } from "../../../shared";
import type { WatchlistItem } from "../state";

export function WatchlistView({
  items,
  onView,
  onRemove,
  isLoading,
  colors,
}: {
  items: WatchlistItem[];
  onView: (query: string) => void;
  onRemove: (query: string) => void;
  isLoading: boolean;
  colors: Colors;
}) {
  if (items.length === 0) {
    return (
      <div
        className="px-4 py-8 text-center text-[13px] text-[var(--muted)]"
        style={{ ["--muted" as string]: colors.textSecondary }}
      >
        No starred markets yet. Hit ☆ on any insight to add it here.
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-2"
      style={{
        ["--text" as string]: colors.text,
        ["--muted" as string]: colors.textSecondary,
        ["--border" as string]: colors.border,
        ["--surface" as string]: colors.bgSurface,
        ["--btn-bg" as string]: colors.actionBtn,
        ["--btn-text" as string]: colors.actionBtnText,
        ["--yes" as string]: colors.yes,
      }}
    >
      {items.map((item) => (
        <div
          key={item.query}
          className="flex items-center gap-2.5 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5"
        >
          <div className="min-w-0 flex-1">
            <p className="m-0 truncate text-[13px] font-medium text-[var(--text)]">{item.eventTitle}</p>
            {item.consensus !== null && (
              <span className="text-xs font-semibold text-[var(--yes)]">
                {(item.consensus * 100).toFixed(1)}% consensus
              </span>
            )}
          </div>
          <button
            onClick={() => onView(item.query)}
            disabled={isLoading}
            className="shrink-0 rounded-[7px] border border-[var(--border)] bg-[var(--btn-bg)] px-2.5 py-1 text-[11px] font-medium text-[var(--btn-text)] disabled:cursor-default disabled:opacity-50"
          >
            View
          </button>
          <button
            onClick={() => onRemove(item.query)}
            className="shrink-0 px-1.5 py-1 text-[13px] text-[var(--muted)]"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
