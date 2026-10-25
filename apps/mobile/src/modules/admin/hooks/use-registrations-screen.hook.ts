import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAlertMessage } from "@/providers/alert-message";

import { Registration } from "../registrations.types";
import {
  getRegistrationErrorKey,
  isAlreadyDecided,
} from "../utils/registration-error";

import { useApproveRegistration } from "./use-approve-registration.hook";
import { useDenyRegistration } from "./use-deny-registration.hook";
import { useRegistrations } from "./use-registrations.hook";
import {
  RegistrationAction,
  RegistrationsStatus,
  UseRegistrationsScreenResult,
} from "./use-registrations-screen.types";

export const useRegistrationsScreen = (): UseRegistrationsScreenResult => {
  const { t } = useTranslation();
  const alertMessage = useAlertMessage();
  const query = useRegistrations();
  const approveMutation = useApproveRegistration();
  const denyMutation = useDenyRegistration();

  const [sending, setSending] = useState<Record<string, RegistrationAction>>(
    {},
  );
  const [denying, setDenying] = useState<Registration | null>(null);
  // Kept while the detail sheet slides away, so its content doesn't vanish before it is gone.
  const [selected, setSelected] = useState<Registration | null>(null);
  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // A second tap in the same frame must not send twice, before `sending` has re-rendered.
  const inFlight = useRef(new Set<string>());

  // A decision only closes the sheet that belongs to it: another card's sheet, and its reason, stay.
  const closeDenyOf = (registration: Registration) =>
    setDenying((current) => (current?.id === registration.id ? null : current));

  const decide = async (
    registration: Registration,
    action: RegistrationAction,
    send: () => Promise<unknown>,
  ) => {
    if (inFlight.current.has(registration.id)) {
      return;
    }

    inFlight.current.add(registration.id);
    setSending((current) => ({ ...current, [registration.id]: action }));

    try {
      await send();
      closeDenyOf(registration);
    } catch (error) {
      const key = getRegistrationErrorKey(error);

      if (key) {
        alertMessage.show(t(key));
      }

      if (isAlreadyDecided(error)) {
        closeDenyOf(registration);
      }
    } finally {
      inFlight.current.delete(registration.id);
      setSending((current) => {
        const { [registration.id]: _done, ...rest } = current;

        return rest;
      });
    }
  };

  const approve = (registration: Registration) =>
    decide(registration, "approve", () =>
      approveMutation.mutateAsync(registration.id),
    );

  const confirmDeny = (reason: string) => {
    if (denying) {
      decide(denying, "deny", () =>
        denyMutation.mutateAsync({ id: denying.id, reason }),
      );
    }
  };

  const refresh = async () => {
    setIsRefreshing(true);
    await query.refetch();
    setIsRefreshing(false);
  };

  const registrations = query.data?.items ?? [];
  // A list on screen stays there when a later reload fails; the error state is only for a first load that failed.
  const status: RegistrationsStatus = query.data
    ? registrations.length === 0
      ? "empty"
      : "ready"
    : query.isError
      ? "error"
      : "loading";

  return {
    registrations,
    status,
    isRetrying: query.isFetching,
    isRefreshing,
    sending,
    denying,
    selected,
    isSheetVisible,
    openRegistration: (registration: Registration) => {
      setSelected(registration);
      setIsSheetVisible(true);
    },
    closeSheet: () => setIsSheetVisible(false),
    retry: () => query.refetch(),
    refresh,
    approve,
    openDeny: setDenying,
    closeDeny: () => setDenying(null),
    confirmDeny,
  };
};
