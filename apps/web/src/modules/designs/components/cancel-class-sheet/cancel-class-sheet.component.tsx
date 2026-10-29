import { appT } from "@/modules/designs/i18n/app-t";
import { joinAudience } from "@/modules/designs/utils/audience";

import { BottomModal } from "../bottom-modal";
import { Button } from "../button";
import { GuestsWarning } from "../guests-warning";
import { TextArea } from "../text-area";

import type { CancelClassSheetProps } from "./cancel-class-sheet.types";

// The app's `CLASS_CANCELLATION_MESSAGE_MAX`.
const MESSAGE_MAX = 300;

/** Asks before a class is cancelled: who will be told, the guests who won't, and an optional message. */
export function CancelClassSheet({ locale, guestCount = 0, studentCount = 0, pendingCount = 0, instructorCount = 0, message = "" }: CancelClassSheetProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);
  const audience = [
    studentCount > 0 ? t("cancelClass.audience.students", { count: studentCount }) : null,
    pendingCount > 0 ? t("cancelClass.audience.pending", { count: pendingCount }) : null,
    instructorCount > 0 ? t("cancelClass.audience.instructors", { count: instructorCount }) : null,
  ].filter((part) => part !== null);
  const description = audience.length === 0 ? t("cancelClass.description") : t("cancelClass.descriptionWithAudience", { list: joinAudience(audience, t("cancelClass.audience.and")) });

  return (
    <BottomModal>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="ds-text-sheet-title text-ink">{t("cancelClass.title")}</h3>
          <p className="ds-text-body text-ink-2">{description}</p>
        </div>
        <GuestsWarning locale={locale} count={guestCount} />
        <TextArea label={t("cancelClass.messageLabel")} placeholder={t("cancelClass.messagePlaceholder")} value={message} maxLength={MESSAGE_MAX} />
        <Button variant="danger">{t("cancelClass.confirm")}</Button>
        <Button variant="ghost">{t("cancelClass.keep")}</Button>
      </div>
    </BottomModal>
  );
}
