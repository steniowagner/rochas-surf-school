import { AuthenticatedUser } from '../types/current-user.type.js';
import { JwtPayload } from '../types/jwt-payload.type.js';

export function mapUserRecordToAuthenticatedUser(
  record: Pick<AuthenticatedUser, 'id' | 'email' | 'role' | 'status'>,
  payload: JwtPayload,
): AuthenticatedUser {
  return {
    id: record.id,
    email: record.email,
    role: record.role,
    status: record.status,
    claims: payload,
  };
}
