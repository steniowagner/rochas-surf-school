import { ClassDiscipline } from "../model";

export interface ClassEdited {
  instructorIds: string[];
  classId: string;
  discipline: ClassDiscipline;
  startsAt: Date;
}

export interface ClassChangeNotifier {
  classEdited(event: ClassEdited): Promise<void>;
}
