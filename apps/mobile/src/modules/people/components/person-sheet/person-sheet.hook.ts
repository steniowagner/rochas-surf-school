import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Linking } from "react-native";

import { useAlertMessage } from "@/providers/alert-message";

import { ROLE_ACTION_TARGET } from "../../constants/role-actions";
import { useChangeRole } from "../../hooks/use-change-role.hook";
import { RoleAction } from "../../people.types";
import { formatWhatsappNumber } from "../../utils/format-whatsapp-number";
import { getRoleChangeErrorKey } from "../../utils/role-change-error";

import { UsePersonSheetProps } from "./person-sheet.types";

export const usePersonSheet = ({ person, onClose }: UsePersonSheetProps) => {
  const { t } = useTranslation();
  const alertMessage = useAlertMessage();
  const changeRole = useChangeRole();
  const [roleAction, setRoleAction] = useState<RoleAction | null>(null);
  // A second tap can land before the loading state is drawn: this guard sends the change once.
  const isChangingRole = useRef(false);
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
    onClose();
  };

  const confirmRoleChange = async () => {
    if (!person?.id || !roleAction || isChangingRole.current) {
      return;
    }

    isChangingRole.current = true;
    try {
      await changeRole.mutateAsync({ id: person.id, role: ROLE_ACTION_TARGET[roleAction] });
      close();
    } catch (error) {
      const key = getRoleChangeErrorKey(error);

      if (key) {
        alertMessage.show(t(key));
      }
    } finally {
      isChangingRole.current = false;
    }
  };

  return {
    formattedNumber: number ? formatWhatsappNumber(number) : null,
    openChat,
    close,
    roleAction,
    selectRoleAction: setRoleAction,
    backToDetails: () => setRoleAction(null),
    confirmRoleChange,
    isChangingRole: changeRole.isPending,
    // The name up to its first space (spec 058, D-15).
    firstName: person?.name.split(" ")[0] ?? "",
  };
};
