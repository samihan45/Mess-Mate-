export type Role = 'STUDENT' | 'OWNER' | 'ADMIN';
export type CrowdLevel = 'LOW' | 'MODERATE' | 'HIGH';
export type FoodType = 'VEG' | 'NON_VEG' | 'BOTH';
export type DishCategory = 'SABJI' | 'DAL' | 'RICE' | 'ROTI' | 'THALI' | 'SNACK' | 'SWEET' | 'OTHER';
export type MessStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface CrowdEstimate {
  level: CrowdLevel | null;
  score: number | null;
  confidence: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  waitMinutes: { min: number; max: number } | null;
  lastUpdatedAt: string | null;
  contributors: number;
  basis: { studentReports: number; ownerUpdate: boolean; checkIns: number };
  isEstimate: true;
}

export interface RatingSummary {
  avg: number | null;
  hygiene: number | null;
  value: number | null;
  count: number;
}

export interface Mess {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  foodType: FoodType;
  avgMealPrice: number;
  seatingCapacity: number;
  opensAt: string;
  closesAt: string;
  isOpen: boolean;
  photoUrl: string | null;
  status: MessStatus;
  isSample: boolean;
  distanceMeters: number | null;
  rating: RatingSummary;
  crowd: CrowdEstimate | null;
  todayCount: number;
  todayHighlights: string[];
  todayNote: string | null;
  isFavourite: boolean;
}

export interface Dish {
  id: string;
  name: string;
  description: string | null;
  category: DishCategory;
  isVeg: boolean;
  photoUrl: string | null;
  price: number;
  isAvailable: boolean;
  rating: { avg: number | null; count: number };
  myRating: number | null;
}

export interface DailyMenu {
  date: string;
  note: string | null;
  items: Dish[];
}

export interface Review {
  id: string;
  rating: number;
  hygieneRating: number;
  valueRating: number;
  comment: string | null;
  createdAt: string;
  author: string;
  userId: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  category: DishCategory;
  price: number;
  isVeg: boolean;
  photoUrl: string | null;
  isActive: boolean;
}

export interface OwnerMess {
  id: string;
  name: string;
  description: string | null;
  address: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  foodType: FoodType;
  avgMealPrice: number;
  seatingCapacity: number;
  opensAt: string;
  closesAt: string;
  isOpen: boolean;
  photoUrl: string | null;
  status: MessStatus;
  isSample: boolean;
  checkInUrl?: string;
}
