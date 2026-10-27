import { ForbiddenError, ValidationException } from "@rochas-surf-school/shared";
import { RegisterPushToken } from "../../../src";
import {
  FakeClockProvider,
  FakePushTokenRepository,
  NOW,
  pushToken,
  USER_A,
  USER_B,
} from "../../mock";

function setup(initial = new FakePushTokenRepository()) {
  return { repository: initial, usecase: new RegisterPushToken(initial, new FakeClockProvider(NOW)) };
}

async function errorsOf(promise: Promise<unknown>): Promise<string[]> {
  try {
    await promise;
    return [];
  } catch (error) {
    return (error as ValidationException).errors.map((item) => item.message);
  }
}

describe("RegisterPushToken", () => {
  it.each(["pending", "approved", "deleted", "removed"])("registers the token of a %s user", async (status) => {
    const { repository, usecase } = setup();

    await usecase.execute({
      actor: { id: USER_A, status },
      token: "ExponentPushToken[abc]",
      locale: "es",
    });

    expect(repository.items).toHaveLength(1);
    expect(repository.items[0].userId).toBe(USER_A);
    expect(repository.items[0].locale).toBe("es");
    expect(repository.items[0].updatedAt).toEqual(NOW);
  });

  it.each(["denied", "unknown"])(
    "refuses a %s user before checking the body",
    async (status) => {
      const { repository, usecase } = setup();

      const promise = usecase.execute({
        actor: { id: USER_A, status },
        token: "invalid",
        locale: "fr",
      });

      await expect(promise).rejects.toThrow(ForbiddenError);
      await expect(promise).rejects.toThrow("pushToken.status.notAllowed");
      expect(repository.items).toEqual([]);
    },
  );

  it("updates the locale of a token registered again", async () => {
    const { repository, usecase } = setup();
    const actor = { id: USER_A, status: "approved" };

    await usecase.execute({ actor, token: "ExpoPushToken[abc]", locale: "es" });
    await usecase.execute({ actor, token: "ExpoPushToken[abc]", locale: "en" });

    expect(repository.items).toHaveLength(1);
    expect(repository.items[0].locale).toBe("en");
  });

  it("moves a token registered by another user to the caller", async () => {
    const { repository, usecase } = setup(
      new FakePushTokenRepository([pushToken("ExpoPushToken[abc]", USER_A)]),
    );

    await usecase.execute({
      actor: { id: USER_B, status: "approved" },
      token: "ExpoPushToken[abc]",
      locale: "en",
    });

    expect(repository.items).toHaveLength(1);
    expect(repository.items[0].userId).toBe(USER_B);
  });

  it("keeps several devices of one user", async () => {
    const { repository, usecase } = setup();
    const actor = { id: USER_A, status: "approved" };

    await usecase.execute({ actor, token: "ExpoPushToken[a]", locale: "en" });
    await usecase.execute({ actor, token: "ExpoPushToken[b]", locale: "en" });

    expect(repository.tokens()).toEqual(["ExpoPushToken[a]", "ExpoPushToken[b]"]);
  });

  it.each([undefined, 7, "abc"])("rejects the token %p", async (token) => {
    const { repository, usecase } = setup();

    const errors = await errorsOf(
      usecase.execute({ actor: { id: USER_A, status: "approved" }, token, locale: "en" }),
    );

    expect(errors).toEqual(["pushToken.token.invalid"]);
    expect(repository.items).toEqual([]);
  });

  it("rejects an invalid locale", async () => {
    const { usecase } = setup();

    const errors = await errorsOf(
      usecase.execute({
        actor: { id: USER_A, status: "approved" },
        token: "ExpoPushToken[a]",
        locale: "fr",
      }),
    );

    expect(errors).toEqual(["pushToken.locale.invalid"]);
  });

  it("lists both keys when both are invalid", async () => {
    const { usecase } = setup();

    const errors = await errorsOf(
      usecase.execute({ actor: { id: USER_A, status: "pending" }, token: 1, locale: null }),
    );

    expect(errors).toEqual(["pushToken.token.invalid", "pushToken.locale.invalid"]);
  });
});
