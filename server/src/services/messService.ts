import type { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { getCrowdMap } from './crowdService.js';
import { haversineMeters } from '../lib/geo.js';
import { todayIST } from '../lib/dates.js';
import type { CrowdEstimate } from '../lib/crowd.js';

interface MenuItemLite {
  id: string;
  name: string;
  category: string;
  isVeg: boolean;
  price: number;
}

interface MessRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  foodType: string;
  avgMealPrice: number;
  seatingCapacity: number;
  opensAt: string;
  closesAt: string;
  isOpen: boolean;
  photoUrl: string | null;
  status: string;
  isSample: boolean;
  dailyMenus: { note: string | null; items: { priceOverride: number | null; menuItem: MenuItemLite }[] }[];
}

export interface RatingSummary {
  avg: number | null;
  hygiene: number | null;
  value: number | null;
  count: number;
}

export interface ListParams {
  q?: string;
  maxPrice?: number;
  foodType?: 'VEG' | 'NON_VEG' | 'BOTH';
  crowd?: 'LOW' | 'MODERATE' | 'HIGH';
  openOnly?: boolean;
  lat?: number;
  lng?: number;
  sort?: 'distance' | 'rating' | 'price' | 'crowd';
  favouritesOf?: string;
  userId?: string;
  page?: number;
  pageSize?: number;
}

const round1 = (n: number | null | undefined) => (n == null ? null : Math.round(n * 10) / 10);

export const todayMenuInclude = (date: Date) =>
  ({
    dailyMenus: {
      where: { date },
      include: {
        items: {
          where: { isAvailable: true },
          include: { menuItem: { select: { id: true, name: true, category: true, isVeg: true, price: true } } },
        },
      },
    },
  }) satisfies Prisma.MessInclude;

export async function ratingMap(messIds: string[]): Promise<Map<string, RatingSummary>> {
  const rows = await prisma.review.groupBy({
    by: ['messId'],
    where: { messId: { in: messIds }, status: 'VISIBLE' },
    _avg: { rating: true, hygieneRating: true, valueRating: true },
    _count: { _all: true },
  });
  return new Map(
    rows.map((r) => [
      r.messId,
      { avg: round1(r._avg.rating), hygiene: round1(r._avg.hygieneRating), value: round1(r._avg.valueRating), count: r._count._all },
    ]),
  );
}

const CATEGORY_ORDER = ['SABJI', 'DAL', 'THALI', 'RICE', 'ROTI', 'SNACK', 'SWEET', 'OTHER'];

export function serializeMess(
  m: MessRow,
  ctx: { crowd?: CrowdEstimate; rating?: RatingSummary; favourite?: boolean; lat?: number; lng?: number },
) {
  const items = m.dailyMenus[0]?.items ?? [];
  const sorted = [...items].sort(
    (a, b) => CATEGORY_ORDER.indexOf(a.menuItem.category) - CATEGORY_ORDER.indexOf(b.menuItem.category),
  );
  return {
    id: m.id,
    name: m.name,
    slug: m.slug,
    description: m.description,
    address: m.address,
    latitude: m.latitude,
    longitude: m.longitude,
    phone: m.phone,
    foodType: m.foodType,
    avgMealPrice: m.avgMealPrice,
    seatingCapacity: m.seatingCapacity,
    opensAt: m.opensAt,
    closesAt: m.closesAt,
    isOpen: m.isOpen,
    photoUrl: m.photoUrl,
    status: m.status,
    isSample: m.isSample,
    distanceMeters:
      ctx.lat != null && ctx.lng != null ? haversineMeters(ctx.lat, ctx.lng, m.latitude, m.longitude) : null,
    rating: ctx.rating ?? { avg: null, hygiene: null, value: null, count: 0 },
    crowd: ctx.crowd ?? null,
    todayCount: items.length,
    todayHighlights: sorted.slice(0, 4).map((i) => i.menuItem.name),
    todayNote: m.dailyMenus[0]?.note ?? null,
    isFavourite: ctx.favourite ?? false,
  };
}

export async function listMesses(p: ListParams) {
  const today = todayIST();
  const where: Prisma.MessWhereInput = { status: 'VERIFIED' };
  if (p.maxPrice != null) where.avgMealPrice = { lte: p.maxPrice };
  if (p.foodType) where.foodType = p.foodType === 'BOTH' ? undefined : { in: [p.foodType, 'BOTH'] };
  if (p.openOnly) where.isOpen = true;
  if (p.favouritesOf) where.favourites = { some: { userId: p.favouritesOf } };
  if (p.q) {
    const contains = { contains: p.q, mode: 'insensitive' as const };
    where.OR = [
      { name: contains },
      { address: contains },
      { dailyMenus: { some: { date: today, items: { some: { isAvailable: true, menuItem: { name: contains } } } } } },
    ];
  }

  const rows = await prisma.mess.findMany({ where, include: todayMenuInclude(today), take: 200 });
  const ids = rows.map((r) => r.id);
  const [crowds, ratings, favs] = await Promise.all([
    getCrowdMap(rows),
    ratingMap(ids),
    p.userId
      ? prisma.favourite.findMany({ where: { userId: p.userId, messId: { in: ids } }, select: { messId: true } })
      : Promise.resolve([]),
  ]);
  const favSet = new Set(favs.map((f) => f.messId));

  let out = rows.map((r) =>
    serializeMess(r, { crowd: crowds.get(r.id), rating: ratings.get(r.id), favourite: favSet.has(r.id), lat: p.lat, lng: p.lng }),
  );
  if (p.crowd) out = out.filter((m) => m.crowd?.level === p.crowd);

  const crowdRank = (m: (typeof out)[number]) => (m.crowd?.level ? { LOW: 0, MODERATE: 1, HIGH: 2 }[m.crowd.level] : 3);
  const sort = p.sort ?? (p.lat != null ? 'distance' : 'rating');
  out.sort((a, b) => {
    switch (sort) {
      case 'distance':
        return (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity);
      case 'price':
        return a.avgMealPrice - b.avgMealPrice;
      case 'crowd':
        return crowdRank(a) - crowdRank(b) || (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0);
      default:
        return (b.rating.avg ?? -1) - (a.rating.avg ?? -1) || b.rating.count - a.rating.count;
    }
  });
  const page = p.page ?? 1;
  const pageSize = p.pageSize ?? 12;
  const total = out.length;
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (page - 1) * pageSize;

  return {
    messes: out.slice(startIndex, startIndex + pageSize),
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

export async function dishRatingMap(menuItemIds: string[]) {
  const rows = await prisma.dishRating.groupBy({
    by: ['menuItemId'],
    where: { menuItemId: { in: menuItemIds } },
    _avg: { rating: true },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.menuItemId, { avg: round1(r._avg.rating), count: r._count._all }]));
}

/** Full menu for a date, with community ratings per dish. */
export async function menuForDate(messId: string, date: Date, userId?: string) {
  const dm = await prisma.dailyMenu.findUnique({
    where: { messId_date: { messId, date } },
    include: { items: { include: { menuItem: true }, orderBy: { menuItem: { name: 'asc' } } } },
  });
  if (!dm) return { date, note: null, items: [] };
  const ids = dm.items.map((i) => i.menuItemId);
  const [ratings, mine] = await Promise.all([
    dishRatingMap(ids),
    userId
      ? prisma.dishRating.findMany({ where: { userId, menuItemId: { in: ids } }, select: { menuItemId: true, rating: true } })
      : Promise.resolve([]),
  ]);
  const mineMap = new Map(mine.map((m) => [m.menuItemId, m.rating]));
  return {
    date,
    note: dm.note,
    items: dm.items.map((i) => ({
      id: i.menuItem.id,
      name: i.menuItem.name,
      description: i.menuItem.description,
      category: i.menuItem.category,
      isVeg: i.menuItem.isVeg,
      photoUrl: i.menuItem.photoUrl,
      price: i.priceOverride ?? i.menuItem.price,
      isAvailable: i.isAvailable,
      rating: ratings.get(i.menuItemId) ?? { avg: null, count: 0 },
      myRating: mineMap.get(i.menuItemId) ?? null,
    })),
  };
}
