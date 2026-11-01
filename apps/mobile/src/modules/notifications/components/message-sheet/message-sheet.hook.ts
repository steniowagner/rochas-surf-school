import { useState } from "react";

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
  const classId = onOpenClass ? (message?.classId ?? null) : null;
  const classQuery = useClass(classId ?? "", { enabled: classId !== null });

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
      if (!isPersonOpen) {
        onClose();
      }
    },
    openClass: () => {
      if (classId !== null) {
        onOpenClass?.(classId);
      }
    },
    openPerson: () => setIsPersonOpen(true),
    closePerson: () => setIsPersonOpen(false),
  };
};
