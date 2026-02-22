import { McpUseProvider } from "mcp-use/react";
import { SkeletonBar, type Colors } from "../../../shared";

export function Pending({ colors }: { colors: Colors }) {
  return (
    <McpUseProvider autoSize>
      <div
        className="flex flex-col gap-3 rounded-2xl bg-[var(--widget-bg)] p-5"
        style={{
          ["--widget-bg" as string]: colors.bg,
        }}
      >
        <SkeletonBar width="70%" height={18} colors={colors} />
        <SkeletonBar width="100%" height={90} colors={colors} />
        <SkeletonBar width="100%" height={130} colors={colors} />
      </div>
    </McpUseProvider>
  );
}
