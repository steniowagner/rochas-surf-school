import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Linking } from "react-native";

import { useAlertMessage } from "@/providers/alert-message";

import { ROLE_ACTION_TARGET } from "../../constants/role-actions";
import { useChangeRole } from "../../hooks/use-change-role.hook";
import { useRemovePerson } from "../../hooks/use-remove-person.hook";
import { useSetInstructorFlag } from "../../hooks/use-set-instructor-flag.hook";
import { RoleAction } from "../../people.types";
import { formatWhatsappNumber } from "../../utils/format-whatsapp-number";
import { getInstructorFlagErrorKey } from "../../utils/instructor-flag-error";
import { getRemovalErrorKey } from "../../utils/removal-error";
import { getRoleChangeErrorKey } from "../../utils/role-change-error";

import { UsePersonSheetProps } from "./person-sheet.types";

export const usePersonSheet = ({ person, onClose }: UsePersonSheetProps) => {
  const { t } = useTranslation();
  const alertMessage = useAlertMessage();
  const changeRole = useChangeRole();
  const removePerson = useRemovePerson();
  const setInstructorFlag = useSetInstructorFlag();
  const [roleAction, setRoleAction] = useState<RoleAction | null>(null);
  const [isConfirmingRemoval, setIsConfirmingRemoval] = useState(false);
  // The new state of the flag for the open sheet: the person is a snapshot of the list, which reloads behind the sheet.
  const [flagOverride, setFlagOverride] = useState<{ id: string; value: boolean } | null>(null);
  const number = person?.whatsappNumber ?? null;

  const openChat = async () => {
    try {
      await Linking.openURL(`https://wa.me/${number?.replace("+", "")}`);
    } catch {
      alertMessage.show(t("people.whatsappUnavailable"));
    }
  };

  const close = () => {
    setRoleAction(null);
    setIsConfirmingRemoval(false);
    onClose();
  };

  // The confirm button ignores presses while it is loading, so a second tap can't send another change.
  const confirmRoleChange = async (isInstructor: boolean) => {
    if (!person?.id || !roleAction) {
      return;
    }

    try {
      await changeRole.mutateAsync({
        id: person.id,
        role: ROLE_ACTION_TARGET[roleAction],
        ...(roleAction === "promoteAdmin" ? { isInstructor } : {}),
      });
      close();
    } catch (error) {
      const key = getRoleChangeErrorKey(error);

      if (key) {
        alertMessage.show(t(key));
      }
    }
  };

  // Like the role change: no success toast, and the confirm button ignores presses while it runs.
  const confirmRemoval = async () => {
    if (!person?.id || !isConfirmingRemoval) {
      return;
    }

    try {
      await removePerson.mutateAsync(person.id);
      close();
    } catch (error) {
      const key = getRemovalErrorKey(error);

      if (key) {
        alertMessage.show(t(key));
      }
    }
  };

  const isInstructor =
    flagOverride && flagOverride.id === person?.id
      ? flagOverride.value
      : (person?.isInstructor ?? false);

  // The checkbox is disabled while it runs, so a second tap can't send another change; no success toast.
  const toggleInstructorFlag = async () => {
    if (!person?.id) {
      return;
    }

    const next = !isInstructor;

    try {
      await setInstructorFlag.mutateAsync({ id: person.id, isInstructor: next });
      setFlagOverride({ id: person.id, value: next });
    } catch (error) {
      const key = getInstructorFlagErrorKey(error);

      if (key) {
        alertMessage.show(t(key));
      }
    }
  };

  return {
    isInstructor,
    toggleInstructorFlag,
    isSettingInstructorFlag: setInstructorFlag.isPending,
    formattedNumber: number ? formatWhatsappNumber(number) : null,
    openChat,
    close,
    roleAction,
    selectRoleAction: setRoleAction,
    backToDetails: () => setRoleAction(null),
    confirmRoleChange,
    isChangingRole: changeRole.isPending,
    isConfirmingRemoval,
    startRemoval: () => setIsConfirmingRemoval(true),
    cancelRemoval: () => setIsConfirmingRemoval(false),
    confirmRemoval,
    isRemoving: removePerson.isPending,
    // The name up to its first space (spec 058, D-15).
    firstName: person?.name.split(" ")[0] ?? "",
  };
};
