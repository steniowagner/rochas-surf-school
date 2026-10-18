import { DomainError, NotFoundError, UseCase, UuidRule } from "@rochas-surf-school/shared";
import { ClassActor, assertCanManageClasses } from "../../access";
import {
  ClassChangeNotifier,
  ClockProvider,
  PendingRequestCounter,
  SchoolClassRepository,
  SeatCounter,
} from "../provider";

export interface DeleteClassIn {
  actor: ClassActor;
  id: string;
}

const uuidRule = new UuidRule();

function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuidRule.validate(value) === null;
}

export class DeleteClass implements UseCase<DeleteClassIn, void> {
  constructor(
    private readonly schoolClassRepository: SchoolClassRepository,
    private readonly seatCounter: SeatCounter,
    private readonly pendingRequestCounter: PendingRequestCounter,
    private readonly classChangeNotifier: ClassChangeNotifier,
    private readonly clockProvider: ClockProvider,
  ) {}

  async execute(input: DeleteClassIn): Promise<void> {
    assertCanManageClasses(input.actor);

    const stored = isUuid(input.id)
      ? await this.schoolClassRepository.findById(input.id)
      : null;

    if (!stored) {
      throw new NotFoundError("class.notFound");
    }

    const now = this.clockProvider.now();

    if (stored.cancelledAt) {
      throw new DomainError("class.cancelled", 409);
    }

    if (stored.startsAt.getTime() <= now.getTime()) {
      throw new DomainError("class.started", 409);
    }

    const seatsTaken = await this.seatCounter.countSeatsTaken(stored.id);
    const pendingRequests = await this.pendingRequestCounter.countPendingRequests(stored.id);

    if (seatsTaken > 0 || pendingRequests > 0) {
      throw new DomainError("class.delete.notEmpty", 409, { seatsTaken, pendingRequests });
    }

    if (!(await this.schoolClassRepository.delete(stored.id, now))) {
      throw await this.refusalAfterLostRace(stored.id);
    }

    const instructorIds = stored.instructorIds.filter((id) => id !== input.actor.id);

    await this.notify(instructorIds, () =>
      this.classChangeNotifier.classDeleted({
        instructorIds,
        discipline: stored.discipline,
        startsAt: stored.startsAt,
      }),
    );
  }

  /** The write lost to a cancel, a delete or the clock: reads the class again to say which. */
  private async refusalAfterLostRace(id: string): Promise<Error> {
    const current = await this.schoolClassRepository.findById(id);

    if (!current) return new NotFoundError("class.notFound");

    return new DomainError(current.cancelledAt ? "class.cancelled" : "class.started", 409);
  }

  /** A failed notification never changes the answer; the adapter logs it. */
  private async notify(instructorIds: string[], send: () => Promise<void>): Promise<void> {
    if (instructorIds.length === 0) return;

    try {
      await send();
    } catch {
      // swallowed on purpose
    }
  }
}
