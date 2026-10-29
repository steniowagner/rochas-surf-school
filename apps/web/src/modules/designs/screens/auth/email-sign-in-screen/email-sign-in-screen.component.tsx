import { people } from "@/modules/designs/data/fortaleza";
import { appRich, appT } from "@/modules/designs/i18n/app-t";
import { AppIcon } from "@/modules/designs/components/app-icon";
import { AuthFormFrame } from "@/modules/designs/components/auth-form-frame";
import { Button } from "@/modules/designs/components/button";
import { ScreenIntro } from "@/modules/designs/components/screen-intro";
import { TermsLine } from "@/modules/designs/components/terms-line";
import { TextButton } from "@/modules/designs/components/text-button";
import { TextInput } from "@/modules/designs/components/text-input";

import type { EmailSignInScreenProps } from "./email-sign-in-screen.types";

export function EmailSignInScreen({ locale, state }: EmailSignInScreenProps) {
  const t = (key: string) => appT(locale, key);
  const invalid = state === "invalid";
  const canSubmit = state === "sending" || state === "sendError";
  const email = state === "empty" ? "" : invalid ? "ana.lima@" : people.email;

  return (
    <AuthFormFrame
      toastMessage={state === "sendError" ? t("createAccount.errors.sendFailed") : undefined}
      intro={
        <ScreenIntro
          icon={<AppIcon name="Ionicons:log-in-outline" size={28} className="text-grape" />}
          title={t("emailSignIn.title")}
          description={t("emailSignIn.subtitle")}
        />
      }
      footer={
        <>
          <Button disabled={!canSubmit} loading={state === "sending"}>
            {t("emailSignIn.submit")}
          </Button>
          <TermsLine locale={locale} />
        </>
      }
    >
      <TextInput
        icon={<AppIcon name="Ionicons:mail-outline" size={20} className="text-ink-2" />}
        placeholder={t("emailSignIn.emailPlaceholder")}
        value={email}
        status={invalid ? "error" : "neutral"}
        errorMessage={t("emailSignIn.emailInvalid")}
      />
      <p className="ds-text-list-subtitle text-left text-ink-2">
        {appRich(locale, "emailSignIn.noAccount", { create: (children) => <TextButton>{children}</TextButton> })}
      </p>
    </AuthFormFrame>
  );
}
