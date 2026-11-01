import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncHandler, HttpError, validate } from '../http.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/limits.js';

export const adminRouter = Router();
adminRouter.use(authenticate, requireRole('ADMIN'));

const idParam = z.object({ id: z.string().min(1).max(40) });

adminRouter.get(
  '/messes',
  validate({ query: z.object({ status: z.enum(['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED']).optional() }) }),
  asyncHandler(async (req, res) => {
    const status = req.query.status as 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED' | undefined;
    const messes = await prisma.mess.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true, name: true, address: true, status: true, isSample: true, createdAt: true, avgMealPrice: true, foodType: true,
        latitude: true, longitude: true, phone: true,
        owner: { select: { id: true, name: true, email: true } },
        verificationLogs: { orderBy: { createdAt: 'desc' }, take: 3, select: { action: true, note: true, createdAt: true } },
      },
    });
    res.json({ messes });
  }),
);

const ACTIONS = {
  APPROVE: { from: ['PENDING', 'REJECTED'], to: 'VERIFIED', log: 'APPROVED' },
  REJECT: { from: ['PENDING'], to: 'REJECTED', log: 'REJECTED' },
  SUSPEND: { from: ['VERIFIED'], to: 'SUSPENDED', log: 'SUSPENDED' },
  REINSTATE: { from: ['SUSPENDED'], to: 'VERIFIED', log: 'REINSTATED' },
} as const;

adminRouter.post(
  '/messes/:id/verify',
  writeLimiter,
  validate({
    params: idParam,
    body: z.object({ action: z.enum(['APPROVE', 'REJECT', 'SUSPEND', 'REINSTATE']), note: z.string().trim().max(300).optional() }),
  }),
  asyncHandler(async (req, res) => {
    const { action, note } = req.body as { action: keyof typeof ACTIONS; note?: string };
    const rule = ACTIONS[action];
    const mess = await prisma.mess.findUnique({ where: { id: req.params.id! } });
    if (!mess) throw new HttpError(404, 'Mess not found');
    if (!(rule.from as readonly string[]).includes(mess.status)) {
      throw new HttpError(409, `Cannot ${action.toLowerCase()} a mess that is ${mess.status.toLowerCase()}`);
    }
    const [updated] = await prisma.$transaction([
      prisma.mess.update({ where: { id: mess.id }, data: { status: rule.to } }),
      prisma.verificationLog.create({ data: { messId: mess.id, actorId: req.user!.id, action: rule.log, note: note || null } }),
    ]);
    res.json({ mess: { id: updated.id, status: updated.status } });
  }),
);

adminRouter.get(
  '/users',
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });
    res.json({ users });
  }),
);

adminRouter.patch(
  '/users/:id',
  writeLimiter,
  validate({ params: idParam, body: z.object({ isActive: z.boolean() }) }),
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user!.id) throw new HttpError(400, 'You cannot deactivate your own account');
    const target = await prisma.user.findUnique({ where: { id: req.params.id! } });
    if (!target) throw new HttpError(404, 'User not found');
    if (target.role === 'ADMIN') throw new HttpError(403, 'Admin accounts cannot be deactivated here');
    const user = await prisma.user.update({ where: { id: target.id }, data: { isActive: req.body.isActive }, select: { id: true, isActive: true } });
    res.json({ user });
  }),
);

adminRouter.get(
  '/reviews',
  validate({ query: z.object({ status: z.enum(['VISIBLE', 'HIDDEN']).optional() }) }),
  asyncHandler(async (req, res) => {
    const status = req.query.status as 'VISIBLE' | 'HIDDEN' | undefined;
    const reviews = await prisma.review.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { user: { select: { name: true, email: true } }, mess: { select: { name: true } } },
    });
    res.json({ reviews });
  }),
);

adminRouter.patch(
  '/reviews/:id',
  writeLimiter,
  validate({ params: idParam, body: z.object({ status: z.enum(['VISIBLE', 'HIDDEN']) }) }),
  asyncHandler(async (req, res) => {
    const review = await prisma.review.update({ where: { id: req.params.id! }, data: { status: req.body.status }, select: { id: true, status: true } });
    res.json({ review });
  }),
);
