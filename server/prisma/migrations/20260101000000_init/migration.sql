-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'OWNER', 'ADMIN');
CREATE TYPE "MessStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED');
CREATE TYPE "FoodType" AS ENUM ('VEG', 'NON_VEG', 'BOTH');
CREATE TYPE "DishCategory" AS ENUM ('SABJI', 'DAL', 'RICE', 'ROTI', 'THALI', 'SNACK', 'SWEET', 'OTHER');
CREATE TYPE "CrowdLevel" AS ENUM ('LOW', 'MODERATE', 'HIGH');
CREATE TYPE "CrowdSource" AS ENUM ('STUDENT', 'OWNER');
CREATE TYPE "ReviewStatus" AS ENUM ('VISIBLE', 'HIDDEN');
CREATE TYPE "VerificationAction" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'SUSPENDED', 'REINSTATED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Mess" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "phone" TEXT,
    "foodType" "FoodType" NOT NULL DEFAULT 'VEG',
    "avgMealPrice" INTEGER NOT NULL,
    "seatingCapacity" INTEGER NOT NULL DEFAULT 30,
    "opensAt" TEXT NOT NULL DEFAULT '11:00',
    "closesAt" TEXT NOT NULL DEFAULT '21:00',
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "photoUrl" TEXT,
    "qrToken" TEXT NOT NULL,
    "status" "MessStatus" NOT NULL DEFAULT 'PENDING',
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Mess_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "messId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "DishCategory" NOT NULL DEFAULT 'SABJI',
    "price" INTEGER NOT NULL,
    "isVeg" BOOLEAN NOT NULL DEFAULT true,
    "photoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DailyMenu" (
    "id" TEXT NOT NULL,
    "messId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DailyMenu_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DailyMenuItem" (
    "id" TEXT NOT NULL,
    "dailyMenuId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "priceOverride" INTEGER,
    CONSTRAINT "DailyMenuItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DishRating" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DishRating_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "hygieneRating" INTEGER NOT NULL,
    "valueRating" INTEGER NOT NULL,
    "comment" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'VISIBLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrowdReport" (
    "id" TEXT NOT NULL,
    "messId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" "CrowdSource" NOT NULL,
    "level" "CrowdLevel" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CrowdReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CheckIn" (
    "id" TEXT NOT NULL,
    "messId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "geoVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Favourite" (
    "userId" TEXT NOT NULL,
    "messId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Favourite_pkey" PRIMARY KEY ("userId","messId")
);

CREATE TABLE "VerificationLog" (
    "id" TEXT NOT NULL,
    "messId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "VerificationAction" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VerificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE UNIQUE INDEX "Mess_slug_key" ON "Mess"("slug");
CREATE UNIQUE INDEX "Mess_qrToken_key" ON "Mess"("qrToken");
CREATE INDEX "Mess_status_idx" ON "Mess"("status");
CREATE INDEX "Mess_ownerId_idx" ON "Mess"("ownerId");
CREATE INDEX "Mess_latitude_longitude_idx" ON "Mess"("latitude", "longitude");
CREATE INDEX "MenuItem_messId_idx" ON "MenuItem"("messId");
CREATE UNIQUE INDEX "MenuItem_messId_name_key" ON "MenuItem"("messId", "name");
CREATE INDEX "DailyMenu_date_idx" ON "DailyMenu"("date");
CREATE UNIQUE INDEX "DailyMenu_messId_date_key" ON "DailyMenu"("messId", "date");
CREATE INDEX "DailyMenuItem_menuItemId_idx" ON "DailyMenuItem"("menuItemId");
CREATE UNIQUE INDEX "DailyMenuItem_dailyMenuId_menuItemId_key" ON "DailyMenuItem"("dailyMenuId", "menuItemId");
CREATE INDEX "DishRating_menuItemId_idx" ON "DishRating"("menuItemId");
CREATE UNIQUE INDEX "DishRating_userId_menuItemId_key" ON "DishRating"("userId", "menuItemId");
CREATE INDEX "Review_messId_status_idx" ON "Review"("messId", "status");
CREATE UNIQUE INDEX "Review_userId_messId_key" ON "Review"("userId", "messId");
CREATE INDEX "CrowdReport_messId_createdAt_idx" ON "CrowdReport"("messId", "createdAt");
CREATE INDEX "CrowdReport_expiresAt_idx" ON "CrowdReport"("expiresAt");
CREATE INDEX "CrowdReport_userId_messId_createdAt_idx" ON "CrowdReport"("userId", "messId", "createdAt");
CREATE INDEX "CheckIn_messId_createdAt_idx" ON "CheckIn"("messId", "createdAt");
CREATE INDEX "CheckIn_userId_messId_createdAt_idx" ON "CheckIn"("userId", "messId", "createdAt");
CREATE INDEX "Favourite_messId_idx" ON "Favourite"("messId");
CREATE INDEX "VerificationLog_messId_createdAt_idx" ON "VerificationLog"("messId", "createdAt");

-- AddForeignKey
ALTER TABLE "Mess" ADD CONSTRAINT "Mess_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_messId_fkey" FOREIGN KEY ("messId") REFERENCES "Mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailyMenu" ADD CONSTRAINT "DailyMenu_messId_fkey" FOREIGN KEY ("messId") REFERENCES "Mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailyMenuItem" ADD CONSTRAINT "DailyMenuItem_dailyMenuId_fkey" FOREIGN KEY ("dailyMenuId") REFERENCES "DailyMenu"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailyMenuItem" ADD CONSTRAINT "DailyMenuItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DishRating" ADD CONSTRAINT "DishRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DishRating" ADD CONSTRAINT "DishRating_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_messId_fkey" FOREIGN KEY ("messId") REFERENCES "Mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrowdReport" ADD CONSTRAINT "CrowdReport_messId_fkey" FOREIGN KEY ("messId") REFERENCES "Mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrowdReport" ADD CONSTRAINT "CrowdReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_messId_fkey" FOREIGN KEY ("messId") REFERENCES "Mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Favourite" ADD CONSTRAINT "Favourite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Favourite" ADD CONSTRAINT "Favourite_messId_fkey" FOREIGN KEY ("messId") REFERENCES "Mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VerificationLog" ADD CONSTRAINT "VerificationLog_messId_fkey" FOREIGN KEY ("messId") REFERENCES "Mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VerificationLog" ADD CONSTRAINT "VerificationLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
