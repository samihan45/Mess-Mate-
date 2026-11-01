# MessMate REST API

Base URL: `/api`. JSON in and out. Authenticated routes need `Authorization: Bearer <token>`.
Errors: `{ "error": "message", "details": [{ "field", "message" }]? }` with status 400 (validation), 401, 403, 404, 409, 429.

## Auth
| Method | Path | Body | Notes |
|---|---|---|---|
| POST | /auth/register | `{ name, email, password (8-72, letter+number), role: STUDENT\|OWNER }` | Admins cannot self-register. Returns `{ token, user }`. |
| POST | /auth/login | `{ email, password }` | Returns `{ token, user }`. |
| GET | /auth/me | | Current user. |

## Discovery (public; token optional)
| Method | Path | Notes |
|---|---|---|
| GET | /messes | Query: `q` (mess, address or today's dish), `maxPrice`, `foodType`, `crowd` (LOW\|MODERATE\|HIGH), `openOnly`, `lat`, `lng`, `sort` (distance\|rating\|price\|crowd). Verified messes only. Each item includes `crowd` (estimate), `rating`, `distanceMeters`, `todayHighlights`. |
| GET | /messes/:id | `{ mess, menu }` with today's menu and dish ratings. |
| GET | /messes/:id/menu?date=YYYY-MM-DD | Menu for a date (IST). |
| GET | /messes/:id/reviews | Visible reviews. |
| GET | /checkins/resolve/:token | Which mess a QR belongs to. |

## Student (role STUDENT)
| Method | Path | Body |
|---|---|---|
| POST | /messes/:id/reviews | `{ rating, hygieneRating, valueRating (1-5), comment? }` (upsert) |
| POST | /dishes/:id/ratings | `{ rating 1-5, comment? }` (upsert) |
| POST | /messes/:id/crowd-reports | `{ level }`. 429 inside the 5-minute cooldown. |
| POST | /checkins | `{ qrToken, latitude?, longitude? }`. Returns `geoVerified`. Duplicate within 30 min returns `alreadyCheckedIn: true`. |
| GET / PUT / DELETE | /favourites, /favourites/:messId | Saved messes. |

## Owner (role OWNER; only own messes)
| Method | Path | Notes |
|---|---|---|
| GET / POST | /owner/messes | Create submits as PENDING and logs `SUBMITTED`. |
| GET / PATCH | /owner/messes/:id | Detail includes `checkInUrl`, crowd, today's menu. |
| POST | /owner/messes/:id/rotate-qr | Invalidates old QR. |
| POST | /owner/messes/:id/crowd | `{ level }`, verified messes only. |
| POST | /owner/messes/:id/menu-items | `{ name, category, price, isVeg?, photoUrl?, description? }` |
| PATCH / DELETE | /owner/menu-items/:id | |
| GET / PUT | /owner/messes/:id/daily-menu | PUT `{ date?, note?, items: [{ menuItemId, isAvailable?, priceOverride? }] }`, date within today..+7 days. |
| POST | /owner/uploads | multipart field `image` (JPG/PNG/WebP, 3 MB). Returns `{ url }`. |

## Admin (role ADMIN)
| Method | Path | Notes |
|---|---|---|
| GET | /admin/messes?status= | With owner and recent verification log. |
| POST | /admin/messes/:id/verify | `{ action: APPROVE\|REJECT\|SUSPEND\|REINSTATE, note? }`; invalid transitions return 409. |
| GET / PATCH | /admin/users, /admin/users/:id | `{ isActive }`; cannot deactivate admins or yourself. |
| GET / PATCH | /admin/reviews, /admin/reviews/:id | `{ status: VISIBLE\|HIDDEN }` |

## Realtime (Socket.IO, same origin as API)
Server emits `crowd:update { messId, crowd }` and `menu:update { messId }`. Clients may emit `mess:watch` / `mess:unwatch` with a mess id to join its room.

## Health
`GET /api/health` returns `{ status: "ok" }`.
