import { createHash } from "node:crypto";
import { StartSession, StartSessionIn } from "../../../src";
import {
  FakeClockProvider,
  FakeRefreshTokenRepository,
  FakeTokenProvider,
} from "../../mock";

const NOW = new Date("2026-10-07T12:00:00.000Z");
const USER = { id: "8f14e45f-ceea-4e7a-9b1d-0c1a2b3c4d5e", email: "ana@example.com" };

function setup() {
  const clock = new FakeClockProvider(NOW);
  const refreshTokenRepository = new FakeRefreshTokenRepository();
  const tokenProvider = new FakeTokenProvider(clock);
  const useCase = new StartSession(refreshTokenRepository, tokenProvider, clock);
  return { clock, refreshTokenRepository, tokenProvider, useCase };
}

const input: StartSessionIn = { user: USER, refreshTokenTtlDays: 30 };

describe("StartSession", () => {
  test("returns the signed access token and a refresh token expiring after the TTL", async () => {
    const { useCase } = setup();

    await expect(useCase.execute(input)).resolves.toEqual({
      accessToken: `access:${USER.id}`,
      accessTokenExpiresAt: new Date("2026-10-07T12:15:00.000Z"),
      refreshToken: "refresh-1",
      refreshTokenExpiresAt: new Date("2026-11-06T12:00:00.000Z"),
    });
  });

  test("stores only the hash of the refresh token, for the user, with a new family", async () => {
    const { useCase, refreshTokenRepository } = setup();

    const session = await useCase.execute(input);

    expect(refreshTokenRepository.tokens).toHaveLength(1);
    const stored = refreshTokenRepository.tokens[0]!;
    expect(stored.userId).toBe(USER.id);
    expect(stored.tokenHash).toBe(
      createHash("sha256").update(session.refreshToken).digest("hex"),
    );
    expect(stored.tokenHash).not.toContain(session.refreshToken);
    expect(stored.familyId).toMatch(/^[0-9a-f-]{36}$/);
    expect(stored.familyId).not.toBe(stored.id);
    expect(stored.expiresAt).toEqual(session.refreshTokenExpiresAt);
    expect(stored.revokedAt).toBeUndefined();
  });

  test("two sessions of the same user get different tokens and families", async () => {
    const { useCase, refreshTokenRepository } = setup();

    const first = await useCase.execute(input);
    const second = await useCase.execute(input);

    expect(first.refreshToken).not.toBe(second.refreshToken);
    expect(refreshTokenRepository.tokens).toHaveLength(2);
    expect(refreshTokenRepository.tokens[0]!.familyId).not.toBe(
      refreshTokenRepository.tokens[1]!.familyId,
    );
  });

  test("uses the TTL it is given", async () => {
    const { useCase } = setup();

    const session = await useCase.execute({ user: USER, refreshTokenTtlDays: 1 });

    expect(session.refreshTokenExpiresAt).toEqual(new Date("2026-10-08T12:00:00.000Z"));
  });

  test("rejects an invalid user id and stores nothing", async () => {
    const { useCase, refreshTokenRepository } = setup();

    await expect(
      useCase.execute({ user: { id: "nope", email: USER.email }, refreshTokenTtlDays: 30 }),
    ).rejects.toMatchObject({ statusCode: 422 });
    expect(refreshTokenRepository.tokens).toHaveLength(0);
  });

  test("propagates repository errors", async () => {
    const { useCase, refreshTokenRepository } = setup();
    const error = new Error("database unavailable");
    jest.spyOn(refreshTokenRepository, "create").mockRejectedValueOnce(error);

    await expect(useCase.execute(input)).rejects.toBe(error);
  });
});
