import rateLimit from 'express-rate-limit';

const base = { standardHeaders: true, legacyHeaders: false } as const;

export const authLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60_000,
  limit: 30,
  message: { error: 'Too many attempts. Try again in a few minutes.' },
});

export const writeLimiter = rateLimit({
  ...base,
  windowMs: 60_000,
  limit: 40,
  message: { error: 'You are doing that too fast. Slow down a little.' },
});
