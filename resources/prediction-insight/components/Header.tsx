import { formatDate, type Colors } from "../../../shared";

export function Header({
  eventTitle,
  query,
  generatedAt,
  colors,
}: {
  eventTitle: string;
  query: string;
  generatedAt: string;
  colors: Colors;
}) {
  return (
    <div
      className="flex flex-col gap-1.5"
      style={{
        ["--text" as string]: colors.text,
        ["--muted" as string]: colors.textSecondary,
      }}
    >
      <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--muted)]">
        Prediction Insight
      </span>
      <h2 className="m-0 text-lg leading-[1.3] text-[var(--text)]">{eventTitle}</h2>
      <p className="m-0 text-xs text-[var(--muted)]">Query: {query}</p>
      <p className="m-0 text-[11px] text-[var(--muted)]">Updated {formatDate(generatedAt)}</p>
    </div>
  );
}
