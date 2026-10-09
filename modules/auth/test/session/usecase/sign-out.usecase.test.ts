import { SignOut, StartSession, User } from "../../../src";
import { FakeClockProvider, FakeRefreshTokenRepository, FakeTokenProvider } from "../../mock";

const NOW = new Date("2026-10-07T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const USER = new User({
  name: "Ana Rocha",
  email: "ana@example.com",
  whatsappVisible: false,
  role: "student",
  status: "approved",
});

function setup() {
  const clock = new FakeClockProvider(NOW);
  const refreshTokenRepository = new FakeRefreshTokenRepository();
  const tokenProvider = new FakeTokenProvider(clock);
  const startSession = new StartSession(refreshTokenRepository, tokenProvider, clock);
  const useCase = new SignOut(refreshTokenRepository, tokenProvider, clock);
  const signIn = () =>
    startSession.execute({ user: { id: USER.id, email: USER.email }, refreshTokenTtlDays: 30 });
  return { clock, refreshTokenRepository, useCase, signIn };
}

const revokedAts = (repository: FakeRefreshTokenRepository) =>
  repository.tokens.map((token) => token.revokedAt);

describe("SignOut", () => {
  test("revokes every active token of the family and leaves other families alone", async () => {
    const ctx = setup();
    const x = await ctx.signIn();
    await ctx.signIn();
    ctx.clock.advance(1000);
    const [xToken] = ctx.refreshTokenRepository.tokens;
    await ctx.refreshTokenRepository.create(
      xToken!.clone({ id: undefined, tokenHash: "b".repeat(64), revokedAt: undefined }),
    );

    await expect(ctx.useCase.execute({ refreshToken: x.refreshToken })).resolves.toBeUndefined();

    const at = ctx.clock.now();
    expect(revokedAts(ctx.refreshTokenRepository)).toEqual([at, undefined, at]);
  });

  test("keeps the first revocation date of an already-revoked token", async () => {
    const ctx = setup();
    const x = await ctx.signIn();
    await ctx.useCase.execute({ refreshToken: x.refreshToken });
    ctx.clock.advance(DAY_MS);

    await expect(ctx.useCase.execute({ refreshToken: x.refreshToken })).resolves.toBeUndefined();

    expect(revokedAts(ctx.refreshTokenRepository)).toEqual([NOW]);
  });

  test("an unknown token changes nothing", async () => {
    const ctx = setup();
    await ctx.signIn();

    await expect(ctx.useCase.execute({ refreshToken: "never-issued" })).resolves.toBeUndefined();

    expect(revokedAts(ctx.refreshTokenRepository)).toEqual([undefined]);
  });

  test("an expired token is answered without error", async () => {
    const ctx = setup();
    const x = await ctx.signIn();
    ctx.clock.advance(31 * DAY_MS);

    await expect(ctx.useCase.execute({ refreshToken: x.refreshToken })).resolves.toBeUndefined();
  });

  test.each([undefined, "", 42, null, {}])("a missing or non-string token (%p) is 422", async (value) => {
    const ctx = setup();

    const error = await ctx.useCase.execute({ refreshToken: value as never }).catch((e) => e);

    expect(error).toMatchObject({ statusCode: 422 });
    expect(error.errors.map((item: { message: string }) => item.message)).toEqual([
      "refreshToken.token.required",
    ]);
  });

  test("a missing input is 422", async () => {
    const ctx = setup();

    await expect(ctx.useCase.execute(undefined as never)).rejects.toMatchObject({
      statusCode: 422,
    });
  });
});
