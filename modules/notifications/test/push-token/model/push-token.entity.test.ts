import { ValidationException } from "@rochas-surf-school/shared";
import { PushToken, PushTokenState } from "../../../src";

const USER_ID = "8f14e45f-ceea-4e7a-9b1d-0c1a2b3c4d5e";

function messagesOf(callback: () => void): string[] {
  try {
    callback();
    return [];
  } catch (error) {
    return (error as ValidationException).errors.map((item) => item.message);
  }
}

function build(overrides: Partial<PushTokenState> = {}): PushToken {
  return new PushToken({
    token: "ExponentPushToken[abc]",
    userId: USER_ID,
    locale: "es",
    ...overrides,
  });
}

describe("PushToken", () => {
  it("creates a valid push token and exposes its fields", () => {
    const pushToken = build();

    expect(pushToken.token).toBe("ExponentPushToken[abc]");
    expect(pushToken.userId).toBe(USER_ID);
    expect(pushToken.locale).toBe("es");
    expect(() => pushToken.validate()).not.toThrow();
  });

  it.each(["ExponentPushToken[abc]", "ExpoPushToken[abc-123_x]"])(
    "accepts the token %s",
    (token) => {
      expect(() => build({ token }).validate()).not.toThrow();
    },
  );

  it.each(["pt-BR", "es", "en"] as const)("accepts the locale %s", (locale) => {
    expect(() => build({ locale }).validate()).not.toThrow();
  });

  it.each([undefined, null, 12, "", "abc", "ExponentPushToken[]", "ExponentPushToken[a]x"])(
    "rejects the token %p",
    (token) => {
      expect(messagesOf(() => build({ token: token as never }).validate())).toEqual([
        "pushToken.token.invalid",
      ]);
    },
  );

  it.each([undefined, "fr", "pt", 1])("rejects the locale %p", (locale) => {
    expect(messagesOf(() => build({ locale: locale as never }).validate())).toEqual([
      "pushToken.locale.invalid",
    ]);
  });

  it("lists both keys when the token and the locale are invalid", () => {
    const pushToken = build({ token: "x", locale: "fr" as never });

    expect(messagesOf(() => pushToken.validate())).toEqual([
      "pushToken.token.invalid",
      "pushToken.locale.invalid",
    ]);
  });

  it("rejects a missing or invalid user id", () => {
    expect(messagesOf(() => build({ userId: "" }).validate())).toContain(
      "pushToken.userId.required",
    );
    expect(messagesOf(() => build({ userId: "abc" }).validate())).toContain(
      "pushToken.userId.uuid",
    );
  });
});
