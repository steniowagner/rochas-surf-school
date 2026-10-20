import { ConflictError } from "@rochas-surf-school/shared";
import {
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

  /** Applies the transition only to a pending enrolment, as the conditional writes do. */
  private change(id: string, transition: (item: Enrolment) => Enrolment): boolean {
    const stored = this.enrolments.find((item) => item.id === id);
    if (!stored || stored.status !== "pending") return false;

    this.enrolments = this.enrolments.map((item) => (item.id === id ? transition(item) : item));
    return true;
  }
}
