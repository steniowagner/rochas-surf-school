import { DeleteExpiredSignInCodes, SignInCode } from "../../../src";
import { FakeClockProvider, FakeSignInCodeRepository } from "../../mock";

const NOW = new Date("2026-10-07T12:00:00.000Z");

function buildCode(email: string, expiresAt: Date): SignInCode {
  return new SignInCode({
    email,
    codeHash: "a".repeat(64),
    expiresAt,
    lastSentAt: new Date(expiresAt.getTime() - 10 * 60 * 1000),
    attempts: 0,
  });
}

function setup(codes: SignInCode[]) {
  const repository = new FakeSignInCodeRepository(codes);
  const useCase = new DeleteExpiredSignInCodes(repository, new FakeClockProvider(NOW));
  return { repository, useCase };
}

describe("DeleteExpiredSignInCodes", () => {
  test("deletes the expired codes and keeps the others", async () => {
    const { repository, useCase } = setup([
      buildCode("ana@example.com", new Date(NOW.getTime() - 1)),
      buildCode("bia@example.com", new Date(NOW.getTime() - 60_000)),
      buildCode("carla@example.com", new Date(NOW.getTime() + 60_000)),
    ]);

    await expect(useCase.execute()).resolves.toEqual({ deleted: 2 });
    expect(repository.codes.map((code) => code.email)).toEqual(["carla@example.com"]);
  });

  test("keeps a code that expires exactly now", async () => {
    const { repository, useCase } = setup([buildCode("ana@example.com", NOW)]);

    await expect(useCase.execute()).resolves.toEqual({ deleted: 0 });
    expect(repository.codes).toHaveLength(1);
  });

  test("deletes nothing when nothing expired", async () => {
    const { useCase } = setup([]);

    await expect(useCase.execute()).resolves.toEqual({ deleted: 0 });
  });

  test("passes the clock's time to the repository", async () => {
    const { repository, useCase } = setup([]);
    const spy = jest.spyOn(repository, "deleteExpired");

    await useCase.execute();

    expect(spy).toHaveBeenCalledWith(NOW);
  });
});
