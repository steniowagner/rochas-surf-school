import { ConflictError, NotFoundError, UseCase, UuidRule } from "@rochas-surf-school/shared";
import { ClassActor, assertCanManageClasses } from "../../access";
import { LocationRepository } from "../provider";

export interface ArchiveLocationIn {
  actor: ClassActor;
  id: string;
}

const uuidRule = new UuidRule();

export class ArchiveLocation implements UseCase<ArchiveLocationIn, void> {
  constructor(private readonly locationRepository: LocationRepository) {}

  async execute(input: ArchiveLocationIn): Promise<void> {
    assertCanManageClasses(input.actor);

    const stored =
      typeof input.id === "string" && uuidRule.validate(input.id) === null
        ? await this.locationRepository.findById(input.id)
        : null;

    if (!stored) {
      throw new NotFoundError("location.notFound");
    }

    if (stored.isArchived) {
      throw new ConflictError("location.archived");
    }

    // The write is conditional: of two concurrent archives, the loser finds it already archived.
    if (!(await this.locationRepository.archive(stored.id))) {
      throw new ConflictError("location.archived");
    }
  }
}
