import { UnauthorizedError, UseCase } from "@rochas-surf-school/shared";
import { Identity, IdentityRepository } from "../../identity";
import { StartSession, StartSessionOut } from "../../session";
import { User, UserRepository, UserRole, UserStatus } from "../../user";
import { SIGN_IN_CODE_MAX_ATTEMPTS, normalizeEmail } from "../model";
import {
  ClockProvider,
  SignInCodeProvider,
  SignInCodeRepository,
} from "../provider";

export interface VerifySignInCodeIn {
  email: string;
  code: string;
  /** Required only when no account exists for the email; ignored otherwise. */
  name?: string;
}

export interface VerifySignInCodeOut extends StartSessionOut {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    createdAt: Date;
  };
}

export class VerifySignInCode
  implements UseCase<VerifySignInCodeIn, VerifySignInCodeOut>
{
  constructor(
    private readonly signInCodeRepository: SignInCodeRepository,
    private readonly userRepository: UserRepository,
    private readonly identityRepository: IdentityRepository,
    private readonly signInCodeProvider: SignInCodeProvider,
    private readonly clock: ClockProvider,
    private readonly startSession: StartSession,
    private readonly refreshTokenTtlDays: number,
  ) {}

  async execute(input: VerifySignInCodeIn): Promise<VerifySignInCodeOut> {
    const email = normalizeEmail(input.email);
    const code = typeof input.code === "string" ? input.code : "";

    const signInCode = await this.signInCodeRepository.findByEmail(email);
    if (!signInCode) {
      throw new UnauthorizedError("signInCode.code.invalid");
    }
    if (signInCode.attempts >= SIGN_IN_CODE_MAX_ATTEMPTS) {
      throw new UnauthorizedError("signInCode.attempts.exceeded");
    }
    if (this.clock.now().getTime() >= signInCode.expiresAt.getTime()) {
      throw new UnauthorizedError("signInCode.code.expired");
    }
    if (!this.signInCodeProvider.matches(signInCode.codeHash, email, code)) {
      await this.signInCodeRepository.incrementAttempts(email);
      throw new UnauthorizedError("signInCode.code.invalid");
    }

    const existingUser = await this.userRepository.findByEmail(email);
    const user = existingUser ?? this.buildNewUser(email, input.name);

    const consumed = await this.signInCodeRepository.consume(email, signInCode.codeHash);
    if (!consumed) {
      throw new UnauthorizedError("signInCode.code.invalid");
    }

    if (!existingUser) {
      await this.userRepository.create(user);
    }
    await this.ensureEmailIdentity(user);

    const session = await this.startSession.execute({
      user: { id: user.id, email: user.email },
      refreshTokenTtlDays: this.refreshTokenTtlDays,
    });

    return {
      ...session,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
      },
    };
  }

  /** Validated before the code is consumed, so a missing or invalid name keeps the code usable. */
  private buildNewUser(email: string, name: unknown): User {
    const user = new User({
      name: typeof name === "string" ? name.trim() : "",
      email,
      whatsappVisible: false,
      role: "student",
      status: "pending",
    });
    user.validate();
    return user;
  }

  private async ensureEmailIdentity(user: User): Promise<void> {
    const identities = await this.identityRepository.findByUserId(user.id);
    if (identities.some((identity) => identity.provider === "email")) {
      return;
    }

    const identity = new Identity({
      userId: user.id,
      provider: "email",
      providerUserId: user.email,
      email: user.email,
    });
    identity.validate();
    await this.identityRepository.create(identity);
  }
}
