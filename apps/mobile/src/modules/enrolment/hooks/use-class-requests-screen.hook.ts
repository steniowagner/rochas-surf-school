import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { routes } from "@/constants/routes";
import type { DisciplineFilterValue } from "@/modules/classes/classes.types";
import { useAlertMessage } from "@/providers/alert-message";

import type { RequestAction } from "../components/class-requests-group/class-requests-group.types";
import type { PendingRequest, PendingRequestsClass } from "../enrolment.types";
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
  const router = useRouter();
  const alertMessage = useAlertMessage();
  const query = usePendingRequests();
  const approveMutation = useApproveRequest();
  const denyMutation = useDenyRequest();

  const [sending, setSending] = useState<Record<string, RequestAction>>({});
  const [denying, setDenying] = useState<PendingRequest | null>(null);
  // Kept after the sheet closes, so its content stays while it slides away.
  const [student, setStudent] = useState<PendingRequest | null>(null);
  const [studentVisible, setStudentVisible] = useState(false);
  const [discipline, setDiscipline] = useState<DisciplineFilterValue>("all");
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

  const allClasses = query.data?.classes ?? [];
  const classes = allClasses.filter(
    (item) => discipline === "all" || item.discipline === discipline,
  );
  // A list on screen stays there when a later reload fails; the error state is only for a first load that failed.
  const status: ClassRequestsStatus = query.data
    ? allClasses.length === 0
      ? "empty"
      : "ready"
    : query.isError
      ? "error"
      : "loading";

  return {
    classes,
    total: classes.reduce((sum, item) => sum + item.requests.length, 0),
    discipline,
    selectDiscipline: setDiscipline,
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
    student,
    studentVisible,
    openStudent: (request: PendingRequest) => {
      setStudent(request);
      setStudentVisible(true);
    },
    openClass: (item: PendingRequestsClass) =>
      router.push(routes.admin.classDetail(item.id)),
    closeStudent: () => setStudentVisible(false),
  };
};
