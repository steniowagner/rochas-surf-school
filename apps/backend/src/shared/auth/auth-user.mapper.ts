import { AuthenticatedUser } from '../types/current-user.type.js';
import { JwtPayload } from '../types/jwt-payload.type.js';

export function mapJwtPayloadToAuthenticatedUser(
  payload: JwtPayload,
): AuthenticatedUser {
  return {
    id: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : undefined,
    claims: payload,
  };
}
