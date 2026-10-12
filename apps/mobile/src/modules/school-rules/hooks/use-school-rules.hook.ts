import { useQuery } from "@tanstack/react-query";

import { apiGet } from "@/services/api";

import { SchoolRules } from "../school-rules.types";

export const SCHOOL_RULES_QUERY_KEY = ["school-rules"];

/**
 * The current school rules and their version. Every caller shares one cache entry, so the text shown and the
 * version accepted are the same. An expired session is handled once for the whole app (spec 018, D-08).
 */
export const useSchoolRules = () =>
  useQuery({
    queryKey: SCHOOL_RULES_QUERY_KEY,
    queryFn: () =>
      apiGet<SchoolRules>("/school-rules", { authenticated: true }),
    retry: false,
  });
