import { ClassDiscipline } from "../model";

export interface ClassEdited {
  instructorIds: string[];
  classId: string;
  discipline: ClassDiscipline;
  startsAt: Date;
}

export interface ClassCancelled {
  instructorIds: string[];
  classId: string;
  discipline: ClassDiscipline;
  startsAt: Date;
  /** The admin's message, trimmed; absent when there is none. */
  message?: string;
}

export interface ClassDeleted {
  instructorIds: string[];
  discipline: ClassDiscipline;
  startsAt: Date;
}

export interface ClassChangeNotifier {
  classEdited(event: ClassEdited): Promise<void>;
  classCancelled(event: ClassCancelled): Promise<void>;
  classDeleted(event: ClassDeleted): Promise<void>;
}
