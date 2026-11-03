/**
 * Additive estimated-menu enrichment for MessMate's imported candidate listings.
 *
 * IMPORTANT:
 * - These are illustrative menus and price estimates based on the supplied local menu photos.
 * - They are NOT confirmed menus, current availability, or owner-approved prices.
 * - Images are representative food photography, not photos of the businesses' own dishes.
 * - Only listings with slug prefix "candidate-" and isSample=false are touched.
 * - Existing menu rows are retained; old "(indicative)" placeholders are deactivated, not deleted.
 * - No users, reviews, ratings, favourites, check-ins, crowd reports, or verification statuses are changed.
 *
 * Run: npm run db:seed:menus
 */
import 'dotenv/config';
import { PrismaClient, type DishCategory } from '@prisma/client';
import { todayIST } from '../src/lib/dates.js';

const prisma = new PrismaClient();

type Dish = { name: string; category: DishCategory; price: number; isVeg: boolean };
type MenuProfile = { avgMealPrice: number; dishes: Dish[] };

// Representative food photos from Unsplash. These illustrate dish types, not individual businesses.
const photos = {
  thali: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=900&auto=format&fit=crop&q=85',
  curry: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=900&auto=format&fit=crop&q=85',
  paneer: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=900&auto=format&fit=crop&q=85',
  rice: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=900&auto=format&fit=crop&q=85',
  biryani: 'https://images.unsplash.com/photo-1563379091339-03246963d96c?w=900&auto=format&fit=crop&q=85',
  noodles: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=900&auto=format&fit=crop&q=85',
  dal: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=900&auto=format&fit=crop&q=85',
  snack: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=900&auto=format&fit=crop&q=85',
  meal: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=900&auto=format&fit=crop&q=85',
};

const dishPhoto = (category: DishCategory, name: string) => {
  const n = name.toLowerCase();
  if (n.includes('paneer')) return photos.paneer;
  if (n.includes('biryani') || n.includes('pulao')) return photos.biryani;
  if (n.includes('noodle') || n.includes('chinese') || n.includes('manchurian')) return photos.noodles;
  if (n.includes('paratha') || n.includes('bhakri') || n.includes('chapati') || n.includes('roti')) return photos.thali;
  if (category === 'DAL') return photos.dal;
  if (category === 'RICE') return photos.rice;
  if (category === 'SNACK') return photos.snack;
  if (category === 'THALI') return photos.thali;
  return photos.curry;
};

const profiles: MenuProfile[] = [
  {
    avgMealPrice: 85,
    dishes: [
      { name: 'Daily Veg Thali', category: 'THALI', price: 90, isVeg: true },
      { name: 'Mini Veg Thali', category: 'THALI', price: 70, isVeg: true },
      { name: 'Chapati', category: 'ROTI', price: 10, isVeg: true },
      { name: 'Jwari Bhakri', category: 'ROTI', price: 20, isVeg: true },
      { name: 'Seasonal Bhaji', category: 'SABJI', price: 45, isVeg: true },
      { name: 'Shev Bhaji', category: 'SABJI', price: 80, isVeg: true },
      { name: 'Dal Fry', category: 'DAL', price: 70, isVeg: true },
      { name: 'Plain Rice', category: 'RICE', price: 50, isVeg: true },
      { name: 'Dal Khichdi', category: 'RICE', price: 80, isVeg: true },
      { name: 'Poha', category: 'SNACK', price: 35, isVeg: true },
    ],
  },
  {
    avgMealPrice: 115,
    dishes: [
      { name: 'Maharashtrian Veg Thali', category: 'THALI', price: 110, isVeg: true },
      { name: 'Pithla Bhakri', category: 'THALI', price: 90, isVeg: true },
      { name: 'Zunka Bhakri', category: 'THALI', price: 85, isVeg: true },
      { name: 'Chapati', category: 'ROTI', price: 10, isVeg: true },
      { name: 'Bajri Bhakri', category: 'ROTI', price: 20, isVeg: true },
      { name: 'Matki Usal', category: 'SABJI', price: 65, isVeg: true },
      { name: 'Mix Veg', category: 'SABJI', price: 90, isVeg: true },
      { name: 'Dal Tadka', category: 'DAL', price: 90, isVeg: true },
      { name: 'Jeera Rice', category: 'RICE', price: 70, isVeg: true },
      { name: 'Masala Rice', category: 'RICE', price: 90, isVeg: true },
      { name: 'Gulab Jamun', category: 'SWEET', price: 30, isVeg: true },
    ],
  },
  {
    avgMealPrice: 140,
    dishes: [
      { name: 'Paneer Veg Thali', category: 'THALI', price: 140, isVeg: true },
      { name: 'Paneer Masala', category: 'SABJI', price: 130, isVeg: true },
      { name: 'Mutter Paneer', category: 'SABJI', price: 110, isVeg: true },
      { name: 'Paneer Kadai', category: 'SABJI', price: 140, isVeg: true },
      { name: 'Veg Kolhapuri', category: 'SABJI', price: 110, isVeg: true },
      { name: 'Dal Fry', category: 'DAL', price: 70, isVeg: true },
      { name: 'Chapati', category: 'ROTI', price: 10, isVeg: true },
      { name: 'Plain Rice Half', category: 'RICE', price: 50, isVeg: true },
      { name: 'Jeera Rice Half', category: 'RICE', price: 60, isVeg: true },
      { name: 'Veg Pulao', category: 'RICE', price: 80, isVeg: true },
    ],
  },
  {
    avgMealPrice: 125,
    dishes: [
      { name: 'Veg Chinese Meal', category: 'THALI', price: 130, isVeg: true },
      { name: 'Veg Hakka Noodles Half', category: 'OTHER', price: 90, isVeg: true },
      { name: 'Veg Schezwan Rice Half', category: 'RICE', price: 90, isVeg: true },
      { name: 'Veg Manchurian', category: 'SNACK', price: 120, isVeg: true },
      { name: 'Paneer Chilli', category: 'SNACK', price: 140, isVeg: true },
      { name: 'Dal Tadka', category: 'DAL', price: 90, isVeg: true },
      { name: 'Chapati', category: 'ROTI', price: 10, isVeg: true },
      { name: 'Veg Fried Rice Half', category: 'RICE', price: 90, isVeg: true },
      { name: 'Veg Triple Rice', category: 'RICE', price: 120, isVeg: true },
    ],
  },
  {
    avgMealPrice: 150,
    dishes: [
      { name: 'Egg Thali', category: 'THALI', price: 100, isVeg: false },
      { name: 'Chicken Thali', category: 'THALI', price: 150, isVeg: false },
      { name: 'Egg Bhurji', category: 'SABJI', price: 70, isVeg: false },
      { name: 'Boiled Egg Bhurji', category: 'SABJI', price: 90, isVeg: false },
      { name: 'Egg Curry', category: 'SABJI', price: 80, isVeg: false },
      { name: 'Chicken Curry', category: 'SABJI', price: 100, isVeg: false },
      { name: 'Chicken Masala', category: 'SABJI', price: 120, isVeg: false },
      { name: 'Chicken Kolhapuri', category: 'SABJI', price: 130, isVeg: false },
      { name: 'Chapati', category: 'ROTI', price: 10, isVeg: true },
      { name: 'Plain Rice', category: 'RICE', price: 50, isVeg: true },
      { name: 'Dal Fry', category: 'DAL', price: 70, isVeg: true },
    ],
  },
  {
    avgMealPrice: 105,
    dishes: [
      { name: 'Home Style Veg Tiffin', category: 'THALI', price: 100, isVeg: true },
      { name: 'Chapati Bhaji', category: 'THALI', price: 75, isVeg: true },
      { name: 'Aloo Jeera', category: 'SABJI', price: 65, isVeg: true },
      { name: 'Bhindi Masala', category: 'SABJI', price: 80, isVeg: true },
      { name: 'Dal Tadka', category: 'DAL', price: 90, isVeg: true },
      { name: 'Plain Rice Half', category: 'RICE', price: 50, isVeg: true },
      { name: 'Veg Pulao', category: 'RICE', price: 80, isVeg: true },
      { name: 'Chapati', category: 'ROTI', price: 10, isVeg: true },
      { name: 'Paratha', category: 'ROTI', price: 40, isVeg: true },
      { name: 'Kanda Poha', category: 'SNACK', price: 35, isVeg: true },
    ],
  },
];

const heroPhotos = [photos.thali, photos.meal, photos.curry, photos.paneer, photos.rice, photos.biryani, photos.snack, photos.dal];

async function main() {
  const messes = await prisma.mess.findMany({
    where: { slug: { startsWith: 'candidate-' }, isSample: false },
    orderBy: { slug: 'asc' },
    select: { id: true, slug: true, name: true, foodType: true, description: true },
  });

  if (messes.length === 0) {
    throw new Error('No imported candidate listings found. Expected Mess records with slug prefix "candidate-".');
  }

  const date = todayIST();
  let updatedMesses = 0;
  let createdDishes = 0;
  let updatedDishes = 0;

  for (let i = 0; i < messes.length; i += 1) {
    const mess = messes[i];
    const profile = profiles[i % profiles.length];
    const includeNonVeg = mess.foodType === 'BOTH' && profile.dishes.some((d) => !d.isVeg);
    const dishes = profile.dishes.filter((d) => d.isVeg || (mess.foodType === 'BOTH' && includeNonVeg));
    const avgMealPrice = mess.foodType === 'VEG' && profile.avgMealPrice === 150 ? 125 : profile.avgMealPrice;

    await prisma.mess.update({
      where: { id: mess.id },
      data: {
        avgMealPrice,
        photoUrl: heroPhotos[i % heroPhotos.length],
        description: `${mess.description ?? 'Local mess / tiffin listing.'} Sample menu and prices are illustrative estimates based on local menu references; confirm with the business before relying on them. Photos are representative food images, not photographs of this establishment.`,
      },
    });

    // Deactivate only the old generated placeholders; preserve all rows and references.
    await prisma.menuItem.updateMany({
      where: { messId: mess.id, name: { contains: '(indicative)' } },
      data: { isActive: false },
    });

    const dailyMenu = await prisma.dailyMenu.upsert({
      where: { messId_date: { messId: mess.id, date } },
      create: { messId: mess.id, date, note: 'Sample menu and estimated prices for preview only. Please confirm today’s availability and prices directly with the mess.' },
      update: { note: 'Sample menu and estimated prices for preview only. Please confirm today’s availability and prices directly with the mess.' },
    });

    for (const dish of dishes) {
      const existing = await prisma.menuItem.findUnique({
        where: { messId_name: { messId: mess.id, name: dish.name } },
        select: { id: true },
      });
      const item = await prisma.menuItem.upsert({
        where: { messId_name: { messId: mess.id, name: dish.name } },
        create: {
          messId: mess.id,
          name: dish.name,
          category: dish.category,
          price: dish.price,
          isVeg: dish.isVeg,
          photoUrl: dishPhoto(dish.category, dish.name),
          description: 'Representative menu item. Price is an estimate from local menu references, not owner-confirmed.',
          isActive: true,
        },
        update: {
          category: dish.category,
          price: dish.price,
          isVeg: dish.isVeg,
          photoUrl: dishPhoto(dish.category, dish.name),
          description: 'Representative menu item. Price is an estimate from local menu references, not owner-confirmed.',
          isActive: true,
        },
      });
      if (existing) updatedDishes += 1; else createdDishes += 1;

      await prisma.dailyMenuItem.upsert({
        where: { dailyMenuId_menuItemId: { dailyMenuId: dailyMenu.id, menuItemId: item.id } },
        create: { dailyMenuId: dailyMenu.id, menuItemId: item.id, isAvailable: true },
        update: { isAvailable: true, priceOverride: null },
      });
    }

    // Existing indicative items remain in history but are hidden from the active menu.
    const placeholderItems = await prisma.menuItem.findMany({
      where: { messId: mess.id, name: { contains: '(indicative)' } },
      select: { id: true },
    });
    for (const placeholder of placeholderItems) {
      await prisma.dailyMenuItem.updateMany({
        where: { dailyMenuId: dailyMenu.id, menuItemId: placeholder.id },
        data: { isAvailable: false },
      });
    }

    updatedMesses += 1;
    console.log(`Updated ${mess.name}: ${dishes.length} illustrative menu items`);
  }

  console.log(`Menu enrichment complete. Messes updated: ${updatedMesses}; dishes created: ${createdDishes}; existing dishes updated: ${updatedDishes}.`);
  console.log('No messes, users, reviews, ratings, favourites, check-ins, crowd reports, or verification statuses were deleted or modified.');
  console.log('All new menu entries and representative images are clearly labelled as estimates / illustrative photography.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
