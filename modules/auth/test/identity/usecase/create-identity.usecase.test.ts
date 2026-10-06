import { CreateIdentity, Identity } from "../../../src";
import { FakeIdentityRepository } from "../../mock";

describe("CreateIdentity", () => {
  test("stores the identity and returns it", async () => {
    const identity = new Identity({
      userId: "8f14e45f-ceea-4e7a-9b1d-0c1a2b3c4d5e",
      provider: "google",
      providerUserId: "109876543210987654321",
    });
    const identityRepository = new FakeIdentityRepository();
    const useCase = new CreateIdentity(identityRepository);

    await expect(useCase.execute({ entity: identity })).resolves.toBe(identity);
    await expect(
      identityRepository.findByProvider("google", "109876543210987654321"),
    ).resolves.toBe(identity);
    await expect(
      identityRepository.findByUserId(identity.userId),
    ).resolves.toEqual([identity]);
  });
});
