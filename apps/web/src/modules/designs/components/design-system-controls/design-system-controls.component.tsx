import { appRich, appT } from "@/modules/designs/i18n/app-t";
import { countries } from "@/modules/designs/data/fortaleza";

import { AppIcon } from "../app-icon";
import { Button } from "../button";
import type { ButtonVariant } from "../button/button.types";
import { Checkbox } from "../checkbox";
import { CountryPicker } from "../country-picker";
import { DesignEntry } from "../design-entry";
import { DesignSection } from "../design-section";
import { HeaderButton } from "../header-button";
import { OtpInput } from "../otp-input";
import { PhoneFrame } from "../phone-frame";
import { PhoneNumberField } from "../phone-number-field";
import { SegmentedControl } from "../segmented-control";
import { StepTabs } from "../step-tabs";
import { TextArea } from "../text-area";
import { TextButton } from "../text-button";
import { TextInput } from "../text-input";

import type { DesignSystemSectionProps } from "./design-system-controls.types";

const variants: ButtonVariant[] = ["primary", "dark", "ink", "outline", "subtle", "danger", "success", "ghost"];

export function DesignSystemControls({ locale, text }: DesignSystemSectionProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);
  const e = text.entries;
  const mail = <AppIcon name="Feather:mail" size={19} className="text-ink-2" />;

  return (
    <DesignSection number="04" title={text.sections.controls.title} description={text.sections.controls.description}>
      <DesignEntry id="DS-04-01" title={e["DS-04-01"].title} note={e["DS-04-01"].note}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {variants.map((variant) => (
            <div key={variant} data-variant={variant} className="flex flex-col gap-2 rounded-card border border-line p-3">
              <p className="ds-text-section-label text-ink-2">{variant}</p>
              <Button variant={variant}>{t("common.back")}</Button>
              <Button variant={variant} disabled>{t("common.back")}</Button>
              <Button variant={variant} loading>{t("common.back")}</Button>
            </div>
          ))}
          <div className="flex flex-col gap-2 rounded-card border border-line p-3">
            <p className="ds-text-section-label text-ink-2">{text.labels.withIcon}</p>
            <Button icon={<AppIcon name="Ionicons:add" size={18} />}>{t("classesWeek.create")}</Button>
          </div>
        </div>
      </DesignEntry>
      <DesignEntry id="DS-04-02" title={e["DS-04-02"].title} note={e["DS-04-02"].note}>
        <div className="flex items-center gap-6">
          <HeaderButton icon="Ionicons:notifications-outline" label={t("userHeader.notifications")} />
          <HeaderButton icon="Ionicons:notifications-outline" label={t("userHeader.notifications")} badge={3} />
          <HeaderButton icon="Ionicons:notifications-outline" label={t("userHeader.notifications")} badge={3} standalone />
        </div>
      </DesignEntry>
      <DesignEntry id="DS-04-03" title={e["DS-04-03"].title} note={e["DS-04-03"].note}>
        <p className="ds-text-list-subtitle max-w-96 text-ink-2">
          {appRich(locale, "auth.terms", {
            terms: (children) => <TextButton className="text-ink">{children}</TextButton>,
            privacy: (children) => <TextButton className="text-ink">{children}</TextButton>,
          })}
        </p>
      </DesignEntry>
      <DesignEntry id="DS-04-04" title={e["DS-04-04"].title} note={e["DS-04-04"].note}>
        <div className="grid gap-3 sm:grid-cols-3">
          <TextInput icon={mail} placeholder={t("emailSignIn.emailPlaceholder")} />
          <TextInput icon={mail} value="ana.lima@email.com" clearable />
          <TextInput icon={mail} value="ana.lima@" status="error" errorMessage={t("emailSignIn.emailInvalid")} />
        </div>
      </DesignEntry>
      <DesignEntry id="DS-04-05" title={e["DS-04-05"].title} note={e["DS-04-05"].note}>
        <div className="grid gap-3 sm:grid-cols-3">
          <TextArea value="" maxLength={200} label={t("reactivations.denySheet.label")} placeholder={t("reactivations.denySheet.placeholder")} />
          <TextArea value={t("reactivations.denySheet.placeholder")} maxLength={200} label={t("reactivations.denySheet.label")} />
          <TextArea value="Sem vagas." maxLength={10} label={t("reactivations.denySheet.label")} />
        </div>
      </DesignEntry>
      <DesignEntry id="DS-04-06" title={e["DS-04-06"].title} note={e["DS-04-06"].note}>
        <div className="grid gap-3 sm:grid-cols-2">
          <OtpInput value="" />
          <OtpInput value="482" />
          <OtpInput value="482915" status="error" />
          <OtpInput value="482" editable={false} />
        </div>
      </DesignEntry>
      <DesignEntry id="DS-04-07" title={e["DS-04-07"].title} note={e["DS-04-07"].note}>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["plain", "boxed"] as const).map((variant) => (
            <div key={variant} className="flex flex-col gap-2">
              <Checkbox variant={variant} checked={false} label={t("schoolRules.submit")} />
              <Checkbox variant={variant} checked label={t("schoolRules.submit")} />
              <Checkbox variant={variant} checked={false} disabled label={t("schoolRules.submit")} />
              <Checkbox variant={variant} checked label={t("whatsapp.hideNumber")} helper={t("whatsapp.hideNumberHint")} />
            </div>
          ))}
        </div>
      </DesignEntry>
      <DesignEntry id="DS-04-08" title={e["DS-04-08"].title} note={e["DS-04-08"].note}>
        <div className="flex flex-col gap-3 sm:max-w-96">
          <SegmentedControl value="surf" options={[{ value: "surf", label: t("classesWeek.disciplineFilter.surf") }, { value: "skate", label: t("classesWeek.disciplineFilter.skate") }]} />
          <SegmentedControl value="all" options={[{ value: "all", label: t("classesWeek.disciplineFilter.all") }, { value: "surf", label: t("classesWeek.disciplineFilter.surf") }, { value: "skate", label: t("classesWeek.disciplineFilter.skate") }]} />
        </div>
      </DesignEntry>
      <DesignEntry id="DS-04-09" title={e["DS-04-09"].title} note={e["DS-04-09"].note}>
        <StepTabs
          selected="class"
          steps={[
            { key: "who", label: t("enrolStudent.steps.who"), value: "Ana Beatriz", done: true },
            { key: "class", label: t("enrolStudent.steps.class"), value: t("enrolStudent.steps.pending"), done: false },
            { key: "confirm", label: t("enrolStudent.next"), value: "—", done: false, disabled: true },
          ]}
        />
      </DesignEntry>
      <DesignEntry id="DS-04-10" title={e["DS-04-10"].title} note={e["DS-04-10"].note}>
        <div className="grid gap-3 sm:grid-cols-2">
          <PhoneNumberField country="BR" dialCode="+55" placeholder="85 91234-5678" />
          <PhoneNumberField country="BR" dialCode="+55" value="85 9123" status="error" errorMessage={t("whatsapp.invalidNumber")} />
        </div>
      </DesignEntry>
      <DesignEntry id="DS-04-11" title={e["DS-04-11"].title} note={e["DS-04-11"].note}>
        <PhoneFrame caption={t("whatsapp.pickerTitle")}>
          <CountryPicker title={t("whatsapp.pickerTitle")} searchPlaceholder={t("whatsapp.pickerSearch")} countries={countries} />
        </PhoneFrame>
      </DesignEntry>
    </DesignSection>
  );
}
