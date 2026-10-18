import { useCancellationRules } from "../../hooks/use-cancellation-rules.hook";

import type { UseCancellationRulesSheetProps } from "./cancellation-rules-sheet.types";

/** The rules load when the sheet opens, and again each time it does after a failure. */
export const useCancellationRulesSheet = ({ visible }: UseCancellationRulesSheetProps) => {
  const query = useCancellationRules({ enabled: visible });

  return {
    status: query.isError ? ("error" as const) : query.data ? ("ready" as const) : ("loading" as const),
    rules: query.data,
    retry: () => void query.refetch(),
  };
};
