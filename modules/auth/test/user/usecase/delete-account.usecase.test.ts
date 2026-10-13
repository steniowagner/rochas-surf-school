import { ForbiddenError, UnauthorizedError } from "@rochas-surf-school/shared";
import { DeleteAccount, User, UserStatus } from "../../../src";
import { FakeClockProvider, FakeUserRepository } from "../../mock";

const NOW = new Date("2026-10-14T12:00:00.000Z");

const buildUser = (status: UserStatus = "approved") =>
  new User({
    name: "Ana Souza",
    email: "ana@example.com",
    whatsappVisible: false,
    role: "student",
    status,
  });

describe("DeleteAccount", () => {
  it("closes an approved account and stamps the deletion", async () => {
    const ana = buildUser();
    const repository = new FakeUserRepository([ana]);

    await new DeleteAccount(repository, new FakeClockProvider(NOW)).execute({ userId: ana.id });

    const saved = await repository.findById(ana.id);
    expect(saved?.status).toBe("deleted");
    expect(saved?.deletedAt).toEqual(NOW);
  });

  it.each<UserStatus>(["pending", "denied", "deleted", "removed"])(
    "refuses a %s account",
    async (status) => {
      const ana = buildUser(status);
      const repository = new FakeUserRepository([ana]);

      const error = await new DeleteAccount(repository, new FakeClockProvider(NOW))
        .execute({ userId: ana.id })
        .catch((e) => e);

      expect(error).toBeInstanceOf(ForbiddenError);
      expect((await repository.findById(ana.id))?.status).toBe(status);
    },
  );

  it("refuses an unknown account", async () => {
    const error = await new DeleteAccount(new FakeUserRepository(), new FakeClockProvider(NOW))
      .execute({ userId: buildUser().id })
      .catch((e) => e);

    expect(error).toBeInstanceOf(UnauthorizedError);
  });
});
