import type { ClassItem } from "../../classes.types";
import type { StudentsLabel } from "../../utils/occupancy";
import type { ClassCardAvatar } from "../class-card/class-card.types";

export type OngoingClassCardProps = {
  /** A class under way (started, not cancelled). */
  item: ClassItem;
  onPress: (id: string) => void;
};

export type UseOngoingClassCardProps = Pick<OngoingClassCardProps, "item">;

export type UseOngoingClassCardResult = {
  /** "08:00 – 09:30", America/Fortaleza. */
  timeRange: string;
  /** 0 to 100. */
  occupancyPercent: number;
  full: boolean;
  /** The students whose avatars the footer shows (up to 4). */
  avatars: ClassCardAvatar[];
  /** The seats taken that no avatar shows ("+N"). */
  hiddenSeats: number;
  studentsLabel: StudentsLabel;
};
