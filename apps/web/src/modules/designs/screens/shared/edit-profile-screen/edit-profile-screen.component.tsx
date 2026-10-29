import { AppIcon } from "@/modules/designs/components/app-icon";
import { Button } from "@/modules/designs/components/button";
import { PhoneFrame } from "@/modules/designs/components/phone-frame";
import { ProfileAvatar } from "@/modules/designs/components/profile-avatar";
import { StackHeader } from "@/modules/designs/components/stack-header";
import { TextInput } from "@/modules/designs/components/text-input";
import { adminAccount, instructorAccount, people } from "@/modules/designs/data/fortaleza";
import { appT } from "@/modules/designs/i18n/app-t";

import type { EditProfileScreenProps } from "./edit-profile-screen.types";

/** The name field, the read-only e-mail and "Salvar", which waits for a new valid name. */
export function EditProfileScreen({ locale, state, role = "student" }: EditProfileScreenProps) {
  const t = (key: string) => appT(locale, key);
  const account = role === "admin" ? adminAccount : role === "instructor" ? instructorAccount : people;
  const invalid = state === "invalidName";
  const saving = state === "saving";
  const name = invalid ? "A1" : saving ? `${account.name} Souza` : account.name;

  return (
    <PhoneFrame>
      <div className="flex flex-1 flex-col bg-page">
        <StackHeader title={t("editProfile.title")} />
        <div className="flex flex-1 flex-col px-5 pb-8">
          <div className="flex flex-1 flex-col gap-3 pb-6 pt-6">
            <div className="flex justify-center">
              <ProfileAvatar name={name} changePhotoLabel={t("editProfile.changePhoto")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="ds-text-section-label text-ink-2">{t("editProfile.nameLabel")}</p>
              <TextInput
                icon={<AppIcon name="Ionicons:person-outline" size={20} className="text-ink-2" />}
                value={name}
                status={invalid ? "error" : "neutral"}
                errorMessage={t("createAccount.nameInvalid")}
              />
            </div>
            <div className="flex flex-col gap-1.5 pb-4">
              <p className="ds-text-section-label text-ink-2">{t("editProfile.emailLabel")}</p>
              <TextInput icon={<AppIcon name="Ionicons:mail-outline" size={20} className="text-ink-2" />} value={account.email} editable={false} />
              <p className="ds-text-list-subtitle px-1 text-ink-2">{t("editProfile.emailHint")}</p>
            </div>
          </div>
          <Button disabled={state === "idle" || invalid} loading={saving}>{t("editProfile.save")}</Button>
        </div>
      </div>
    </PhoneFrame>
  );
}
