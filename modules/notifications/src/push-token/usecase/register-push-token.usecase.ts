import { ForbiddenError, UseCase } from "@rochas-surf-school/shared";
import { ClockProvider } from "../../notification/provider";
import { PushToken } from "../model";
import { PushTokenRepository } from "../provider";

export interface PushTokenActor {
  id: string;
  status: string;
}

export interface RegisterPushTokenIn {
  actor: PushTokenActor;
  token: unknown;
  locale: unknown;
}

const REGISTRABLE_STATUSES = ["pending", "approved"];

/** Stores the device's push token for the caller, or moves it to them when another account held it. */
export class RegisterPushToken implements UseCase<RegisterPushTokenIn, void> {
  constructor(
    private readonly pushTokenRepository: PushTokenRepository,
    private readonly clock: ClockProvider,
  ) {}

  async execute(input: RegisterPushTokenIn): Promise<void> {
    if (!REGISTRABLE_STATUSES.includes(input.actor.status)) {
      throw new ForbiddenError("pushToken.status.notAllowed");
    }

    const now = this.clock.now();
    const pushToken = new PushToken({
      userId: input.actor.id,
      token: input.token as string,
      locale: input.locale as PushToken["locale"],
      createdAt: now,
      updatedAt: now,
    });
    pushToken.validate();

    await this.pushTokenRepository.upsert(pushToken);
  }
}
