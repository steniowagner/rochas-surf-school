import { RegistrationNotifier, User, UserRepository } from "../../user";
import { Identity, IdentityProvider } from "../model";
import { IdentityRepository } from "../provider";

export interface LinkOrCreateIn {
  provider: IdentityProvider;
  sub: string;
  email: string;
  /** Replaces the provider's name for a new account; ignored when the account already exists. */
  bodyName: unknown;
  providerName?: string;
}

/** The rule "one account per email", shared by the sign-ins that verify a provider's token. */
export class ProviderAccountResolver {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly identityRepository: IdentityRepository,
    private readonly registrationNotifier: RegistrationNotifier,
  ) {}

  /** An identity whose account no longer exists counts as no identity. */
  async findByIdentity(provider: IdentityProvider, sub: string): Promise<User | null> {
    const known = await this.identityRepository.findByProvider(provider, sub);
    return known ? this.userRepository.findById(known.userId) : null;
  }

  /** A new user is validated before anything is written, so a bad name writes nothing. */
  async linkOrCreate(input: LinkOrCreateIn): Promise<User> {
    const existing = await this.userRepository.findByEmail(input.email);
    if (existing) {
      await this.createIdentity(existing.id, input);
      return existing;
    }

    const user = this.buildNewUser(input);
    await this.userRepository.create(user);
    await this.createIdentity(user.id, input);
    await this.registrationNotifier.registrationPending({
      id: user.id,
      name: user.name,
    });
    return user;
  }

  private buildNewUser({ email, bodyName, providerName }: LinkOrCreateIn): User {
    const chosen = typeof bodyName === "string" ? bodyName : providerName;
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
    { provider, sub, email }: LinkOrCreateIn,
  ): Promise<void> {
    const identity = new Identity({
      userId,
      provider,
      providerUserId: sub,
      email,
    });
    identity.validate();
    await this.identityRepository.create(identity);
  }
}
