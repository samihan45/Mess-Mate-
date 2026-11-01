/**
 * Seed script. SAMPLE DATA ONLY.
 *
 * - Creates an admin and a demo owner. Passwords come from ADMIN_PASSWORD / SEED_DEMO_PASSWORD;
 *   if those are unset a random password is generated and printed once. Nothing is hardcoded.
 * - Creates four clearly labelled sample messes near the DY Patil campus (isSample = true,
 *   names start with "Sample Mess:"). They are NOT real businesses; the UI shows a
 *   "Sample listing" badge on them.
 * - Creates menus and today's daily menu. It does NOT create ratings, reviews, check-ins or
 *   crowd reports, so no live-looking data is fabricated.
 * - Idempotent: re-run it each morning (or whenever) to refresh the sample daily menu.
 */
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { PrismaClient, type DishCategory, type FoodType } from '@prisma/client';

const prisma = new PrismaClient();

const secret = (envValue: string | undefined) => envValue || randomBytes(9).toString('base64url') + '7a';
const istToday = () => new Date(new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10) + 'T00:00:00.000Z');

interface SampleDish { name: string; category: DishCategory; price: number; isVeg?: boolean; today: boolean }
interface SampleMess {
  slug: string; name: string; description: string; address: string; lat: number; lng: number;
  foodType: FoodType; avgMealPrice: number; seats: number; opens: string; closes: string; dishes: SampleDish[]; note?: string;
}

// Coordinates are offsets around the approximate campus centre (18.646, 73.759) for demo purposes only.
const MESSES: SampleMess[] = [
  {
    slug: 'sample-sahyadri-thali',
    name: 'Sample Mess: Sahyadri Thali',
    description: 'Sample listing. Home-style Maharashtrian veg thali.',
    address: 'Sample address near Sector 29, Nigdi Pradhikaran, Akurdi',
    lat: 18.6468, lng: 73.7601, foodType: 'VEG', avgMealPrice: 80, seats: 40, opens: '11:00', closes: '21:30',
    note: 'Sample menu',
    dishes: [
      { name: 'Pithla', category: 'SABJI', price: 20, today: true },
      { name: 'Aloo Matar', category: 'SABJI', price: 25, today: true },
      { name: 'Bhendi Fry', category: 'SABJI', price: 25, today: false },
      { name: 'Varan Bhaat', category: 'RICE', price: 30, today: true },
      { name: 'Chapati', category: 'ROTI', price: 6, today: true },
      { name: 'Shrikhand', category: 'SWEET', price: 30, today: false },
    ],
  },
  {
    slug: 'sample-gavran-kitchen',
    name: 'Sample Mess: Gavran Kitchen',
    description: 'Sample listing. Spicy village-style veg and non-veg meals.',
    address: 'Sample address near Akurdi Railway Station',
    lat: 18.6441, lng: 73.7648, foodType: 'BOTH', avgMealPrice: 110, seats: 30, opens: '12:00', closes: '22:00',
    dishes: [
      { name: 'Zunka', category: 'SABJI', price: 30, today: true },
      { name: 'Egg Curry', category: 'SABJI', price: 50, isVeg: false, today: true },
      { name: 'Bhakri', category: 'ROTI', price: 15, today: true },
      { name: 'Dal Tadka', category: 'DAL', price: 35, today: true },
      { name: 'Jeera Rice', category: 'RICE', price: 40, today: false },
    ],
  },
  {
    slug: 'sample-malhar-bhojnalay',
    name: 'Sample Mess: Malhar Bhojnalay',
    description: 'Sample listing. Budget unlimited-roti veg meals.',
    address: 'Sample address near Pradhikaran, Akurdi',
    lat: 18.6489, lng: 73.7563, foodType: 'VEG', avgMealPrice: 65, seats: 60, opens: '11:30', closes: '21:00',
    dishes: [
      { name: 'Usal', category: 'SABJI', price: 20, today: true },
      { name: 'Shev Bhaji', category: 'SABJI', price: 25, today: true },
      { name: 'Masale Bhaat', category: 'RICE', price: 30, today: true },
      { name: 'Chapati', category: 'ROTI', price: 5, today: true },
      { name: 'Gulab Jamun', category: 'SWEET', price: 15, today: false },
    ],
  },
  {
    slug: 'sample-campus-chapati-corner',
    name: 'Sample Mess: Campus Chapati Corner',
    description: 'Sample listing. Quick lunch boxes and paneer specials.',
    address: 'Sample address opposite campus gate, Akurdi',
    lat: 18.6452, lng: 73.7585, foodType: 'VEG', avgMealPrice: 95, seats: 24, opens: '10:30', closes: '20:30',
    dishes: [
      { name: 'Paneer Bhurji', category: 'SABJI', price: 45, today: true },
      { name: 'Mix Veg', category: 'SABJI', price: 30, today: true },
      { name: 'Full Thali', category: 'THALI', price: 90, today: true },
      { name: 'Veg Pulao', category: 'RICE', price: 45, today: false },
    ],
  },
];

async function upsertUser(email: string, name: string, role: 'ADMIN' | 'OWNER', password: string) {
  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.user.upsert({
    where: { email },
    create: { email, name, role, passwordHash },
    update: { name, role, isActive: true },
  });
}

async function main() {
  const today = istToday();
  const printed: string[] = [];

  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase();
  const adminExisting = await prisma.user.findUnique({ where: { email: adminEmail } });
  const adminPassword = secret(process.env.ADMIN_PASSWORD);
  const admin = await upsertUser(adminEmail, 'MessMate Admin', 'ADMIN', adminPassword);
  if (!adminExisting) printed.push(`admin  ${adminEmail}  ${process.env.ADMIN_PASSWORD ? '(password from ADMIN_PASSWORD)' : adminPassword}`);

  const ownerEmail = 'sample-owner@messmate.local';
  const ownerExisting = await prisma.user.findUnique({ where: { email: ownerEmail } });
  const ownerPassword = secret(process.env.SEED_DEMO_PASSWORD);
  const owner = await upsertUser(ownerEmail, 'Sample Owner', 'OWNER', ownerPassword);
  if (!ownerExisting) printed.push(`owner  ${ownerEmail}  ${process.env.SEED_DEMO_PASSWORD ? '(password from SEED_DEMO_PASSWORD)' : ownerPassword}`);

  for (const m of MESSES) {
    const mess = await prisma.mess.upsert({
      where: { slug: m.slug },
      create: {
        slug: m.slug, name: m.name, description: m.description, address: m.address,
        latitude: m.lat, longitude: m.lng, foodType: m.foodType, avgMealPrice: m.avgMealPrice,
        seatingCapacity: m.seats, opensAt: m.opens, closesAt: m.closes,
        ownerId: owner.id, status: 'VERIFIED', isSample: true,
        qrToken: randomBytes(18).toString('base64url'),
        verificationLogs: { create: { actorId: admin.id, action: 'APPROVED', note: 'Sample data, auto-approved by seed script' } },
      },
      update: { name: m.name, description: m.description, address: m.address, avgMealPrice: m.avgMealPrice, isSample: true, status: 'VERIFIED' },
    });

    const itemIds = new Map<string, string>();
    for (const d of m.dishes) {
      const item = await prisma.menuItem.upsert({
        where: { messId_name: { messId: mess.id, name: d.name } },
        create: { messId: mess.id, name: d.name, category: d.category, price: d.price, isVeg: d.isVeg ?? true },
        update: { category: d.category, price: d.price, isVeg: d.isVeg ?? true },
      });
      itemIds.set(d.name, item.id);
    }

    const dm = await prisma.dailyMenu.upsert({
      where: { messId_date: { messId: mess.id, date: today } },
      create: { messId: mess.id, date: today, note: m.note ?? null },
      update: { note: m.note ?? null },
    });
    await prisma.dailyMenuItem.deleteMany({ where: { dailyMenuId: dm.id } });
    await prisma.dailyMenuItem.createMany({
      data: m.dishes.filter((d) => d.today).map((d) => ({ dailyMenuId: dm.id, menuItemId: itemIds.get(d.name)!, isAvailable: true })),
    });
  }

  console.log(`Seeded ${MESSES.length} SAMPLE messes with today's menu (${today.toISOString().slice(0, 10)}).`);
  console.log('No ratings, check-ins or crowd reports were created.');
  if (printed.length) {
    console.log('\nAccounts created (shown once, save them):');
    printed.forEach((l) => console.log('  ' + l));
  } else {
    console.log('Accounts already existed; passwords unchanged.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
