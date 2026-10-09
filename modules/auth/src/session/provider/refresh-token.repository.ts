import { CreateRepository } from "@rochas-surf-school/shared";
import { RefreshToken } from "../model";

export interface RefreshTokenRepository extends CreateRepository<RefreshToken> {
  findByTokenHash(hash: string): Promise<RefreshToken | null>;
  /** Revokes the token only while it is still active; true when this call revoked it. */
  revokeIfActive(id: string, at: Date): Promise<boolean>;
  /** Revokes every still-active token of the family (one sign-in). */
  revokeFamily(familyId: string, at: Date): Promise<void>;
}
