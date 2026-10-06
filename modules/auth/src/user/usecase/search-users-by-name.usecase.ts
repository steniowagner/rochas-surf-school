import { UseCase } from "@rochas-surf-school/shared";
import { User } from "../model";
import { UserRepository } from "../provider";

export interface SearchUsersByNameIn {
  name: string;
}

export interface SearchUsersByNameOut {
  users: User[];
}

export class SearchUsersByName
  implements UseCase<SearchUsersByNameIn, SearchUsersByNameOut>
{
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: SearchUsersByNameIn): Promise<SearchUsersByNameOut> {
    const users = await this.userRepository.searchByName(input.name);

    return {
      users,
    };
  }
}
