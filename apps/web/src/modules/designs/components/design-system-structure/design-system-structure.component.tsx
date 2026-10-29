import { localeOptions, people } from "@/modules/designs/data/fortaleza";
import { buildMockCalendar } from "@/modules/designs/data/mock-calendar";
import { appLocaleBySiteLocale } from "@/modules/designs/i18n/app-locale";
import { appRich, appT } from "@/modules/designs/i18n/app-t";

import { AccountStatus } from "../account-status";
import { AppIcon } from "../app-icon";
import { Button } from "../button";
import { DecisionCard } from "../decision-card";
import { DenySheet } from "../deny-sheet";
import { DesignEntry } from "../design-entry";
import { DesignSection } from "../design-section";
import { HeaderButton } from "../header-button";
import { LanguageSheet } from "../language-sheet";
import { PhoneFrame } from "../phone-frame";
import { ScreenIntro } from "../screen-intro";
import { StackHeader } from "../stack-header";
import { StudentAvatar } from "../student-avatar";
import { TabBar } from "../tab-bar";
import { ThemeSheet } from "../theme-sheet";
import { Toast } from "../toast";
import { UserHeader } from "../user-header";
import { WeekMonthCalendar } from "../week-month-calendar";
import { CalendarMonthGrid } from "../calendar-month-grid";
import { CalendarWeekRow } from "../calendar-week-row";

import type { DesignSystemSectionProps } from "./design-system-structure.types";

export function DesignSystemStructure({ locale, text }: DesignSystemSectionProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);
  const e = text.entries;
  const { caption, week, month } = buildMockCalendar(locale);
  const calendar = { caption, previousLabel: t("weekMonthCalendar.previousWeek"), nextLabel: t("weekMonthCalendar.nextWeek"), week, month };
  const current = appLocaleBySiteLocale[locale];
  const studentTabs = [
    { key: "agenda", label: t("tabs.agenda"), icon: "Ionicons:calendar-outline" },
    { key: "myClasses", label: t("tabs.myClasses"), icon: "Ionicons:ticket-outline" },
    { key: "school", label: t("tabs.school"), icon: "Feather:users" },
    { key: "profile", label: t("tabs.profile"), icon: "FontAwesome6:circle-user" },
  ] as const;
  const staffTabs = [
    { key: "home", label: t("tabs.home"), icon: "Feather:home" },
    { key: "classes", label: t("tabs.classes"), icon: "Ionicons:calendar-outline" },
    { key: "people", label: t("tabs.people"), icon: "Feather:users" },
    { key: "profile", label: t("tabs.profile"), icon: "FontAwesome6:circle-user" },
  ] as const;
  const denyProps = {
    title: t("reactivations.denySheet.title"),
    hint: t("reactivations.denySheet.hint", { name: people.firstName }),
    label: t("reactivations.denySheet.label"),
    placeholder: t("reactivations.denySheet.placeholder"),
    maxLength: 200,
    backLabel: t("common.back"),
    confirmLabel: t("reactivations.denySheet.confirm"),
  };
  const decision = {
    title: people.name,
    subtitle: people.email,
    details: ["Surf · " + t("newClass.level.beginner")],
    avatar: <StudentAvatar name={people.name} size={44} />,
    approveLabel: t("classRequests.approve"),
    denyLabel: t("classRequests.deny"),
  };
  const emailBold = { bold: (children: React.ReactNode) => <strong>{children}</strong> };

  return (
    <DesignSection number="07" title={text.sections.structure.title} description={text.sections.structure.description}>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <DesignEntry id="DS-07-01" title={e["DS-07-01"].title} note={e["DS-07-01"].note}>
          <TabBar tabs={[...studentTabs]} selected="agenda" />
        </DesignEntry>
        <DesignEntry id="DS-07-02" title={e["DS-07-02"].title} note={e["DS-07-02"].note}>
          <TabBar tabs={[...staffTabs]} selected="classes" />
        </DesignEntry>
        <DesignEntry id="DS-07-03" title={e["DS-07-03"].title} note={e["DS-07-03"].note}>
          <StackHeader title={t("classesWeek.newClass")} right={<HeaderButton icon="Ionicons:notifications-outline" label={t("userHeader.notifications")} badge={2} />} />
        </DesignEntry>
        <DesignEntry id="DS-07-04" title={e["DS-07-04"].title} note={e["DS-07-04"].note}>
          <ScreenIntro icon={<AppIcon name="MaterialCommunityIcons:surfing" size={32} className="text-grape" />} eyebrow={t("schoolRules.eyebrow")} title={t("schoolRules.title")} description={t("schoolRules.description")} />
        </DesignEntry>
        <DesignEntry id="DS-07-05" title={e["DS-07-05"].title} note={e["DS-07-05"].note}>
          <UserHeader name={people.name} firstName={people.firstName} greeting={t("userHeader.greeting.morning")} notificationsLabel={t("userHeader.notifications")} unreadCount={3} />
        </DesignEntry>
        <DesignEntry id="DS-07-06" title={e["DS-07-06"].title} note={e["DS-07-06"].note}>
          <CalendarWeekRow {...week} />
        </DesignEntry>
        <DesignEntry id="DS-07-07" title={e["DS-07-07"].title} note={e["DS-07-07"].note}>
          <CalendarMonthGrid {...month} />
        </DesignEntry>
        <DesignEntry id="DS-07-08" title={e["DS-07-08"].title} note={e["DS-07-08"].note}>
          <div className="flex flex-col gap-4">
            <WeekMonthCalendar view="week" {...calendar} />
            <WeekMonthCalendar view="month" {...calendar} previousLabel={t("weekMonthCalendar.previousMonth")} nextLabel={t("weekMonthCalendar.nextMonth")} />
          </div>
        </DesignEntry>
      </div>
      <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <DesignEntry id="DS-07-09" title={e["DS-07-09"].title} note={e["DS-07-09"].note}>
          <PhoneFrame caption={t("language.title")}>
            <ScreenIntro icon={<AppIcon name="Ionicons:calendar-outline" size={32} className="text-grape" />} title={t("classesWeek.newClass")} description={t("language.description")} />
            <LanguageSheet title={t("language.title")} description={t("language.description")} locales={localeOptions.map((option) => ({ flag: option.flag, name: option.name, selected: option.key === current }))} />
          </PhoneFrame>
        </DesignEntry>
        <DesignEntry id="DS-07-10" title={e["DS-07-10"].title} note={e["DS-07-10"].note}>
          <div className="flex flex-col gap-3">
            <Toast tone="success" message={t("enrolStudent.done", { name: people.firstName })} />
            <Toast tone="error" message={t("whatsapp.invalidNumber")} />
          </div>
        </DesignEntry>
        <DesignEntry id="DS-07-11" title={e["DS-07-11"].title} note={e["DS-07-11"].note}>
          <PhoneFrame caption={t("language.title")}>
            <LanguageSheet title={t("language.title")} description={t("language.description")} locales={localeOptions.map((option) => ({ flag: option.flag, name: option.name, selected: option.key === current }))} />
          </PhoneFrame>
        </DesignEntry>
        <DesignEntry id="DS-07-12" title={e["DS-07-12"].title} note={e["DS-07-12"].note}>
          <PhoneFrame caption={t("themeSheet.title")}>
            <ThemeSheet
              title={t("themeSheet.title")}
              description={t("themeSheet.description")}
              options={[
                { icon: "Ionicons:options-outline", label: t("theme.system"), selected: true },
                { icon: "Ionicons:sunny-outline", label: t("theme.light"), selected: false },
                { icon: "Ionicons:moon-outline", label: t("theme.dark"), selected: false },
              ]}
            />
          </PhoneFrame>
        </DesignEntry>
        <DesignEntry id="DS-07-13" title={e["DS-07-13"].title} note={e["DS-07-13"].note}>
          <div className="grid gap-3">
            <PhoneFrame caption={t("reactivations.denySheet.confirm")}><DenySheet {...denyProps} showLabel /></PhoneFrame>
            <PhoneFrame><DenySheet {...denyProps} hideReason /></PhoneFrame>
            <PhoneFrame><DenySheet {...denyProps} showLabel loading /></PhoneFrame>
          </div>
        </DesignEntry>
        <DesignEntry id="DS-07-14" title={e["DS-07-14"].title} note={e["DS-07-14"].note}>
          <div className="flex flex-col gap-3">
            <DecisionCard {...decision} />
            <DecisionCard {...decision} disabled loading="approve" />
            <DecisionCard {...decision} disabled loading="deny" />
            <DecisionCard {...decision} disabled />
            <DecisionCard {...decision} approveDisabled />
          </div>
        </DesignEntry>
        <DesignEntry id="DS-07-15" title={e["DS-07-15"].title} note={e["DS-07-15"].note}>
          <div className="grid gap-3">
            <PhoneFrame>
              <AccountStatus tone="bad" icon="MaterialCommunityIcons:close" eyebrow={t("denied.eyebrow")} title={t("denied.title")} description={appRich(locale, "denied.description", emailBold, { email: people.email })} note={{ title: t("denied.noteTitle"), text: t("closedAccount.contactSchool") }} useAnotherEmailLabel={t("closedAccount.useAnotherEmail")} />
            </PhoneFrame>
            <PhoneFrame>
              <AccountStatus tone="dim" icon="MaterialCommunityIcons:account-remove-outline" eyebrow={t("removed.eyebrow")} title={t("removed.title")} description={appRich(locale, "removed.description", emailBold, { email: people.email })} note={{ title: t("removed.noteTitle"), text: t("removed.noteText") }} useAnotherEmailLabel={t("closedAccount.useAnotherEmail")} />
            </PhoneFrame>
            <PhoneFrame>
              <AccountStatus tone="sand" icon="MaterialCommunityIcons:send-outline" eyebrow={t("reactivation.notRequested.eyebrow")} title={t("reactivation.notRequested.title")} description={appRich(locale, "reactivation.notRequested.description", emailBold, { email: people.email })} primaryAction={<Button>{t("reactivation.notRequested.request")}</Button>} useAnotherEmailLabel={t("closedAccount.useAnotherEmail")} />
            </PhoneFrame>
          </div>
        </DesignEntry>
      </div>
    </DesignSection>
  );
}
