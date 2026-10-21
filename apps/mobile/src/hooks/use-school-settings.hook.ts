import { useQuery } from "@tanstack/react-query";

import { apiGet } from "@/services/api";

import { SchoolSettings } from "./use-school-settings.types";

export const SCHOOL_SETTINGS_QUERY_KEY = ["school-settings"];

/** The school settings (the WhatsApp number and the waiting-list switch); every caller shares one cache entry. */
export const useSchoolSettings = () =>
  useQuery({
    queryKey: SCHOOL_SETTINGS_QUERY_KEY,
    queryFn: () =>
      apiGet<SchoolSettings>("/school-settings", { authenticated: true }),
    retry: false,
  });
