import { useQuery } from "@tanstack/react-query";

import { ApiError, apiGet, SessionExpiredError } from "@/services/api";

import { ClassDetails } from "../classes.types";

const DEFAULT_RETRIES = 3;

/**
 * One class by id; a 404 and an expired session are final, so they are not retried. `enabled: false` reads nothing
 * (the Send notice screen without a class).
 */
export const useClass = (id: string, { enabled = true }: { enabled?: boolean } = {}) =>
  useQuery({
    enabled,
    queryKey: ["classes", "detail", id],
    queryFn: () =>
      apiGet<ClassDetails>(`/classes/${id}`, { authenticated: true }),
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status === 404) &&
      !(error instanceof SessionExpiredError) &&
      failureCount < DEFAULT_RETRIES,
  });
