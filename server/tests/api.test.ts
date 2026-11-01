/**
 * API tests that do not need a running database: routing, auth gates and input validation
 * all reject before any query runs. (Prisma Client must be generated: `npm run db:generate`.)
 */
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ??= 'unit-test-secret-that-is-long-enough-0123456789';
process.env.DATABASE_URL ??= 'postgresql://test:test@127.0.0.1:5999/test';

let app: import('express').Express;
before(async () => {
  const mod = await import('../src/app.js');
  app = mod.createApp();
});

test('GET /api/health', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
});

test('unknown route returns JSON 404', async () => {
  const res = await request(app).get('/api/nope');
  assert.equal(res.status, 404);
  assert.match(res.body.error, /not found/i);
});

test('protected routes reject anonymous requests with 401', async () => {
  for (const path of ['/api/auth/me', '/api/favourites', '/api/owner/messes', '/api/admin/users']) {
    const res = await request(app).get(path);
    assert.equal(res.status, 401, path);
  }
  assert.equal((await request(app).post('/api/checkins').send({ qrToken: 'abcdefgh1234' })).status, 401);
});

test('a malformed token is rejected', async () => {
  const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not.a.jwt');
  assert.equal(res.status, 401);
});

test('register validates input before touching the database', async () => {
  const res = await request(app).post('/api/auth/register').send({ name: 'A', email: 'nope', password: 'short' });
  assert.equal(res.status, 400);
  const fields = (res.body.details as { field: string }[]).map((d) => d.field).sort();
  assert.deepEqual(fields, ['email', 'name', 'password']);
});

test('register cannot create admin accounts', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Eve Mallory', email: 'eve@example.com', password: 'abcdefg1', role: 'ADMIN' });
  assert.equal(res.status, 400);
});

test('login validates input', async () => {
  const res = await request(app).post('/api/auth/login').send({ email: 'x' });
  assert.equal(res.status, 400);
});

test('list query validation rejects bad filters', async () => {
  const res = await request(app).get('/api/messes?crowd=PACKED&maxPrice=-5');
  assert.equal(res.status, 400);
});

test('invalid JSON body returns 400, not 500', async () => {
  const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{bad');
  assert.equal(res.status, 400);
});
