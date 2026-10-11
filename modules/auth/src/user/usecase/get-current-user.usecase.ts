import { UnauthorizedError, UseCase } from "@rochas-surf-school/shared";
import { RulesVersionProvider, UserRepository } from "../provider";
import { AccountOut, toAccountOut } from "./account.out";

export interface GetCurrentUserIn {
  id: string;
}

export type GetCurrentUserOut = AccountOut;

export class GetCurrentUser
  implements UseCase<GetCurrentUserIn, GetCurrentUserOut>
{
  constructor(
    private readonly userRepository: UserRepository,
    private readonly rulesVersionProvider: RulesVersionProvider,
  ) {}

  async execute(input: GetCurrentUserIn): Promise<GetCurrentUserOut> {
    const user = await this.userRepository.findById(input.id);
    if (!user) {
      throw new UnauthorizedError("auth.token.invalid");
    }

    return toAccountOut(user, await this.rulesVersionProvider.getCurrentVersion());
  }
}
