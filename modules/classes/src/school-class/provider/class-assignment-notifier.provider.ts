import { ClassDiscipline } from "../model";

export interface ClassAssigned {
  instructorIds: string[];
  count: number;
  discipline: ClassDiscipline;
}

export interface ClassUnassigned {
  instructorIds: string[];
  classId: string;
  discipline: ClassDiscipline;
  startsAt: Date;
}

export interface ClassAssignmentNotifier {
  classAssigned(event: ClassAssigned): Promise<void>;
  classUnassigned(event: ClassUnassigned): Promise<void>;
}
