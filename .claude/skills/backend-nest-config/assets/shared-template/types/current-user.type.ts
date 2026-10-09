import type { UserRole, UserStatus } from '__SCOPE__/auth';
import { JwtPayload } from './jwt-payload.type.js';

/** The signed-in account, read from the database on every request (not from the token). */
export type AuthenticatedUser = {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  claims: JwtPayload;
};
