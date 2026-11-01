import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { z } from 'zod';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { asyncHandler, HttpError, validate } from '../http.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/limits.js';
import { CROWD_LEVELS, DISH_CATEGORIES, FOOD_TYPES } from '../lib/enums.js';
import { CROWD_CONFIG } from '../lib/crowd.js';
import { dateFromString, istDateString, todayIST } from '../lib/dates.js';
import { randomToken, slugify } from '../lib/tokens.js';
import { getCrowdFor } from '../services/crowdService.js';
import { menuForDate } from '../services/messService.js';
import { emitCrowdUpdate, emitMenuUpdate } from '../realtime.js';

export const ownerRouter = Router();
ownerRouter.use(authenticate, requireRole('OWNER'));

const idParam = z.object({ id: z.string().min(1).max(40) });
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour HH:MM');
const uploadUrl = z.string().regex(/^\/uploads\/[\w.-]+$/, 'Upload the image through MessMate first');

const messFields = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional().nullable(),
  address: z.string().trim().min(5).max(200),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  phone: z.string().trim().regex(/^[+0-9 -]{7,15}$/, 'Enter a valid phone number').optional().nullable().or(z.literal('')),
  foodType: z.enum(FOOD_TYPES),
  avgMealPrice: z.coerce.number().int().min(0).max(5000),
  seatingCapacity: z.coerce.number().int().min(1).max(1000),
  opensAt: hhmm,
  closesAt: hhmm,
  isOpen: z.boolean(),
  photoUrl: uploadUrl.nullable(),
});
const createMessBody = messFields.partial({ description: true, phone: true, isOpen: true, photoUrl: true, opensAt: true, closesAt: true, seatingCapacity: true });
const updateMessBody = messFields.partial();

async function ownedMess(userId: string, id: string) {
  const mess = await prisma.mess.findUnique({ where: { id } });
  if (!mess || mess.ownerId !== userId) throw new HttpError(404, 'Mess not found');
  return mess;
}

const qrUrl = (token: string) => `${config.publicAppUrl}/checkin/${token}`;

// ---------- messes ----------
ownerRouter.get(
  '/messes',
  asyncHandler(async (req, res) => {
    const messes = await prisma.mess.findMany({ where: { ownerId: req.user!.id }, orderBy: { createdAt: 'desc' } });
    res.json({ messes: messes.map(({ qrToken: _q, ...m }) => m) });
  }),
);

ownerRouter.post(
  '/messes',
  writeLimiter,
  validate({ body: createMessBody }),
  asyncHandler(async (req, res) => {
    const data = req.body as z.infer<typeof createMessBody>;
    const mess = await prisma.mess.create({
      data: {
        ...data,
        phone: data.phone || null,
        description: data.description || null,
        ownerId: req.user!.id,
        slug: slugify(data.name),
        qrToken: randomToken(),
        status: 'PENDING',
        verificationLogs: { create: { actorId: req.user!.id, action: 'SUBMITTED', note: 'Submitted for verification' } },
      },
    });
    res.status(201).json({ mess: { ...mess, qrToken: undefined } });
  }),
);

ownerRouter.get(
  '/messes/:id',
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    const mess = await ownedMess(req.user!.id, req.params.id!);
    const [menuItems, crowd, today, logs] = await Promise.all([
      prisma.menuItem.findMany({ where: { messId: mess.id }, orderBy: [{ category: 'asc' }, { name: 'asc' }] }),
      getCrowdFor(mess),
      menuForDate(mess.id, todayIST()),
      prisma.verificationLog.findMany({ where: { messId: mess.id }, orderBy: { createdAt: 'desc' }, take: 5 }),
    ]);
    const { qrToken, ...rest } = mess;
    res.json({ mess: { ...rest, checkInUrl: qrUrl(qrToken) }, menuItems, crowd, today, verificationLog: logs });
  }),
);

ownerRouter.patch(
  '/messes/:id',
  writeLimiter,
  validate({ params: idParam, body: updateMessBody }),
  asyncHandler(async (req, res) => {
    await ownedMess(req.user!.id, req.params.id!);
    const data = req.body as z.infer<typeof updateMessBody>;
    const mess = await prisma.mess.update({
      where: { id: req.params.id! },
      data: { ...data, phone: data.phone === '' ? null : data.phone },
    });
    emitMenuUpdate(mess.id);
    res.json({ mess: { ...mess, qrToken: undefined } });
  }),
);

ownerRouter.post(
  '/messes/:id/rotate-qr',
  writeLimiter,
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    await ownedMess(req.user!.id, req.params.id!);
    const mess = await prisma.mess.update({ where: { id: req.params.id! }, data: { qrToken: randomToken() } });
    res.json({ checkInUrl: qrUrl(mess.qrToken) });
  }),
);

// ---------- crowd ----------
ownerRouter.post(
  '/messes/:id/crowd',
  writeLimiter,
  validate({ params: idParam, body: z.object({ level: z.enum(CROWD_LEVELS) }) }),
  asyncHandler(async (req, res) => {
    const mess = await ownedMess(req.user!.id, req.params.id!);
    if (mess.status !== 'VERIFIED') throw new HttpError(409, 'Crowd updates open once your mess is verified');
    await prisma.crowdReport.create({
      data: {
        messId: mess.id,
        userId: req.user!.id,
        source: 'OWNER',
        level: req.body.level,
        expiresAt: new Date(Date.now() + CROWD_CONFIG.ownerTtlMin * 60_000),
      },
    });
    void emitCrowdUpdate(mess.id);
    res.status(201).json({ crowd: await getCrowdFor(mess) });
  }),
);

// ---------- menu items ----------
const menuItemFields = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(240).optional().nullable(),
  category: z.enum(DISH_CATEGORIES),
  price: z.coerce.number().int().min(0).max(5000),
  isVeg: z.boolean(),
  photoUrl: uploadUrl.nullable(),
  isActive: z.boolean(),
});
const createItemBody = menuItemFields.partial({ description: true, photoUrl: true, isActive: true, isVeg: true });

ownerRouter.post(
  '/messes/:id/menu-items',
  writeLimiter,
  validate({ params: idParam, body: createItemBody }),
  asyncHandler(async (req, res) => {
    await ownedMess(req.user!.id, req.params.id!);
    const item = await prisma.menuItem.create({ data: { ...(req.body as z.infer<typeof createItemBody>), messId: req.params.id! } });
    res.status(201).json({ item });
  }),
);

async function ownedItem(userId: string, id: string) {
  const item = await prisma.menuItem.findUnique({ where: { id }, include: { mess: { select: { ownerId: true } } } });
  if (!item || item.mess.ownerId !== userId) throw new HttpError(404, 'Menu item not found');
  return item;
}

ownerRouter.patch(
  '/menu-items/:id',
  writeLimiter,
  validate({ params: idParam, body: menuItemFields.partial() }),
  asyncHandler(async (req, res) => {
    await ownedItem(req.user!.id, req.params.id!);
    const item = await prisma.menuItem.update({ where: { id: req.params.id! }, data: req.body });
    res.json({ item });
  }),
);

ownerRouter.delete(
  '/menu-items/:id',
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    await ownedItem(req.user!.id, req.params.id!);
    await prisma.menuItem.delete({ where: { id: req.params.id! } });
    res.status(204).end();
  }),
);

// ---------- daily menu ----------
const dailyBody = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  note: z.string().trim().max(160).optional().nullable(),
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1).max(40),
        isAvailable: z.boolean().default(true),
        priceOverride: z.coerce.number().int().min(0).max(5000).optional().nullable(),
      }),
    )
    .max(80),
});

ownerRouter.get(
  '/messes/:id/daily-menu',
  validate({ params: idParam, query: z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }) }),
  asyncHandler(async (req, res) => {
    await ownedMess(req.user!.id, req.params.id!);
    const date = typeof req.query.date === 'string' ? dateFromString(req.query.date) : todayIST();
    res.json(await menuForDate(req.params.id!, date));
  }),
);

ownerRouter.put(
  '/messes/:id/daily-menu',
  writeLimiter,
  validate({ params: idParam, body: dailyBody }),
  asyncHandler(async (req, res) => {
    const mess = await ownedMess(req.user!.id, req.params.id!);
    const body = req.body as z.infer<typeof dailyBody>;
    const today = todayIST();
    const date = body.date ? dateFromString(body.date) : today;
    const maxDate = new Date(today.getTime() + 7 * 24 * 60 * 60_000);
    if (Number.isNaN(date.getTime()) || date < today || date > maxDate) {
      throw new HttpError(400, `Choose a date between ${istDateString()} and the next 7 days`);
    }
    const ids = [...new Set(body.items.map((i) => i.menuItemId))];
    const valid = await prisma.menuItem.count({ where: { id: { in: ids }, messId: mess.id, isActive: true } });
    if (valid !== ids.length) throw new HttpError(400, 'Some dishes do not belong to this mess or are inactive');

    await prisma.$transaction(async (tx) => {
      const dm = await tx.dailyMenu.upsert({
        where: { messId_date: { messId: mess.id, date } },
        create: { messId: mess.id, date, note: body.note || null },
        update: { note: body.note || null },
      });
      await tx.dailyMenuItem.deleteMany({ where: { dailyMenuId: dm.id } });
      await tx.dailyMenuItem.createMany({
        data: ids.map((menuItemId) => {
          const row = body.items.find((i) => i.menuItemId === menuItemId)!;
          return { dailyMenuId: dm.id, menuItemId, isAvailable: row.isAvailable, priceOverride: row.priceOverride ?? null };
        }),
      });
    });
    emitMenuUpdate(mess.id);
    res.json(await menuForDate(mess.id, date));
  }),
);

// ---------- uploads (local disk; use S3/R2 in production) ----------
const uploadDir = path.resolve(config.UPLOAD_DIR);
fs.mkdirSync(uploadDir, { recursive: true });
const EXT: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, cb) => cb(null, `${randomToken(12)}${EXT[file.mimetype] ?? ''}`),
  }),
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (EXT[file.mimetype]) cb(null, true);
    else cb(new HttpError(400, 'Upload a JPG, PNG or WebP image'));
  },
});

ownerRouter.post(
  '/uploads',
  writeLimiter,
  upload.single('image'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'Choose an image to upload');
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  }),
);
