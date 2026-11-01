import { useRef, useState } from "react";

import { useClass } from "@/modules/classes/hooks/use-class.hook";
import { useNow } from "@/modules/classes/hooks/use-now.hook";
import { useSession } from "@/providers/session";

import { useRelativeTime } from "../../hooks/use-relative-time.hook";

import type { UseMessageSheetProps } from "./message-sheet.types";

export const useMessageSheet = ({ message, visible, onClose, onOpenClass }: UseMessageSheetProps) => {
  const { user } = useSession();
  const now = useNow();
  const time = useRelativeTime(message?.createdAt ?? "", now);
  const [isPersonOpen, setIsPersonOpen] = useState(false);
  // Read when the message's sheet is dismissed: the library can call a callback from before the chip was pressed.
  const isShowingPerson = useRef(false);
  const classId = onOpenClass ? (message?.classId ?? null) : null;
  // The sheet stays mounted on its screen: enabling the read when it opens loads the class again, so it's never stale.
  const classQuery = useClass(classId ?? "", { enabled: classId !== null && visible });

  return {
    time,
    // One sheet shows at a time (D-10).
    messageVisible: visible && !isPersonOpen,
    personVisible: visible && isPersonOpen,
    isViewer: message?.sender?.id === user?.id,
    isClassLoading: classId !== null && classQuery.isPending,
    // A deleted class or a failed read shows no card: the message stays readable.
    classItem: classId !== null && !classQuery.isError ? classQuery.data : undefined,
    // Hiding the message for the person sheet also dismisses it: that isn't the person closing it.
    close: () => {
      if (!isShowingPerson.current) {
        onClose();
      }
    },
    // The card shows only with a class to open, so both are there.
    openClass: () => onOpenClass!(classId!),
    openPerson: () => {
      isShowingPerson.current = true;
      setIsPersonOpen(true);
    },
    closePerson: () => {
      isShowingPerson.current = false;
      setIsPersonOpen(false);
    },
  };
};
