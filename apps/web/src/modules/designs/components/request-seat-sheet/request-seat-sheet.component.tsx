import { appT } from "@/modules/designs/i18n/app-t";

import { AppIcon } from "../app-icon";
import { BottomModal } from "../bottom-modal";
import { Button } from "../button";
import { Checkbox } from "../checkbox";
import { RequestSeatClassCard } from "../request-seat-class-card";

import type { RequestSeatSheetProps } from "./request-seat-sheet.types";

/** The class, what happens to the request and the cancellation rule to accept before it is sent. */
export function RequestSeatSheet({ locale, waitingList = false, rule = "deadline", deadline = "", accepted = false, sending = false, classCard }: RequestSeatSheetProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);
  const hasRule = rule !== "noRule";
  const ruleText = !hasRule ? t("enrolment.requestSheet.noRule") : rule === "deadline" ? t("enrolment.requestSheet.deadline", { when: deadline }) : t("enrolment.requestSheet.noDeadline");
  const checked = accepted || sending;

  return (
    <BottomModal>
      <div className="flex flex-col gap-4">
        <h3 className="ds-text-sheet-title text-ink">{t(waitingList ? "enrolment.requestSheet.waitingListTitle" : "enrolment.requestSheet.title")}</h3>
        <RequestSeatClassCard locale={locale} {...classCard} />
        <div className="flex items-center gap-3 rounded-card bg-warn-tint px-4 py-3">
          <AppIcon name="Ionicons:hourglass-outline" size={18} className="text-warn" />
          <p className="ds-text-list-title flex-1 text-ink">{t(waitingList ? "enrolment.requestSheet.waitingListNote" : "enrolment.requestSheet.note")}</p>
        </div>
        <div className="overflow-hidden rounded-card border border-line bg-surface">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <span className="flex size-8.5 items-center justify-center rounded-checkbox bg-dim text-lagoon">
              <AppIcon name="Ionicons:close-circle-outline" size={17} />
            </span>
            <p className="ds-text-body flex-1 text-ink">{ruleText}</p>
          </div>
          {hasRule ? (
            <>
              <div className="h-px bg-line" />
              <div className="flex items-center gap-2 px-4 py-1.5">
                <div className="flex-1">
                  <Checkbox checked={checked} label={t("enrolment.requestSheet.accept")} />
                </div>
                <span role="link" aria-label={t("enrolment.requestSheet.read")} className="ds-text-list-title flex min-h-11 items-center gap-0.5 pl-2 text-lagoon">
                  {t("enrolment.requestSheet.read")}
                  <AppIcon name="Ionicons:chevron-forward" size={16} />
                </span>
              </div>
            </>
          ) : null}
        </div>
        <Button loading={sending} disabled={!hasRule ? false : !checked}>
          {t(waitingList ? "enrolment.requestSheet.submitWaitingList" : "enrolment.requestSheet.submit")}
        </Button>
        <Button variant="ghost">{t("enrolment.requestSheet.later")}</Button>
      </div>
    </BottomModal>
  );
}
