import { UseCase } from "@rochas-surf-school/shared";
import { PushTokenRepository } from "../provider";

export interface RemovePushTokenIn {
  userId: string;
  token: string;
}

/** Deletes the token only when it belongs to the user, so one person can't remove another's device. */
export class RemovePushToken implements UseCase<RemovePushTokenIn, void> {
  constructor(private readonly pushTokenRepository: PushTokenRepository) {}

  async execute(input: RemovePushTokenIn): Promise<void> {
    await this.pushTokenRepository.deleteForUser(input.userId, input.token);
  }
}
