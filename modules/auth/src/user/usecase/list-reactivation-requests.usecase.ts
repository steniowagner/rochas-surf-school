import { UseCase } from "@rochas-surf-school/shared";
import { ClockProvider } from "../../sign-in-code/provider";
import { UserRole } from "../model";
import { ClassesTakenCounter, UserRepository } from "../provider";
import {
  assertCanDecideRegistrations,
  RegistrationActor,
} from "./registration-access";

export interface ListReactivationRequestsIn {
  actor: RegistrationActor;
}

export interface ReactivationRequestItemOut {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  deletedAt: string;
  requestedAt: string;
  classesTaken: number;
}

export interface ListReactivationRequestsOut {
  items: ReactivationRequestItemOut[];
}

/** The deleted accounts waiting for an answer to their request to come back, oldest request first. */
export class ListReactivationRequests implements UseCase<
  ListReactivationRequestsIn,
  ListReactivationRequestsOut
> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly classesTakenCounter: ClassesTakenCounter,
    private readonly clock: ClockProvider,
  ) {}

  async execute(input: ListReactivationRequestsIn): Promise<ListReactivationRequestsOut> {
    assertCanDecideRegistrations(input.actor);

    const requests = await this.userRepository.findReactivationRequests();
    if (requests.length === 0) {
      return { items: [] };
    }

    const taken = await this.classesTakenCounter.countTaken(
      requests.map((user) => user.id),
      this.clock.now(),
    );

    return {
      items: requests.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        deletedAt: (user.deletedAt ?? user.updatedAt).toISOString(),
        requestedAt: (user.reactivationRequestedAt ?? user.updatedAt).toISOString(),
        classesTaken: taken[user.id] ?? 0,
      })),
    };
  }
}
