import {
  DomainError,
  NotFoundError,
  RangeLengthRule,
  RequiredRule,
  UseCase,
  UuidRule,
  Validator,
} from "@rochas-surf-school/shared";
import { ClassActor, assertCanManageClasses } from "../../access";
import { CLASS_MESSAGE_TEXT_MAX, CLASS_MESSAGE_TITLE_MAX, getClassState } from "../model";
import {
  ClassAudienceReader,
  ClassChangeNotifier,
  ClockProvider,
  SchoolClassRepository,
} from "../provider";

export interface SendClassMessageIn {
  actor: ClassActor;
  id: string;
  /** Written by the admin; trimmed and shown as written. */
  title: unknown;
  message: unknown;
}

const uuidRule = new UuidRule();

function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuidRule.validate(value) === null;
}

function trimmed(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Sends an admin's message to the people of a class that hasn't finished: its instructors and its audience. */
export class SendClassMessage implements UseCase<SendClassMessageIn, void> {
  constructor(
    private readonly schoolClassRepository: SchoolClassRepository,
    private readonly classAudienceReader: ClassAudienceReader,
    private readonly classChangeNotifier: ClassChangeNotifier,
    private readonly clockProvider: ClockProvider,
  ) {}

  async execute(input: SendClassMessageIn): Promise<void> {
    assertCanManageClasses(input.actor);

    const stored = isUuid(input.id)
      ? await this.schoolClassRepository.findById(input.id)
      : null;

    if (!stored) {
      throw new NotFoundError("class.notFound");
    }

    const title = trimmed(input.title);
    const message = trimmed(input.message);

    Validator.validate([
      {
        code: "class.message.title",
        value: title,
        rules: [new RequiredRule(), new RangeLengthRule(1, CLASS_MESSAGE_TITLE_MAX)],
      },
      {
        code: "class.message.text",
        value: message,
        rules: [new RequiredRule(), new RangeLengthRule(1, CLASS_MESSAGE_TEXT_MAX)],
      },
    ]);

    const state = getClassState(stored.startsAt, stored.endsAt, this.clockProvider.now(), stored.cancelledAt);

    if (state === "cancelled") {
      throw new DomainError("class.cancelled", 409);
    }

    if (state === "finished") {
      throw new DomainError("class.finished", 409);
    }

    // Each person once, never the sender; someone who teaches the class is told as an instructor.
    const instructorIds = stored.instructorIds.filter((id) => id !== input.actor.id);
    const studentIds = [...new Set(await this.findStudents(stored.id))].filter(
      (id) => id !== input.actor.id && !instructorIds.includes(id),
    );

    if (instructorIds.length === 0 && studentIds.length === 0) return;

    try {
      await this.classChangeNotifier.classMessage({
        instructorIds,
        ...(studentIds.length === 0 ? {} : { studentIds }),
        classId: stored.id,
        discipline: stored.discipline,
        startsAt: stored.startsAt,
        title,
        message,
      });
    } catch {
      // A failed notification never changes the answer; the adapter logs it.
    }
  }

  /** Who holds a seat or a request; a failed read tells the instructors only. */
  private async findStudents(classId: string): Promise<string[]> {
    try {
      return await this.classAudienceReader.findClassAudience(classId);
    } catch {
      return [];
    }
  }
}
