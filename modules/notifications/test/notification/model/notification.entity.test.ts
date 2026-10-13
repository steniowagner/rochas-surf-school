import { ValidationException } from "@rochas-surf-school/shared";
import {
  Notification,
  NotificationState,
  NOTIFICATION_TYPES,
} from "../../../src";

const USER_ID = "8f14e45f-ceea-4e7a-9b1d-0c1a2b3c4d5e";

function messagesOf(callback: () => void): string[] {
  try {
    callback();
    return [];
  } catch (error) {
    return (error as ValidationException).errors.map((item) => item.message);
  }
}

function build(overrides: Partial<NotificationState> = {}): Notification {
  return new Notification({
    userId: USER_ID,
    type: "registration.pending",
    params: { name: "Ana Souza" },
    ...overrides,
  });
}

describe("Notification", () => {
  it("creates a valid notification and exposes its fields", () => {
    const notification = build();

    expect(notification.id).toEqual(expect.any(String));
    expect(notification.userId).toBe(USER_ID);
    expect(notification.type).toBe("registration.pending");
    expect(notification.params).toEqual({ name: "Ana Souza" });
    expect(() => notification.validate()).not.toThrow();
  });

  it.each(NOTIFICATION_TYPES)("accepts the type %s", (type) => {
    expect(() => build({ type, params: {} }).validate()).not.toThrow();
  });

  it("rejects a missing or invalid user id", () => {
    expect(messagesOf(() => build({ userId: "" }).validate())).toContain(
      "notification.userId.required",
    );
    expect(messagesOf(() => build({ userId: "abc" }).validate())).toContain(
      "notification.userId.uuid",
    );
  });

  it("rejects an unknown type", () => {
    const notification = build({ type: "registration.other" as never });

    expect(messagesOf(() => notification.validate())).toEqual([
      "notification.type.in",
    ]);
  });

  it.each([null, "text", ["a"]])("rejects params that aren't an object (%p)", (params) => {
    const notification = build({ params: params as never });

    expect(messagesOf(() => notification.validate())).toEqual([
      "notification.params.invalid",
    ]);
  });
});
