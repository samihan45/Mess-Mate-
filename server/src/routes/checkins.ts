import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { asyncHandler, HttpError, validate } from '../http.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/limits.js';
import { CROWD_CONFIG } from '../lib/crowd.js';
import { haversineMeters } from '../lib/geo.js';
import { getCrowdFor } from '../services/crowdService.js';
import { emitCrowdUpdate } from '../realtime.js';

export const checkinRouter = Router();

const tokenParam = z.object({ token: z.string().min(8).max(64).regex(/^[\w-]+$/) });

/** Lets the check-in page show which mess a scanned QR belongs to before the student confirms. */
checkinRouter.get(
  '/resolve/:token',
  validate({ params: tokenParam }),
  asyncHandler(async (req, res) => {
    const mess = await prisma.mess.findUnique({
      where: { qrToken: req.params.token! },
      select: { id: true, name: true, address: true, status: true, isSample: true },
    });
    if (!mess || mess.status !== 'VERIFIED') throw new HttpError(404, 'This QR code is not active');
    res.json({ mess: { id: mess.id, name: mess.name, address: mess.address, isSample: mess.isSample } });
  }),
);

const body = z.object({
  qrToken: z.string().min(8).max(64).regex(/^[\w-]+$/),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
});

checkinRouter.post(
  '/',
  authenticate,
  requireRole('STUDENT'),
  writeLimiter,
  validate({ body }),
  asyncHandler(async (req, res) => {
    const { qrToken, latitude, longitude } = req.body as z.infer<typeof body>;
    const mess = await prisma.mess.findUnique({ where: { qrToken } });
    if (!mess || mess.status !== 'VERIFIED') throw new HttpError(404, 'This QR code is not active');

    const now = new Date();
    const windowStart = new Date(now.getTime() - CROWD_CONFIG.checkInWindowMin * 60_000);
    const existing = await prisma.checkIn.findFirst({
      where: { userId: req.user!.id, messId: mess.id, createdAt: { gt: windowStart } },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      const crowd = await getCrowdFor(mess);
      return res.json({ checkIn: existing, alreadyCheckedIn: true, geoVerified: existing.geoVerified, mess: { id: mess.id, name: mess.name }, crowd });
    }

    // The QR alone can be photographed and shared, so a check-in only counts toward crowd
    // estimates when the phone's location is also near the mess.
    const hasPosition = latitude != null && longitude != null;
    const distance = hasPosition ? haversineMeters(latitude, longitude, mess.latitude, mess.longitude) : null;
    const geoVerified = distance != null && distance <= config.CHECKIN_MAX_DISTANCE_M;

    const checkIn = await prisma.checkIn.create({
      data: { messId: mess.id, userId: req.user!.id, latitude: latitude ?? null, longitude: longitude ?? null, geoVerified },
    });
    const crowd = await getCrowdFor(mess);
    if (geoVerified) void emitCrowdUpdate(mess.id);
    res.status(201).json({
      checkIn,
      alreadyCheckedIn: false,
      geoVerified,
      distanceMeters: distance,
      mess: { id: mess.id, name: mess.name },
      crowd,
    });
  }),
);
