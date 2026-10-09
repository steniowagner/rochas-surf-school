import { UnauthorizedError } from "@rochas-surf-school/shared";
import {
  RefreshSession,
  StartSession,
  User,
  UserStatus,
} from "../../../src";
import {
  FakeClockProvider,
  FakeRefreshTokenRepository,
  FakeTokenProvider,
  FakeUserRepository,
} from "../../mock";

const NOW = new Date("2026-10-07T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function buildUser(status: UserStatus = "approved"): User {
  return new User({
    name: "Ana Rocha",
    email: "ana@example.com",
    whatsappVisible: false,
    role: "student",
    status,
  });
}

function setup(users: User[] = [buildUser()]) {
  const clock = new FakeClockProvider(NOW);
  const refreshTokenRepository = new FakeRefreshTokenRepository();
  const userRepository = new FakeUserRepository(users);
  const tokenProvider = new FakeTokenProvider(clock);
  const startSession = new StartSession(refreshTokenRepository, tokenProvider, clock);
  const useCase = new RefreshSession(
    refreshTokenRepository,
    userRepository,
    tokenProvider,
    clock,
    30,
  );
  const signIn = (user: User = users[0]!) =>
    startSession.execute({ user: { id: user.id, email: user.email }, refreshTokenTtlDays: 30 });
  return { clock, refreshTokenRepository, userRepository, tokenProvider, useCase, signIn };
}

async function expectInvalid(promise: Promise<unknown>): Promise<void> {
  const error = await promise.catch((e) => e);
  expect(error).toBeInstanceOf(UnauthorizedError);
  expect(error).toMatchObject({ message: "auth.refreshToken.invalid", statusCode: 401 });
}

async function validationErrorsOf(promise: Promise<unknown>): Promise<string[]> {
  const error = await promise.catch((e) => e);
  expect(error).toMatchObject({ statusCode: 422 });
  return (error.errors as { message: string }[]).map((item) => item.message);
}

describe("RefreshSession", () => {
  describe("rotation", () => {
    test("returns a new session with the user and revokes the sent token", async () => {
      const ctx = setup();
      const ana = ctx.userRepository.users[0]!;
      const first = await ctx.signIn();
      ctx.clock.advance(10 * DAY_MS);

      const result = await ctx.useCase.execute({ refreshToken: first.refreshToken });

      expect(result).toEqual({
        accessToken: `access:${ana.id}`,
        accessTokenExpiresAt: new Date(NOW.getTime() + 10 * DAY_MS + 15 * 60 * 1000),
        refreshToken: "refresh-2",
        refreshTokenExpiresAt: new Date(NOW.getTime() + 40 * DAY_MS),
        user: {
          id: ana.id,
          name: "Ana Rocha",
          email: "ana@example.com",
          role: "student",
          status: "approved",
          createdAt: ana.createdAt,
        },
      });
      const [old, rotated] = ctx.refreshTokenRepository.tokens;
      expect(old!.revokedAt).toEqual(new Date(NOW.getTime() + 10 * DAY_MS));
      expect(rotated!.familyId).toBe(old!.familyId);
      expect(rotated!.userId).toBe(ana.id);
      expect(rotated!.tokenHash).toBe(ctx.tokenProvider.hashRefreshToken("refresh-2"));
      expect(rotated!.revokedAt).toBeUndefined();
    });

    test("the new refresh token can be refreshed too", async () => {
      const ctx = setup();
      const first = await ctx.signIn();

      const second = await ctx.useCase.execute({ refreshToken: first.refreshToken });
      const third = await ctx.useCase.execute({ refreshToken: second.refreshToken });

      expect(third.refreshToken).toBe("refresh-3");
      expect(ctx.refreshTokenRepository.tokens).toHaveLength(3);
    });

    test.each<UserStatus>(["pending", "denied", "deleted", "removed"])(
      "a %s account can refresh",
      async (status) => {
        const ctx = setup([buildUser(status)]);
        const first = await ctx.signIn();

        await expect(ctx.useCase.execute({ refreshToken: first.refreshToken })).resolves.toMatchObject({
          user: { status },
        });
      },
    );
  });

  describe("reuse", () => {
    test("a rotated token revokes its whole family", async () => {
      const ctx = setup();
      const first = await ctx.signIn();
      const second = await ctx.useCase.execute({ refreshToken: first.refreshToken });

      await expectInvalid(ctx.useCase.execute({ refreshToken: first.refreshToken }));

      expect(ctx.refreshTokenRepository.tokens.every((token) => token.revokedAt)).toBe(true);
      await expectInvalid(ctx.useCase.execute({ refreshToken: second.refreshToken }));
    });

    test("losing the atomic rotation (concurrent reuse) revokes the family", async () => {
      const ctx = setup();
      const first = await ctx.signIn();
      jest.spyOn(ctx.refreshTokenRepository, "rotate").mockResolvedValueOnce(false);

      await expectInvalid(ctx.useCase.execute({ refreshToken: first.refreshToken }));

      expect(ctx.refreshTokenRepository.tokens).toHaveLength(1);
      expect(ctx.refreshTokenRepository.tokens[0]!.revokedAt).toEqual(NOW);
    });

    test("does not touch another family of the same user", async () => {
      const ctx = setup();
      const first = await ctx.signIn();
      const other = await ctx.signIn();
      await ctx.useCase.execute({ refreshToken: first.refreshToken });

      await expectInvalid(ctx.useCase.execute({ refreshToken: first.refreshToken }));

      await expect(ctx.useCase.execute({ refreshToken: other.refreshToken })).resolves.toMatchObject({
        accessToken: expect.any(String),
      });
    });
  });

  describe("refusals", () => {
    test("an unknown token", async () => {
      const ctx = setup();

      await expectInvalid(ctx.useCase.execute({ refreshToken: "never-issued" }));

      expect(ctx.refreshTokenRepository.tokens).toHaveLength(0);
    });

    test("an expired token issues nothing", async () => {
      const ctx = setup();
      const first = await ctx.signIn();
      ctx.clock.advance(30 * DAY_MS);

      await expectInvalid(ctx.useCase.execute({ refreshToken: first.refreshToken }));

      expect(ctx.refreshTokenRepository.tokens).toHaveLength(1);
      expect(ctx.refreshTokenRepository.tokens[0]!.revokedAt).toBeUndefined();
    });

    test("a token revoked by a sign-out", async () => {
      const ctx = setup();
      const first = await ctx.signIn();
      await ctx.refreshTokenRepository.revokeFamily(
        ctx.refreshTokenRepository.tokens[0]!.familyId,
        NOW,
      );

      await expectInvalid(ctx.useCase.execute({ refreshToken: first.refreshToken }));

      expect(ctx.refreshTokenRepository.tokens).toHaveLength(1);
    });

    test("a token whose user no longer exists", async () => {
      const ctx = setup();
      const first = await ctx.signIn();
      await ctx.userRepository.delete(ctx.userRepository.users[0]!.id);

      await expectInvalid(ctx.useCase.execute({ refreshToken: first.refreshToken }));

      expect(ctx.refreshTokenRepository.tokens).toHaveLength(1);
    });

    test.each([undefined, "", 42, null, {}])("a missing or non-string token (%p) is 422", async (value) => {
      const ctx = setup();

      await expect(
        validationErrorsOf(ctx.useCase.execute({ refreshToken: value as never })),
      ).resolves.toEqual(["refreshToken.token.required"]);
    });

    test("a missing input is 422", async () => {
      const ctx = setup();

      await expect(
        validationErrorsOf(ctx.useCase.execute(undefined as never)),
      ).resolves.toEqual(["refreshToken.token.required"]);
    });
  });
});

