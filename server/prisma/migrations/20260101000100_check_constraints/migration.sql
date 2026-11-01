-- Database-level guards that Prisma's schema language cannot express.
-- These do not change the Prisma data model, so `prisma migrate diff` ignores them.
ALTER TABLE "Mess" ADD CONSTRAINT "Mess_avgMealPrice_check" CHECK ("avgMealPrice" >= 0);
ALTER TABLE "Mess" ADD CONSTRAINT "Mess_seatingCapacity_check" CHECK ("seatingCapacity" > 0);
ALTER TABLE "Mess" ADD CONSTRAINT "Mess_latitude_check" CHECK ("latitude" BETWEEN -90 AND 90);
ALTER TABLE "Mess" ADD CONSTRAINT "Mess_longitude_check" CHECK ("longitude" BETWEEN -180 AND 180);
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_price_check" CHECK ("price" >= 0);
ALTER TABLE "DishRating" ADD CONSTRAINT "DishRating_rating_check" CHECK ("rating" BETWEEN 1 AND 5);
ALTER TABLE "Review" ADD CONSTRAINT "Review_rating_check" CHECK ("rating" BETWEEN 1 AND 5);
ALTER TABLE "Review" ADD CONSTRAINT "Review_hygieneRating_check" CHECK ("hygieneRating" BETWEEN 1 AND 5);
ALTER TABLE "Review" ADD CONSTRAINT "Review_valueRating_check" CHECK ("valueRating" BETWEEN 1 AND 5);
