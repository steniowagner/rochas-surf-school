import { RequiredRule, UseCase, Validator } from "@rochas-surf-school/shared";
import { PushTokenRepository } from "../provider";

export interface UnregisterPushTokenIn {
  userId: string;
  token: unknown;
}

/** Removes one of the caller's own devices; a token of another account or an unknown one changes nothing. */
export class UnregisterPushToken implements UseCase<UnregisterPushTokenIn, void> {
  constructor(private readonly pushTokenRepository: PushTokenRepository) {}

  async execute(input: UnregisterPushTokenIn): Promise<void> {
    const token = typeof input.token === "string" ? input.token : undefined;
    Validator.validate([{ code: "pushToken.token", value: token, rules: [new RequiredRule()] }]);

    await this.pushTokenRepository.deleteForUser(input.userId, token as string);
  }
}
