-- AlterTable
ALTER TABLE "Sauce" ADD COLUMN     "mayContain" TEXT[] DEFAULT ARRAY[]::TEXT[];
