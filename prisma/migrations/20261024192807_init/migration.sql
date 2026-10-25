-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('pending_confirmation', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show', 'rejected');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pending_confirmation', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'ready_to_serve', 'completed', 'cancelled', 'rejected', 'not_collected', 'delivery_failed');

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "data" JSONB NOT NULL,
    "profile" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "arabicName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "MenuCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "arabicName" TEXT NOT NULL,
    "aliases" TEXT[],
    "categoryId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priceFils" INTEGER NOT NULL,
    "portion" JSONB NOT NULL,
    "cookingMethod" TEXT NOT NULL,
    "preparationStyle" TEXT NOT NULL,
    "spiceLevel" INTEGER NOT NULL,
    "spiceAdjustment" JSONB NOT NULL,
    "prepTimeMinutes" INTEGER NOT NULL,
    "kitchenPortions" INTEGER NOT NULL,
    "customizations" JSONB NOT NULL,
    "mayContain" TEXT[],
    "crossContactNotes" TEXT[],
    "fulfilment" JSONB NOT NULL,
    "bulk" JSONB NOT NULL,
    "maxPerOrder" INTEGER NOT NULL,
    "dailyLimit" INTEGER,
    "availabilityRules" JSONB NOT NULL,
    "availabilityNote" TEXT NOT NULL,
    "pairings" TEXT[],
    "customerQA" JSONB NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "signature" BOOLEAN NOT NULL DEFAULT false,
    "groupMeal" BOOLEAN NOT NULL DEFAULT false,
    "imageSrc" TEXT NOT NULL,
    "imageAlt" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "availabilityStatus" TEXT NOT NULL DEFAULT 'available',
    "soldOutUntil" TIMESTAMPTZ(3),
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ingredient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "arabicName" TEXT,
    "aliases" TEXT[],
    "description" TEXT NOT NULL,
    "diet" TEXT NOT NULL,
    "allergens" TEXT[],
    "mayContain" TEXT[],
    "notes" TEXT,

    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItemIngredient" (
    "itemId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "quantity" TEXT NOT NULL,
    "removable" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "position" INTEGER NOT NULL,

    CONSTRAINT "MenuItemIngredient_pkey" PRIMARY KEY ("itemId","ingredientId")
);

-- CreateTable
CREATE TABLE "Sauce" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "arabicName" TEXT,
    "aliases" TEXT[],
    "kind" TEXT NOT NULL,
    "houseSpecial" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT NOT NULL,
    "flavourProfile" TEXT NOT NULL,
    "spiceLevel" INTEGER NOT NULL,
    "batchYield" TEXT NOT NULL,
    "preparation" TEXT NOT NULL,
    "servedTemperature" TEXT NOT NULL,
    "crossContactNotes" TEXT[],
    "sidePriceFils" INTEGER,

    CONSTRAINT "Sauce_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SauceIngredient" (
    "sauceId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "quantity" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "SauceIngredient_pkey" PRIMARY KEY ("sauceId","ingredientId")
);

-- CreateTable
CREATE TABLE "SauceComponent" (
    "sauceId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "quantity" TEXT NOT NULL,

    CONSTRAINT "SauceComponent_pkey" PRIMARY KEY ("sauceId","componentId")
);

-- CreateTable
CREATE TABLE "MenuItemSauce" (
    "itemId" TEXT NOT NULL,
    "sauceId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "note" TEXT,
    "position" INTEGER NOT NULL,

    CONSTRAINT "MenuItemSauce_pkey" PRIMARY KEY ("itemId","sauceId")
);

-- CreateTable
CREATE TABLE "SpecialPeriod" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "provisional" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT NOT NULL,
    "hoursOverride" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpecialPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Closure" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "scope" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "publicNote" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Closure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiningTable" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "minCovers" INTEGER NOT NULL,
    "maxCovers" INTEGER NOT NULL,
    "onlineBookable" BOOLEAN NOT NULL DEFAULT true,
    "features" TEXT[],
    "sortOrder" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DiningTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "accessTokenHash" TEXT NOT NULL,
    "status" "ReservationStatus" NOT NULL,
    "date" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "startAt" TIMESTAMPTZ(3) NOT NULL,
    "endAt" TIMESTAMPTZ(3) NOT NULL,
    "blockedUntil" TIMESTAMPTZ(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "partySize" INTEGER NOT NULL,
    "seatingPreference" TEXT NOT NULL,
    "seatingArea" TEXT NOT NULL,
    "preferenceMet" BOOLEAN NOT NULL,
    "tableId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "specialRequests" TEXT,
    "occasion" TEXT,
    "childrenCount" INTEGER NOT NULL DEFAULT 0,
    "highChairs" INTEGER NOT NULL DEFAULT 0,
    "wheelchairAccess" BOOLEAN NOT NULL DEFAULT false,
    "channel" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "apiKeyId" TEXT,
    "cancelledAt" TIMESTAMPTZ(3),
    "cancellationReason" TEXT,
    "cancelledBy" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReservationEvent" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "note" TEXT,
    "actor" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReservationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "accessTokenHash" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "apiKeyId" TEXT,
    "customerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "recipientName" TEXT,
    "recipientPhone" TEXT,
    "requestedAsap" BOOLEAN NOT NULL DEFAULT false,
    "requestedFor" TIMESTAMPTZ(3),
    "promisedAt" TIMESTAMPTZ(3) NOT NULL,
    "readyAt" TIMESTAMPTZ(3) NOT NULL,
    "prepStartAt" TIMESTAMPTZ(3) NOT NULL,
    "slotKey" TEXT NOT NULL,
    "localDate" TEXT NOT NULL,
    "kitchenPortions" INTEGER NOT NULL,
    "subtotalFils" INTEGER NOT NULL,
    "discountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountFils" INTEGER NOT NULL DEFAULT 0,
    "deliveryFeeFils" INTEGER NOT NULL DEFAULT 0,
    "totalFils" INTEGER NOT NULL,
    "vatFils" INTEGER NOT NULL,
    "depositRequiredFils" INTEGER NOT NULL DEFAULT 0,
    "paymentMethod" TEXT NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid',
    "deliveryAddress" JSONB,
    "deliveryZoneId" TEXT,
    "reservationId" TEXT,
    "specialInstructions" TEXT,
    "allergyNoteFlagged" BOOLEAN NOT NULL DEFAULT false,
    "quoteId" TEXT,
    "requiresReview" BOOLEAN NOT NULL DEFAULT false,
    "reviewReason" TEXT,
    "eventType" TEXT,
    "guestCount" INTEGER,
    "companyName" TEXT,
    "cancelledAt" TIMESTAMPTZ(3),
    "cancellationReason" TEXT,
    "cancelledBy" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitBasePriceFils" INTEGER NOT NULL,
    "unitOptionsFils" INTEGER NOT NULL,
    "unitPriceFils" INTEGER NOT NULL,
    "lineTotalFils" INTEGER NOT NULL,
    "selectedOptions" JSONB NOT NULL,
    "kitchenPortions" INTEGER NOT NULL,
    "allergens" TEXT[],
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "removedReason" TEXT,
    "position" INTEGER NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "note" TEXT,
    "actor" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BulkQuote" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "request" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "feasible" BOOLEAN NOT NULL,
    "portions" INTEGER NOT NULL,
    "totalFils" INTEGER NOT NULL,
    "fulfilmentAt" TIMESTAMPTZ(3) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "apiKeyId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BulkQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyRecord" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "responseStatus" INTEGER,
    "responseBody" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "scopes" TEXT[],
    "createdBy" TEXT,
    "lastUsedAt" TIMESTAMPTZ(3),
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MenuCategory_slug_key" ON "MenuCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItem_slug_key" ON "MenuItem"("slug");

-- CreateIndex
CREATE INDEX "MenuItem_categoryId_idx" ON "MenuItem"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Sauce_slug_key" ON "Sauce"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SpecialPeriod_slug_key" ON "SpecialPeriod"("slug");

-- CreateIndex
CREATE INDEX "Closure_date_idx" ON "Closure"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DiningTable_code_key" ON "DiningTable"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_reference_key" ON "Reservation"("reference");

-- CreateIndex
CREATE INDEX "Reservation_date_idx" ON "Reservation"("date");

-- CreateIndex
CREATE INDEX "Reservation_phone_idx" ON "Reservation"("phone");

-- CreateIndex
CREATE INDEX "Reservation_status_idx" ON "Reservation"("status");

-- CreateIndex
CREATE INDEX "ReservationEvent_reservationId_idx" ON "ReservationEvent"("reservationId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_number_key" ON "Order"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Order_quoteId_key" ON "Order"("quoteId");

-- CreateIndex
CREATE INDEX "Order_localDate_idx" ON "Order"("localDate");

-- CreateIndex
CREATE INDEX "Order_phone_idx" ON "Order"("phone");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_slotKey_idx" ON "Order"("slotKey");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_menuItemId_idx" ON "OrderItem"("menuItemId");

-- CreateIndex
CREATE INDEX "OrderEvent_orderId_idx" ON "OrderEvent"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "BulkQuote_reference_key" ON "BulkQuote"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyRecord_scope_key_key" ON "IdempotencyRecord"("scope", "key");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MenuCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemIngredient" ADD CONSTRAINT "MenuItemIngredient_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemIngredient" ADD CONSTRAINT "MenuItemIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SauceIngredient" ADD CONSTRAINT "SauceIngredient_sauceId_fkey" FOREIGN KEY ("sauceId") REFERENCES "Sauce"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SauceIngredient" ADD CONSTRAINT "SauceIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SauceComponent" ADD CONSTRAINT "SauceComponent_sauceId_fkey" FOREIGN KEY ("sauceId") REFERENCES "Sauce"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SauceComponent" ADD CONSTRAINT "SauceComponent_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Sauce"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemSauce" ADD CONSTRAINT "MenuItemSauce_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemSauce" ADD CONSTRAINT "MenuItemSauce_sauceId_fkey" FOREIGN KEY ("sauceId") REFERENCES "Sauce"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "DiningTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationEvent" ADD CONSTRAINT "ReservationEvent_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "BulkQuote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Concurrency safety: a table can never hold two overlapping active bookings.
-- The application also serialises reservation writes per date with an advisory
-- lock; this constraint is the last line of defence against race conditions.
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Reservation"
  ADD CONSTRAINT "Reservation_no_overlapping_table_bookings"
  EXCLUDE USING gist (
    "tableId" WITH =,
    tstzrange("startAt", "blockedUntil", '[)') WITH &&
  )
  WHERE ("status" IN ('pending_confirmation', 'confirmed', 'seated'));

-- Money and quantities must be sane.
ALTER TABLE "Order" ADD CONSTRAINT "Order_totals_non_negative" CHECK ("totalFils" >= 0 AND "subtotalFils" >= 0);
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_party_size_positive" CHECK ("partySize" > 0);
