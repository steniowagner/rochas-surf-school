import { ClassDiscipline } from "../model";

/** Classes left with nobody to teach them; `classId`, `discipline` and `startsAt` are the earliest one's. */
export interface ClassesWithoutInstructor {
  count: number;
  classId: string;
  discipline: ClassDiscipline;
  startsAt: Date;
  excludeUserIds: string[];
}

export interface NoInstructorNotifier {
  classesWithoutInstructor(event: ClassesWithoutInstructor): Promise<void>;
}
