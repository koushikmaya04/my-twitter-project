
import type { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  handle: string;
  displayName: string;
  createdAt: Date | string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
