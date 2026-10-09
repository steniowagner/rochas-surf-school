import { RefreshToken } from "../../../src";
import { FakeClockProvider, FakeRefreshTokenRepository, FakeTokenProvider } from "../../mock";

const AT = new Date("2026-10-07T12:00:00.000Z");
const FAMILY_A = "8f14e45f-ceea-4e7a-9b1d-0c1a2b3c4d5e";
const FAMILY_B = "9a14e45f-ceea-4e7a-9b1d-0c1a2b3c4d5e";
const USER_ID = "1b14e45f-ceea-4e7a-9b1d-0c1a2b3c4d5e";

function buildToken(hash: string, familyId: string): RefreshToken {
  return new RefreshToken({
    userId: USER_ID,
    tokenHash: hash.padEnd(64, "0"),
    familyId,
    expiresAt: new Date("2026-11-06T12:00:00.000Z"),
  });
}

describe("FakeRefreshTokenRepository", () => {
  test("finds a token by its hash, or null", async () => {
    const repository = new FakeRefreshTokenRepository();
    const token = await repository.create(buildToken("a", FAMILY_A));

    await expect(repository.findByTokenHash(token.tokenHash)).resolves.toBe(token);
    await expect(repository.findByTokenHash("f".repeat(64))).resolves.toBeNull();
  });

  test("revokeIfActive revokes once and then reports false", async () => {
    const repository = new FakeRefreshTokenRepository();
    const token = await repository.create(buildToken("a", FAMILY_A));

    await expect(repository.revokeIfActive(token.id, AT)).resolves.toBe(true);
    await expect(repository.revokeIfActive(token.id, new Date())).resolves.toBe(false);

    const stored = await repository.findByTokenHash(token.tokenHash);
    expect(stored?.revokedAt).toEqual(AT);
  });

  test("revokeIfActive reports false for an unknown id", async () => {
    const repository = new FakeRefreshTokenRepository();

    await expect(repository.revokeIfActive(USER_ID, AT)).resolves.toBe(false);
  });

  test("rotate revokes the current token and stores its successor", async () => {
    const repository = new FakeRefreshTokenRepository();
    const current = await repository.create(buildToken("a", FAMILY_A));
    const next = buildToken("b", FAMILY_A);

    await expect(repository.rotate(current.id, next, AT)).resolves.toBe(true);

    expect(repository.tokens).toHaveLength(2);
    expect(repository.tokens[0]!.revokedAt).toEqual(AT);
    expect(repository.tokens[1]).toBe(next);
  });

  test("rotate stores nothing when the current token was already revoked", async () => {
    const repository = new FakeRefreshTokenRepository();
    const current = await repository.create(buildToken("a", FAMILY_A));
    await repository.revokeIfActive(current.id, AT);

    await expect(repository.rotate(current.id, buildToken("b", FAMILY_A), AT)).resolves.toBe(false);

    expect(repository.tokens).toHaveLength(1);
  });

  test("revokeFamily revokes the active tokens of that family only", async () => {
    const repository = new FakeRefreshTokenRepository();
    const first = await repository.create(buildToken("a", FAMILY_A));
    const second = await repository.create(buildToken("b", FAMILY_A));
    const other = await repository.create(buildToken("c", FAMILY_B));
    await repository.revokeIfActive(first.id, new Date("2026-10-01T00:00:00.000Z"));

    await repository.revokeFamily(FAMILY_A, AT);

    expect((await repository.findByTokenHash(first.tokenHash))?.revokedAt).toEqual(
      new Date("2026-10-01T00:00:00.000Z"),
    );
    expect((await repository.findByTokenHash(second.tokenHash))?.revokedAt).toEqual(AT);
    expect((await repository.findByTokenHash(other.tokenHash))?.revokedAt).toBeUndefined();
  });
});

describe("FakeTokenProvider.hashRefreshToken", () => {
  test("matches the hash generateRefreshToken returns", () => {
    const provider = new FakeTokenProvider(new FakeClockProvider(AT));

    const generated = provider.generateRefreshToken();

    expect(provider.hashRefreshToken(generated.token)).toBe(generated.hash);
  });
});
