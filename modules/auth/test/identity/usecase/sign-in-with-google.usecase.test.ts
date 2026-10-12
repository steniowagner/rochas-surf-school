import {
  UnauthorizedError,
  ValidationException,
} from "@rochas-surf-school/shared";
import {
  GoogleIdTokenPayload,
  Identity,
  SignInWithGoogle,
  StartSession,
  User,
  UserState,
} from "../../../src";
import {
  FakeClockProvider,
  FakeGoogleIdTokenProvider,
  FakeIdentityRepository,
  FakeRefreshTokenRepository,
  FakeRulesVersionProvider,
  FakeTokenProvider,
  FakeUserRepository,
} from "../../mock";

const T = new Date("2026-10-12T12:00:00.000Z");

function buildUser(overrides: Partial<UserState> = {}): User {
  return new User({
    name: "Ana Rocha",
    email: "ana@example.com",
    whatsappVisible: false,
    role: "student",
    status: "approved",
    ...overrides,
  });
}

function payload(overrides: Partial<GoogleIdTokenPayload> = {}): GoogleIdTokenPayload {
  return {
    sub: "sub-1",
    email: "maria@example.com",
    emailVerified: true,
    name: "Maria Silva",
    ...overrides,
  };
}

function setup(
  options: {
    users?: User[];
    identities?: Identity[];
    tokens?: Record<string, GoogleIdTokenPayload>;
  } = {},
) {
  const clock = new FakeClockProvider(T);
  const provider = new FakeGoogleIdTokenProvider(options.tokens ?? { good: payload() });
  const userRepository = new FakeUserRepository(options.users ?? []);
  const identityRepository = new FakeIdentityRepository(options.identities ?? []);
  const refreshTokenRepository = new FakeRefreshTokenRepository();
  const startSession = new StartSession(
    refreshTokenRepository,
    new FakeTokenProvider(clock),
    clock,
  );
  const signIn = new SignInWithGoogle(
    provider,
    userRepository,
    identityRepository,
    startSession,
    30,
    new FakeRulesVersionProvider(0),
  );
  return { provider, userRepository, identityRepository, refreshTokenRepository, signIn };
}

async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => {
      throw new Error("expected a rejection");
    },
    (error: unknown) => error,
  );
}

async function expectUnauthorized(promise: Promise<unknown>, message: string): Promise<void> {
  const error = await rejectionOf(promise);
  expect(error).toBeInstanceOf(UnauthorizedError);
  expect(error).toMatchObject({ message, statusCode: 401 });
}

async function validationErrorsOf(promise: Promise<unknown>): Promise<string[]> {
  const error = await rejectionOf(promise);
  expect(error).toBeInstanceOf(ValidationException);
  return (error as ValidationException).errors.map((item) => item.message);
}

function expectNothingWritten(ctx: ReturnType<typeof setup>, users = 0, identities = 0) {
  expect(ctx.userRepository.users).toHaveLength(users);
  expect(ctx.identityRepository.identities).toHaveLength(identities);
  expect(ctx.refreshTokenRepository.tokens).toHaveLength(0);
}

describe("SignInWithGoogle", () => {
  test("new account: creates a pending student with Google's name and a google identity", async () => {
    const ctx = setup({ tokens: { good: payload({ email: " Maria@Example.com " }) } });

    const result = await ctx.signIn.execute({ idToken: "good" });

    expect(result.user).toMatchObject({
      name: "Maria Silva",
      email: "maria@example.com",
      role: "student",
      status: "pending",
    });
    expect(result.accessToken).toBeTruthy();
    expect(ctx.userRepository.users).toHaveLength(1);
    expect(ctx.identityRepository.identities).toHaveLength(1);
    expect(ctx.identityRepository.identities[0]).toMatchObject({
      userId: result.user.id,
      provider: "google",
      providerUserId: "sub-1",
      email: "maria@example.com",
    });
    expect(ctx.refreshTokenRepository.tokens).toHaveLength(1);
  });

  test("name from the body replaces Google's name", async () => {
    const ctx = setup({ tokens: { good: payload({ name: "Maria" }) } });

    const result = await ctx.signIn.execute({ idToken: "good", name: "  Maria Souza " });

    expect(result.user.name).toBe("Maria Souza");
    expect(ctx.userRepository.users).toHaveLength(1);
  });

  test("invalid name: refuses and writes nothing, then accepts a name from the body", async () => {
    const ctx = setup({ tokens: { good: payload({ name: "Maria" }) } });

    const errors = await validationErrorsOf(ctx.signIn.execute({ idToken: "good" }));
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.every((key) => key.startsWith("user.name."))).toBe(true);
    expectNothingWritten(ctx);

    await validationErrorsOf(ctx.signIn.execute({ idToken: "good", name: "x".repeat(81) }));
    expectNothingWritten(ctx);

    const result = await ctx.signIn.execute({ idToken: "good", name: "Maria Souza" });
    expect(result.user.name).toBe("Maria Souza");
  });

  test("invalid name: a token without a name asks for one", async () => {
    const ctx = setup({ tokens: { good: payload({ name: undefined }) } });

    const errors = await validationErrorsOf(ctx.signIn.execute({ idToken: "good" }));

    expect(errors.every((key) => key.startsWith("user.name."))).toBe(true);
    expectNothingWritten(ctx);
  });

  test("links an existing account by email without duplicating it", async () => {
    const ana = buildUser();
    const ctx = setup({
      users: [ana],
      tokens: { good: payload({ sub: "sub-ana", email: "Ana@Example.com" }) },
    });

    const result = await ctx.signIn.execute({ idToken: "good", name: "Someone Else" });

    expect(result.user.id).toBe(ana.id);
    expect(result.user.name).toBe("Ana Rocha");
    expect(ctx.userRepository.users).toHaveLength(1);
    expect(ctx.identityRepository.identities).toHaveLength(1);
    expect(ctx.identityRepository.identities[0]).toMatchObject({
      userId: ana.id,
      provider: "google",
      providerUserId: "sub-ana",
    });
  });

  test.each(["pending", "approved", "denied", "deleted", "removed"] as const)(
    "any status: a %s account gets a session with its own status",
    async (status) => {
      const ana = buildUser({ status });
      const ctx = setup({
        users: [ana],
        tokens: { good: payload({ email: "ana@example.com" }) },
      });

      const result = await ctx.signIn.execute({ idToken: "good" });

      expect(result.user).toMatchObject({ id: ana.id, status });
      expect(ctx.refreshTokenRepository.tokens).toHaveLength(1);
    },
  );

  test("known identity: opens its account even when the Google email changed", async () => {
    const ana = buildUser({ email: "old@gmail.com" });
    const identity = new Identity({
      userId: ana.id,
      provider: "google",
      providerUserId: "sub-ana",
      email: "old@gmail.com",
    });
    const ctx = setup({
      users: [ana],
      identities: [identity],
      tokens: { good: payload({ sub: "sub-ana", email: "new@gmail.com" }) },
    });

    const first = await ctx.signIn.execute({ idToken: "good" });
    const second = await ctx.signIn.execute({ idToken: "good" });

    expect(first.user).toMatchObject({ id: ana.id, email: "old@gmail.com" });
    expect(second.user.id).toBe(ana.id);
    expect(ctx.userRepository.users).toHaveLength(1);
    expect(ctx.identityRepository.identities).toHaveLength(1);
  });

  test("known identity whose account is gone falls back to the email lookup", async () => {
    const orphan = new Identity({
      userId: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      provider: "google",
      providerUserId: "sub-1",
      email: "maria@example.com",
    });
    const ctx = setup({ identities: [orphan] });

    const result = await ctx.signIn.execute({ idToken: "good" });

    expect(result.user.email).toBe("maria@example.com");
    expect(ctx.userRepository.users).toHaveLength(1);
  });

  test("token required: an empty, missing or non-string token is refused without calling the provider", async () => {
    const ctx = setup();

    for (const idToken of ["", undefined, 42] as unknown[]) {
      const errors = await validationErrorsOf(
        ctx.signIn.execute({ idToken } as never),
      );
      expect(errors).toEqual(["idToken.token.required"]);
    }
    expect(await validationErrorsOf(ctx.signIn.execute(undefined as never))).toEqual([
      "idToken.token.required",
    ]);
    expect(ctx.provider.verified).toHaveLength(0);
    expectNothingWritten(ctx);
  });

  test("token invalid: a token the provider rejects is refused", async () => {
    const ctx = setup();

    await expectUnauthorized(
      ctx.signIn.execute({ idToken: "bad" }),
      "auth.google.tokenInvalid",
    );
    expectNothingWritten(ctx);
  });

  test("email not verified: refused even when the account and identity exist", async () => {
    const ana = buildUser();
    const identity = new Identity({
      userId: ana.id,
      provider: "google",
      providerUserId: "sub-ana",
      email: "ana@example.com",
    });
    const ctx = setup({
      users: [ana],
      identities: [identity],
      tokens: {
        absent: payload({ sub: "sub-ana", email: "ana@example.com", emailVerified: undefined as never }),
        no: payload({ sub: "sub-ana", email: "ana@example.com", emailVerified: false }),
      },
    });

    await expectUnauthorized(ctx.signIn.execute({ idToken: "absent" }), "auth.google.emailNotVerified");
    await expectUnauthorized(ctx.signIn.execute({ idToken: "no" }), "auth.google.emailNotVerified");
    expectNothingWritten(ctx, 1, 1);
  });
});
