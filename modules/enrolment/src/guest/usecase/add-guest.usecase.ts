import { ClassActor, assertCanManageClasses } from "@rochas-surf-school/classes";
import { DomainError, NotFoundError, UseCase, UuidRule } from "@rochas-surf-school/shared";
import { ClockProvider, EnrolmentClassReader } from "../../enrolment/provider";

import { Guest } from "../model";
import { GuestRepository } from "../provider";

export interface AddGuestIn {
  actor: ClassActor;
  classId: string;
  name: unknown;
  whatsappNumber: unknown;
}

export interface AddGuestOut {
  id: string;
  classId: string;
  name: string;
}

const uuidRule = new UuidRule();

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export class AddGuest implements UseCase<AddGuestIn, AddGuestOut> {
  constructor(
    private readonly guestRepository: GuestRepository,
    private readonly classReader: EnrolmentClassReader,
    private readonly clockProvider: ClockProvider,
  ) {}

  async execute(input: AddGuestIn): Promise<AddGuestOut> {
    assertCanManageClasses(input.actor);

    const found =
      typeof input.classId === "string" && uuidRule.validate(input.classId) === null
        ? await this.classReader.findById(input.classId)
        : null;

    if (!found) {
      throw new NotFoundError("class.notFound");
    }

    const name = toText(input.name);
    const guest = new Guest({
      classId: found.id,
      name,
      whatsappNumber: toText(input.whatsappNumber),
      createdBy: input.actor.id,
    });
    guest.validate();

    if (found.cancelledAt) {
      throw new DomainError("class.cancelled", 409);
    }

    if (this.clockProvider.now().getTime() >= found.startsAt.getTime()) {
      throw new DomainError("class.started", 409);
    }

    if ((await this.guestRepository.create(guest)) === "full") {
      throw new DomainError("enrolment.class.full", 409);
    }

    return { id: guest.id, classId: guest.classId, name };
  }
}
