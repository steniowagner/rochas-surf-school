import { useState } from "react";

import { useSchoolRules } from "@/modules/school-rules/hooks/use-school-rules.hook";

import { useAcceptSchoolRules } from "../../hooks/use-accept-school-rules.hook";

/** State of the school rules acceptance: the box, and the acceptance of the version the person was shown (D-09, D-12). */
export const useSchoolRulesAcceptance = () => {
  const [isChecked, setIsChecked] = useState(false);
  const { data, isError } = useSchoolRules();
  const { mutate, isPending } = useAcceptSchoolRules({
    onOutdated: () => setIsChecked(false),
  });
  // The person can only accept rules they were shown.
  const canAccept = !!data && !isError;
  const canSubmit = canAccept && isChecked && !isPending;

  const submit = () => {
    if (!data || !canSubmit) {
      return;
    }

    mutate({ version: data.version });
  };

  return {
    isChecked,
    setIsChecked,
    canAccept,
    canSubmit,
    isAccepting: isPending,
    submit,
  };
};
