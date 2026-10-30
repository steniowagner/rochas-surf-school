import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Keyboard } from "react-native";

import {
  getStatus,
  isValid,
  nameRules,
} from "@/modules/auth/utils/field-validation";
import { useAlertMessage } from "@/providers/alert-message";
import { useSession } from "@/providers/session";

import { useUpdateName } from "../../hooks/use-update-name.hook";

export const useEditProfile = () => {
  const { t } = useTranslation();
  const { user } = useSession();
  const alertMessage = useAlertMessage();
  const updateName = useUpdateName();
  const currentName = user?.name ?? "";
  const [name, setName] = useState(currentName);
  const [isNameTouched, setIsNameTouched] = useState(false);

  const trimmedName = name.trim();
  const isNameValid = isValid(trimmedName, nameRules());

  const nameField = {
    value: name,
    status: getStatus(trimmedName, isNameValid, isNameTouched),
    errorMessage: t("createAccount.nameInvalid"),
    onChangeText: setName,
    onBlur: () => setIsNameTouched(true),
  };

  const canSubmit = isNameValid && trimmedName !== currentName;

  const submit = () => {
    if (!canSubmit || updateName.isPending) {
      return;
    }

    Keyboard.dismiss();

    updateName.mutate(
      { name: trimmedName },
      { onSuccess: () => router.back() },
    );
  };

  return {
    currentName,
    photoUrl: user?.photoUrl ?? null,
    email: user?.email ?? "",
    nameField,
    canSubmit,
    isSaving: updateName.isPending,
    submit,
    showComingSoon: () => alertMessage.show(t("profile.comingSoon")),
  };
};
