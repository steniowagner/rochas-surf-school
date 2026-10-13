import {
  ForbiddenError,
  RequiredRule,
  UnauthorizedError,
  UseCase,
  Validator,
} from "@rochas-surf-school/shared";
import { RulesVersionProvider, UserRepository } from "../provider";
import { AccountOut, toAccountOut } from "./account.out";

export interface SetNameIn {
  userId: string;
  name: string;
}

export type SetNameOut = AccountOut;

export class SetName implements UseCase<SetNameIn, SetNameOut> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly rulesVersionProvider: RulesVersionProvider,
  ) {}

  async execute(input: SetNameIn): Promise<SetNameOut> {
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new UnauthorizedError("auth.token.invalid");
    }
    if (user.status !== "approved") {
      throw new ForbiddenError("user.status.notApproved");
    }

    const name = typeof input.name === "string" ? input.name.trim() : undefined;
    Validator.validate([{ code: "user.name", value: name, rules: [new RequiredRule()] }]);

    const updated = user.clone({ name });
    updated.validate();
    await this.userRepository.update(updated);

    return toAccountOut(updated, await this.rulesVersionProvider.getCurrentVersion());
  }
}
