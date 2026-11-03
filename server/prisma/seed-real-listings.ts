/**
 * Additive real-business candidate seeder for MessMate.
 *
 * SAFETY / DATA QUALITY:
 * - Adds directory-listed mess/tiffin candidates only; does not claim owner affiliation.
 * - Every listing is PENDING and therefore must be verified by an admin before public display.
 * - Menu items and prices are indicative placeholders, NOT verified live menus/prices.
 * - Coordinates are locality-level approximations for map previews, not surveyed premises.
 * - Does not create fake reviews, ratings, student accounts, check-ins, favourites or crowd reports.
 * - Idempotent by slug; never deletes or updates existing business records.
 *
 * Run: npm run db:seed:real
 * Optional: SEED_LISTINGS_OWNER_EMAIL=sample-owner@messmate.local
 */
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { PrismaClient, type DishCategory, type FoodType } from '@prisma/client';

const prisma = new PrismaClient();

type Dish = { name: string; category: DishCategory; price: number; isVeg: boolean };
type Listing = {
  slug: string; name: string; address: string; area: string; lat: number; lng: number;
  phone?: string; foodType: FoodType; avgMealPrice: number; opens: string; closes: string;
  description: string; dishes: Dish[];
};

// Business names and locality/address clues are drawn from public business directories.
// Confirm the exact premises, owner consent, menu, prices, hours and coordinates before approval.
const listings: Listing[] = [
  { slug:'candidate-sakshi-mess-akurdi', name:'Sakshi Mess', address:'D-1, Ekta Nagar, near Trinity High School, Akurdi Gaothan, Dattawadi, Akurdi, Pune 411035', area:'Akurdi', lat:18.6460, lng:73.7590, phone:'+918208079164', foodType:'BOTH', avgMealPrice:90, opens:'11:00', closes:'22:00', description:'Directory-listed local mess. Menu, pricing and timings are indicative and require owner confirmation.', dishes:[{name:'Maharashtrian Veg Thali (indicative)',category:'THALI',price:80,isVeg:true},{name:'Chapati (indicative)',category:'ROTI',price:8,isVeg:true},{name:'Dal Tadka (indicative)',category:'DAL',price:35,isVeg:true}] },
  { slug:'candidate-jayashri-mess-akurdi', name:'Jayashri Mess', address:'170/71, Panchtara Road, Bijali Nagar, Ganga Nagar, Akurdi, Pune 411035', area:'Akurdi', lat:18.6470, lng:73.7650, phone:'+918007622419', foodType:'VEG', avgMealPrice:85, opens:'11:00', closes:'21:30', description:'Directory-listed tiffin/mess candidate. Menu and prices are illustrative pending confirmation.', dishes:[{name:'Daily Veg Thali (indicative)',category:'THALI',price:80,isVeg:true},{name:'Seasonal Sabji (indicative)',category:'SABJI',price:30,isVeg:true},{name:'Jeera Rice (indicative)',category:'RICE',price:35,isVeg:true}] },
  { slug:'candidate-naivedyam-dining-hall-akurdi', name:'Naivedyam Dining Hall', address:'CTS 5213-5216, 2nd Floor, Tapasvi Plaza, Old Mumbai-Pune Highway, Akurdi, Pune 411019', area:'Akurdi', lat:18.6468, lng:73.7660, phone:'+919637396922', foodType:'VEG', avgMealPrice:180, opens:'11:30', closes:'22:30', description:'Directory-listed vegetarian dining hall. Menu and individual dish prices are indicative, not verified.', dishes:[{name:'Maharashtrian Unlimited Thali (indicative)',category:'THALI',price:180,isVeg:true},{name:'Puran Poli (indicative)',category:'SWEET',price:50,isVeg:true},{name:'Solkadhi (indicative)',category:'OTHER',price:35,isVeg:true}] },
  { slug:'candidate-pickle-me-foods-akurdi', name:'Pickle Me Foods Home Made Food', address:'Sardesai Bungalow, opposite Bajaj Auto Ltd, Akurdi, Pune 411044', area:'Akurdi', lat:18.6480, lng:73.7700, phone:'+918390870690', foodType:'VEG', avgMealPrice:100, opens:'09:00', closes:'21:30', description:'Directory-listed homemade food and tiffin candidate. Sample menu/prices need owner confirmation.', dishes:[{name:'Homestyle Lunch Tiffin (indicative)',category:'THALI',price:100,isVeg:true},{name:'Chapati (indicative)',category:'ROTI',price:8,isVeg:true},{name:'Seasonal Bhaji (indicative)',category:'SABJI',price:30,isVeg:true}] },
  { slug:'candidate-aarus-kitchen-akurdi', name:"Aaru's Kitchen Tiffin Services", address:'Samarth Complex, Panchtara Nagar, Bijali Nagar, Ganga Nagar, Akurdi, Pune 411035', area:'Akurdi', lat:18.6470, lng:73.7640, phone:'+917620705290', foodType:'BOTH', avgMealPrice:90, opens:'11:30', closes:'14:00', description:'Directory-listed homemade tiffin service. Listing reports a ₹90 meal; confirm current menu and price directly.', dishes:[{name:'Homemade Veg Tiffin (indicative)',category:'THALI',price:90,isVeg:true},{name:'Chicken Meal (indicative)',category:'THALI',price:140,isVeg:false},{name:'Chapati (indicative)',category:'ROTI',price:8,isVeg:true}] },
  { slug:'candidate-akash-mess-nigdi', name:'Akash Mess And Tiffin Service', address:'Shiv Niwas Building, Sant Namdev Marg, Gawade Wada, Gurudwara Colony, Nigdi, Pune 411033', area:'Nigdi', lat:18.6500, lng:73.7700, foodType:'VEG', avgMealPrice:90, opens:'10:00', closes:'20:00', description:'Directory-listed mess/tiffin candidate. Menu, pricing and operating details are indicative.', dishes:[{name:'Daily Veg Meal (indicative)',category:'THALI',price:90,isVeg:true},{name:'Dal Rice (indicative)',category:'DAL',price:50,isVeg:true},{name:'Chapati Bhaji (indicative)',category:'THALI',price:65,isVeg:true}] },
  { slug:'candidate-vaishnavi-mess-nigdi', name:'Vaishnavi Mess', address:'Gawade Wada, Gurudwara Colony, Nigdi, Pimpri-Chinchwad, Pune 411033', area:'Nigdi', lat:18.6505, lng:73.7705, phone:'+919356895720', foodType:'BOTH', avgMealPrice:120, opens:'11:30', closes:'22:30', description:'Directory-listed mess candidate. Menu and prices are estimates; verify with the business.', dishes:[{name:'Veg Thali (indicative)',category:'THALI',price:90,isVeg:true},{name:'Chicken Thali (indicative)',category:'THALI',price:150,isVeg:false},{name:'Fish Curry (indicative)',category:'SABJI',price:100,isVeg:false}] },
  { slug:'candidate-sai-homemade-tiffin-ravet', name:'Sai Homemade Tiffin & Catering Services', address:'Mangaltirth Housing Society, Shinde Vasti, Ravet, Pune 412101', area:'Ravet', lat:18.6500, lng:73.7550, phone:'+919762352730', foodType:'VEG', avgMealPrice:100, opens:'11:30', closes:'14:00', description:'Directory-listed tiffin and catering service. Dish list and prices are illustrative pending confirmation.', dishes:[{name:'Homestyle Veg Tiffin (indicative)',category:'THALI',price:100,isVeg:true},{name:'Dal Khichdi (indicative)',category:'RICE',price:80,isVeg:true},{name:'Chapati Bhaji (indicative)',category:'THALI',price:75,isVeg:true}] },
  { slug:'candidate-savvy-meals-ravet', name:'Savvy Meals Tiffin Service', address:'Chandrabhaga Corner, Legacy Fortune Exotica, Ravet, Pune 412101', area:'Ravet', lat:18.6500, lng:73.7530, phone:'+918208187373', foodType:'VEG', avgMealPrice:110, opens:'07:00', closes:'22:00', description:'Directory-listed box lunch/tiffin service. Menu and prices are indicative and need confirmation.', dishes:[{name:'Daily Lunch Box (indicative)',category:'THALI',price:110,isVeg:true},{name:'Poha (indicative)',category:'SNACK',price:35,isVeg:true},{name:'Veg Pulao (indicative)',category:'RICE',price:75,isVeg:true}] },
  { slug:'candidate-renuka-tiffin-pradhikaran', name:'Renuka Tiffin Service', address:'A4/15, Ruston Colony, Pradhikaran Plot 27A, Nigdi, Pune 411044', area:'Pradhikaran', lat:18.6513, lng:73.7734, phone:'+919067590099', foodType:'VEG', avgMealPrice:100, opens:'09:00', closes:'18:00', description:'Directory-listed tiffin service. Menu and pricing are placeholders pending direct confirmation.', dishes:[{name:'Daily Veg Tiffin (indicative)',category:'THALI',price:100,isVeg:true},{name:'Dal Tadka (indicative)',category:'DAL',price:35,isVeg:true},{name:'Chapati (indicative)',category:'ROTI',price:8,isVeg:true}] },
  { slug:'candidate-satvik-tiffin-nigdi', name:'Satvik Tiffin Services', address:'Plot 438, Sector 27A, near TJSB Bank, Nigdi Pradhikaran, Pune 411044', area:'Pradhikaran', lat:18.6530, lng:73.7720, foodType:'VEG', avgMealPrice:100, opens:'09:00', closes:'20:00', description:'Directory-listed vegetarian tiffin candidate. Menu and prices require owner confirmation.', dishes:[{name:'Satvik Veg Thali (indicative)',category:'THALI',price:100,isVeg:true},{name:'Moong Dal Khichdi (indicative)',category:'RICE',price:80,isVeg:true},{name:'Seasonal Sabji (indicative)',category:'SABJI',price:30,isVeg:true}] },
  { slug:'candidate-hotel-sadguru-mess-nigdi', name:'Hotel Sadguru Mess and Tiffin Services', address:'Sai Pooja Building, Phase 1, Shop 5, Vitthal Mandir Road, Dattawadi, Akurdi, Pune 411035', area:'Akurdi', lat:18.6440, lng:73.7610, foodType:'BOTH', avgMealPrice:110, opens:'11:00', closes:'21:00', description:'Directory-listed mess/tiffin candidate. Menu and prices are illustrative only.', dishes:[{name:'Veg Meal (indicative)',category:'THALI',price:90,isVeg:true},{name:'Egg Curry Meal (indicative)',category:'THALI',price:120,isVeg:false},{name:'Dal Rice (indicative)',category:'RICE',price:60,isVeg:true}] },
  { slug:'candidate-janiv-tiffin-nigdi', name:'Janiv Tiffin Service', address:'Sector 21, Umesh Shetty Road, Nigdi, Pune 411044', area:'Nigdi', lat:18.6550, lng:73.7750, foodType:'VEG', avgMealPrice:100, opens:'09:00', closes:'20:00', description:'Directory-listed tiffin candidate. Verify active status, menu and price with the provider.', dishes:[{name:'Home Style Veg Tiffin (indicative)',category:'THALI',price:100,isVeg:true},{name:'Dal Khichdi (indicative)',category:'RICE',price:75,isVeg:true},{name:'Chapati (indicative)',category:'ROTI',price:8,isVeg:true}] },
  { slug:'candidate-appas-mess-chinchwad', name:"Appa's Mess", address:'PMRDA Building, Bijli Nagar, Chinchwad, Pune 411033', area:'Chinchwad', lat:18.6380, lng:73.7750, foodType:'BOTH', avgMealPrice:110, opens:'11:00', closes:'21:00', description:'Directory-listed mess candidate. Dish list and pricing are indicative pending confirmation.', dishes:[{name:'Maharashtrian Veg Thali (indicative)',category:'THALI',price:90,isVeg:true},{name:'Chicken Thali (indicative)',category:'THALI',price:150,isVeg:false},{name:'Varan Bhaat (indicative)',category:'RICE',price:55,isVeg:true}] },
  { slug:'candidate-sp-kitchen-ravet', name:'SP Kitchen', address:'Prabhu Krupa Building, Plot 2/6, Sector 29, Ravet, Pune 412101', area:'Ravet', lat:18.6520, lng:73.7500, foodType:'VEG', avgMealPrice:100, opens:'10:00', closes:'21:00', description:'Directory-listed kitchen/tiffin candidate. Menu and prices are sample estimates.', dishes:[{name:'Veg Lunch Box (indicative)',category:'THALI',price:100,isVeg:true},{name:'Paneer Bhaji (indicative)',category:'SABJI',price:65,isVeg:true},{name:'Jeera Rice (indicative)',category:'RICE',price:45,isVeg:true}] },
  { slug:'candidate-health-box-tiffins-tathawade', name:'Health Box Tiffins', address:'Pyramid Atlante, Akshar Elementa Road, Tathawade, Pune 411033', area:'Tathawade', lat:18.6190, lng:73.7480, foodType:'VEG', avgMealPrice:130, opens:'09:00', closes:'21:00', description:'Directory-listed tiffin candidate. Health claims and menu not verified; sample menu/prices need confirmation.', dishes:[{name:'Balanced Veg Meal (indicative)',category:'THALI',price:130,isVeg:true},{name:'Sprouts Usal (indicative)',category:'SABJI',price:45,isVeg:true},{name:'Rice Bowl (indicative)',category:'RICE',price:65,isVeg:true}] },
  { slug:'candidate-kitchen-fifty-five-thergaon', name:'Kitchen Fifty Five', address:'Lakshmitara Market, Survey 19/1, Jambe Road, Thergaon, Pune 411033', area:'Thergaon', lat:18.6090, lng:73.7700, foodType:'VEG', avgMealPrice:120, opens:'10:00', closes:'21:00', description:'Directory-listed food/tiffin candidate. Menu and pricing are indicative pending confirmation.', dishes:[{name:'Veg Meal Box (indicative)',category:'THALI',price:120,isVeg:true},{name:'Paneer Masala (indicative)',category:'SABJI',price:70,isVeg:true},{name:'Dal Fry (indicative)',category:'DAL',price:40,isVeg:true}] },
  { slug:'candidate-samartha-tiffin-wakad', name:'Samartha Tiffin Services', address:'Vision Mall, Shop 212, Bhumkar Chowk, Wakad, Pune 411057', area:'Wakad', lat:18.5980, lng:73.7650, foodType:'VEG', avgMealPrice:120, opens:'09:00', closes:'21:00', description:'Directory-listed tiffin candidate. Confirm active service, menu and prices before publication.', dishes:[{name:'Daily Veg Tiffin (indicative)',category:'THALI',price:120,isVeg:true},{name:'Mix Veg (indicative)',category:'SABJI',price:50,isVeg:true},{name:'Chapati (indicative)',category:'ROTI',price:10,isVeg:true}] },
  { slug:'candidate-foodies-corner-ravet', name:"Foodies Corner Snack and Rice Plate", address:'One Stop Solution, near Mankar Dosa, Chandrabhaga Corner, Ravet, Pune 412101', area:'Ravet', lat:18.6500, lng:73.7540, foodType:'VEG', avgMealPrice:100, opens:'11:00', closes:'22:00', description:'Directory-listed snack/rice-plate candidate. Menu and prices are indicative only.', dishes:[{name:'Veg Rice Plate (indicative)',category:'RICE',price:100,isVeg:true},{name:'Masala Rice (indicative)',category:'RICE',price:75,isVeg:true},{name:'Misal Pav (indicative)',category:'SNACK',price:65,isVeg:true}] },
  { slug:'candidate-annapurna-tiffin-rahatani', name:'Annapurna Tiffin Center', address:'Swami Samarth Colony, Shop 27, Rahatani Road, Rahatani, Pune 411017', area:'Rahatani', lat:18.6030, lng:73.7870, foodType:'VEG', avgMealPrice:100, opens:'09:00', closes:'20:00', description:'Directory-listed tiffin candidate. Confirm exact location, service and current pricing.', dishes:[{name:'Homestyle Veg Tiffin (indicative)',category:'THALI',price:100,isVeg:true},{name:'Aloo Matar (indicative)',category:'SABJI',price:35,isVeg:true},{name:'Dal Rice (indicative)',category:'RICE',price:60,isVeg:true}] },
  { slug:'candidate-swad-ghar-ka-pimple-nilakh', name:'Swad Ghar Ka Tiffin Services', address:'Shantiniketan Society, House 27, Vishal Nagar Road, Pimple Nilakh, Pune 411027', area:'Pimple Nilakh', lat:18.5830, lng:73.7900, foodType:'VEG', avgMealPrice:120, opens:'09:00', closes:'21:00', description:'Directory-listed home-food/tiffin candidate. Menu and prices are placeholders requiring confirmation.', dishes:[{name:'Home Style Veg Thali (indicative)',category:'THALI',price:120,isVeg:true},{name:'Bhindi Masala (indicative)',category:'SABJI',price:55,isVeg:true},{name:'Dal Tadka (indicative)',category:'DAL',price:45,isVeg:true}] },
  { slug:'candidate-meal-story-wakad', name:'Meal Story', address:'Ashirwad Apartment, Chhatrapati Chowk, Wakad, Pune 411057', area:'Wakad', lat:18.5970, lng:73.7660, foodType:'BOTH', avgMealPrice:130, opens:'10:00', closes:'21:00', description:'Directory-listed meal/tiffin candidate. Menu and pricing are indicative; verify directly.', dishes:[{name:'Veg Meal Box (indicative)',category:'THALI',price:120,isVeg:true},{name:'Egg Meal Box (indicative)',category:'THALI',price:140,isVeg:false},{name:'Veg Pulao (indicative)',category:'RICE',price:75,isVeg:true}] },
  { slug:'candidate-pds-thali-pimple-saudagar', name:'PDS Thali', address:'Row House 13, Dwarkadhish Residency, Pimple Saudagar, Pune 411027', area:'Pimple Saudagar', lat:18.5950, lng:73.8030, foodType:'VEG', avgMealPrice:110, opens:'11:00', closes:'22:00', description:'Directory-listed thali candidate. Confirm current menu, price and service details.', dishes:[{name:'Veg Thali (indicative)',category:'THALI',price:110,isVeg:true},{name:'Chapati (indicative)',category:'ROTI',price:10,isVeg:true},{name:'Dal Fry (indicative)',category:'DAL',price:40,isVeg:true}] },
  { slug:'candidate-yashraj-bhojanalay-wakad', name:'Yashraj Bhojanalay', address:'Shankar Heights, Pimpri, near Gaikwad Petrol Pump, Pune 411018', area:'Pimpri', lat:18.6240, lng:73.8050, foodType:'BOTH', avgMealPrice:120, opens:'11:00', closes:'22:00', description:'Directory-listed bhojanalay candidate. Location/menu/prices need direct confirmation.', dishes:[{name:'Veg Thali (indicative)',category:'THALI',price:100,isVeg:true},{name:'Chicken Thali (indicative)',category:'THALI',price:160,isVeg:false},{name:'Rice Plate (indicative)',category:'RICE',price:70,isVeg:true}] },
  { slug:'candidate-only-home-made-food-baner', name:'Only Home Made Food', address:'C Wing, Orvi Apartment, Sutarwadi, Baner, Pune 411045', area:'Baner', lat:18.5650, lng:73.7860, foodType:'VEG', avgMealPrice:140, opens:'09:00', closes:'21:00', description:'Directory-listed home-made food candidate. Menu and price estimates require provider confirmation.', dishes:[{name:'Homemade Veg Tiffin (indicative)',category:'THALI',price:140,isVeg:true},{name:'Seasonal Bhaji (indicative)',category:'SABJI',price:50,isVeg:true},{name:'Chapati (indicative)',category:'ROTI',price:10,isVeg:true}] },
  { slug:'candidate-star-lunch-dinner-pimple-saudagar', name:'Star Lunch and Dinner Home Made Food', address:'Pimple Saudagar, Pune 411027', area:'Pimple Saudagar', lat:18.5960, lng:73.8020, foodType:'VEG', avgMealPrice:120, opens:'10:00', closes:'21:00', description:'Directory-listed home-food candidate; address is locality-level only. Confirm premises and menu before approval.', dishes:[{name:'Daily Veg Lunch (indicative)',category:'THALI',price:120,isVeg:true},{name:'Dal Rice (indicative)',category:'RICE',price:65,isVeg:true},{name:'Chapati Bhaji (indicative)',category:'THALI',price:85,isVeg:true}] },
];

async function main() {
  const ownerEmail = (process.env.SEED_LISTINGS_OWNER_EMAIL || 'sample-owner@messmate.local').toLowerCase();
  const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!owner || owner.role !== 'OWNER') {
    throw new Error(`Owner account ${ownerEmail} not found. Run the existing seed first or set SEED_LISTINGS_OWNER_EMAIL to an existing OWNER account.`);
  }

  let created = 0;
  let skipped = 0;
  for (const listing of listings) {
    const existing = await prisma.mess.findUnique({ where: { slug: listing.slug }, select: { id: true } });
    if (existing) { skipped += 1; continue; }

    const mess = await prisma.mess.create({
      data: {
        slug: listing.slug, name: listing.name,
        description: listing.description,
        address: listing.address, latitude: listing.lat, longitude: listing.lng,
        phone: listing.phone, foodType: listing.foodType, avgMealPrice: listing.avgMealPrice,
        seatingCapacity: 20, opensAt: listing.opens, closesAt: listing.closes,
        isOpen: true, ownerId: owner.id, status: 'PENDING', isSample: false,
        qrToken: randomBytes(18).toString('base64url'),
      },
    });

    for (const dish of listing.dishes) {
      await prisma.menuItem.create({
        data: { messId: mess.id, name: dish.name, category: dish.category, price: dish.price, isVeg: dish.isVeg, description: 'Indicative demo menu item — confirm with business before publication.' },
      });
    }
    created += 1;
  }

  console.log(`Real-business candidate import complete. Created: ${created}; already present/skipped: ${skipped}; candidates in file: ${listings.length}.`);
  console.log('All newly imported listings are PENDING. No existing records were updated or deleted.');
  console.log('Menu items/prices and coordinates are indicative; no student activity, reviews, ratings or crowd reports were fabricated.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
