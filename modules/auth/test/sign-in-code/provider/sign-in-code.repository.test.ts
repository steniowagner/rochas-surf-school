import { SignInCode } from "../../../src";
import { FakeSignInCodeRepository } from "../../mock";

function buildCode(email: string, expiresAt: string, codeHash = "a".repeat(64)): SignInCode {
  return new SignInCode({
    email,
    codeHash,
    expiresAt: new Date(expiresAt),
    lastSentAt: new Date("2026-10-07T12:00:00.000Z"),
    attempts: 0,
  });
}

describe("SignInCodeRepository (fake)", () => {
  test("save replaces the code of the same email", async () => {
    const repository = new FakeSignInCodeRepository();
    await repository.save(buildCode("ana@example.com", "2026-10-07T12:10:00.000Z"));
    const second = buildCode("ana@example.com", "2026-10-07T12:20:00.000Z", "b".repeat(64));

    await repository.save(second);

    expect(repository.codes).toEqual([second]);
    await expect(repository.findByEmail("ana@example.com")).resolves.toBe(second);
    await expect(repository.findByEmail("bia@example.com")).resolves.toBeNull();
  });

  test("incrementAttempts adds one and ignores unknown emails", async () => {
    const repository = new FakeSignInCodeRepository([
      buildCode("ana@example.com", "2026-10-07T12:10:00.000Z"),
    ]);

    await repository.incrementAttempts("ana@example.com");
    await repository.incrementAttempts("bia@example.com");

    expect((await repository.findByEmail("ana@example.com"))?.attempts).toBe(1);
    expect(repository.codes).toHaveLength(1);
  });

  test("consume deletes only a matching code, once", async () => {
    const repository = new FakeSignInCodeRepository([
      buildCode("ana@example.com", "2026-10-07T12:10:00.000Z"),
    ]);

    await expect(repository.consume("ana@example.com", "b".repeat(64))).resolves.toBe(false);
    await expect(repository.consume("ana@example.com", "a".repeat(64))).resolves.toBe(true);
    await expect(repository.consume("ana@example.com", "a".repeat(64))).resolves.toBe(false);
  });

  test("deleteByEmail and deleteExpired remove codes", async () => {
    const repository = new FakeSignInCodeRepository([
      buildCode("ana@example.com", "2026-10-07T11:59:00.000Z"),
      buildCode("bia@example.com", "2026-10-07T12:10:00.000Z"),
      buildCode("carla@example.com", "2026-10-07T12:20:00.000Z"),
    ]);

    await repository.deleteByEmail("carla@example.com");

    await expect(repository.deleteExpired(new Date("2026-10-07T12:00:00.000Z"))).resolves.toBe(1);
    expect(repository.codes.map((code) => code.email)).toEqual(["bia@example.com"]);
  });
});
