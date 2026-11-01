import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncHandler, HttpError, validate } from '../http.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/limits.js';
import { dishRatingMap } from '../services/messService.js';

export const dishRouter = Router();

const body = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(300).optional().nullable(),
});

dishRouter.post(
  '/:id/ratings',
  authenticate,
  requireRole('STUDENT'),
  writeLimiter,
  validate({ params: z.object({ id: z.string().min(1).max(40) }), body }),
  asyncHandler(async (req, res) => {
    const dish = await prisma.menuItem.findUnique({ where: { id: req.params.id! }, include: { mess: true } });
    if (!dish || !dish.isActive || dish.mess.status !== 'VERIFIED') throw new HttpError(404, 'Dish not found');
    const data = req.body as z.infer<typeof body>;
    await prisma.dishRating.upsert({
      where: { userId_menuItemId: { userId: req.user!.id, menuItemId: dish.id } },
      create: { userId: req.user!.id, menuItemId: dish.id, rating: data.rating, comment: data.comment || null },
      update: { rating: data.rating, comment: data.comment || null },
    });
    const summary = (await dishRatingMap([dish.id])).get(dish.id) ?? { avg: null, count: 0 };
    res.status(201).json({ rating: summary, myRating: data.rating });
  }),
);
