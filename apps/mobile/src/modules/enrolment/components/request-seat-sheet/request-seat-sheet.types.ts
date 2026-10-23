import type { ClassDiscipline, ClassLevel } from "@rochas-surf-school/classes";

export type RequestSeatSheetProps = {
  visible: boolean;
  /** The request is being sent. */
  loading: boolean;
  /** The class is full: the request goes on the waiting list. */
  waitingList: boolean;
  discipline: ClassDiscipline;
  level: ClassLevel;
  startsAt: string;
  endsAt: string;
  locationName: string;
  /** Until when the class can be cancelled, already formatted, or `null` while it can't be worked out. */
  deadline: string | null;
  onConfirm: () => void;
  onClose: () => void;
};

export type UseRequestSeatSheetProps = Pick<RequestSeatSheetProps, "visible" | "discipline" | "onClose">;
