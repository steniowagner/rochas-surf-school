import { CancellationRulesSheet } from "@/modules/designs/components/cancellation-rules-sheet";
import { AboutSheet } from "@/modules/designs/components/about-sheet";
import { DeleteAccountSheet } from "@/modules/designs/components/delete-account-sheet";
import { LanguageSheet } from "@/modules/designs/components/language-sheet";
import { PhoneFrame } from "@/modules/designs/components/phone-frame";
import { ProfileCard } from "@/modules/designs/components/profile-card";
import { ProfileHeader } from "@/modules/designs/components/profile-header";
import { ProfileRow } from "@/modules/designs/components/profile-row";
import { ScreenToast } from "@/modules/designs/components/screen-toast";
import { SignOutSheet } from "@/modules/designs/components/sign-out-sheet";
import { Switch } from "@/modules/designs/components/switch";
import { TabBar } from "@/modules/designs/components/tab-bar";
import { ThemeSheet } from "@/modules/designs/components/theme-sheet";
import { instructorAccount, localeOptions, people } from "@/modules/designs/data/fortaleza";
import { instructorTabs } from "@/modules/designs/data/instructor-app";
import { studentTabs } from "@/modules/designs/data/student-app";
import { appLocaleBySiteLocale } from "@/modules/designs/i18n/app-locale";
import { appT } from "@/modules/designs/i18n/app-t";

import type { ProfileScreenProps } from "./profile-screen.types";

/** The profile tab: the header, the account rows, the push switch, the school's rules and links, sign out and removing the account. */
export function ProfileScreen({ locale, state, rules, role = "student" }: ProfileScreenProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);
  const current = appLocaleBySiteLocale[locale];
  const rulesState = state === "rulesLoading" ? "loading" : state === "rulesError" ? "error" : "ready";
  const rulesOf = state === "rulesEmpty" ? { surf: null, skate: null } : { surf: rules.surf, skate: rules.skate };

  return (
    <PhoneFrame tall={state === "profile"}>
      <div className="flex flex-1 flex-col bg-page">
        <div className="flex flex-1 flex-col gap-6 px-5 pb-6 pt-6">
          <ProfileHeader locale={locale} name={role === "instructor" ? instructorAccount.name : people.name} role={role} />
          <ProfileCard>
            <ProfileRow icon="Ionicons:pencil-outline" label={t("profile.editProfile")} />
            <ProfileRow icon="Ionicons:logo-whatsapp" label={t("profile.whatsapp")} value={t("profile.whatsappVisible")} />
            <ProfileRow icon="Ionicons:sunny-outline" label={t("profile.theme")} value={t("theme.system")} />
            <ProfileRow icon="Ionicons:language-outline" label={t("profile.language")} value={localeOptions.find((option) => option.key === current)?.name} />
          </ProfileCard>
          <div className="flex flex-col gap-2">
            <ProfileCard>
              <ProfileRow icon="Ionicons:notifications-outline" label={t("profile.push")} trailing={<Switch value={state !== "pushDenied"} label={t("profile.push")} />} />
            </ProfileCard>
            <p className="ds-text-list-subtitle px-1 text-ink-2">{t("profile.pushNote")}</p>
          </div>
          <ProfileCard>
            <ProfileRow icon="Ionicons:shield-outline" label={t("profile.schoolRules")} />
            <ProfileRow icon="Ionicons:close-circle-outline" label={t("profile.cancellationRules")} />
            <ProfileRow icon="Ionicons:information-circle-outline" label={t("profile.about")} />
            <ProfileRow icon="Ionicons:lock-closed-outline" label={t("profile.privacyPolicy")} />
            <ProfileRow icon="Ionicons:reader-outline" label={t("profile.termsOfUse")} />
          </ProfileCard>
          <ProfileCard>
            <ProfileRow icon="Ionicons:log-out-outline" label={t("profile.signOut")} hideChevron />
          </ProfileCard>
          <ProfileCard>
            <ProfileRow icon="Ionicons:trash-outline" label={t("profile.removeAccount")} hideChevron destructive />
          </ProfileCard>
        </div>
        <TabBar tabs={role === "instructor" ? instructorTabs(locale) : studentTabs(locale)} selected="profile" />
        {state === "pushDenied" ? <ScreenToast message={t("profile.pushDenied")} /> : null}
        {state === "languageSheet" ? (
          <LanguageSheet title={t("language.title")} description={t("language.description")} locales={localeOptions.map((option) => ({ flag: option.flag, name: option.name, selected: option.key === current }))} />
        ) : null}
        {state === "themeSheet" ? (
          <ThemeSheet
            title={t("themeSheet.title")}
            description={t("themeSheet.description")}
            options={[
              { icon: "Ionicons:options-outline", label: t("theme.system"), selected: true },
              { icon: "Ionicons:sunny-outline", label: t("theme.light"), selected: false },
              { icon: "Ionicons:moon-outline", label: t("theme.dark"), selected: false },
            ]}
          />
        ) : null}
        {state === "aboutSheet" ? <AboutSheet locale={locale} /> : null}
        {state === "signOutSheet" ? <SignOutSheet locale={locale} /> : null}
        {state === "deleteSheet" || state === "removing" ? <DeleteAccountSheet locale={locale} removing={state === "removing"} /> : null}
        {state === "rules" || state === "rulesLoading" || state === "rulesEmpty" || state === "rulesError" ? <CancellationRulesSheet locale={locale} status={rulesState} rules={rulesOf} /> : null}
      </div>
    </PhoneFrame>
  );
}
