import { useQuery } from "@tanstack/react-query";

import { apiGet } from "@/services/api";

import { CancellationRules } from "../cancellation-rules.types";

export const CANCELLATION_RULES_QUERY_KEY = ["cancellation-rules"];

/** Both cancellation rules. Any approved account reads them; every caller shares one cache entry. */
export const useCancellationRules = ({ enabled = true }: { enabled?: boolean } = {}) =>
  useQuery({
    queryKey: CANCELLATION_RULES_QUERY_KEY,
    queryFn: () => apiGet<CancellationRules>("/cancellation-rules", { authenticated: true }),
    retry: false,
    enabled,
  });
