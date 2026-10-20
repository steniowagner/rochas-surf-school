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

export interface RequestDecided {
  studentId: string;
  classId: string;
  discipline: ClassDiscipline;
  startsAt: Date;
}

export interface RequestDenied extends RequestDecided {
  /** The admin's trimmed reason, when one was given. */
  reason?: string;
}

export interface SeatCancelled {
  classId: string;
  studentName: string;
  discipline: ClassDiscipline;
  startsAt: Date;
  /** The class's pending requests, counted after the cancellation. */
  waitingCount: number;
  /** The class's instructors; the adapter adds the approved admins and tells each person once. */
  instructorIds: string[];
}

export interface StudentEnrolled extends RequestDecided {}

export interface EnrolmentNotifier {
  /** Tells the admins and the class's instructors that a student asked for a seat. */
  seatRequested(event: SeatRequested): Promise<void>;
  /** Tells the student that the class started without a seat for the request. */
  requestExpired(event: RequestExpired): Promise<void>;
  /** Tells the student that the request was approved. */
  requestApproved(event: RequestDecided): Promise<void>;
  /** Tells the student that the request was denied, with the reason when there is one. */
  requestDenied(event: RequestDenied): Promise<void>;
  /** Tells the student that an admin enrolled them directly. */
  studentEnrolled(event: StudentEnrolled): Promise<void>;
  /** Tells the admins (with the waiting count) and the class's instructors that a student gave up a seat. */
  seatCancelled(event: SeatCancelled): Promise<void>;
}
