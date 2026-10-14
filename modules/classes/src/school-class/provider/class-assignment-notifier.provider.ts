import { ClassDiscipline } from "../model";

export interface ClassAssigned {
  instructorIds: string[];
  count: number;
  discipline: ClassDiscipline;
}

export interface ClassAssignmentNotifier {
  classAssigned(event: ClassAssigned): Promise<void>;
}
