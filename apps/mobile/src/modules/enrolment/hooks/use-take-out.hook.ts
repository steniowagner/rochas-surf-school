import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAlertMessage } from "@/providers/alert-message";

import type { TakeOutTarget } from "../enrolment.types";
import { getTakeOutErrorKey, shouldReloadClass } from "../utils/enrolment-error";

import { useTakeStudentOut } from "./use-take-student-out.hook";

/**
 * The take-out of a student from a class's details: the student the sheet is open for, the request with its toasts,
 * and `reload` when the class turned out to have changed (it started, or the seat was already gone).
 */
export const useTakeOut = (reload: () => void) => {
  const { t } = useTranslation();
  const alertMessage = useAlertMessage();
  const mutation = useTakeStudentOut();
  const [target, setTarget] = useState<TakeOutTarget | null>(null);
  // A second press in the same frame must not send twice, before `isPending` has re-rendered.
  const inFlight = useRef(false);

  const close = () => setTarget(null);

  const confirm = async (reason: string) => {
    if (!target || inFlight.current) {
      return;
    }

    inFlight.current = true;

    try {
      await mutation.mutateAsync({ id: target.enrolmentId, reason });
      alertMessage.show(t("takeOutSheet.done", { name: target.name }));
      close();
    } catch (error) {
      const key = getTakeOutErrorKey(error);

      if (key) {
        alertMessage.show(t(key));
      }

      if (shouldReloadClass(error)) {
        close();
        reload();
      }
    } finally {
      inFlight.current = false;
    }
  };

  return {
    target,
    open: setTarget,
    close,
    confirm,
    isPending: mutation.isPending,
  };
};
