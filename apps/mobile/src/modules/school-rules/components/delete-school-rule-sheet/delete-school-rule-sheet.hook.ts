import { useTranslation } from "react-i18next";

import { useAlertMessage } from "@/providers/alert-message";

import { useDeleteSchoolRule } from "../../hooks/use-delete-school-rule.hook";
import { isRuleNotFoundError } from "../../utils/school-rules-error";

import { UseDeleteSchoolRuleSheetProps } from "./delete-school-rule-sheet.types";

export const useDeleteSchoolRuleSheet = ({ rule, onClose }: UseDeleteSchoolRuleSheetProps) => {
  const { t } = useTranslation();
  const alertMessage = useAlertMessage();
  const deleteRule = useDeleteSchoolRule();

  const confirm = async () => {
    try {
      await deleteRule.mutateAsync({ id: rule!.id });
      alertMessage.show(t("manageSchoolRules.toasts.deleted"));
      onClose();
    } catch (error) {
      // The mutation already showed the toast; a rule that is gone closes the confirmation, any other failure keeps it.
      if (isRuleNotFoundError(error)) {
        onClose();
      }
    }
  };

  return { loading: deleteRule.isPending, confirm };
};
