import { AppIcon } from "../app-icon";
import { Button } from "../button";
import { ScreenIntro } from "../screen-intro";

import type { AccountStatusProps, AccountStatusTone } from "./account-status.types";

const tileClasses: Record<AccountStatusTone, string> = { bad: "bg-bad-tint", dim: "bg-dim", sand: "bg-sand" };
const iconClasses: Record<AccountStatusTone, string> = { bad: "text-bad", dim: "text-ink-2", sand: "text-grape" };

export function AccountStatus({ tone, icon, eyebrow, title, description, note, primaryAction, useAnotherEmailLabel }: AccountStatusProps) {
  return (
    <div className="flex flex-1 flex-col justify-between bg-page px-5 pb-6 pt-3">
      <div className="mt-6 flex flex-col gap-6">
        <ScreenIntro
          icon={<AppIcon name={icon} size={30} className={iconClasses[tone]} />}
          iconTileClassName={tileClasses[tone]}
          eyebrow={eyebrow}
          eyebrowClassName={tone === "bad" ? "text-bad" : "text-ink-2"}
          title={title}
          description={description}
        />
        {note ? (
          <div className="flex flex-col gap-1 rounded-card border border-line bg-surface p-4">
            <p className="ds-text-list-title text-ink">{note.title}</p>
            <p className="ds-text-list-subtitle text-ink-2">{note.text}</p>
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-3">
        {primaryAction}
        <Button variant="ghost">{useAnotherEmailLabel}</Button>
      </div>
    </div>
  );
}
