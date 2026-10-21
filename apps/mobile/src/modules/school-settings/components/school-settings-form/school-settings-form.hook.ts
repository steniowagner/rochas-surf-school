import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Keyboard } from "react-native";

import { usePhoneNumberField } from "@/components/phone-number-field";
import { useAlertMessage } from "@/providers/alert-message";

import { useSaveSchoolSettings } from "../../hooks/use-save-school-settings.hook";

import { UseSchoolSettingsFormProps } from "./school-settings-form.types";

export const useSchoolSettingsForm = ({
  settings,
}: UseSchoolSettingsFormProps) => {
  const { t } = useTranslation();
  const alertMessage = useAlertMessage();
  const saveSettings = useSaveSchoolSettings();
  const phone = usePhoneNumberField({ initialNumber: settings.whatsappNumber });
  const [waitingListEnabled, setWaitingListEnabled] = useState(
    settings.waitingListEnabled,
  );

  // A second press in the same frame must not send twice, before `isPending` has re-rendered.
  const sending = useRef(false);

  const isSwitchChanged = waitingListEnabled !== settings.waitingListEnabled;
  // An emptied field is no change: the school's number can be replaced, not cleared.
  const isNumberFilled = phone.whatsappNumber !== "";
  const isNumberChanged =
    isNumberFilled && phone.whatsappNumber !== (settings.whatsappNumber ?? "");
  const canSave =
    (isSwitchChanged || isNumberChanged) &&
    (!isNumberFilled || phone.isNumberValid) &&
    !saveSettings.isPending;

  const save = () => {
    if (!canSave || sending.current) {
      return;
    }

    sending.current = true;
    Keyboard.dismiss();

    saveSettings.mutate(
      {
        waitingListEnabled: isSwitchChanged ? waitingListEnabled : undefined,
        whatsappNumber: isNumberChanged ? phone.whatsappNumber : undefined,
      },
      {
        onSuccess: () => alertMessage.show(t("schoolSettings.saved")),
        onSettled: () => {
          sending.current = false;
        },
      },
    );
  };

  return {
    phone,
    waitingListEnabled,
    setWaitingListEnabled,
    canSave,
    isSaving: saveSettings.isPending,
    save,
  };
};
