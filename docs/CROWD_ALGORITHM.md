# Crowd estimate: how it works

MessMate never claims to detect occupancy. The level shown is an **estimate** built from three human signals.
Every API response includes `isEstimate: true`, and the UI labels it "est." with the last-updated time.

| Signal | Weight | Fades (half-life) | Dropped after | Notes |
|---|---|---|---|---|
| Student report (Low / Moderate / Busy) | 1 | 15 min | 45 min | Only each student's latest report counts. 5-minute cooldown per student per mess. |
| Owner update | 2 | 30 min | 90 min | Only the newest owner update counts. |
| Verified QR check-in | 0.3 per person, capped at 1.5 | 15 min | 30 min | Counts only if the phone was within `CHECKIN_MAX_DISTANCE_M` (default 300 m) of the mess. Compared with seating capacity: under 25% full = low, under 60% = moderate, else high. |

**Score** = weighted average of signal values (Low 1, Moderate 2, High 3).
**Level**: score < 1.67 Low, 1.67 to 2.33 Moderate, 2.33 and above High.
**No data**: if total weight is below 0.2 (for example a single report that is about 40 minutes old) the level is `null` and the UI says "No recent reports". A background job re-evaluates active messes every minute and pushes a Socket.IO event when a level changes or expires.
**Wait time** is a range per level (Low 0 to 5 min, Moderate 5 to 15, High 15 to 30). It is a rough guide, not a measured queue length.
**Confidence**: points = distinct contributing students plus 2 if an owner update is present. 4+ high, 2 to 3 medium, below 2 low.

## Known limits
- Reports can be wrong or malicious. Mitigations: rate limits, cooldowns, one vote per student, decay, owner double weight, admin user deactivation. There is no reputation system yet.
- A printed QR can be photographed. Location verification reduces but does not eliminate remote check-ins; rotate the QR from the owner dashboard if abused.
- Coordinates from GPS can be spoofed by determined users.

All constants live in `server/src/lib/crowd.ts` (`CROWD_CONFIG`) and are covered by `server/tests/crowd.test.ts`.
