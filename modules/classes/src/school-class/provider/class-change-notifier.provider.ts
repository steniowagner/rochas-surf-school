import { ClassDiscipline } from "../model";

export interface ClassEdited {
  instructorIds: string[];
  /** The students with a seat or a pending request; absent when there are none. */
  studentIds?: string[];
  classId: string;
  discipline: ClassDiscipline;
  startsAt: Date;
}

export interface ClassCancelled {
  instructorIds: string[];
  /** The students whose open enrolment ended with the cancellation; absent when there are none. */
  studentIds?: string[];
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
