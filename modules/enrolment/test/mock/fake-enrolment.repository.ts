import { ConflictError } from "@rochas-surf-school/shared";
import {
  ApproveResult,
  DirectEnrolResult,
  Enrolment,
  EnrolmentClass,
  EnrolmentRepository,
  ExpirableEnrolment,
  PendingRequestsClass,
} from "../../src";

export class FakeEnrolmentRepository implements EnrolmentRepository {
  /** Set to make the next `create` fail (a lost race, for instance). */
  createError: Error | null = null;
  /** What `findPendingByClass` reads: the read model the database adapter builds with a join. */
  pendingClasses: PendingRequestsClass[] = [];
  private enrolments: Enrolment[];

  constructor(
    enrolments: Enrolment[] = [],
    private readonly classes: EnrolmentClass[] = [],
  ) {
    this.enrolments = [...enrolments];
  }

  get all(): Enrolment[] {
    return [...this.enrolments];
  }

  async create(enrolment: Enrolment): Promise<Enrolment> {
    if (this.createError) throw this.createError;

    const open = this.enrolments.some(
      (item) =>
        item.isOpen && item.classId === enrolment.classId && item.studentId === enrolment.studentId,
    );
    if (open && enrolment.isOpen) throw new ConflictError("enrolment.alreadyOpen");

    this.enrolments.push(enrolment);
    return enrolment;
  }

  async findById(id: string): Promise<Enrolment | null> {
    return this.enrolments.find((item) => item.id === id) ?? null;
  }

  async withdraw(id: string, now: Date): Promise<boolean> {
    return this.change(id, (item) => item.withdraw(now));
  }

  async findExpirable(now: Date): Promise<ExpirableEnrolment[]> {
    const expirable: ExpirableEnrolment[] = [];

    for (const enrolment of this.enrolments) {
      const found = this.classes.find((item) => item.id === enrolment.classId);

      if (
        enrolment.status === "pending" &&
        found &&
        !found.cancelledAt &&
        found.startsAt.getTime() <= now.getTime()
      ) {
        expirable.push({ enrolment, discipline: found.discipline, startsAt: found.startsAt });
      }
    }

    return expirable;
  }

  async expire(id: string, now: Date): Promise<boolean> {
    return this.change(id, (item) => item.expire(now));
  }

  async findPendingByClass(now: Date): Promise<PendingRequestsClass[]> {
    return this.pendingClasses.filter(
      (item) => item.startsAt.getTime() > now.getTime() && item.requests.length > 0,
    );
  }

  async approve(id: string, now: Date): Promise<ApproveResult> {
    const stored = this.enrolments.find((item) => item.id === id);
    const found = stored && this.classes.find((item) => item.id === stored.classId);

    if (!stored || !found || stored.status !== "pending") return "notPending";

    const taken = this.enrolments.filter(
      (item) => item.classId === stored.classId && item.status === "approved",
    ).length;

    if (taken >= found.capacity) return "full";

    this.change(id, (item) => item.approve(now));
    return "approved";
  }

  async enrolDirectly(enrolment: Enrolment, now: Date): Promise<DirectEnrolResult> {
    const found = this.classes.find((item) => item.id === enrolment.classId);
    const forClass = this.enrolments.filter((item) => item.classId === enrolment.classId);

    if (!found) return { result: "full" };

    if (forClass.some((item) => item.studentId === enrolment.studentId && item.status === "approved")) {
      return { result: "alreadyApproved" };
    }

    if (forClass.filter((item) => item.status === "approved").length >= found.capacity) {
      return { result: "full" };
    }

    const pending = forClass.find((item) => item.studentId === enrolment.studentId && item.status === "pending");

    if (pending) {
      const approved = pending.approve(now);
      this.enrolments = this.enrolments.map((item) => (item.id === pending.id ? approved : item));
      return { result: "approved", enrolment: approved };
    }

    this.enrolments.push(enrolment);
    return { result: "enrolled", enrolment };
  }

  async deny(id: string, reason: string | null, now: Date): Promise<boolean> {
    return this.change(id, (item) => item.deny(reason, now));
  }

  async cancel(id: string, now: Date): Promise<boolean> {
    return this.change(id, (item) => item.cancel(now), "approved");
  }

  async countPendingForClass(classId: string): Promise<number> {
    return this.enrolments.filter((item) => item.classId === classId && item.status === "pending").length;
  }

  async releaseForStudent(studentId: string, now: Date): Promise<Enrolment[]> {
    const cancelled: Enrolment[] = [];

    this.enrolments = this.enrolments.map((item) => {
      if (item.studentId !== studentId) return item;

      if (item.status === "pending") return item.withdraw(now);

      const found = this.classes.find((candidate) => candidate.id === item.classId);
      const upcoming = !!found && !found.cancelledAt && found.startsAt.getTime() > now.getTime();

      if (item.status !== "approved" || !upcoming) return item;

      const out = item.cancel(now);
      cancelled.push(out);
      return out;
    });

    return cancelled;
  }

  async closeOpenForClass(classId: string, now: Date): Promise<Enrolment[]> {
    const closed: Enrolment[] = [];

    this.enrolments = this.enrolments.map((item) => {
      if (item.classId !== classId || !item.isOpen) return item;

      const out = item.closeForCancelledClass(now);
      closed.push(out);
      return out;
    });

    return closed;
  }

  /** Applies the transition only to an enrolment in `from`, as the conditional writes do. */
  private change(
    id: string,
    transition: (item: Enrolment) => Enrolment,
    from: Enrolment["status"] = "pending",
  ): boolean {
    const stored = this.enrolments.find((item) => item.id === id);
    if (!stored || stored.status !== from) return false;

    this.enrolments = this.enrolments.map((item) => (item.id === id ? transition(item) : item));
    return true;
  }
}
