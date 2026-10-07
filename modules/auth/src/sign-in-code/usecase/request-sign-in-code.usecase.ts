import {
  BadGatewayError,
  TooManyRequestsError,
  UseCase,
  ValidationError,
  ValidationException,
} from "@rochas-surf-school/shared";
import {
  SIGN_IN_CODE_RESEND_COOLDOWN_MS,
  SIGN_IN_CODE_TTL_MS,
  SignInCode,
  isValidEmail,
  normalizeEmail,
} from "../model";
import {
  ClockProvider,
  EmailProvider,
  SIGN_IN_LOCALES,
  SignInCodeProvider,
  SignInCodeRepository,
  SignInLocale,
} from "../provider";

export interface RequestSignInCodeIn {
  email: string;
  locale?: SignInLocale;
}

export interface RequestSignInCodeOut {
  resendAvailableAt: Date;
  expiresAt: Date;
}

/** Normalized review-account email → its fixed code. */
export type ReviewCodes = Record<string, string>;

export class RequestSignInCode
  implements UseCase<RequestSignInCodeIn, RequestSignInCodeOut>
{
  private readonly reviewCodes: Map<string, string>;

  constructor(
    private readonly signInCodeRepository: SignInCodeRepository,
    private readonly signInCodeProvider: SignInCodeProvider,
    private readonly emailProvider: EmailProvider,
    private readonly clock: ClockProvider,
    reviewCodes: ReviewCodes,
  ) {
    this.reviewCodes = new Map(
      Object.entries(reviewCodes).map(([email, code]) => [normalizeEmail(email), code]),
    );
  }

  async execute(input: RequestSignInCodeIn): Promise<RequestSignInCodeOut> {
    const email = normalizeEmail(input.email);
    const locale = input.locale ?? "pt-BR";
    this.validate(email, locale);

    const now = this.clock.now();
    const existing = await this.signInCodeRepository.findByEmail(email);
    if (existing) {
      const resendAvailableAt = new Date(
        existing.lastSentAt.getTime() + SIGN_IN_CODE_RESEND_COOLDOWN_MS,
      );
      if (now.getTime() < resendAvailableAt.getTime()) {
        throw new TooManyRequestsError("signInCode.resend.tooSoon", {
          resendAvailableAt: resendAvailableAt.toISOString(),
        });
      }
    }

    const reviewCode = this.reviewCodes.get(email);
    const code = reviewCode ?? this.signInCodeProvider.generate();
    const signInCode = new SignInCode({
      email,
      codeHash: this.signInCodeProvider.hash(email, code),
      expiresAt: new Date(now.getTime() + SIGN_IN_CODE_TTL_MS),
      lastSentAt: now,
      attempts: 0,
    });
    signInCode.validate();
    await this.signInCodeRepository.save(signInCode);

    if (reviewCode === undefined) {
      await this.send(email, code, locale, now);
    }

    return {
      resendAvailableAt: new Date(now.getTime() + SIGN_IN_CODE_RESEND_COOLDOWN_MS),
      expiresAt: signInCode.expiresAt,
    };
  }

  private validate(email: string, locale: string): void {
    const errors: ValidationError[] = [];
    if (!isValidEmail(email)) {
      errors.push(new ValidationError("signInCode.email.invalid"));
    }
    if (!(SIGN_IN_LOCALES as readonly string[]).includes(locale)) {
      errors.push(new ValidationError("signInCode.locale.invalid"));
    }
    if (errors.length > 0) {
      throw new ValidationException(errors);
    }
  }

  private async send(
    email: string,
    code: string,
    locale: SignInLocale,
    sentAt: Date,
  ): Promise<void> {
    try {
      await this.emailProvider.sendSignInCode({
        to: email,
        code,
        locale,
        idempotencyKey: `signin-code:${email}:${sentAt.getTime()}`,
      });
    } catch {
      await this.signInCodeRepository.deleteByEmail(email);
      throw new BadGatewayError("signInCode.email.sendFailed");
    }
  }
}
