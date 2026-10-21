import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { SCHOOL_SETTINGS_QUERY_KEY } from "@/hooks/use-school-settings.hook";
import { SchoolSettings } from "@/hooks/use-school-settings.types";
import { useAlertMessage } from "@/providers/alert-message";
import { apiPut, NetworkError, SessionExpiredError } from "@/services/api";

import { SaveSchoolSettingsVariables } from "../school-settings.types";

/**
 * Saves what changed, one request each (the switch, then the number), and puts the last answer, which carries both,
 * in the cache. Errors show in the toast, except an expired session, which is handled once for the whole app; the
 * caller keeps its edits.
 */
export const useSaveSchoolSettings = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const alertMessage = useAlertMessage();

  return useMutation({
    retry: false,
    mutationFn: async ({
      waitingListEnabled,
      whatsappNumber,
    }: SaveSchoolSettingsVariables) => {
      let settings: SchoolSettings | undefined;

      if (waitingListEnabled !== undefined) {
        settings = await apiPut<SchoolSettings>(
          "/school-settings/waiting-list",
          { enabled: waitingListEnabled },
          { authenticated: true },
        );
      }

      if (whatsappNumber !== undefined) {
        settings = await apiPut<SchoolSettings>(
          "/school-settings/whatsapp",
          { whatsappNumber },
          { authenticated: true },
        );
      }

      return settings;
    },
    onSuccess: (settings) => {
      if (settings) {
        queryClient.setQueryData<SchoolSettings>(
          SCHOOL_SETTINGS_QUERY_KEY,
          settings,
        );
      }
    },
    onError: (error) => {
      if (error instanceof SessionExpiredError) {
        return;
      }

      alertMessage.show(
        error instanceof NetworkError
          ? t("createAccount.errors.noConnection")
          : t("createAccount.errors.generic"),
      );
    },
  });
};
