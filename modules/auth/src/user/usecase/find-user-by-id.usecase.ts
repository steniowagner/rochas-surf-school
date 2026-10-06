import { UseCase } from "@rochas-surf-school/shared";
import { User } from "../model";
import { UserRepository } from "../provider";

export interface FindUserByIdIn {
  id: string;
}

export class FindUserById
  implements UseCase<FindUserByIdIn, User | null>
{
  constructor(
    private readonly userRepository: UserRepository,
  ) {}

  async execute(
    input: FindUserByIdIn,
  ): Promise<User | null> {
    return this.userRepository.findById(input.id);
  }
}
