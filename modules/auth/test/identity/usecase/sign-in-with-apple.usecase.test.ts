import {
  UnauthorizedError,
  ValidationException,
} from "@rochas-surf-school/shared";
import {
  AppleIdTokenPayload,
  Identity,
  SignInWithApple,
  StartSession,
  User,
  UserState,
} from "../../../src";
import {
  FakeAppleIdTokenProvider,
  FakeClockProvider,
  FakeIdentityRepository,
  FakeRefreshTokenRepository,
  FakeRegistrationNotifier,
  FakeRulesVersionProvider,
  FakeTokenProvider,
  FakeUserRepository,
} from "../../mock";

const T = new Date("2026-11-01T12:00:00.000Z");

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

function buildIdentity(user: User, sub = "sub-1"): Identity {
  return new Identity({
    userId: user.id,
    provider: "apple",
    providerUserId: sub,
    email: user.email,
  });
}

function payload(overrides: Partial<AppleIdTokenPayload> = {}): AppleIdTokenPayload {
  return {
    sub: "sub-1",
    email: "maria@example.com",
    emailVerified: true,
    ...overrides,
  };
}

function setup(
  options: {
    users?: User[];
    identities?: Identity[];
    tokens?: Record<string, AppleIdTokenPayload>;
  } = {},
) {
  const clock = new FakeClockProvider(T);
  const provider = new FakeAppleIdTokenProvider(options.tokens ?? { good: payload() });
  const userRepository = new FakeUserRepository(options.users ?? []);
  const identityRepository = new FakeIdentityRepository(options.identities ?? []);
  const refreshTokenRepository = new FakeRefreshTokenRepository();
  const startSession = new StartSession(
    refreshTokenRepository,
    new FakeTokenProvider(clock),
    clock,
  );
  const notifier = new FakeRegistrationNotifier();
  const signIn = new SignInWithApple(
    provider,
    userRepository,
    identityRepository,
    startSession,
    30,
    new FakeRulesVersionProvider(0),
    notifier,
  );
  return { notifier, provider, userRepository, identityRepository, refreshTokenRepository, signIn };
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
  expect(ctx.notifier.pending).toEqual([]);
}

describe("SignInWithApple", () => {
  test("new account: creates a pending student with the body's name and an apple identity", async () => {
    const ctx = setup({ tokens: { good: payload({ email: " Maria@Example.com " }) } });

    const result = await ctx.signIn.execute({ idToken: "good", name: "  Maria Silva " });

    expect(result.user).toMatchObject({
      name: "Maria Silva",
      email: "maria@example.com",
      role: "student",
      status: "pending",
    });
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(ctx.userRepository.users).toHaveLength(1);
    expect(ctx.identityRepository.identities).toHaveLength(1);
    expect(ctx.identityRepository.identities[0]).toMatchObject({
      userId: result.user.id,
      provider: "apple",
      providerUserId: "sub-1",
      email: "maria@example.com",
    });
    expect(ctx.refreshTokenRepository.tokens).toHaveLength(1);
    expect(ctx.notifier.pending).toEqual([{ id: result.user.id, name: "Maria Silva" }]);
  });

  test("links an existing account by email without duplicating it or changing its name", async () => {
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
      provider: "apple",
      providerUserId: "sub-ana",
      email: "ana@example.com",
    });
    expect(ctx.notifier.pending).toEqual([]);
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
      expect(ctx.notifier.pending).toEqual([]);
    },
  );

  test.each([
    ["no email", undefined],
    ["another verified email", "new@example.com"],
  ])("known identity: opens its account with %s, keeping its email", async (_, email) => {
    const ana = buildUser({ email: "old@example.com" });
    const ctx = setup({
      users: [ana],
      identities: [buildIdentity(ana, "sub-ana")],
      tokens: {
        good: payload({ sub: "sub-ana", email, emailVerified: email !== undefined }),
      },
    });

    const result = await ctx.signIn.execute({ idToken: "good" });

    expect(result.user).toMatchObject({ id: ana.id, email: "old@example.com" });
    expect(ctx.userRepository.users).toHaveLength(1);
    expect(ctx.identityRepository.identities).toHaveLength(1);
    expect(ctx.refreshTokenRepository.tokens).toHaveLength(1);
  });

  test("known identity whose account is gone continues by email", async () => {
    const ana = buildUser();
    const orphan = new Identity({
      userId: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      provider: "apple",
      providerUserId: "sub-1",
    });
    const ctx = setup({
      users: [ana],
      identities: [orphan],
      tokens: { good: payload({ email: "ana@example.com" }) },
    });

    const result = await ctx.signIn.execute({ idToken: "good" });

    expect(result.user.id).toBe(ana.id);
    expect(ctx.userRepository.users).toHaveLength(1);
  });

  test("known identity whose account is gone and no email is refused as a new person", async () => {
    const orphan = new Identity({
      userId: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      provider: "apple",
      providerUserId: "sub-1",
    });
    const ctx = setup({
      identities: [orphan],
      tokens: { good: payload({ email: undefined, emailVerified: false }) },
    });

    await expectUnauthorized(
      ctx.signIn.execute({ idToken: "good", name: "Maria Silva" }),
      "auth.apple.emailMissing",
    );
    expectNothingWritten(ctx, 0, 1);
  });

  test("token required: an empty, missing or non-string token is refused without calling the provider", async () => {
    const ctx = setup();

    for (const idToken of ["", undefined, 42] as unknown[]) {
      const errors = await validationErrorsOf(ctx.signIn.execute({ idToken } as never));
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
      ctx.signIn.execute({ idToken: "bad", name: "Maria Silva" }),
      "auth.apple.tokenInvalid",
    );
    expectNothingWritten(ctx);
  });

  test("email not verified: refused and nothing written, even with a matching account", async () => {
    const ana = buildUser();
    const ctx = setup({
      users: [ana],
      tokens: { good: payload({ email: "ana@example.com", emailVerified: false }) },
    });

    await expectUnauthorized(
      ctx.signIn.execute({ idToken: "good" }),
      "auth.apple.emailNotVerified",
    );
    expectNothingWritten(ctx, 1, 0);
  });

  test("email not verified: refused even with a matching identity", async () => {
    const ana = buildUser();
    const ctx = setup({
      users: [ana],
      identities: [buildIdentity(ana)],
      tokens: { good: payload({ email: "ana@example.com", emailVerified: false }) },
    });

    await expectUnauthorized(
      ctx.signIn.execute({ idToken: "good" }),
      "auth.apple.emailNotVerified",
    );
    expectNothingWritten(ctx, 1, 1);
  });

  test("email missing: a new person with no email is refused, whatever the name", async () => {
    const ctx = setup({
      tokens: { good: payload({ email: undefined, emailVerified: false }) },
    });

    await expectUnauthorized(
      ctx.signIn.execute({ idToken: "good", name: "Maria Silva" }),
      "auth.apple.emailMissing",
    );
    expectNothingWritten(ctx);
  });

  test("invalid name: refuses and writes nothing, then accepts a valid name with the same token", async () => {
    const ctx = setup();

    const missing = await validationErrorsOf(ctx.signIn.execute({ idToken: "good" }));
    expect(missing.length).toBeGreaterThan(0);
    expect(missing.every((key) => key.startsWith("user.name."))).toBe(true);
    expectNothingWritten(ctx);

    for (const name of ["Maria", "  Maria  ", "x".repeat(81)]) {
      const errors = await validationErrorsOf(ctx.signIn.execute({ idToken: "good", name }));
      expect(errors.every((key) => key.startsWith("user.name."))).toBe(true);
      expectNothingWritten(ctx);
    }

    const result = await ctx.signIn.execute({ idToken: "good", name: " Maria Souza " });
    expect(result.user.name).toBe("Maria Souza");
    expect(ctx.userRepository.users).toHaveLength(1);
  });

  test("relay address: a new account keeps it, and the real address's account is untouched", async () => {
    const ana = buildUser();
    const relay = "x1y2z3@privaterelay.appleid.com";
    const ctx = setup({
      users: [ana],
      tokens: { good: payload({ email: relay }) },
    });

    const first = await ctx.signIn.execute({ idToken: "good", name: "Maria Silva" });
    const second = await ctx.signIn.execute({ idToken: "good" });

    expect(first.user).toMatchObject({ email: relay, role: "student", status: "pending" });
    expect(first.user.id).not.toBe(ana.id);
    expect(second.user.id).toBe(first.user.id);
    expect(ctx.userRepository.users).toHaveLength(2);
    expect(ctx.identityRepository.identities).toHaveLength(1);
    expect(await ctx.userRepository.findByEmail("ana@example.com")).toMatchObject({
      id: ana.id,
      name: "Ana Rocha",
    });
  });
});
