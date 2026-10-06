import { UseCase } from "@rochas-surf-school/shared";
import { User } from "../model";
import { UserRepository } from "../provider";

export interface CreateUserIn {
  entity: User;
}

export class CreateUser
  implements UseCase<CreateUserIn, User>
{
  constructor(
    private readonly userRepository: UserRepository,
  ) {}

  async execute(input: CreateUserIn): Promise<User> {
    return this.userRepository.create(input.entity);
  }
}
