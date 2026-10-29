import { AppIcon } from "../app-icon";

import type { TabBarProps } from "./tab-bar.types";

export function TabBar({ tabs, selected }: TabBarProps) {
  const selectedIndex = Math.max(0, tabs.findIndex((tab) => tab.key === selected));

  return (
    <div role="tablist" className="relative flex border-t border-line bg-surface pb-8 pt-2">
      <span
        data-testid="tab-indicator"
        className="absolute -top-px left-0 h-[3px] rounded-b-full bg-sun"
        style={{ width: `${100 / tabs.length}%`, transform: `translateX(${selectedIndex * 100}%)` }}
      />
      {tabs.map((tab) => {
        const isSelected = tab.key === selected;

        return (
          <div key={tab.key} role="tab" aria-selected={isSelected} aria-label={tab.label} className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-1 ${isSelected ? "text-sun" : "text-ink-2"}`}>
            <AppIcon name={tab.icon} size={22} />
            <span className="ds-text-tab-bar-label truncate">{tab.label}</span>
          </div>
        );
      })}
    </div>
  );
}
