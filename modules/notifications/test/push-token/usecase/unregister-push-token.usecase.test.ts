import { ValidationException } from "@rochas-surf-school/shared";
import { UnregisterPushToken } from "../../../src";
import { FakePushTokenRepository, pushToken, USER_A, USER_B } from "../../mock";

describe("UnregisterPushToken", () => {
  it("deletes the caller's own token", async () => {
    const repository = new FakePushTokenRepository([
      pushToken("ExponentPushToken[a]", USER_A),
      pushToken("ExponentPushToken[b]", USER_B),
    ]);

    await new UnregisterPushToken(repository).execute({
      userId: USER_A,
      token: "ExponentPushToken[a]",
    });

    expect(repository.tokens()).toEqual(["ExponentPushToken[b]"]);
  });

  it("keeps a token that belongs to another account", async () => {
    const repository = new FakePushTokenRepository([pushToken("ExponentPushToken[b]", USER_B)]);

    await new UnregisterPushToken(repository).execute({
      userId: USER_A,
      token: "ExponentPushToken[b]",
    });

    expect(repository.tokens()).toEqual(["ExponentPushToken[b]"]);
  });

  it("changes nothing for an unknown token", async () => {
    const repository = new FakePushTokenRepository([pushToken("ExponentPushToken[a]", USER_A)]);

    await new UnregisterPushToken(repository).execute({
      userId: USER_A,
      token: "ExponentPushToken[zzz]",
    });

    expect(repository.tokens()).toEqual(["ExponentPushToken[a]"]);
  });

  it.each([undefined, null, "", 42, {}])("requires a token (%p)", async (token) => {
    const repository = new FakePushTokenRepository([pushToken("ExponentPushToken[a]", USER_A)]);

    const error = (await new UnregisterPushToken(repository)
      .execute({ userId: USER_A, token })
      .catch((e) => e)) as ValidationException;

    expect(error).toBeInstanceOf(ValidationException);
    expect(error.errors.map((item) => item.message)).toEqual(["pushToken.token.required"]);
    expect(repository.tokens()).toHaveLength(1);
  });
});
