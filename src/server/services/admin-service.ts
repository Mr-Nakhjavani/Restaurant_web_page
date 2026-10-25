import { Prisma } from "@prisma/client";
import { DateTime } from "luxon";
import { SettingsSchema, type RestaurantSettings } from "@/domain/settings";
import { money } from "@/domain/money";
import { RESTAURANT_TZ, toLocalDate } from "@/domain/time";
import { CAPACITY_ORDER_STATUSES } from "@/domain/status";
import { prisma } from "../db";
import { ApiError } from "../errors";
import { logger } from "../logger";
import { verifyPassword } from "../auth/password";
import { generateApiKey, type ApiKeyScope } from "../auth/api-keys";
import { actorName, type Principal } from "../auth/principal";
import { signSession } from "../auth/session";
import { loadCatalog, loadRestaurantContext } from "../repositories/catalog-repo";
import { dailyItemUsage } from "./menu-service";

async function audit(principal: Principal, action: string, entityType: string, entityId: string, before: unknown, after: unknown) {
  await prisma.auditLog.create({
    data: {
      actor: actorName(principal),
      action,
      entityType,
      entityId,
      before: before === undefined ? Prisma.JsonNull : (JSON.parse(JSON.stringify(before)) as Prisma.InputJsonValue),
      after: after === undefined ? Prisma.JsonNull : (JSON.parse(JSON.stringify(after)) as Prisma.InputJsonValue),
    },
  });
}

// --- auth -------------------------------------------------------------------

export async function login(email: string, password: string) {
  const user = await prisma.adminUser.findUnique({ where: { email: email.trim().toLowerCase() } });
  const ok = user && user.active && (await verifyPassword(password, user.passwordHash));
  if (!ok || !user) {
    logger.warn("admin.login_failed", { email: email.replace(/(.{2}).*@/, "$1***@") });
    throw new ApiError("INVALID_CREDENTIALS");
  }
  await prisma.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const token = await signSession({ sub: user.id, email: user.email, name: user.name, role: user.role as "admin" | "staff" });
  return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
}

// --- dashboard --------------------------------------------------------------

export async function dashboard(date: string) {
  const [orders, reservations, pendingOrders, pendingReservations, catering] = await Promise.all([
    prisma.order.groupBy({ by: ["status"], where: { localDate: date, kind: "regular" }, _count: true, _sum: { totalFils: true } }),
    prisma.reservation.groupBy({ by: ["status"], where: { date }, _count: true, _sum: { partySize: true } }),
    prisma.order.count({ where: { status: "pending_confirmation" } }),
    prisma.reservation.count({ where: { status: "pending_confirmation" } }),
    prisma.order.count({ where: { kind: "bulk", status: { in: CAPACITY_ORDER_STATUSES }, localDate: { gte: date } } }),
  ]);
  const revenue = orders.filter((o) => CAPACITY_ORDER_STATUSES.includes(o.status)).reduce((s, o) => s + (o._sum.totalFils ?? 0), 0);
  return {
    date,
    orders: { byStatus: Object.fromEntries(orders.map((o) => [o.status, o._count])), total: orders.reduce((s, o) => s + o._count, 0), expectedRevenue: money(revenue) },
    reservations: {
      byStatus: Object.fromEntries(reservations.map((r) => [r.status, r._count])),
      total: reservations.reduce((s, r) => s + r._count, 0),
      covers: reservations.filter((r) => ["confirmed", "pending_confirmation", "seated", "completed"].includes(r.status)).reduce((s, r) => s + (r._sum.partySize ?? 0), 0),
    },
    needsAttention: { pendingOrders, pendingReservations, upcomingCateringOrders: catering },
  };
}

// --- menu -------------------------------------------------------------------

export async function adminMenuItems(now: DateTime) {
  const catalog = await loadCatalog();
  const usage = await dailyItemUsage(toLocalDate(now));
  return catalog.items.map((i) => ({
    id: i.id,
    slug: i.slug,
    name: i.name,
    arabicName: i.arabicName,
    categoryId: i.categoryId,
    category: catalog.categories.find((c) => c.id === i.categoryId)?.name ?? i.categoryId,
    kind: i.kind,
    price: money(i.priceFils),
    availabilityStatus: i.availabilityStatus,
    soldOutUntil: i.soldOutUntil,
    isVisible: i.isVisible,
    featured: i.featured,
    dailyLimit: i.dailyLimit,
    orderedToday: usage.get(i.id) ?? 0,
    prepTimeMinutes: i.prepTimeMinutes,
    shortDescription: i.shortDescription,
    availabilityNote: i.availabilityNote,
    image: i.image.src,
    updatedAt: i.updatedAt,
  }));
}

export interface MenuItemPatch {
  priceFils?: number;
  availabilityStatus?: "available" | "sold_out" | "paused";
  soldOutUntil?: string | null;
  isVisible?: boolean;
  featured?: boolean;
  shortDescription?: string;
  description?: string;
  availabilityNote?: string;
  dailyLimit?: number | null;
  prepTimeMinutes?: number;
}

export async function updateMenuItem(id: string, patch: MenuItemPatch, principal: Principal, now: DateTime) {
  const before = await prisma.menuItem.findFirst({ where: { OR: [{ id }, { slug: id }] } });
  if (!before) throw new ApiError("NOT_FOUND", `No menu item ${id}.`);
  let soldOutUntil: Date | null | undefined = undefined;
  if (patch.availabilityStatus === "sold_out") {
    soldOutUntil = patch.soldOutUntil ? DateTime.fromISO(patch.soldOutUntil, { zone: RESTAURANT_TZ }).toJSDate() : now.endOf("day").toJSDate();
  } else if (patch.availabilityStatus) {
    soldOutUntil = null;
  }
  const updated = await prisma.menuItem.update({
    where: { id: before.id },
    data: {
      priceFils: patch.priceFils,
      availabilityStatus: patch.availabilityStatus,
      soldOutUntil,
      isVisible: patch.isVisible,
      featured: patch.featured,
      shortDescription: patch.shortDescription,
      description: patch.description,
      availabilityNote: patch.availabilityNote,
      dailyLimit: patch.dailyLimit,
      prepTimeMinutes: patch.prepTimeMinutes,
    },
  });
  const pick = (r: typeof before) => ({
    priceFils: r.priceFils,
    availabilityStatus: r.availabilityStatus,
    soldOutUntil: r.soldOutUntil,
    isVisible: r.isVisible,
    featured: r.featured,
    dailyLimit: r.dailyLimit,
    prepTimeMinutes: r.prepTimeMinutes,
    shortDescription: r.shortDescription,
    availabilityNote: r.availabilityNote,
  });
  await audit(principal, "menu_item.update", "menu_item", before.id, pick(before), pick(updated));
  logger.info("admin.menu_item.updated", { id: before.id, actor: actorName(principal), fields: Object.keys(patch) });
  return (await adminMenuItems(now)).find((i) => i.id === before.id)!;
}

// --- settings ---------------------------------------------------------------

function deepMerge<T>(base: T, patch: unknown): T {
  if (patch === null || typeof patch !== "object" || Array.isArray(patch)) return patch as T;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
    const current = out[k];
    out[k] = current && typeof current === "object" && !Array.isArray(current) && v && typeof v === "object" && !Array.isArray(v) ? deepMerge(current, v) : v;
  }
  return out as T;
}

export async function getSettings() {
  const ctx = await loadRestaurantContext();
  return { settings: ctx.settings, version: ctx.settingsVersion, updatedAt: ctx.settingsUpdatedAt };
}

export async function updateSettings(patch: Record<string, unknown>, principal: Principal) {
  const ctx = await loadRestaurantContext();
  const merged = deepMerge<RestaurantSettings>(ctx.settings, patch);
  const parsed = SettingsSchema.safeParse(merged);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", "The settings are not valid.", { issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) });
  }
  const row = await prisma.settings.update({
    where: { id: "default" },
    data: { data: parsed.data as unknown as Prisma.InputJsonValue, version: { increment: 1 }, updatedBy: actorName(principal) },
  });
  await audit(principal, "settings.update", "settings", "default", ctx.settings, parsed.data);
  return { settings: parsed.data, version: row.version, updatedAt: row.updatedAt.toISOString() };
}

// --- calendar ---------------------------------------------------------------

export interface PeriodInput {
  slug: string;
  type: string;
  name: string;
  startDate: string;
  endDate: string;
  provisional?: boolean;
  notes?: string;
  hoursOverride?: { open: string; close: string } | null;
}

export async function listPeriods() {
  return (await loadRestaurantContext()).specialPeriods;
}

export async function upsertPeriod(id: string | null, input: PeriodInput, principal: Principal) {
  if (input.startDate > input.endDate) throw new ApiError("VALIDATION_ERROR", "startDate must be on or before endDate.");
  const data = {
    slug: input.slug,
    type: input.type,
    name: input.name,
    startDate: input.startDate,
    endDate: input.endDate,
    provisional: input.provisional ?? false,
    notes: input.notes ?? "",
    hoursOverride: input.hoursOverride ? (input.hoursOverride as Prisma.InputJsonValue) : Prisma.JsonNull,
  };
  const before = id ? await prisma.specialPeriod.findUnique({ where: { id } }) : null;
  if (id && !before) throw new ApiError("NOT_FOUND", `No special period ${id}.`);
  try {
    const row = id ? await prisma.specialPeriod.update({ where: { id }, data }) : await prisma.specialPeriod.create({ data: { id: `sp_${input.slug.replace(/-/g, "_")}`, ...data } });
    await audit(principal, id ? "special_period.update" : "special_period.create", "special_period", row.id, before, row);
    return row;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new ApiError("VALIDATION_ERROR", "A special period with that slug already exists.");
    throw e;
  }
}

export async function deletePeriod(id: string, principal: Principal) {
  const before = await prisma.specialPeriod.findUnique({ where: { id } });
  if (!before) throw new ApiError("NOT_FOUND", `No special period ${id}.`);
  await prisma.specialPeriod.delete({ where: { id } });
  await audit(principal, "special_period.delete", "special_period", id, before, null);
  return { deleted: id };
}

export interface ClosureInput {
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  scope: "all" | "reservations" | "orders";
  reason: string;
  publicNote: string;
}

export async function listClosures() {
  return (await loadRestaurantContext()).closures;
}

export async function createClosure(input: ClosureInput, principal: Principal) {
  if (input.startTime && input.endTime && input.startTime >= input.endTime) throw new ApiError("VALIDATION_ERROR", "startTime must be before endTime.");
  const row = await prisma.closure.create({
    data: { id: `cl_${input.date.replace(/-/g, "_")}_${Date.now().toString(36)}`, date: input.date, startTime: input.startTime ?? null, endTime: input.endTime ?? null, scope: input.scope, reason: input.reason, publicNote: input.publicNote },
  });
  await audit(principal, "closure.create", "closure", row.id, null, row);
  return row;
}

export async function deleteClosure(id: string, principal: Principal) {
  const before = await prisma.closure.findUnique({ where: { id } });
  if (!before) throw new ApiError("NOT_FOUND", `No closure ${id}.`);
  await prisma.closure.delete({ where: { id } });
  await audit(principal, "closure.delete", "closure", id, before, null);
  return { deleted: id };
}

// --- API keys ---------------------------------------------------------------

export async function listApiKeys() {
  const keys = await prisma.apiKey.findMany({ orderBy: { createdAt: "desc" } });
  return keys.map((k) => ({ id: k.id, name: k.name, prefix: k.prefix, scopes: k.scopes, createdBy: k.createdBy, createdAt: k.createdAt.toISOString(), lastUsedAt: k.lastUsedAt?.toISOString() ?? null, revokedAt: k.revokedAt?.toISOString() ?? null }));
}

export async function createApiKey(name: string, scopes: ApiKeyScope[], principal: Principal) {
  const { key, prefix, hash } = generateApiKey();
  const row = await prisma.apiKey.create({ data: { name, prefix, keyHash: hash, scopes, createdBy: actorName(principal) } });
  await audit(principal, "api_key.create", "api_key", row.id, null, { name, scopes, prefix });
  return { id: row.id, name, prefix, scopes, key, warning: "Store this key now — it is shown only once." };
}

export async function revokeApiKey(id: string, principal: Principal) {
  const row = await prisma.apiKey.findUnique({ where: { id } });
  if (!row) throw new ApiError("NOT_FOUND", `No API key ${id}.`);
  await prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
  await audit(principal, "api_key.revoke", "api_key", id, { revokedAt: null }, { revokedAt: new Date().toISOString() });
  return { revoked: id };
}

export async function auditLog(entityType?: string, entityId?: string, limit = 50) {
  const rows = await prisma.auditLog.findMany({ where: { ...(entityType ? { entityType } : {}), ...(entityId ? { entityId } : {}) }, orderBy: { createdAt: "desc" }, take: limit });
  return rows.map((r) => ({ id: r.id, actor: r.actor, action: r.action, entityType: r.entityType, entityId: r.entityId, before: r.before, after: r.after, at: r.createdAt.toISOString() }));
}
