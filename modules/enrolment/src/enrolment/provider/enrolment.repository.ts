import { ClassDiscipline } from "@rochas-surf-school/classes";
import { Enrolment } from "../model";

/** A pending enrolment of a class that already started, with what its notification needs. */
export interface ExpirableEnrolment {
  enrolment: Enrolment;
  discipline: ClassDiscipline;
  startsAt: Date;
}

export interface EnrolmentRepository {
  /**
   * Stores the enrolment. Throws a 409 `enrolment.alreadyOpen` when the student already has a pending or
   * approved enrolment in the class: of two simultaneous requests exactly one is stored.
   */
  create(enrolment: Enrolment): Promise<Enrolment>;
  /** The enrolment, or null when there is none. */
  findById(id: string): Promise<Enrolment | null>;
  /**
   * Ends the enrolment as withdrawn at `now`, only while it is still pending. Returns `true` when it wrote and
   * `false` otherwise (no longer pending, or gone): of two simultaneous withdraws exactly one wins.
   */
  withdraw(id: string, now: Date): Promise<boolean>;
  /** The pending enrolments of the classes that started at or before `now` and aren't cancelled. */
  findExpirable(now: Date): Promise<ExpirableEnrolment[]>;
  /** Ends the enrolment as expired at `now`, only while it is still pending. Returns whether it wrote. */
  expire(id: string, now: Date): Promise<boolean>;
  /**
   * Ends every pending and approved enrolment of the class as `classCancelled` at `now` and returns the ones it
   * closed. Ended enrolments stay as they are.
   */
  closeOpenForClass(classId: string, now: Date): Promise<Enrolment[]>;
}
