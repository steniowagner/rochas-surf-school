import { ClassDiscipline } from "@rochas-surf-school/classes";

export interface SeatRequested {
  classId: string;
  studentName: string;
  discipline: ClassDiscipline;
  startsAt: Date;
  /** The class's instructors; the adapter adds the approved admins and tells each person once. */
  instructorIds: string[];
}

export interface RequestExpired {
  studentId: string;
  classId: string;
  discipline: ClassDiscipline;
  startsAt: Date;
}

export interface EnrolmentNotifier {
  /** Tells the admins and the class's instructors that a student asked for a seat. */
  seatRequested(event: SeatRequested): Promise<void>;
  /** Tells the student that the class started without a seat for the request. */
  requestExpired(event: RequestExpired): Promise<void>;
}
