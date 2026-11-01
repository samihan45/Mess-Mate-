import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncHandler, HttpError, validate } from '../http.js';
import { authenticate, optionalAuth, requireRole, type AuthUser } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/limits.js';
import { CROWD_LEVELS, FOOD_TYPES } from '../lib/enums.js';
import { CROWD_CONFIG } from '../lib/crowd.js';
import { dateFromString, todayIST } from '../lib/dates.js';
import { getCrowdFor } from '../services/crowdService.js';
import { listMesses, menuForDate, ratingMap, serializeMess, todayMenuInclude } from '../services/messService.js';
import { emitCrowdUpdate } from '../realtime.js';

export const messRouter = Router();

const idParam = z.object({ id: z.string().min(1).max(40) });

const listQuery = z.object({
  q: z.string().trim().max(80).optional(),
  maxPrice: z.coerce.number().int().min(0).max(5000).optional(),
  foodType: z.enum(FOOD_TYPES).optional(),
  crowd: z.enum(CROWD_LEVELS).optional(),
  openOnly: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  sort: z.enum(['distance', 'rating', 'price', 'crowd']).optional(),
});

messRouter.get(
  '/',
  optionalAuth,
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as z.infer<typeof listQuery>;
    const messes = await listMesses({ ...q, userId: req.user?.id });
    res.json({ messes, generatedAt: new Date().toISOString() });
  }),
);

/** Visible to everyone when VERIFIED; otherwise only to the owner and admins. */
async function loadVisibleMess(id: string, user?: AuthUser) {
  const mess = await prisma.mess.findUnique({ where: { id }, include: todayMenuInclude(todayIST()) });
  if (!mess) throw new HttpError(404, 'Mess not found');
  const privileged = user && (user.role === 'ADMIN' || mess.ownerId === user.id);
  if (mess.status !== 'VERIFIED' && !privileged) throw new HttpError(404, 'Mess not found');
  return mess;
}

messRouter.get(
  '/:id',
  optionalAuth,
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    const mess = await loadVisibleMess(req.params.id!, req.user);
    const [crowd, ratings, fav, menu] = await Promise.all([
      getCrowdFor(mess),
      ratingMap([mess.id]),
      req.user
        ? prisma.favourite.findUnique({ where: { userId_messId: { userId: req.user.id, messId: mess.id } } })
        : null,
      menuForDate(mess.id, todayIST(), req.user?.id),
    ]);
    res.json({
      mess: serializeMess(mess, { crowd, rating: ratings.get(mess.id), favourite: Boolean(fav) }),
      menu,
    });
  }),
);

messRouter.get(
  '/:id/menu',
  optionalAuth,
  validate({ params: idParam, query: z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }) }),
  asyncHandler(async (req, res) => {
    const mess = await loadVisibleMess(req.params.id!, req.user);
    const date = typeof req.query.date === 'string' ? dateFromString(req.query.date) : todayIST();
    res.json(await menuForDate(mess.id, date, req.user?.id));
  }),
);

messRouter.get(
  '/:id/reviews',
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    const reviews = await prisma.review.findMany({
      where: { messId: req.params.id!, status: 'VISIBLE' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { user: { select: { name: true } } },
    });
    res.json({
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        hygieneRating: r.hygieneRating,
        valueRating: r.valueRating,
        comment: r.comment,
        createdAt: r.createdAt,
        author: r.user.name.split(' ')[0],
        userId: r.userId,
      })),
    });
  }),
);

const reviewBody = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  hygieneRating: z.coerce.number().int().min(1).max(5),
  valueRating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(600).optional().nullable(),
});

messRouter.post(
  '/:id/reviews',
  authenticate,
  requireRole('STUDENT'),
  writeLimiter,
  validate({ params: idParam, body: reviewBody }),
  asyncHandler(async (req, res) => {
    const mess = await loadVisibleMess(req.params.id!, req.user);
    const data = req.body as z.infer<typeof reviewBody>;
    const review = await prisma.review.upsert({
      where: { userId_messId: { userId: req.user!.id, messId: mess.id } },
      create: { ...data, comment: data.comment || null, userId: req.user!.id, messId: mess.id },
      update: { ...data, comment: data.comment || null, status: 'VISIBLE' },
    });
    res.status(201).json({ review });
  }),
);

const crowdBody = z.object({ level: z.enum(CROWD_LEVELS) });
const REPORT_COOLDOWN_MS = 5 * 60_000;

messRouter.post(
  '/:id/crowd-reports',
  authenticate,
  requireRole('STUDENT'),
  writeLimiter,
  validate({ params: idParam, body: crowdBody }),
  asyncHandler(async (req, res) => {
    const mess = await loadVisibleMess(req.params.id!, req.user);
    const now = new Date();
    const recent = await prisma.crowdReport.findFirst({
      where: { messId: mess.id, userId: req.user!.id, createdAt: { gt: new Date(now.getTime() - REPORT_COOLDOWN_MS) } },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) {
      const retryAfterSec = Math.ceil((recent.createdAt.getTime() + REPORT_COOLDOWN_MS - now.getTime()) / 1000);
      res.setHeader('Retry-After', String(retryAfterSec));
      throw new HttpError(429, `You reported this mess a moment ago. You can update it in ${Math.ceil(retryAfterSec / 60)} min.`);
    }
    await prisma.crowdReport.create({
      data: {
        messId: mess.id,
        userId: req.user!.id,
        source: 'STUDENT',
        level: (req.body as z.infer<typeof crowdBody>).level,
        expiresAt: new Date(now.getTime() + CROWD_CONFIG.studentTtlMin * 60_000),
      },
    });
    const crowd = await getCrowdFor(mess);
    void emitCrowdUpdate(mess.id);
    res.status(201).json({ crowd });
  }),
);
