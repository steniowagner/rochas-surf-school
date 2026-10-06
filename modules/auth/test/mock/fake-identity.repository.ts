import {
  Identity,
  IdentityProvider,
  IdentityRepository,
} from "../../src";

export class FakeIdentityRepository implements IdentityRepository {
  readonly identities: Identity[];

  constructor(identities: Identity[] = []) {
    this.identities = [...identities];
  }

  async create(identity: Identity): Promise<Identity> {
    this.identities.push(identity);
    return identity;
  }

  async findByProvider(
    provider: IdentityProvider,
    providerUserId: string,
  ): Promise<Identity | null> {
    return (
      this.identities.find(
        (item) =>
          item.provider === provider && item.providerUserId === providerUserId,
      ) ?? null
    );
  }

  async findByUserId(userId: string): Promise<Identity[]> {
    return this.identities.filter((item) => item.userId === userId);
  }
}
