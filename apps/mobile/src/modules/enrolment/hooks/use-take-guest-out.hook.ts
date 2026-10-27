import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAlertMessage } from "@/providers/alert-message";

import type { RemoveGuestTarget } from "../enrolment.types";
import { getRemoveGuestErrorKey, shouldReloadClass } from "../utils/enrolment-error";

import { useRemoveGuest } from "./use-remove-guest.hook";

/**
 * The removal of a trial guest from a class's details: the guest the sheet is open for, the request with its toasts,
 * and `reload` when the class turned out to have changed (it started, or the guest was already gone).
 */
export const useTakeGuestOut = (reload: () => void) => {
  const { t } = useTranslation();
  const alertMessage = useAlertMessage();
  const mutation = useRemoveGuest();
  const [target, setTarget] = useState<RemoveGuestTarget | null>(null);
  // A second press in the same frame must not send twice, before `isPending` has re-rendered.
  const inFlight = useRef(false);

  const close = () => setTarget(null);

  const confirm = async () => {
    if (!target || inFlight.current) {
      return;
    }

    inFlight.current = true;

    try {
      await mutation.mutateAsync({ id: target.guestId });
      alertMessage.show(t("takeOutSheet.guestDone", { name: target.name }), { tone: "success" });
      close();
    } catch (error) {
      const key = getRemoveGuestErrorKey(error);

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
