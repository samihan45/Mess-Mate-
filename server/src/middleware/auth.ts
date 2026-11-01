import type { NextFunction, Request, Response } from 'express';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { config } from '../config.js';
import { prisma } from '../db.js';
import { HttpError } from '../http.js';

export type RoleName = 'STUDENT' | 'OWNER' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: RoleName;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(user: { id: string; role: string }): string {
  return jwt.sign({ role: user.role }, config.JWT_SECRET, {
    subject: user.id,
    expiresIn: config.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  });
}

async function resolveUser(req: Request): Promise<AuthUser | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  let sub: string | undefined;
  try {
    const payload = jwt.verify(header.slice(7), config.JWT_SECRET);
    sub = typeof payload === 'object' ? payload.sub : undefined;
  } catch {
    throw new HttpError(401, 'Your session has expired. Sign in again.');
  }
  if (!sub) throw new HttpError(401, 'Invalid session token');
  const user = await prisma.user.findUnique({ where: { id: sub } });
  if (!user || !user.isActive) throw new HttpError(401, 'This account is not active');
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const user = await resolveUser(req);
    if (!user) throw new HttpError(401, 'Sign in to continue');
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/** Attaches req.user when a valid token is present, but never rejects anonymous requests. */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const user = await resolveUser(req);
    if (user) req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export const requireRole =
  (...roles: RoleName[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new HttpError(401, 'Sign in to continue'));
    if (!roles.includes(req.user.role)) return next(new HttpError(403, 'Your account type cannot do this'));
    next();
  };
