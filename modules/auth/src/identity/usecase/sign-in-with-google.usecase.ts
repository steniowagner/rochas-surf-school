import {
  UnauthorizedError,
  UrlRule,
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
  GoogleIdTokenPayload,
  GoogleIdTokenProvider,
  IdentityRepository,
} from "../provider";
import { VerifySignInCodeOut } from "../../sign-in-code/usecase";
import { ProviderAccountResolver } from "./provider-account-resolver";

export interface SignInWithGoogleIn {
  idToken: string;
  /** Replaces Google's name for a new account; ignored when the account already exists. */
  name?: string;
}

export type SignInWithGoogleOut = VerifySignInCodeOut;

export class SignInWithGoogle
  implements UseCase<SignInWithGoogleIn, SignInWithGoogleOut>
{
  private readonly accountResolver: ProviderAccountResolver;

  constructor(
    private readonly googleIdTokenProvider: GoogleIdTokenProvider,
    private readonly userRepository: UserRepository,
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

    const user = await this.fillPhoto(
      await this.resolveUser(payload, email, input.name),
      payload.picture,
    );

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

  private async resolveUser(
    payload: GoogleIdTokenPayload,
    email: string,
    name: unknown,
  ): Promise<User> {
    const known = await this.accountResolver.findByIdentity("google", payload.sub);
    return (
      known ??
      this.accountResolver.linkOrCreate({
        provider: "google",
        sub: payload.sub,
        email,
        bodyName: name,
        providerName: payload.name,
      })
    );
  }

  /** Google's picture is only a starting point: a photo already there stays, and a bad URL never stops the sign-in. */
  private async fillPhoto(user: User, picture?: string): Promise<User> {
    if (user.photoUrl || !picture || new UrlRule().validate(picture) !== null) {
      return user;
    }

    const written = await this.userRepository.fillPhotoUrl(user.id, picture);
    return written ? user.clone({ photoUrl: picture }) : user;
  }
}
