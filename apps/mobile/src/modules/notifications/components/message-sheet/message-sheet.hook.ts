import { useClass } from "@/modules/classes/hooks/use-class.hook";
import { useNow } from "@/modules/classes/hooks/use-now.hook";

import { useRelativeTime } from "../../hooks/use-relative-time.hook";

import type { UseMessageSheetProps } from "./message-sheet.types";

export const useMessageSheet = ({ message, visible, onOpenClass }: UseMessageSheetProps) => {
  const now = useNow();
  const time = useRelativeTime(message?.createdAt ?? "", now);
  const classId = onOpenClass ? (message?.classId ?? null) : null;
  // The sheet stays mounted on its screen: enabling the read when it opens loads the class again, so it's never stale.
  const classQuery = useClass(classId ?? "", { enabled: classId !== null && visible });

  return {
    subtitle: [message?.sender?.name, time].filter(Boolean).join(" · "),
    isClassLoading: classId !== null && classQuery.isPending,
    // A deleted class or a failed read shows no card: the message stays readable.
    classItem: classId !== null && !classQuery.isError ? classQuery.data : undefined,
    // The card shows only with a class to open, so both are there.
    openClass: () => onOpenClass!(classId!),
  };
};
