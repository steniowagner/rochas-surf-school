import { ClassDiscipline } from "../model";

export interface ClassReminder {
  /** The approved students and the instructors of the class, each once. */
  recipientIds: string[];
  classId: string;
  discipline: ClassDiscipline;
  startsAt: Date;
  locationName: string;
}

export interface ClassReminderNotifier {
  classReminder(event: ClassReminder): Promise<void>;
}
