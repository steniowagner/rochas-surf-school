import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { DecidedItem } from "@/components/decision/decided-list/decided-list.types";
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
  const [decided, setDecided] = useState<DecidedItem[]>([]);
  const [denying, setDenying] = useState<Registration | null>(null);
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
      setDecided((current) => [
        {
          id: registration.id,
          title: registration.name,
          tag: t(
            action === "approve" ? "decision.approved" : "decision.denied",
          ),
          tone: action === "approve" ? "ok" : "bad",
        },
        ...current,
      ]);
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

  return {
    registrations: query.data?.items ?? [],
    isLoading: query.isPending,
    isError: query.isError,
    isRefreshing,
    sending,
    decided,
    denying,
    retry: () => query.refetch(),
    refresh,
    approve,
    openDeny: setDenying,
    closeDeny: () => setDenying(null),
    confirmDeny,
  };
};
