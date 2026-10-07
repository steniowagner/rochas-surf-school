import { JwtPayload } from './jwt-payload.type.js';

export type AuthenticatedUser = {
  id: string;
  email?: string;
  claims: JwtPayload;
};
