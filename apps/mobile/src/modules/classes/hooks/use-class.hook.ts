import { useQuery } from "@tanstack/react-query";

import { ApiError, apiGet } from "@/services/api";

import { ClassItem } from "../classes.types";

const DEFAULT_RETRIES = 3;

/** One class by id; a 404 is final, so it is not retried. */
export const useClass = (id: string) =>
  useQuery({
    queryKey: ["classes", "detail", id],
    queryFn: () => apiGet<ClassItem>(`/classes/${id}`, { authenticated: true }),
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status === 404) &&
      failureCount < DEFAULT_RETRIES,
  });
