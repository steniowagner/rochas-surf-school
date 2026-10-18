import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useAlertMessage } from "@/providers/alert-message";

import type { CancellationDiscipline } from "../cancellation-rules.types";
import { useCancellationRules } from "../hooks/use-cancellation-rules.hook";
import { useSaveCancellationRule } from "../hooks/use-save-cancellation-rule.hook";

import type { Drafts, UseCancellationRulesScreenResult } from "./cancellation-rules.screen.types";

export const useCancellationRulesScreen = (): UseCancellationRulesScreenResult => {
  const { t } = useTranslation();
  const alertMessage = useAlertMessage();
  const query = useCancellationRules();
  const saveRule = useSaveCancellationRule();
  const [discipline, setDiscipline] = useState<CancellationDiscipline>("surf");
  // One draft per discipline, kept while switching; an untouched discipline shows its saved text.
  const [drafts, setDrafts] = useState<Drafts>({});

  const savedText = query.data?.[discipline] ?? "";
  const value = drafts[discipline] ?? savedText;
  const isDirty = value.trim() !== savedText.trim();

  const save = () => {
    saveRule.mutate(
      { discipline, text: value },
      {
        onSuccess: () => {
          setDrafts((current) => ({ ...current, [discipline]: undefined }));
          alertMessage.show(
            t("cancellationRules.screen.saved", {
              discipline: t(`cancellationRules.screen.discipline.${discipline}`),
            }),
          );
        },
      },
    );
  };

  const getNote = () => {
    if (isDirty) return "unsaved";

    return savedText === "" ? "none" : "inForce";
  };

  return {
    status: query.isError ? "error" : query.data ? "ready" : "loading",
    retry: () => void query.refetch(),
    discipline,
    setDiscipline,
    value,
    setValue: (text) => setDrafts((current) => ({ ...current, [discipline]: text })),
    note: getNote(),
    canSave: isDirty && value.trim() !== "" && !saveRule.isPending,
    isSaving: saveRule.isPending,
    save,
  };
};
