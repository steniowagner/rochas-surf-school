import { appT } from "@/modules/designs/i18n/app-t";

import { BottomModal } from "../bottom-modal";
import { Button } from "../button";
import { Chip } from "../chip";

import type { CancellationRulesSheetProps } from "./cancellation-rules-sheet.types";

const disciplines = ["surf", "skate"] as const;

/** Both cancellation rules, as the school wrote them. */
export function CancellationRulesSheet({ locale, status, rules }: CancellationRulesSheetProps) {
  const t = (key: string) => appT(locale, key);

  return (
    <BottomModal>
      <div className="flex flex-col gap-4 pb-6">
        <h3 className="ds-text-screen-title text-ink">{t("cancellationRules.sheet.title")}</h3>
        {status === "loading" ? (
          <div className="flex justify-center py-8">
            <span role="status" aria-label={t("classesWeek.loading")} className="size-5 animate-spin rounded-full border-2 border-grape border-t-transparent" />
          </div>
        ) : null}
        {status === "error" ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <p className="ds-text-body text-center text-ink-2">{t("cancellationRules.sheet.loadError")}</p>
            <Button variant="subtle">{t("cancellationRules.sheet.retry")}</Button>
          </div>
        ) : null}
        {status === "ready" && rules
          ? disciplines.map((discipline) => (
              <div key={discipline} className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4">
                <Chip tone={discipline}>{t(`newClass.discipline.${discipline}`)}</Chip>
                <p className="ds-text-body text-ink">{rules[discipline] ?? t("cancellationRules.sheet.empty")}</p>
              </div>
            ))
          : null}
        <Button variant="ghost">{t("cancellationRules.sheet.close")}</Button>
      </div>
    </BottomModal>
  );
}
