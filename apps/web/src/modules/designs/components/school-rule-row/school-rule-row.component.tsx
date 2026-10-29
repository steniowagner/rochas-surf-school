import type { SchoolRuleRowProps } from "./school-rule-row.types";

export function SchoolRuleRow({ rule, position, showDivider }: SchoolRuleRowProps) {
  return (
    <div className={`flex gap-3 py-3.5 ${showDivider ? "border-b border-line" : ""}`}>
      <span className="ds-text-sheet-title w-9 text-sun">{String(position).padStart(2, "0")}</span>
      <div className="flex flex-1 flex-col gap-0.5">
        <p className="ds-text-list-title text-ink">{rule.title}</p>
        <p className="ds-text-body text-ink-2">{rule.description}</p>
      </div>
    </div>
  );
}
