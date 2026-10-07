import { Request } from 'express';
import { AuthenticatedUser } from './current-user.type.js';

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};
