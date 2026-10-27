import { UseCase } from "@rochas-surf-school/shared";
import { ClockProvider } from "../../sign-in-code/provider";
import { UserRole } from "../model";
import { UserRepository } from "../provider";
import { assertCanDecideRegistrations, RegistrationActor } from "./registration-access";
import { REMOVAL_WINDOW_MS } from "./removal-window";

export interface ListRemovedAccountsIn {
  actor: RegistrationActor;
}

export interface RemovedAccountOut {
  id: string;
  name: string;
  role: UserRole;
  removedAt: string;
}

export interface ListRemovedAccountsOut {
  items: RemovedAccountOut[];
}

/** An approved admin lists the removed accounts still inside their 30-day window, most recent removal first. */
export class ListRemovedAccounts implements UseCase<ListRemovedAccountsIn, ListRemovedAccountsOut> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly clock: ClockProvider,
  ) {}

  async execute(input: ListRemovedAccountsIn): Promise<ListRemovedAccountsOut> {
    assertCanDecideRegistrations(input.actor);

    const cutoff = new Date(this.clock.now().getTime() - REMOVAL_WINDOW_MS);
    const users = await this.userRepository.findRemovedSince(cutoff);

    return {
      // The repository only returns accounts with a `removedAt`.
      items: users.map((user) => ({
        id: user.id,
        name: user.name,
        role: user.role,
        removedAt: (user.removedAt as Date).toISOString(),
      })),
    };
  }
}
