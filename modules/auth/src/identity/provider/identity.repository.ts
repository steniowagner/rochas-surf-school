import { CreateRepository } from "@rochas-surf-school/shared";
import { Identity, IdentityProvider } from "../model";

export interface IdentityRepository extends CreateRepository<Identity> {
  findByProvider(
    provider: IdentityProvider,
    providerUserId: string,
  ): Promise<Identity | null>;
  findByUserId(userId: string): Promise<Identity[]>;
}
