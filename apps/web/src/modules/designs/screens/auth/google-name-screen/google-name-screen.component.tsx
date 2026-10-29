import { AppIcon } from "@/modules/designs/components/app-icon";
import { AuthFormFrame } from "@/modules/designs/components/auth-form-frame";
import { Button } from "@/modules/designs/components/button";
import { ScreenIntro } from "@/modules/designs/components/screen-intro";
import { TextInput } from "@/modules/designs/components/text-input";
import { people } from "@/modules/designs/data/fortaleza";
import { appT } from "@/modules/designs/i18n/app-t";

import type { GoogleNameScreenProps } from "./google-name-screen.types";

export function GoogleNameScreen({ locale, state }: GoogleNameScreenProps) {
  const t = (key: string) => appT(locale, key);
  const invalid = state === "invalid";
  const filled = state === "sending" || state === "error";

  return (
    <AuthFormFrame
      toastMessage={state === "error" ? t("googleSignIn.tokenInvalid") : undefined}
      intro={
        <ScreenIntro
          icon={<AppIcon name="Ionicons:person-add-outline" size={28} className="text-grape" />}
          title={t("googleName.title")}
          description={t("googleName.description")}
        />
      }
      footer={
        <Button disabled={!filled} loading={state === "sending"}>
          {t("googleName.submit")}
        </Button>
      }
    >
      <TextInput
        icon={<AppIcon name="Ionicons:person-outline" size={20} className="text-ink-2" />}
        placeholder={t("createAccount.namePlaceholder")}
        value={filled ? people.name : invalid ? "Ana" : ""}
        status={invalid ? "error" : "neutral"}
        errorMessage={t("createAccount.nameInvalid")}
      />
    </AuthFormFrame>
  );
}
