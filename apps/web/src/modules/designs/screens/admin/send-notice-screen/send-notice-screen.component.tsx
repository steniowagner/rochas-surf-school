import { AppIcon } from "@/modules/designs/components/app-icon";
import { Button } from "@/modules/designs/components/button";
import { ClassMessageCard } from "@/modules/designs/components/class-message-card";
import { PhoneFrame } from "@/modules/designs/components/phone-frame";
import { ScreenIntro } from "@/modules/designs/components/screen-intro";
import { SegmentedControl } from "@/modules/designs/components/segmented-control";
import { SendNoticeConfirmSheet } from "@/modules/designs/components/send-notice-confirm-sheet";
import { StackHeader } from "@/modules/designs/components/stack-header";
import { TextArea } from "@/modules/designs/components/text-area";
import { TextInput } from "@/modules/designs/components/text-input";
import { adminDates } from "@/modules/designs/data/admin-app";
import { classMessagePeople, noticeAudienceCounts } from "@/modules/designs/data/fortaleza";
import { appT } from "@/modules/designs/i18n/app-t";

import type { SendNoticeScreenProps } from "./send-notice-screen.types";

// The app's `NOTICE_MESSAGE_MAX_LENGTH`.
const MESSAGE_MAX = 500;

/**
 * "Enviar aviso": the intro, who receives it and how many they are, the title and the message, and Send pinned to the
 * bottom. Opened from a class's tools, the same screen writes to that class: its card takes the audience's place.
 */
export function SendNoticeScreen({ locale, state, notice }: SendNoticeScreenProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);
  const classMode = state === "classMessage" || state === "classConfirm";
  const copy = classMode ? "notices.classMessage" : "notices";
  const confirming = state === "confirm" || state === "classConfirm";
  const typed = state !== "empty" && state !== "classMessage";
  const audience = state === "empty" ? "all" : "students";
  const count = classMode ? classMessagePeople.length : noticeAudienceCounts[audience];
  const classSummary = { discipline: "surf", level: "beginner", dateLabel: adminDates(locale).classDate("2026-09-09"), timeRange: "08:00 – 09:30", locationName: "Praia de Iracema" } as const;

  return (
    <PhoneFrame>
      <div className="flex min-h-0 flex-1 flex-col bg-page">
        <StackHeader title="" />
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden px-5 pb-6 pt-2">
          <ScreenIntro
            icon={<AppIcon name={classMode ? "Ionicons:chatbubble-outline" : "Ionicons:megaphone-outline"} size={30} className="text-grape" />}
            title={t(`${copy}.title`)}
            description={t(`${copy}.description`)}
          />
          <div className="flex flex-col gap-2">
            {classMode ? (
              <ClassMessageCard locale={locale} {...classSummary} people={classMessagePeople} />
            ) : (
              <>
                <p className="ds-text-section-label text-ink-2">{t("notices.audience.section")}</p>
                <SegmentedControl
                  options={[
                    { value: "all", label: t("notices.audience.all") },
                    { value: "students", label: t("notices.audience.students") },
                    { value: "instructors", label: t("notices.audience.instructors") },
                  ]}
                  value={audience}
                />
                <div className="flex items-center gap-1.5 px-1">
                  <AppIcon name="Ionicons:people-outline" size={14} className="text-ink-2" />
                  <p data-testid="notice-recipients-count" className="ds-text-list-subtitle flex-1 text-ink-2">
                    {t("notices.count.people", { count })}
                  </p>
                </div>
              </>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <p className="ds-text-section-label text-ink-2">{t("notices.titleLabel")}</p>
            <TextInput value={typed ? notice.title : ""} placeholder={t("notices.titlePlaceholder")} />
          </div>
          <div className="flex flex-col gap-2">
            <p className="ds-text-section-label text-ink-2">{t("notices.messageLabel")}</p>
            <TextArea value={typed ? notice.message : ""} maxLength={MESSAGE_MAX} placeholder={t("notices.messagePlaceholder")} />
          </div>
        </div>
        <div className="bg-page px-5 pb-8 pt-3">
          <Button className="w-full" disabled={!typed}>
            {t("notices.send")}
          </Button>
        </div>
        {confirming ? (
          <SendNoticeConfirmSheet
            locale={locale}
            classSummary={classMode ? classSummary : undefined}
            description={classMode ? t("notices.classMessage.confirm") : t(`notices.confirm.description.${audience}`)}
            count={count}
            title={notice.title}
            message={notice.message}
          />
        ) : null}
      </div>
    </PhoneFrame>
  );
}
