import { useQuery } from "@tanstack/react-query";

import { apiGet } from "@/services/api";

import { TeachingClassesResponse } from "../classes.types";

export const TEACHING_CLASSES_QUERY_KEY = ["classes", "teaching"] as const;

/**
 * The classes the instructor or admin teaches that haven't ended, and whether they teach any; under `["classes"]`, so
 * every class change refreshes it. Shared by the home row and "Minhas aulas".
 */
export const useTeachingClasses = () =>
  useQuery({
    queryKey: TEACHING_CLASSES_QUERY_KEY,
    queryFn: () =>
      apiGet<TeachingClassesResponse>("/classes/teaching", {
        authenticated: true,
      }),
    retry: false,
  });
