import type { ClassDiscipline, ClassLevel } from "@rochas-surf-school/classes";

export type RequestSeatClassCardProps = {
  discipline: ClassDiscipline;
  level: ClassLevel;
  startsAt: string;
  endsAt: string;
  locationName: string;
};

export type UseRequestSeatClassCardProps = Pick<RequestSeatClassCardProps, "startsAt" | "endsAt">;
