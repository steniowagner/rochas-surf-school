import type { ClassDiscipline, ClassLevel } from "@rochas-surf-school/classes";

export type RequestSeatClassCardProps = {
  discipline: ClassDiscipline;
  level: ClassLevel;
  startsAt: string;
  endsAt: string;
  locationName: string;
  /** Makes the card pressable, with a chevron. */
  onPress?: () => void;
};

export type UseRequestSeatClassCardProps = Pick<RequestSeatClassCardProps, "startsAt" | "endsAt">;
