import { PageResult, UseCase } from "@rochas-surf-school/shared";
import { User } from "../model";
import {
  UserPageParams,
  UserRepository,
} from "../provider";

export type FindUserPageIn = UserPageParams;

export class FindUserPage
  implements UseCase<FindUserPageIn, PageResult<User>>
{
  constructor(
    private readonly userRepository: UserRepository,
  ) {}

  async execute(
    input: FindUserPageIn,
  ): Promise<PageResult<User>> {
    return this.userRepository.findPage(input);
  }
}
