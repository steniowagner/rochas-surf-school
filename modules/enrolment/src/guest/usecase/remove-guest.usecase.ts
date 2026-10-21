import { ClassActor, assertCanManageClasses } from "@rochas-surf-school/classes";
import { DomainError, NotFoundError, UseCase, UuidRule } from "@rochas-surf-school/shared";
import { ClockProvider, EnrolmentClassReader } from "../../enrolment/provider";
import { GuestRepository } from "../provider";

export interface RemoveGuestIn {
  actor: ClassActor;
  id: string;
}

const uuidRule = new UuidRule();

export class RemoveGuest implements UseCase<RemoveGuestIn, void> {
  constructor(
    private readonly guestRepository: GuestRepository,
    private readonly classReader: EnrolmentClassReader,
    private readonly clockProvider: ClockProvider,
  ) {}

  async execute(input: RemoveGuestIn): Promise<void> {
    assertCanManageClasses(input.actor);

    const guest =
      typeof input.id === "string" && uuidRule.validate(input.id) === null
        ? await this.guestRepository.findById(input.id)
        : null;
    const found = guest ? await this.classReader.findById(guest.classId) : null;

    if (!guest || !found) {
      throw new NotFoundError("guest.notFound");
    }

    if (this.clockProvider.now().getTime() >= found.startsAt.getTime()) {
      throw new DomainError("class.started", 409);
    }

    // Gone meanwhile: the seat is free either way, but the answer says what happened.
    if (!(await this.guestRepository.delete(guest.id))) {
      throw new NotFoundError("guest.notFound");
    }
  }
}
