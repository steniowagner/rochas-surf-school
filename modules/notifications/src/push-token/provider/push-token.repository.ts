import { PushToken } from "../model";

export interface PushTokenRepository {
  /** Stores the token for the user, or moves it to the user when another one held it. */
  upsert(pushToken: PushToken): Promise<void>;
  findByUserIds(userIds: string[]): Promise<PushToken[]>;
  deleteByToken(token: string): Promise<void>;
  deleteByTokens(tokens: string[]): Promise<void>;
  /** Deletes the token only when it belongs to the user. */
  deleteForUser(userId: string, token: string): Promise<void>;
}
