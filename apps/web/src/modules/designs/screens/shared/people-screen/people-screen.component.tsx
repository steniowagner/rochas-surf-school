import { AppIcon } from "@/modules/designs/components/app-icon";
import { EmptyState } from "@/modules/designs/components/empty-state";
import { ErrorState } from "@/modules/designs/components/error-state";
import { PeopleSkeleton } from "@/modules/designs/components/people-skeleton";
import { PersonRow } from "@/modules/designs/components/person-row";
import { PersonSheet } from "@/modules/designs/components/person-sheet";
import { PhoneFrame } from "@/modules/designs/components/phone-frame";
import { RoleFilters } from "@/modules/designs/components/role-filters";
import { ScreenIntro } from "@/modules/designs/components/screen-intro";
import { ScreenToast } from "@/modules/designs/components/screen-toast";
import { TabBar } from "@/modules/designs/components/tab-bar";
import { TextInput } from "@/modules/designs/components/text-input";
import { directory, studentDates, studentTabs } from "@/modules/designs/data/student-app";
import { appT } from "@/modules/designs/i18n/app-t";

import type { PeopleScreenProps } from "./people-screen.types";

const SEARCH = "mar";

/** The school's directory as a student sees it: the intro, the search, the role filters and the people by initial. */
export function PeopleScreen({ locale, state }: PeopleScreenProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);
  const dates = studentDates(locale);
  const filtered = state === "filtered";
  const people = filtered ? directory.filter((person) => person.role === "instructor" && person.name.toLowerCase().includes(SEARCH)) : directory;
  const empty = state === "empty";
  const groups = people.reduce<Record<string, typeof directory>>((acc, person) => {
    const letter = person.name.charAt(0).toUpperCase();
    acc[letter] = [...(acc[letter] ?? []), person];
    return acc;
  }, {});
  const sheetOpen = state === "sheet" || state === "sheetNotShared" || state === "whatsappUnavailable";
  const rafael = directory.find((person) => person.name === "Rafael Rocha");

  return (
    <PhoneFrame tall={state === "list"}>
      <div className="flex flex-1 flex-col bg-page">
        <div className="flex flex-1 flex-col px-5 pb-6 pt-2">
          <div className="flex flex-col gap-4 pb-3">
            <ScreenIntro
              icon={<AppIcon name="Ionicons:people-outline" size={28} className="text-grape" />}
              eyebrow={t("people.count", { count: directory.length })}
              title={t("people.title")}
              description={t("people.description")}
            />
            <TextInput
              icon={<AppIcon name="Ionicons:search" size={20} className="text-ink-2" />}
              value={filtered || empty ? (empty ? "zzz" : SEARCH) : ""}
              placeholder={t("people.searchPlaceholder")}
              clearable
            />
            <RoleFilters locale={locale} selected={filtered ? ["instructor"] : []} />
          </div>
          {state === "loading" ? (
            <div role="status" aria-label={t("people.loading")}>
              <PeopleSkeleton />
            </div>
          ) : state === "error" ? (
            <div className="flex pt-4">
              <ErrorState title={t("people.loadError.title")} description={t("people.loadError.description")} retryLabel={t("common.tryAgain")} />
            </div>
          ) : empty ? (
            <div className="flex pt-4">
              <EmptyState icon="Ionicons:people-outline" title={t("people.empty.title")} description={t("people.empty.description")} />
            </div>
          ) : (
            Object.entries(groups).map(([letter, group]) => (
              <div key={letter} className="flex flex-col">
                <h4 className="ds-text-section-label mb-2 mt-4 text-ink">{letter}</h4>
                <div>
                  {group.map((person, index) => (
                    <PersonRow key={person.name} locale={locale} name={person.name} role={person.role} since={dates.since(person.since)} isFirst={index === 0} isLast={index === group.length - 1} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
        <TabBar tabs={studentTabs(locale)} selected="school" />
        {sheetOpen && rafael ? <PersonSheet locale={locale} name={rafael.name} role={rafael.role} whatsapp={state === "sheetNotShared" ? null : "+55 85 99999 8888"} /> : null}
        {state === "whatsappUnavailable" ? <ScreenToast message={t("people.whatsappUnavailable")} /> : null}
      </div>
    </PhoneFrame>
  );
}
