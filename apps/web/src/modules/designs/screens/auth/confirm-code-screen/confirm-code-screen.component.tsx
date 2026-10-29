import { AppIcon } from "@/modules/designs/components/app-icon";
import { AuthFormFrame } from "@/modules/designs/components/auth-form-frame";
import { Button } from "@/modules/designs/components/button";
import { OtpInput } from "@/modules/designs/components/otp-input";
import { ScreenIntro } from "@/modules/designs/components/screen-intro";
import { TextButton } from "@/modules/designs/components/text-button";
import { people } from "@/modules/designs/data/fortaleza";
import { appRich, appT } from "@/modules/designs/i18n/app-t";

import type { ConfirmCodeScreenProps } from "./confirm-code-screen.types";

const code = "482915";

export function ConfirmCodeScreen({ locale, state }: ConfirmCodeScreenProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);
  const typed = state === "resend" || state === "verifying";
  const wrong = state === "wrongCode";
  const resendAvailable = state === "resend";

  return (
    <AuthFormFrame
      toastMessage={state === "errorToast" ? t("confirmCode.errors.noAccount") : undefined}
      intro={
        <ScreenIntro
          icon={<AppIcon name="MaterialCommunityIcons:email-check-outline" size={28} className="text-grape" />}
          title={t("confirmCode.title")}
          description={appRich(locale, "confirmCode.description", { bold: (children) => <span className="font-extrabold text-ink">{children}</span> }, { email: people.email })}
        />
      }
      footer={
        <>
          <Button disabled={!typed} loading={state === "verifying"}>
            {t("confirmCode.submit")}
          </Button>
          {resendAvailable ? (
            <p className="ds-text-button my-2 text-center text-ink-2">{t("confirmCode.resend").toUpperCase()}</p>
          ) : (
            <p className="ds-text-list-subtitle text-center text-ink-2">{t("confirmCode.resendIn", { time: "0:24" })}</p>
          )}
          <div className="flex items-start gap-2.5 rounded-card border border-line bg-dim p-3.5">
            <AppIcon name="Ionicons:information-circle-outline" size={17} className="text-ink-2" />
            <p className="ds-text-list-subtitle flex-1 text-ink-2">
              {appRich(locale, "confirmCode.notReceived", { change: (children) => <TextButton>{children}</TextButton> })}
            </p>
          </div>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        <OtpInput value={typed ? code : ""} status={wrong ? "error" : "neutral"} editable={state !== "verifying"} />
        <p className="ds-text-list-subtitle min-h-5 px-1 text-bad">{wrong ? t("confirmCode.errors.wrongCode") : null}</p>
      </div>
    </AuthFormFrame>
  );
}
