import { ClassDiscipline, ClassLevel } from "@rochas-surf-school/classes";
import { Enrolment } from "../model";

/** A pending enrolment of a class that already started, with what its notification needs. */
export interface ExpirableEnrolment {
  enrolment: Enrolment;
  discipline: ClassDiscipline;
  startsAt: Date;
}

/** An upcoming class with pending requests, with what the admins' tool shows. */
export interface PendingRequestsClass {
  id: string;
  discipline: ClassDiscipline;
  level: ClassLevel;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  seatsTaken: number;
  location: { name: string };
  /** In the order asked: `requestedAt`, then id. */
  requests: PendingRequest[];
}

export interface PendingRequest {
  id: string;
  requestedAt: Date;
  student: { id: string; name: string; photoUrl: string | null };
}

/** What approving a request came to. */
export type ApproveResult = "approved" | "full" | "notPending";

/** What enrolling a student directly came to: a new approved row, a pending one approved, or a refusal. */
export type DirectEnrolResult =
  | { result: "enrolled"; enrolment: Enrolment }
  | { result: "approved"; enrolment: Enrolment }
  | { result: "alreadyApproved" }
  | { result: "full" };

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
  /**
   * The classes that start after `now`, aren't cancelled and have pending requests, sorted by start then id,
   * each with its requests in the order asked.
   */
  findPendingByClass(now: Date): Promise<PendingRequestsClass[]>;
  /**
   * Approves the request at `now`. Locks the class, counts the seats taken and writes only while the enrolment is
   * still pending: `full` when the class has no free seat, `notPending` when it was decided meanwhile or is gone.
   * Of two simultaneous approvals for the last seat exactly one is `approved`.
   */
  approve(id: string, now: Date): Promise<ApproveResult>;
  /**
   * Gives the student a seat at `now`. Locks the class and counts the seats taken, then: `alreadyApproved` when the
   * student already holds a seat, `full` when none is free, `approved` when the student's pending request was
   * approved (the stored one is returned), otherwise `enrolled` with `enrolment` stored. Of two simultaneous
   * writes for the last seat exactly one wins.
   */
  enrolDirectly(enrolment: Enrolment, now: Date): Promise<DirectEnrolResult>;
  /** Denies the request with the (optional) reason at `now`, only while it is pending. Returns whether it wrote. */
  deny(id: string, reason: string | null, now: Date): Promise<boolean>;
  /** Ends the enrolment as cancelled at `now`, only while it is still approved. Returns whether it wrote. */
  cancel(id: string, now: Date): Promise<boolean>;
  /** How many pending requests the class has. */
  countPendingForClass(classId: string): Promise<number>;
  /**
   * Gives up everything the student holds: ends as withdrawn every pending enrolment and as cancelled every
   * approved one of a class that hasn't started at `now` and isn't cancelled. Returns the cancelled ones.
   */
  releaseForStudent(studentId: string, now: Date): Promise<Enrolment[]>;
}
