import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncHandler, HttpError, validate } from '../http.js';
import { authenticate, signToken } from '../middleware/auth.js';
import { authLimiter } from '../middleware/limits.js';

export const authRouter = Router();

const registerBody = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z
    .string()
    .min(8, 'Use at least 8 characters')
    .max(72, 'Use 72 characters or fewer')
    .regex(/[A-Za-z]/, 'Include at least one letter')
    .regex(/[0-9]/, 'Include at least one number'),
  role: z.enum(['STUDENT', 'OWNER']).default('STUDENT'),
});

const loginBody = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(72),
});

const publicUser = (u: { id: string; name: string; email: string; role: string }) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
});

// Compared against when the email is unknown, so response time does not reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

authRouter.post(
  '/register',
  authLimiter,
  validate({ body: registerBody }),
  asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body as z.infer<typeof registerBody>;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new HttpError(409, 'An account with this email already exists');
    const user = await prisma.user.create({
      data: { name, email, role, passwordHash: await bcrypt.hash(password, 12) },
    });
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  }),
);

authRouter.post(
  '/login',
  authLimiter,
  validate({ body: loginBody }),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as z.infer<typeof loginBody>;
    const user = await prisma.user.findUnique({ where: { email } });
    const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) throw new HttpError(401, 'Email or password is incorrect');
    if (!user.isActive) throw new HttpError(403, 'This account has been deactivated');
    res.json({ token: signToken(user), user: publicUser(user) });
  }),
);

authRouter.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});
