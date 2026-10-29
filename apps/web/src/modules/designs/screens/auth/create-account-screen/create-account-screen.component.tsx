import { AppIcon } from "@/modules/designs/components/app-icon";
import { AuthFormFrame } from "@/modules/designs/components/auth-form-frame";
import { Button } from "@/modules/designs/components/button";
import { ScreenIntro } from "@/modules/designs/components/screen-intro";
import { TermsLine } from "@/modules/designs/components/terms-line";
import { TextInput } from "@/modules/designs/components/text-input";
import { people } from "@/modules/designs/data/fortaleza";
import { appT } from "@/modules/designs/i18n/app-t";

import type { CreateAccountScreenProps } from "./create-account-screen.types";

export function CreateAccountScreen({ locale, state }: CreateAccountScreenProps) {
  const t = (key: string) => appT(locale, key);
  const invalid = state === "invalid";
  const filled = state === "sending" || state === "sendError";

  return (
    <AuthFormFrame
      toastMessage={state === "sendError" ? t("createAccount.errors.sendFailed") : undefined}
      intro={
        <ScreenIntro
          icon={<AppIcon name="Ionicons:person-add-outline" size={28} className="text-grape" />}
          title={t("createAccount.title")}
          description={t("createAccount.subtitle")}
        />
      }
      footer={
        <>
          <Button disabled={!filled} loading={state === "sending"}>
            {t("createAccount.submit")}
          </Button>
          <TermsLine locale={locale} />
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <TextInput
          icon={<AppIcon name="Ionicons:person-outline" size={20} className="text-ink-2" />}
          placeholder={t("createAccount.namePlaceholder")}
          value={filled ? people.name : invalid ? "Ana" : ""}
          status={invalid ? "error" : "neutral"}
          errorMessage={t("createAccount.nameInvalid")}
        />
        <TextInput
          icon={<AppIcon name="Ionicons:mail-outline" size={20} className="text-ink-2" />}
          placeholder={t("createAccount.emailPlaceholder")}
          value={filled ? people.email : invalid ? "ana.lima@" : ""}
          status={invalid ? "error" : "neutral"}
          errorMessage={t("createAccount.emailInvalid")}
        />
      </div>
    </AuthFormFrame>
  );
}
