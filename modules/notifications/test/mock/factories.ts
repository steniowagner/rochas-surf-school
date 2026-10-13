import { PushLocale, PushToken, PushTicket } from "../../src";

export const USER_A = "11111111-1111-4111-8111-111111111111";
export const USER_B = "22222222-2222-4222-8222-222222222222";
export const USER_C = "33333333-3333-4333-8333-333333333333";

export const NOW = new Date("2026-10-12T12:00:00.000Z");

export function pushToken(
  token: string,
  userId = USER_A,
  locale: PushLocale = "en",
): PushToken {
  return new PushToken({ token, userId, locale });
}

export function minutesAgo(minutes: number): Date {
  return new Date(NOW.getTime() - minutes * 60_000);
}

export function pushTicket(
  id: string,
  token: string,
  createdAt: Date,
): PushTicket {
  return { id, token, createdAt };
}
