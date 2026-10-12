import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { useSignOut } from "@/modules/auth/hooks/use-sign-out.hook";
import { useAlertMessage } from "@/providers/alert-message";
import { useSession } from "@/providers/session";
import { apiGet, ApiError } from "@/services/api";

import { SchoolRules } from "../school-rules.types";

export const SCHOOL_RULES_QUERY_KEY = ["school-rules"];

const INVALID_TOKEN = "auth.token.invalid";

/**
 * The current school rules and their version. Every caller shares one cache entry, so the text shown and the
 * version accepted are the same. An expired access token can't be renewed yet, so a 401 signs out locally; it is
 * handled in the query function so it runs once per request, however many components read the rules (spec 012, D-09).
 */
export const useSchoolRules = () => {
  const { t } = useTranslation();
  const { tokens } = useSession();
  const alertMessage = useAlertMessage();
  const { signOut } = useSignOut();

  return useQuery({
    queryKey: SCHOOL_RULES_QUERY_KEY,
    queryFn: async () => {
      try {
        return await apiGet<SchoolRules>("/school-rules", {
          accessToken: tokens?.accessToken,
        });
      } catch (error) {
        if (
          error instanceof ApiError &&
          error.status === 401 &&
          error.errors[0] === INVALID_TOKEN
        ) {
          alertMessage.show(t("session.expired"));
          signOut();
        }

        throw error;
      }
    },
    retry: false,
  });
};
