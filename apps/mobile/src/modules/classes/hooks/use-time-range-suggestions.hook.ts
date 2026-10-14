import { useQuery } from "@tanstack/react-query";

import { apiGet } from "@/services/api";

import { TimeRangeSuggestionsResponse } from "../classes.types";

/** The time ranges of last week's classes; a failure just leaves the screen without suggestions. */
export const useTimeRangeSuggestions = () =>
  useQuery({
    queryKey: ["classes", "time-range-suggestions"],
    queryFn: () =>
      apiGet<TimeRangeSuggestionsResponse>("/classes/time-range-suggestions", {
        authenticated: true,
      }),
    retry: false,
  });
