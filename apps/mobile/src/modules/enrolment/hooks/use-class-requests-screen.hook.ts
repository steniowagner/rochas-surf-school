import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAlertMessage } from "@/providers/alert-message";

import type { RequestAction } from "../components/class-requests-group/class-requests-group.types";
import type { PendingRequest } from "../enrolment.types";
import {
  getDecideRequestErrorKey,
  shouldReloadRequests,
} from "../utils/enrolment-error";

import type { ClassRequestsStatus } from "./use-class-requests-screen.types";
import { useApproveRequest } from "./use-approve-request.hook";
import { useDenyRequest } from "./use-deny-request.hook";
import { usePendingRequests } from "./use-pending-requests.hook";

export const useClassRequestsScreen = () => {
  const { t } = useTranslation();
  const alertMessage = useAlertMessage();
  const query = usePendingRequests();
  const approveMutation = useApproveRequest();
  const denyMutation = useDenyRequest();

  const [sending, setSending] = useState<Record<string, RequestAction>>({});
  const [denying, setDenying] = useState<PendingRequest | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // A second tap in the same frame must not send twice, before `sending` has re-rendered.
  const inFlight = useRef(new Set<string>());

  // A decision only closes the sheet that belongs to it: another card's sheet, and its reason, stay.
  const closeDenyOf = (request: PendingRequest) =>
    setDenying((current) => (current?.id === request.id ? null : current));

  const decide = async (
    request: PendingRequest,
    action: RequestAction,
    send: () => Promise<unknown>,
    doneKey: string,
  ) => {
    if (inFlight.current.has(request.id)) {
      return;
    }

    inFlight.current.add(request.id);
    setSending((current) => ({ ...current, [request.id]: action }));

    try {
      await send();
      closeDenyOf(request);
      alertMessage.show(t(doneKey, { name: request.student.name }));
    } catch (error) {
      const key = getDecideRequestErrorKey(error);

      if (key) {
        alertMessage.show(t(key));
      }

      if (shouldReloadRequests(error)) {
        closeDenyOf(request);
        void query.refetch();
      }
    } finally {
      inFlight.current.delete(request.id);
      setSending((current) => {
        const { [request.id]: _done, ...rest } = current;

        return rest;
      });
    }
  };

  const approve = (request: PendingRequest) =>
    decide(
      request,
      "approve",
      () => approveMutation.mutateAsync(request.id),
      "classRequests.approved",
    );

  const confirmDeny = (reason: string) => {
    if (denying) {
      void decide(
        denying,
        "deny",
        () => denyMutation.mutateAsync({ id: denying.id, reason }),
        "classRequests.denied",
      );
    }
  };

  const refresh = async () => {
    setIsRefreshing(true);
    await query.refetch();
    setIsRefreshing(false);
  };

  const classes = query.data?.classes ?? [];
  // A list on screen stays there when a later reload fails; the error state is only for a first load that failed.
  const status: ClassRequestsStatus = query.data
    ? classes.length === 0
      ? "empty"
      : "ready"
    : query.isError
      ? "error"
      : "loading";

  return {
    classes,
    total: query.data?.total ?? 0,
    status,
    isLoading: query.isPending,
    isRetrying: query.isFetching,
    isRefreshing,
    sending,
    denying,
    retry: () => query.refetch(),
    refresh,
    approve,
    openDeny: setDenying,
    closeDeny: () => setDenying(null),
    confirmDeny,
  };
};
