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

  it("accepts a class.assigned notification with its count and discipline", () => {
    const notification = build({
      type: "class.assigned",
      params: { count: 4, discipline: "surf" },
    });

    expect(() => notification.validate()).not.toThrow();
    expect(notification.type).toBe("class.assigned");
    expect(notification.params).toEqual({ count: 4, discipline: "surf" });
  });

  it.each(["class.edited", "class.unassigned"] as const)(
    "accepts a %s notification with its class id, discipline and start",
    (type) => {
      const params = {
        classId: "9e1b7a30-4c52-4d86-b0a3-6f2d8c5e1a47",
        discipline: "surf",
        startsAt: "2026-10-18T11:00:00.000Z",
      };
      const notification = build({ type, params });

      expect(() => notification.validate()).not.toThrow();
      expect(notification.type).toBe(type);
      expect(notification.params).toEqual(params);
    },
  );

  it("accepts a class.cancelled notification with the class, its start and the message", () => {
    const params = {
      classId: "9e1b7a30-4c52-4d86-b0a3-6f2d8c5e1a47",
      discipline: "surf",
      startsAt: "2026-10-18T11:00:00.000Z",
      message: "Mar muito grande.",
    };
    const notification = build({ type: "class.cancelled", params });

    expect(() => notification.validate()).not.toThrow();
    expect(notification.type).toBe("class.cancelled");
    expect(notification.params).toEqual(params);
  });

  it("accepts a class.deleted notification with its discipline and start, and no class id", () => {
    const params = { discipline: "surf", startsAt: "2026-10-18T11:00:00.000Z" };
    const notification = build({ type: "class.deleted", params });

    expect(() => notification.validate()).not.toThrow();
    expect(notification.type).toBe("class.deleted");
    expect(notification.params).toEqual(params);
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
