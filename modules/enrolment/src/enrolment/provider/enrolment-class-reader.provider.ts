import { ClassDiscipline } from "@rochas-surf-school/classes";

/** What enrolment needs to know about a class. */
export interface EnrolmentClass {
  id: string;
  discipline: ClassDiscipline;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  cancelledAt: Date | null;
  /** Until when students may cancel their seat; null while it can't be worked out. */
  cancellationDeadline: Date | null;
  instructorIds: string[];
  /** Whether the class's discipline has a cancellation rule written. */
  hasCancellationRule: boolean;
}

export interface EnrolmentClassReader {
  /** The class, or null when there is none. */
  findById(id: string): Promise<EnrolmentClass | null>;
}
