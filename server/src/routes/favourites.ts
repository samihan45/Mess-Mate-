import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncHandler, HttpError, validate } from '../http.js';
import { authenticate } from '../middleware/auth.js';
import { listMesses } from '../services/messService.js';

export const favouriteRouter = Router();
favouriteRouter.use(authenticate);

const param = z.object({ messId: z.string().min(1).max(40) });

favouriteRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ messes: await listMesses({ favouritesOf: req.user!.id, userId: req.user!.id }) });
  }),
);

favouriteRouter.put(
  '/:messId',
  validate({ params: param }),
  asyncHandler(async (req, res) => {
    const mess = await prisma.mess.findFirst({ where: { id: req.params.messId!, status: 'VERIFIED' }, select: { id: true } });
    if (!mess) throw new HttpError(404, 'Mess not found');
    await prisma.favourite.upsert({
      where: { userId_messId: { userId: req.user!.id, messId: mess.id } },
      create: { userId: req.user!.id, messId: mess.id },
      update: {},
    });
    res.json({ isFavourite: true });
  }),
);

favouriteRouter.delete(
  '/:messId',
  validate({ params: param }),
  asyncHandler(async (req, res) => {
    await prisma.favourite.deleteMany({ where: { userId: req.user!.id, messId: req.params.messId! } });
    res.json({ isFavourite: false });
  }),
);
