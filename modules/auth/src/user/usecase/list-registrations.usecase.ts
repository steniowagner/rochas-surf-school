import { UseCase } from "@rochas-surf-school/shared";
import { UserRepository } from "../provider";
import {
  assertCanDecideRegistrations,
  RegistrationActor,
} from "./registration-access";

export interface ListRegistrationsIn {
  actor: RegistrationActor;
}

export interface RegistrationItemOut {
  id: string;
  name: string;
  email: string;
  photoUrl: string | null;
  createdAt: string;
}

export interface ListRegistrationsOut {
  items: RegistrationItemOut[];
}

export class ListRegistrations implements UseCase<
  ListRegistrationsIn,
  ListRegistrationsOut
> {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: ListRegistrationsIn): Promise<ListRegistrationsOut> {
    assertCanDecideRegistrations(input.actor);

    const pending = await this.userRepository.findPending();

    return {
      items: pending.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        photoUrl: user.photoUrl ?? null,
        createdAt: user.createdAt.toISOString(),
      })),
    };
  }
}
