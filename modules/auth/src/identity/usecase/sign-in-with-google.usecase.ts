import {
  UnauthorizedError,
  UseCase,
  ValidationError,
  ValidationException,
} from "@rochas-surf-school/shared";
import { normalizeEmail } from "../../sign-in-code/model";
import { StartSession } from "../../session";
import {
  RulesVersionProvider,
  User,
  UserRepository,
  toAccountOut,
} from "../../user";
import { Identity } from "../model";
import {
  GoogleIdTokenPayload,
  GoogleIdTokenProvider,
  IdentityRepository,
} from "../provider";
import { VerifySignInCodeOut } from "../../sign-in-code/usecase";

export interface SignInWithGoogleIn {
  idToken: string;
  /** Replaces Google's name for a new account; ignored when the account already exists. */
  name?: string;
}

export type SignInWithGoogleOut = VerifySignInCodeOut;

export class SignInWithGoogle
  implements UseCase<SignInWithGoogleIn, SignInWithGoogleOut>
{
  constructor(
    private readonly googleIdTokenProvider: GoogleIdTokenProvider,
    private readonly userRepository: UserRepository,
    private readonly identityRepository: IdentityRepository,
    private readonly startSession: StartSession,
    private readonly refreshTokenTtlDays: number,
    private readonly rulesVersionProvider: RulesVersionProvider,
  ) {}

  async execute(input: SignInWithGoogleIn): Promise<SignInWithGoogleOut> {
    const idToken = typeof input?.idToken === "string" ? input.idToken : "";
    if (idToken === "") {
      throw new ValidationException([new ValidationError("idToken.token.required")]);
    }

    const payload = await this.verifyToken(idToken);
    if (payload.emailVerified !== true) {
      throw new UnauthorizedError("auth.google.emailNotVerified");
    }
    const email = normalizeEmail(payload.email);

    const user = await this.resolveUser(payload, email, input.name);

    const session = await this.startSession.execute({
      user: { id: user.id, email: user.email },
      refreshTokenTtlDays: this.refreshTokenTtlDays,
    });

    return {
      ...session,
      user: toAccountOut(user, await this.rulesVersionProvider.getCurrentVersion()),
    };
  }

  private async verifyToken(idToken: string): Promise<GoogleIdTokenPayload> {
    try {
      return await this.googleIdTokenProvider.verify(idToken);
    } catch {
      throw new UnauthorizedError("auth.google.tokenInvalid");
    }
  }

  /** A new user is validated before anything is written, so a bad name writes nothing. */
  private async resolveUser(
    payload: GoogleIdTokenPayload,
    email: string,
    name: unknown,
  ): Promise<User> {
    const known = await this.identityRepository.findByProvider("google", payload.sub);
    if (known) {
      const owner = await this.userRepository.findById(known.userId);
      if (owner) {
        return owner;
      }
    }

    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      await this.createIdentity(existing.id, payload.sub, email);
      return existing;
    }

    const user = this.buildNewUser(email, name, payload.name);
    await this.userRepository.create(user);
    await this.createIdentity(user.id, payload.sub, email);
    return user;
  }

  private buildNewUser(email: string, bodyName: unknown, googleName?: string): User {
    const chosen = typeof bodyName === "string" ? bodyName : googleName;
    const user = new User({
      name: typeof chosen === "string" ? chosen.trim() : "",
      email,
      whatsappVisible: false,
      role: "student",
      status: "pending",
    });
    user.validate();
    return user;
  }

  private async createIdentity(
    userId: string,
    sub: string,
    email: string,
  ): Promise<void> {
    const identity = new Identity({
      userId,
      provider: "google",
      providerUserId: sub,
      email,
    });
    identity.validate();
    await this.identityRepository.create(identity);
  }
}
