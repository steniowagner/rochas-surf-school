import {
  ForbiddenError,
  RequiredRule,
  UnauthorizedError,
  UseCase,
  Validator,
} from "@rochas-surf-school/shared";
import { RulesVersionProvider, UserRepository } from "../provider";
import { AccountOut, toAccountOut } from "./account.out";

export interface SetWhatsappIn {
  userId: string;
  whatsappNumber: string;
  whatsappVisible: boolean;
}

export type SetWhatsappOut = AccountOut;

export class SetWhatsapp implements UseCase<SetWhatsappIn, SetWhatsappOut> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly rulesVersionProvider: RulesVersionProvider,
  ) {}

  async execute(input: SetWhatsappIn): Promise<SetWhatsappOut> {
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new UnauthorizedError("auth.token.invalid");
    }
    if (user.status !== "approved") {
      throw new ForbiddenError("user.status.notApproved");
    }

    Validator.validate([
      {
        code: "user.whatsappNumber",
        value: input.whatsappNumber,
        rules: [new RequiredRule()],
      },
    ]);

    const updated = user.clone({
      whatsappNumber: input.whatsappNumber,
      whatsappVisible: input.whatsappVisible,
    });
    updated.validate();
    await this.userRepository.update(updated);

    return toAccountOut(updated, await this.rulesVersionProvider.getCurrentVersion());
  }
}
