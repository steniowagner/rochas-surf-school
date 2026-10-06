import { UseCase } from "@rochas-surf-school/shared";
import { Identity } from "../model";
import { IdentityRepository } from "../provider";

export interface CreateIdentityIn {
  entity: Identity;
}

export class CreateIdentity implements UseCase<CreateIdentityIn, Identity> {
  constructor(private readonly identityRepository: IdentityRepository) {}

  async execute(input: CreateIdentityIn): Promise<Identity> {
    return this.identityRepository.create(input.entity);
  }
}
