import { RemovePushToken } from "../../../src";
import { FakePushTokenRepository, pushToken, USER_A, USER_B } from "../../mock";

describe("RemovePushToken", () => {
  it("deletes the token of that user only", async () => {
    const repository = new FakePushTokenRepository([
      pushToken("ExpoPushToken[a]", USER_A),
      pushToken("ExpoPushToken[b]", USER_B),
    ]);
    const usecase = new RemovePushToken(repository);

    await usecase.execute({ userId: USER_A, token: "ExpoPushToken[b]" });
    expect(repository.tokens()).toHaveLength(2);

    await usecase.execute({ userId: USER_A, token: "ExpoPushToken[a]" });
    expect(repository.tokens()).toEqual(["ExpoPushToken[b]"]);
  });
});
