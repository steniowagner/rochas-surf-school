import {
  BadGatewayError,
  TooManyRequestsError,
  ValidationException,
} from "@rochas-surf-school/shared";
import { RequestSignInCode } from "../../../src";
import {
  FakeClockProvider,
  FakeEmailProvider,
  FakeSignInCodeProvider,
  FakeSignInCodeRepository,
} from "../../mock";

const T = new Date("2026-10-07T12:00:00.000Z");
const at = (ms: number) => new Date(T.getTime() + ms);

function setup(reviewCodes: Record<string, string> = {}) {
  const repository = new FakeSignInCodeRepository();
  const codeProvider = new FakeSignInCodeProvider(["123456", "654321", "111111"]);
  const emailProvider = new FakeEmailProvider();
  const clock = new FakeClockProvider(T);
  const useCase = new RequestSignInCode(
    repository,
    codeProvider,
    emailProvider,
    clock,
    reviewCodes,
  );
  return { repository, codeProvider, emailProvider, clock, useCase };
}

async function errorsOf(promise: Promise<unknown>): Promise<string[]> {
  try {
    await promise;
    return [];
  } catch (error) {
    return (error as ValidationException).errors.map((item) => item.message);
  }
}

describe("RequestSignInCode", () => {
  describe("request code", () => {
    test("sends a 6-digit code to the normalized email and stores only its hash", async () => {
      const { useCase, repository, emailProvider, codeProvider } = setup();

      const result = await useCase.execute({ email: " Ana@Example.com ", locale: "es" });

      expect(result).toEqual({ resendAvailableAt: at(30_000), expiresAt: at(600_000) });
      expect(emailProvider.sent).toEqual([
        {
          to: "ana@example.com",
          code: "123456",
          locale: "es",
          idempotencyKey: `signin-code:ana@example.com:${T.getTime()}`,
        },
      ]);
      const stored = await repository.findByEmail("ana@example.com");
      expect(stored?.codeHash).toMatch(/^[0-9a-f]{64}$/);
      expect(stored?.codeHash).not.toContain("123456");
      expect(stored?.codeHash).toBe(codeProvider.hash("ana@example.com", "123456"));
      expect(stored?.expiresAt).toEqual(at(600_000));
      expect(stored?.lastSentAt).toEqual(T);
      expect(stored?.attempts).toBe(0);
    });

    test("answers the same way for any email, with or without an account", async () => {
      const { useCase } = setup();

      const first = await useCase.execute({ email: "ana@example.com", locale: "en" });
      const second = await useCase.execute({ email: "nobody@example.com", locale: "en" });

      expect(second).toEqual(first);
    });

    test("sends in pt-BR when no locale is given", async () => {
      const { useCase, emailProvider } = setup();

      await useCase.execute({ email: "ana@example.com" });

      expect(emailProvider.sent[0]?.locale).toBe("pt-BR");
    });

    test("rejects an invalid email with signInCode.email.invalid and sends nothing", async () => {
      const { useCase, emailProvider, repository } = setup();

      for (const email of ["ana@", "", "   ", undefined as never, 42 as never]) {
        await expect(errorsOf(useCase.execute({ email, locale: "en" }))).resolves.toEqual([
          "signInCode.email.invalid",
        ]);
      }
      expect(emailProvider.sent).toHaveLength(0);
      expect(repository.codes).toHaveLength(0);
    });

    test("rejects an unknown locale with signInCode.locale.invalid and sends nothing", async () => {
      const { useCase, emailProvider, repository } = setup();

      await expect(
        errorsOf(useCase.execute({ email: "ana@example.com", locale: "fr" as never })),
      ).resolves.toEqual(["signInCode.locale.invalid"]);
      expect(emailProvider.sent).toHaveLength(0);
      expect(repository.codes).toHaveLength(0);
    });

    test("reports an invalid email and locale together", async () => {
      const { useCase } = setup();

      await expect(
        errorsOf(useCase.execute({ email: "ana@", locale: "fr" as never })),
      ).resolves.toEqual(["signInCode.email.invalid", "signInCode.locale.invalid"]);
    });
  });

  describe("cooldown", () => {
    test("rejects a new code before 30 seconds and keeps the first one", async () => {
      const { useCase, repository, emailProvider, clock } = setup();
      await useCase.execute({ email: "ana@example.com" });
      const first = await repository.findByEmail("ana@example.com");
      clock.set(at(10_000));

      const error = await useCase
        .execute({ email: "ana@example.com" })
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(TooManyRequestsError);
      expect(error).toMatchObject({
        message: "signInCode.resend.tooSoon",
        statusCode: 429,
        details: { resendAvailableAt: at(30_000).toISOString() },
      });
      expect(emailProvider.sent).toHaveLength(1);
      expect(await repository.findByEmail("ana@example.com")).toBe(first);
    });

    test("sends a new code at 30 seconds exactly, replacing the first and resetting attempts", async () => {
      const { useCase, repository, emailProvider, clock, codeProvider } = setup();
      await useCase.execute({ email: "ana@example.com" });
      await repository.incrementAttempts("ana@example.com");
      clock.set(at(30_000));

      const result = await useCase.execute({ email: "ana@example.com" });

      expect(result).toEqual({ resendAvailableAt: at(60_000), expiresAt: at(630_000) });
      expect(emailProvider.sent.map((sent) => sent.code)).toEqual(["123456", "654321"]);
      expect(emailProvider.sent[1]?.idempotencyKey).toBe(
        `signin-code:ana@example.com:${at(30_000).getTime()}`,
      );
      const stored = await repository.findByEmail("ana@example.com");
      expect(stored?.codeHash).toBe(codeProvider.hash("ana@example.com", "654321"));
      expect(stored?.attempts).toBe(0);
      expect(repository.codes).toHaveLength(1);
    });

    test("does not hold back another email", async () => {
      const { useCase, emailProvider } = setup();
      await useCase.execute({ email: "ana@example.com" });

      await useCase.execute({ email: "bia@example.com" });

      expect(emailProvider.sent.map((sent) => sent.to)).toEqual([
        "ana@example.com",
        "bia@example.com",
      ]);
    });
  });

  describe("send fails", () => {
    test("deletes the code and answers signInCode.email.sendFailed", async () => {
      const { useCase, repository, emailProvider } = setup();
      emailProvider.failing = true;

      const error = await useCase
        .execute({ email: "ana@example.com" })
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(BadGatewayError);
      expect(error).toMatchObject({ message: "signInCode.email.sendFailed", statusCode: 502 });
      await expect(repository.findByEmail("ana@example.com")).resolves.toBeNull();
    });

    test("accepts an immediate new request once the provider works again", async () => {
      const { useCase, emailProvider, clock } = setup();
      emailProvider.failing = true;
      await useCase.execute({ email: "ana@example.com" }).catch(() => undefined);
      emailProvider.failing = false;
      clock.set(at(1_000));

      await expect(useCase.execute({ email: "ana@example.com" })).resolves.toEqual({
        resendAvailableAt: at(31_000),
        expiresAt: at(601_000),
      });
      expect(emailProvider.sent).toHaveLength(1);
    });
  });

  describe("review account", () => {
    const reviewCodes = { "Review.Admin@Example.com ": "246810" };

    test("stores the hash of the fixed code and sends no email", async () => {
      const { useCase, repository, emailProvider, codeProvider } = setup(reviewCodes);

      const result = await useCase.execute({ email: "REVIEW.admin@example.com" });

      expect(result).toEqual({ resendAvailableAt: at(30_000), expiresAt: at(600_000) });
      expect(emailProvider.sent).toHaveLength(0);
      const stored = await repository.findByEmail("review.admin@example.com");
      expect(stored?.codeHash).toBe(codeProvider.hash("review.admin@example.com", "246810"));
      expect(stored?.attempts).toBe(0);
    });

    test("applies the 30-second cooldown to review accounts too", async () => {
      const { useCase, clock } = setup(reviewCodes);
      await useCase.execute({ email: "review.admin@example.com" });
      clock.set(at(29_999));

      await expect(useCase.execute({ email: "review.admin@example.com" })).rejects.toBeInstanceOf(
        TooManyRequestsError,
      );
    });

    test("other emails still get a random code by email", async () => {
      const { useCase, emailProvider } = setup(reviewCodes);

      await useCase.execute({ email: "ana@example.com" });

      expect(emailProvider.sent[0]?.code).toBe("123456");
    });
  });

  test("propagates repository errors", async () => {
    const { useCase, repository } = setup();
    const error = new Error("database unavailable");
    jest.spyOn(repository, "save").mockRejectedValueOnce(error);

    await expect(useCase.execute({ email: "ana@example.com" })).rejects.toBe(error);
  });
});
