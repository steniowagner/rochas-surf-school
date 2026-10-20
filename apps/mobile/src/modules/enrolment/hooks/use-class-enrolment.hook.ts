import { ClassState } from "@rochas-surf-school/classes";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { CANCELLATION_RULES_QUERY_KEY } from "@/modules/cancellation-rules/hooks/use-cancellation-rules.hook";
import type { ClassItem } from "@/modules/classes/classes.types";
import { isClassNotFoundError } from "@/modules/classes/utils/class-error";
import { isClassFull } from "@/modules/classes/utils/occupancy";
import { useAlertMessage } from "@/providers/alert-message";

import { getEnrolmentCta } from "../utils/enrolment-cta";
import {
  getCancelSeatErrorKey,
  getRequestSeatErrorKey,
  getWithdrawRequestErrorKey,
  isRuleNotAcceptedError,
  shouldReloadClass,
} from "../utils/enrolment-error";
import { getEnrolmentDisplay } from "../utils/enrolment-status";

import { useCancelSeat } from "./use-cancel-seat.hook";
import { useRequestSeat } from "./use-request-seat.hook";
import { useWithdrawRequest } from "./use-withdraw-request.hook";

type UseClassEnrolmentProps = {
  item: ClassItem | undefined;
  state: ClassState | null;
  /** Students only: the screen shows the button and the banner of the viewer's own enrolment. */
  canEnrol: boolean;
  /** The phone's clock: the cancellation closes at the class's deadline. */
  now: Date;
  /** Reads the class again when what is on screen turned out to be stale. */
  reload: () => void;
};

/** The student's side of a class's details: the button, the banner and the two flows behind them. */
export const useClassEnrolment = ({ item, state, canEnrol, now, reload }: UseClassEnrolmentProps) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const alertMessage = useAlertMessage();
  const requestSeat = useRequestSeat(item?.id ?? "");
  const withdrawRequest = useWithdrawRequest();
  const cancelSeat = useCancelSeat();
  const [requestVisible, setRequestVisible] = useState(false);
  const [withdrawVisible, setWithdrawVisible] = useState(false);
  const [cancelVisible, setCancelVisible] = useState(false);
  const [denialVisible, setDenialVisible] = useState(false);
  // A second press in the same frame must not send twice, before `isPending` has re-rendered.
  const sending = useRef(false);

  // Only a class that hasn't started takes or loses a request; the started, finished and cancelled states win.
  const open = canEnrol && item !== undefined && state === "not-started";
  const full = item ? isClassFull(item.seatsTaken, item.capacity) : false;
  // The deadline is exclusive: at it the seat is no longer cancellable (as the backend decides).
  const canCancel =
    item?.cancellationDeadline != null && now.getTime() < new Date(item.cancellationDeadline).getTime();
  // An approved seat can no longer be cancelled in the app: the student contacts the school instead.
  const deadlineNote =
    open && item.myEnrolment?.status === "approved" && !canCancel
      ? item.cancellationDeadline === null
        ? ("missing" as const)
        : ("passed" as const)
      : null;
  const cta = open ? getEnrolmentCta(item.myEnrolment, full, canCancel) : null;
  // A denial stays on the banner after the class started or was cancelled, so the student can still read the reason.
  const denied = canEnrol && item?.myEnrolment?.status === "denied";
  const display = open || denied ? getEnrolmentDisplay(item?.myEnrolment ?? null, full) : null;

  const showError = (messageKey: string | null) => {
    if (messageKey !== null) {
      alertMessage.show(t(messageKey));
    }
  };

  const request = async () => {
    if (sending.current) {
      return;
    }

    sending.current = true;

    try {
      await requestSeat.mutateAsync({ acceptCancellationRule: true });

      alertMessage.show(
        t(full ? "enrolment.requestSheet.doneWaitingList" : "enrolment.requestSheet.done"),
      );
      setRequestVisible(false);
    } catch (error) {
      if (shouldReloadClass(error) || isClassNotFoundError(error)) {
        setRequestVisible(false);
        reload();
      }

      if (isRuleNotAcceptedError(error)) {
        void queryClient.invalidateQueries({ queryKey: CANCELLATION_RULES_QUERY_KEY });
      }

      showError(getRequestSeatErrorKey(error));
    } finally {
      sending.current = false;
    }
  };

  const withdraw = async () => {
    if (sending.current || !item?.myEnrolment) {
      return;
    }

    sending.current = true;

    try {
      await withdrawRequest.mutateAsync(item.myEnrolment.id);

      alertMessage.show(
        t(full ? "enrolment.withdrawSheet.doneWaitingList" : "enrolment.withdrawSheet.done"),
      );
      setWithdrawVisible(false);
    } catch (error) {
      if (shouldReloadClass(error)) {
        setWithdrawVisible(false);
        reload();
      }

      showError(getWithdrawRequestErrorKey(error));
    } finally {
      sending.current = false;
    }
  };

  const cancel = async () => {
    if (sending.current || !item?.myEnrolment) {
      return;
    }

    sending.current = true;

    try {
      await cancelSeat.mutateAsync(item.myEnrolment.id);

      alertMessage.show(t("enrolment.cancelSeatSheet.done"));
      setCancelVisible(false);
    } catch (error) {
      if (shouldReloadClass(error)) {
        setCancelVisible(false);
        reload();
      }

      showError(getCancelSeatErrorKey(error));
    } finally {
      sending.current = false;
    }
  };

  const pressCta = () => {
    if (cta?.action === "request") {
      setRequestVisible(true);
    } else if (cta?.action === "withdraw") {
      setWithdrawVisible(true);
    } else if (cta?.action === "cancelSeat") {
      setCancelVisible(true);
    } else if (cta?.action === "leaveWaitingList") {
      // On the waiting list nothing is lost by leaving: no confirmation, as in the design.
      void withdraw();
    }
  };

  return {
    cta,
    deadlineNote,
    display,
    // Only the denial banner is pressable: it opens the reason.
    pressableDisplay: display?.key === "denied",
    denialVisible,
    openDenial: () => setDenialVisible(true),
    closeDenial: () => setDenialVisible(false),
    denialReason: item?.myEnrolment?.reason ?? null,
    // Students who may still ask for a seat get the invitation on the full-class banner.
    invitesWaitingList: cta?.key === "joinWaitingList",
    pressCta,
    // Leaving the waiting list sends from the button itself; the other withdrawal sends from its sheet.
    ctaLoading: withdrawRequest.isPending && !withdrawVisible,
    requestVisible,
    closeRequest: () => setRequestVisible(false),
    request,
    requesting: requestSeat.isPending,
    withdrawVisible,
    closeWithdraw: () => setWithdrawVisible(false),
    withdraw,
    withdrawing: withdrawRequest.isPending,
    cancelVisible,
    closeCancel: () => setCancelVisible(false),
    cancel,
    cancelling: cancelSeat.isPending,
    waitingList: full,
  };
};
