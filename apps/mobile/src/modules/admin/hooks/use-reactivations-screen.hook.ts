import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAlertMessage } from "@/providers/alert-message";

import { ReactivationRequest } from "../reactivations.types";
import {
  getReactivationErrorKey,
  isReactivationAlreadyDecided,
} from "../utils/reactivation-error";

import { useApproveReactivation } from "./use-approve-reactivation.hook";
import { useDenyReactivation } from "./use-deny-reactivation.hook";
import { useReactivationRequests } from "./use-reactivation-requests.hook";
import {
  ReactivationAction,
  ReactivationsStatus,
  UseReactivationsScreenResult,
} from "./use-reactivations-screen.types";

export const useReactivationsScreen = (): UseReactivationsScreenResult => {
  const { t } = useTranslation();
  const alertMessage = useAlertMessage();
  const query = useReactivationRequests();
  const approveMutation = useApproveReactivation();
  const denyMutation = useDenyReactivation();

  const [sending, setSending] = useState<Record<string, ReactivationAction>>(
    {},
  );
  const [denying, setDenying] = useState<ReactivationRequest | null>(null);
  // Kept while the detail sheet slides away, so its content doesn't vanish before it is gone.
  const [selected, setSelected] = useState<ReactivationRequest | null>(null);
  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // A second tap in the same frame must not send twice, before `sending` has re-rendered.
  const inFlight = useRef(new Set<string>());

  // A decision only closes the sheet that belongs to it: another card's sheet, and its reason, stay.
  const closeDenyOf = (request: ReactivationRequest) =>
    setDenying((current) => (current?.id === request.id ? null : current));

  const decide = async (
    request: ReactivationRequest,
    action: ReactivationAction,
    send: () => Promise<unknown>,
  ) => {
    if (inFlight.current.has(request.id)) {
      return;
    }

    inFlight.current.add(request.id);
    setSending((current) => ({ ...current, [request.id]: action }));

    try {
      await send();
      closeDenyOf(request);
    } catch (error) {
      const key = getReactivationErrorKey(error);

      if (key) {
        alertMessage.show(t(key));
      }

      if (isReactivationAlreadyDecided(error)) {
        closeDenyOf(request);
      }
    } finally {
      inFlight.current.delete(request.id);
      setSending((current) => {
        const { [request.id]: _done, ...rest } = current;

        return rest;
      });
    }
  };

  const approve = (request: ReactivationRequest) =>
    decide(request, "approve", () => approveMutation.mutateAsync(request.id));

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

  const requests = query.data?.items ?? [];
  // A list on screen stays there when a later reload fails; the error state is only for a first load that failed.
  const status: ReactivationsStatus = query.data
    ? requests.length === 0
      ? "empty"
      : "ready"
    : query.isError
      ? "error"
      : "loading";

  return {
    requests,
    status,
    isRetrying: query.isFetching,
    isRefreshing,
    sending,
    denying,
    selected,
    isSheetVisible,
    openRequest: (request: ReactivationRequest) => {
      setSelected(request);
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
