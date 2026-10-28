import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useAlertMessage } from "@/providers/alert-message";

import { useCreateSchoolRule } from "../../hooks/use-create-school-rule.hook";
import { useUpdateSchoolRule } from "../../hooks/use-update-school-rule.hook";
import { SCHOOL_RULE_DESCRIPTION_MAX, SCHOOL_RULE_TITLE_MAX } from "../../school-rules.constants";
import { SchoolRule } from "../../school-rules.types";
import { isRuleNotFoundError } from "../../utils/school-rules-error";

import { SchoolRuleSheetFields, UseSchoolRuleSheetProps } from "./school-rule-sheet.types";

const fieldsOf = (rule: SchoolRule | null | undefined): SchoolRuleSheetFields => ({
  title: rule?.title ?? "",
  description: rule?.description ?? "",
});

export const useSchoolRuleSheet = ({ visible, mode, rule, onClose }: UseSchoolRuleSheetProps) => {
  const { t } = useTranslation();
  const alertMessage = useAlertMessage();
  const createRule = useCreateSchoolRule();
  const updateRule = useUpdateSchoolRule();
  const [fields, setFields] = useState(() => fieldsOf(rule));
  const [wasVisible, setWasVisible] = useState(visible);

  // Each opening starts from the rule's text (or empty): a draft that was cancelled or dragged away is dropped. The
  // text stays while the sheet slides down.
  if (wasVisible !== visible) {
    setWasVisible(visible);

    if (visible) {
      setFields(fieldsOf(rule));
    }
  }

  const editing = mode === "edit";
  const title = fields.title.trim();
  const description = fields.description.trim();
  // An unchanged save would change nothing, so "Salvar" waits for a real change (spec 056, D-06).
  const changed = !editing || title !== rule?.title || description !== rule?.description;
  const canSubmit = title !== "" && description !== "" && changed;

  const submit = async () => {
    try {
      if (editing) {
        await updateRule.mutateAsync({ id: rule!.id, ...fields });
        alertMessage.show(t("manageSchoolRules.toasts.saved"), { tone: "success" });
      } else {
        await createRule.mutateAsync(fields);
        alertMessage.show(t("manageSchoolRules.toasts.added"), { tone: "success" });
      }

      onClose();
    } catch (error) {
      // The mutation already showed the toast; a rule that is gone can't be edited, so the sheet closes. Any other
      // failure keeps the sheet and the draft.
      if (isRuleNotFoundError(error)) {
        onClose();
      }
    }
  };

  return {
    editing,
    fields,
    titleMaxLength: SCHOOL_RULE_TITLE_MAX,
    descriptionMaxLength: SCHOOL_RULE_DESCRIPTION_MAX,
    canSubmit,
    loading: createRule.isPending || updateRule.isPending,
    changeTitle: (value: string) => setFields((current) => ({ ...current, title: value })),
    changeDescription: (value: string) => setFields((current) => ({ ...current, description: value })),
    submit,
  };
};
