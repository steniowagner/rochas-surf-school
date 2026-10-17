import {
  DomainError,
  NotFoundError,
  UseCase,
  UuidRule,
  ValidationError,
  ValidationException,
} from "@rochas-surf-school/shared";
import { ClassActor, assertCanManageClasses } from "../../access";
import { CLASS_CANCELLATION_MESSAGE_MAX, getClassState } from "../model";
import { ClassChangeNotifier, ClockProvider, SchoolClassRepository } from "../provider";

export interface CancelClassIn {
  actor: ClassActor;
  id: string;
  /** Optional reason shown to the people told about the cancellation. */
  message?: unknown;
}

export interface CancelClassOut {
  id: string;
}

const uuidRule = new UuidRule();

function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuidRule.validate(value) === null;
}

export class CancelClass implements UseCase<CancelClassIn, CancelClassOut> {
  constructor(
    private readonly schoolClassRepository: SchoolClassRepository,
    private readonly classChangeNotifier: ClassChangeNotifier,
    private readonly clockProvider: ClockProvider,
  ) {}

  async execute(input: CancelClassIn): Promise<CancelClassOut> {
    assertCanManageClasses(input.actor);

    const stored = isUuid(input.id)
      ? await this.schoolClassRepository.findById(input.id)
      : null;

    if (!stored) {
      throw new NotFoundError("class.notFound");
    }

    const message = this.parseMessage(input.message);
    const now = this.clockProvider.now();
    const state = getClassState(stored.startsAt, stored.endsAt, now, stored.cancelledAt);

    if (state === "cancelled") {
      throw new DomainError("class.cancelled", 409);
    }

    if (state === "finished") {
      throw new DomainError("class.finished", 409);
    }

    if (!(await this.schoolClassRepository.cancel(stored.id, now, message))) {
      throw new DomainError("class.cancelled", 409);
    }

    const instructorIds = stored.instructorIds.filter((id) => id !== input.actor.id);

    await this.notify(instructorIds, () =>
      this.classChangeNotifier.classCancelled({
        instructorIds,
        classId: stored.id,
        discipline: stored.discipline,
        startsAt: stored.startsAt,
        ...(message === null ? {} : { message }),
      }),
    );

    return { id: stored.id };
  }

  /** Trimmed; blank or absent is no message. */
  private parseMessage(message: unknown): string | null {
    if (message === undefined || message === null) return null;

    if (typeof message !== "string" || message.trim().length > CLASS_CANCELLATION_MESSAGE_MAX) {
      throw new ValidationException([new ValidationError("class.cancellationMessage.max.length")]);
    }

    return message.trim() === "" ? null : message.trim();
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
