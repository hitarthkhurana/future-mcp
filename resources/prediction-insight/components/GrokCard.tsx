import React from "react";
import { type Colors } from "../../../shared";

function parseLine(
  line: string,
  onLink: (url: string) => void
): React.ReactNode[] {
  const tokenRe = /\*\*([^*]+)\*\*|\[\[(\d+)\]\]\(([^)]+)\)/g;
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = tokenRe.exec(line)) !== null) {
    if (match.index > last) nodes.push(line.slice(last, match.index));

    if (match[1] !== undefined) {
      nodes.push(
        <strong key={i++} className="font-semibold text-[var(--text)]">
          {match[1]}
        </strong>
      );
    } else if (match[3] !== undefined) {
      const url = match[3];
      const num = match[2];
      nodes.push(
        <sup key={i++}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.preventDefault();
              onLink(url);
            }}
            className="text-[0.75em] font-semibold text-[var(--link)] no-underline"
          >
            [{num}]
          </a>
        </sup>
      );
    }

    last = match.index + match[0].length;
  }

  if (last < line.length) nodes.push(line.slice(last));
  return nodes;
}

function renderGrokText(raw: string, onLink: (url: string) => void): React.ReactNode {
  return raw.split("\n").map((line, li) => (
    <React.Fragment key={li}>
      {parseLine(line, onLink)}
      {"\n"}
    </React.Fragment>
  ));
}

export function GrokCard({
  text,
  onLink,
  colors,
}: {
  text: string;
  onLink: (url: string) => void;
  colors: Colors;
}) {
  return (
    <div
      className="flex flex-col gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5"
      style={{
        ["--border" as string]: colors.border,
        ["--surface" as string]: colors.bgSurface,
        ["--text" as string]: colors.text,
        ["--muted" as string]: colors.textSecondary,
        ["--link" as string]: colors.link,
      }}
    >
      <div className="m-0 whitespace-pre-wrap text-[13px] leading-[1.6] text-[var(--text)]">
        {renderGrokText(text, onLink)}
      </div>
    </div>
  );
}
