import {
  UnauthorizedError,
  UseCase,
  ValidationError,
  ValidationException,
} from "@rochas-surf-school/shared";
import { normalizeEmail } from "../../sign-in-code/model";
import { StartSession } from "../../session";
import {
  RegistrationNotifier,
  RulesVersionProvider,
  User,
  UserRepository,
  toAccountOut,
} from "../../user";
import {
  AppleIdTokenPayload,
  AppleIdTokenProvider,
  IdentityRepository,
} from "../provider";
import { ProviderAccountResolver } from "./provider-account-resolver";
import { SignInWithGoogleOut } from "./sign-in-with-google.usecase";

export interface SignInWithAppleIn {
  idToken: string;
  /** The name of a new account, since Apple's token carries none; ignored when the account already exists. */
  name?: string;
}

export type SignInWithAppleOut = SignInWithGoogleOut;

export class SignInWithApple
  implements UseCase<SignInWithAppleIn, SignInWithAppleOut>
{
  private readonly accountResolver: ProviderAccountResolver;

  constructor(
    private readonly appleIdTokenProvider: AppleIdTokenProvider,
    userRepository: UserRepository,
    identityRepository: IdentityRepository,
    private readonly startSession: StartSession,
    private readonly refreshTokenTtlDays: number,
    private readonly rulesVersionProvider: RulesVersionProvider,
    registrationNotifier: RegistrationNotifier,
  ) {
    this.accountResolver = new ProviderAccountResolver(
      userRepository,
      identityRepository,
      registrationNotifier,
    );
  }

  async execute(input: SignInWithAppleIn): Promise<SignInWithAppleOut> {
    const idToken = typeof input?.idToken === "string" ? input.idToken : "";
    if (idToken === "") {
      throw new ValidationException([new ValidationError("idToken.token.required")]);
    }

    const payload = await this.verifyToken(idToken);
    if (payload.email && !payload.emailVerified) {
      throw new UnauthorizedError("auth.apple.emailNotVerified");
    }

    const user = await this.resolveUser(payload, input.name);

    const session = await this.startSession.execute({
      user: { id: user.id, email: user.email },
      refreshTokenTtlDays: this.refreshTokenTtlDays,
    });

    return {
      ...session,
      user: toAccountOut(user, await this.rulesVersionProvider.getCurrentVersion()),
    };
  }

  private async verifyToken(idToken: string): Promise<AppleIdTokenPayload> {
    try {
      return await this.appleIdTokenProvider.verify(idToken);
    } catch {
      throw new UnauthorizedError("auth.apple.tokenInvalid");
    }
  }

  /** The identity comes before the email, because a token may carry no email and a known identity needs none. */
  private async resolveUser(payload: AppleIdTokenPayload, name: unknown): Promise<User> {
    const known = await this.accountResolver.findByIdentity("apple", payload.sub);
    if (known) {
      return known;
    }
    if (!payload.email) {
      throw new UnauthorizedError("auth.apple.emailMissing");
    }

    return this.accountResolver.linkOrCreate({
      provider: "apple",
      sub: payload.sub,
      email: normalizeEmail(payload.email),
      bodyName: name,
    });
  }
}
