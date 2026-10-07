import { UnauthorizedError, ValidationException } from "@rochas-surf-school/shared";
import {
  Identity,
  RequestSignInCode,
  StartSession,
  User,
  UserState,
  UserStatus,
  VerifySignInCode,
} from "../../../src";
import {
  FakeClockProvider,
  FakeEmailProvider,
  FakeIdentityRepository,
  FakeRefreshTokenRepository,
  FakeSignInCodeProvider,
  FakeSignInCodeRepository,
  FakeTokenProvider,
  FakeUserRepository,
} from "../../mock";

const T = new Date("2026-10-07T12:00:00.000Z");
const at = (ms: number) => new Date(T.getTime() + ms);

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

function setup(
  options: { users?: User[]; identities?: Identity[]; reviewCodes?: Record<string, string> } = {},
) {
  const clock = new FakeClockProvider(T);
  const signInCodeRepository = new FakeSignInCodeRepository();
  const codeProvider = new FakeSignInCodeProvider(["123456", "654321", "111111"]);
  const emailProvider = new FakeEmailProvider();
  const userRepository = new FakeUserRepository(options.users ?? []);
  const identityRepository = new FakeIdentityRepository(options.identities ?? []);
  const refreshTokenRepository = new FakeRefreshTokenRepository();
  const startSession = new StartSession(
    refreshTokenRepository,
    new FakeTokenProvider(clock),
    clock,
  );
  const request = new RequestSignInCode(
    signInCodeRepository,
    codeProvider,
    emailProvider,
    clock,
    options.reviewCodes ?? {},
  );
  const verify = new VerifySignInCode(
    signInCodeRepository,
    userRepository,
    identityRepository,
    codeProvider,
    clock,
    startSession,
    30,
  );
  return {
    clock,
    signInCodeRepository,
    emailProvider,
    userRepository,
    identityRepository,
    refreshTokenRepository,
    request,
    verify,
  };
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

describe("VerifySignInCode", () => {
  describe("existing account", () => {
    test("signs in with the correct code and deletes it", async () => {
      const ana = buildUser();
      const ctx = setup({ users: [ana] });
      await ctx.request.execute({ email: "ana@example.com" });

      const result = await ctx.verify.execute({ email: "ana@example.com", code: "123456" });

      expect(result).toEqual({
        accessToken: `access:${ana.id}`,
        accessTokenExpiresAt: at(15 * 60 * 1000),
        refreshToken: "refresh-1",
        refreshTokenExpiresAt: at(30 * 24 * 60 * 60 * 1000),
        user: {
          id: ana.id,
          name: "Ana Rocha",
          email: "ana@example.com",
          role: "student",
          status: "approved",
        },
      });
      await expect(ctx.signInCodeRepository.findByEmail("ana@example.com")).resolves.toBeNull();
      expect(ctx.refreshTokenRepository.tokens).toHaveLength(1);
      expect(ctx.refreshTokenRepository.tokens[0]?.userId).toBe(ana.id);
    });

    test("matches the email case- and space-insensitively", async () => {
      const ana = buildUser();
      const ctx = setup({ users: [ana] });
      await ctx.request.execute({ email: "ana@example.com" });

      const result = await ctx.verify.execute({ email: "  ANA@Example.com ", code: "123456" });

      expect(result.user.id).toBe(ana.id);
    });

    test("adds an email identity to an account created with Google, without a second account", async () => {
      const ana = buildUser();
      const google = new Identity({
        userId: ana.id,
        provider: "google",
        providerUserId: "google-sub-1",
        email: "ana@example.com",
      });
      const ctx = setup({ users: [ana], identities: [google] });
      await ctx.request.execute({ email: "ana@example.com" });

      await ctx.verify.execute({ email: "ana@example.com", code: "123456" });

      expect(ctx.userRepository.users).toEqual([ana]);
      const identities = await ctx.identityRepository.findByUserId(ana.id);
      expect(identities).toHaveLength(2);
      const emailIdentity = identities.find((identity) => identity.provider === "email");
      expect(emailIdentity?.providerUserId).toBe("ana@example.com");
      expect(emailIdentity?.email).toBe("ana@example.com");
    });

    test("does not duplicate an existing email identity", async () => {
      const ana = buildUser();
      const emailIdentity = new Identity({
        userId: ana.id,
        provider: "email",
        providerUserId: "ana@example.com",
        email: "ana@example.com",
      });
      const ctx = setup({ users: [ana], identities: [emailIdentity] });
      await ctx.request.execute({ email: "ana@example.com" });

      await ctx.verify.execute({ email: "ana@example.com", code: "123456" });

      expect(ctx.identityRepository.identities).toEqual([emailIdentity]);
    });

    test.each<UserStatus>(["pending", "denied", "deleted", "removed"])(
      "signs in a %s account and returns its status",
      async (status) => {
        const ana = buildUser({ status });
        const ctx = setup({ users: [ana] });
        await ctx.request.execute({ email: "ana@example.com" });

        const result = await ctx.verify.execute({ email: "ana@example.com", code: "123456" });

        expect(result.user.status).toBe(status);
      },
    );

    test("ignores the name for an existing account", async () => {
      const ana = buildUser();
      const ctx = setup({ users: [ana] });
      await ctx.request.execute({ email: "ana@example.com" });

      const result = await ctx.verify.execute({
        email: "ana@example.com",
        code: "123456",
        name: "Other Name",
      });

      expect(result.user.name).toBe("Ana Rocha");
      expect(ctx.userRepository.users).toEqual([ana]);
    });
  });

  describe("new account", () => {
    test("asks for the name without consuming the code or counting an attempt", async () => {
      const ctx = setup();
      await ctx.request.execute({ email: "bia@example.com" });

      await expect(
        validationErrorsOf(ctx.verify.execute({ email: "bia@example.com", code: "123456" })),
      ).resolves.toEqual(["user.name.required"]);

      expect(ctx.userRepository.users).toHaveLength(0);
      const code = await ctx.signInCodeRepository.findByEmail("bia@example.com");
      expect(code?.attempts).toBe(0);
    });

    test("creates a pending student with an email identity once the name is given", async () => {
      const ctx = setup();
      await ctx.request.execute({ email: "bia@example.com" });
      await ctx.verify.execute({ email: "bia@example.com", code: "123456" }).catch(() => undefined);

      const result = await ctx.verify.execute({
        email: "Bia@Example.com",
        code: "123456",
        name: " Bia Souza ",
      });

      expect(ctx.userRepository.users).toHaveLength(1);
      const bia = ctx.userRepository.users[0]!;
      expect(bia.name).toBe("Bia Souza");
      expect(bia.email).toBe("bia@example.com");
      expect(bia.role).toBe("student");
      expect(bia.status).toBe("pending");
      expect(bia.whatsappVisible).toBe(false);
      expect(result.user).toEqual({
        id: bia.id,
        name: "Bia Souza",
        email: "bia@example.com",
        role: "student",
        status: "pending",
      });
      expect(result.refreshToken).toBe("refresh-1");
      const identities = await ctx.identityRepository.findByUserId(bia.id);
      expect(identities).toHaveLength(1);
      expect(identities[0]).toMatchObject({
        provider: "email",
        providerUserId: "bia@example.com",
        email: "bia@example.com",
      });
      await expect(ctx.signInCodeRepository.findByEmail("bia@example.com")).resolves.toBeNull();
    });

    test("rejects a short name without consuming the code", async () => {
      const ctx = setup();
      await ctx.request.execute({ email: "bia@example.com" });

      const errors = await validationErrorsOf(
        ctx.verify.execute({ email: "bia@example.com", code: "123456", name: "Al" }),
      );

      expect(errors).toEqual(["user.name.min.length", "user.name.person.name"]);
      expect(ctx.userRepository.users).toHaveLength(0);
      const code = await ctx.signInCodeRepository.findByEmail("bia@example.com");
      expect(code?.attempts).toBe(0);
    });

    test("a wrong code with a name answers invalid and creates nothing", async () => {
      const ctx = setup();
      await ctx.request.execute({ email: "bia@example.com" });

      await expectUnauthorized(
        ctx.verify.execute({ email: "bia@example.com", code: "999999", name: "Bia Souza" }),
        "signInCode.code.invalid",
      );

      expect(ctx.userRepository.users).toHaveLength(0);
      expect(ctx.identityRepository.identities).toHaveLength(0);
    });

    test("a name that is not a string counts as missing", async () => {
      const ctx = setup();
      await ctx.request.execute({ email: "bia@example.com" });

      await expect(
        validationErrorsOf(
          ctx.verify.execute({ email: "bia@example.com", code: "123456", name: 42 as never }),
        ),
      ).resolves.toEqual(["user.name.required"]);
    });
  });

  describe("wrong code", () => {
    test("answers invalid, returns no session and counts an attempt", async () => {
      const ctx = setup({ users: [buildUser()] });
      await ctx.request.execute({ email: "ana@example.com" });

      await expectUnauthorized(
        ctx.verify.execute({ email: "ana@example.com", code: "999999" }),
        "signInCode.code.invalid",
      );

      const code = await ctx.signInCodeRepository.findByEmail("ana@example.com");
      expect(code?.attempts).toBe(1);
      expect(ctx.refreshTokenRepository.tokens).toHaveLength(0);
    });

    test("answers the same for an email with no code requested", async () => {
      const ctx = setup({ users: [buildUser()] });

      await expectUnauthorized(
        ctx.verify.execute({ email: "ana@example.com", code: "123456" }),
        "signInCode.code.invalid",
      );
    });

    test("treats a code that is not 6 digits as a wrong code", async () => {
      const ctx = setup({ users: [buildUser()] });
      await ctx.request.execute({ email: "ana@example.com" });

      await expectUnauthorized(
        ctx.verify.execute({ email: "ana@example.com", code: "12ab" }),
        "signInCode.code.invalid",
      );
      await expectUnauthorized(
        ctx.verify.execute({ email: "ana@example.com", code: undefined as never }),
        "signInCode.code.invalid",
      );

      const code = await ctx.signInCodeRepository.findByEmail("ana@example.com");
      expect(code?.attempts).toBe(2);
    });

    test("answers invalid for a malformed email", async () => {
      const ctx = setup();

      await expectUnauthorized(
        ctx.verify.execute({ email: "ana@", code: "123456" }),
        "signInCode.code.invalid",
      );
    });
  });

  describe("expired", () => {
    test("answers expired 10 minutes after the code was sent", async () => {
      const ctx = setup({ users: [buildUser()] });
      await ctx.request.execute({ email: "ana@example.com" });
      ctx.clock.set(at(10 * 60 * 1000));

      await expectUnauthorized(
        ctx.verify.execute({ email: "ana@example.com", code: "123456" }),
        "signInCode.code.expired",
      );
      expect(ctx.refreshTokenRepository.tokens).toHaveLength(0);
    });

    test("still signs in at 9 minutes 59 seconds", async () => {
      const ctx = setup({ users: [buildUser()] });
      await ctx.request.execute({ email: "ana@example.com" });
      ctx.clock.set(at(9 * 60 * 1000 + 59 * 1000));

      await expect(
        ctx.verify.execute({ email: "ana@example.com", code: "123456" }),
      ).resolves.toMatchObject({ refreshToken: "refresh-1" });
    });

    test("a new code requested after expiry signs in", async () => {
      const ctx = setup({ users: [buildUser()] });
      await ctx.request.execute({ email: "ana@example.com" });
      ctx.clock.set(at(11 * 60 * 1000));

      await ctx.request.execute({ email: "ana@example.com" });

      await expect(
        ctx.verify.execute({ email: "ana@example.com", code: "654321" }),
      ).resolves.toMatchObject({ refreshToken: "refresh-1" });
    });
  });

  describe("attempts", () => {
    test("locks the code after 5 wrong guesses", async () => {
      const ctx = setup({ users: [buildUser()] });
      await ctx.request.execute({ email: "ana@example.com" });
      for (let i = 0; i < 5; i++) {
        await ctx.verify.execute({ email: "ana@example.com", code: "999999" }).catch(() => undefined);
      }

      await expectUnauthorized(
        ctx.verify.execute({ email: "ana@example.com", code: "123456" }),
        "signInCode.attempts.exceeded",
      );
      expect(ctx.refreshTokenRepository.tokens).toHaveLength(0);
    });

    test("still signs in after 4 wrong guesses", async () => {
      const ctx = setup({ users: [buildUser()] });
      await ctx.request.execute({ email: "ana@example.com" });
      for (let i = 0; i < 4; i++) {
        await ctx.verify.execute({ email: "ana@example.com", code: "999999" }).catch(() => undefined);
      }

      await expect(
        ctx.verify.execute({ email: "ana@example.com", code: "123456" }),
      ).resolves.toMatchObject({ refreshToken: "refresh-1" });
    });

    test("a new code after the cooldown resets the attempts", async () => {
      const ctx = setup({ users: [buildUser()] });
      await ctx.request.execute({ email: "ana@example.com" });
      for (let i = 0; i < 5; i++) {
        await ctx.verify.execute({ email: "ana@example.com", code: "999999" }).catch(() => undefined);
      }
      ctx.clock.set(at(30_000));

      await ctx.request.execute({ email: "ana@example.com" });

      await expect(
        ctx.verify.execute({ email: "ana@example.com", code: "654321" }),
      ).resolves.toMatchObject({ refreshToken: "refresh-1" });
    });
  });

  describe("single use", () => {
    test("a code that already signed in answers invalid", async () => {
      const ctx = setup({ users: [buildUser()] });
      await ctx.request.execute({ email: "ana@example.com" });
      await ctx.verify.execute({ email: "ana@example.com", code: "123456" });

      await expectUnauthorized(
        ctx.verify.execute({ email: "ana@example.com", code: "123456" }),
        "signInCode.code.invalid",
      );
    });

    test("two concurrent verifies produce one session and one invalid", async () => {
      const ctx = setup({ users: [buildUser()] });
      await ctx.request.execute({ email: "ana@example.com" });

      const results = await Promise.allSettled([
        ctx.verify.execute({ email: "ana@example.com", code: "123456" }),
        ctx.verify.execute({ email: "ana@example.com", code: "123456" }),
      ]);

      expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
      const rejected = results.filter((result) => result.status === "rejected");
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason).toMatchObject({
        message: "signInCode.code.invalid",
        statusCode: 401,
      });
      expect(ctx.refreshTokenRepository.tokens).toHaveLength(1);
    });
  });

  describe("review account", () => {
    const reviewCodes = { "review.admin@example.com": "246810" };
    const reviewAdmin = () =>
      buildUser({
        name: "Review Admin",
        email: "review.admin@example.com",
        role: "admin",
        status: "approved",
      });

    test("signs in with the fixed code", async () => {
      const admin = reviewAdmin();
      const ctx = setup({ users: [admin], reviewCodes });
      await ctx.request.execute({ email: "review.admin@example.com" });

      const result = await ctx.verify.execute({
        email: "review.admin@example.com",
        code: "246810",
      });

      expect(ctx.emailProvider.sent).toHaveLength(0);
      expect(result.user).toEqual({
        id: admin.id,
        name: "Review Admin",
        email: "review.admin@example.com",
        role: "admin",
        status: "approved",
      });
    });

    test("the fixed code does not work for another email", async () => {
      const ctx = setup({ users: [buildUser(), reviewAdmin()], reviewCodes });
      await ctx.request.execute({ email: "ana@example.com" });

      await expectUnauthorized(
        ctx.verify.execute({ email: "ana@example.com", code: "246810" }),
        "signInCode.code.invalid",
      );
    });

    test("the fixed code does not work before a code is requested", async () => {
      const ctx = setup({ users: [reviewAdmin()], reviewCodes });

      await expectUnauthorized(
        ctx.verify.execute({ email: "review.admin@example.com", code: "246810" }),
        "signInCode.code.invalid",
      );
    });

    test("the 5-attempt lockout applies", async () => {
      const ctx = setup({ users: [reviewAdmin()], reviewCodes });
      await ctx.request.execute({ email: "review.admin@example.com" });
      for (let i = 0; i < 5; i++) {
        await ctx.verify
          .execute({ email: "review.admin@example.com", code: "000000" })
          .catch(() => undefined);
      }

      await expectUnauthorized(
        ctx.verify.execute({ email: "review.admin@example.com", code: "246810" }),
        "signInCode.attempts.exceeded",
      );
    });
  });

  test("propagates repository errors", async () => {
    const ctx = setup({ users: [buildUser()] });
    await ctx.request.execute({ email: "ana@example.com" });
    const error = new Error("database unavailable");
    jest.spyOn(ctx.userRepository, "findByEmail").mockRejectedValueOnce(error);

    await expect(
      ctx.verify.execute({ email: "ana@example.com", code: "123456" }),
    ).rejects.toBe(error);
  });
});
