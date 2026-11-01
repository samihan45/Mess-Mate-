import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  PUBLIC_APP_URL: z.string().optional(),
  UPLOAD_DIR: z.string().default('uploads'),
  CHECKIN_MAX_DISTANCE_M: z.coerce.number().int().positive().default(300),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid environment configuration:\n${lines}\nSee .env.example`);
}

const env = parsed.data;

export const config = {
  ...env,
  isProd: env.NODE_ENV === 'production',
  clientOrigins: env.CLIENT_URL.split(',').map((s) => s.trim()).filter(Boolean),
  publicAppUrl: (env.PUBLIC_APP_URL ?? env.CLIENT_URL.split(',')[0]!.trim()).replace(/\/$/, ''),
};
