import { UseCase } from "@rochas-surf-school/shared";
import { User } from "../model";
import { UserRepository } from "../provider";

export interface UpdateUserIn {
  entity: User;
}

export class UpdateUser
  implements UseCase<UpdateUserIn, User>
{
  constructor(
    private readonly userRepository: UserRepository,
  ) {}

  async execute(input: UpdateUserIn): Promise<User> {
    return this.userRepository.update(input.entity);
  }
}
