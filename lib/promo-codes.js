import "server-only";
import { ObjectId } from "mongodb";
import { mongoDatabase } from "@/lib/mongodb";

const promoCodes = mongoDatabase.collection("promoCodes");
let indexPromise;

export class PromoCodeError extends Error {}

export function isValidPromoId(id) {
  return typeof id === "string" && ObjectId.isValid(id) && new ObjectId(id).toHexString() === id;
}

function ensureIndexes() {
  indexPromise ??= promoCodes.createIndex({ code: 1 }, { unique: true });
  return indexPromise;
}

function normalizePromo(input, existing = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new PromoCodeError("Promo code details are required.");
  }
  const code = String(input.code ?? existing.code ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9_-]{2,24}$/.test(code)) {
    throw new PromoCodeError("Use 2–24 letters, numbers, underscores, or hyphens for the code.");
  }
  const discountType = input.discountType ?? existing.discountType;
  const value = Number(input.value ?? existing.value);
  if (!["percent", "fixed"].includes(discountType) || !Number.isSafeInteger(value) || value <= 0) {
    throw new PromoCodeError("Enter a valid discount type and positive whole-number value.");
  }
  if (discountType === "percent" && value > 100) {
    throw new PromoCodeError("Percentage discounts cannot exceed 100%.");
  }

  const expiryInput = input.expiresAt ?? existing.expiresAt ?? null;
  const expiresAt =
    expiryInput instanceof Date
      ? expiryInput
      : expiryInput
        ? new Date(`${expiryInput}T23:59:59.999Z`)
        : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    throw new PromoCodeError("Enter a valid promo expiration date.");
  }
  const usageLimitInput = input.usageLimit ?? existing.usageLimit ?? null;
  const usageLimit = usageLimitInput === "" || usageLimitInput == null ? null : Number(usageLimitInput);
  if (usageLimit !== null && (!Number.isSafeInteger(usageLimit) || usageLimit < 1)) {
    throw new PromoCodeError("Usage limit must be a positive whole number or unlimited.");
  }
  const active = input.active ?? existing.active ?? true;
  if (typeof active !== "boolean") {
    throw new PromoCodeError("Promo status must be active or paused.");
  }

  return { code, discountType, value, expiresAt, usageLimit, active };
}

function serializePromo(document) {
  const { _id, ...promo } = document;
  return {
    ...promo,
    id: _id.toString(),
    expiresAt: promo.expiresAt ? promo.expiresAt.toISOString().slice(0, 10) : "",
  };
}

export async function listPromoCodes({ includeInactive = false } = {}) {
  await ensureIndexes();
  const filter = includeInactive ? {} : { active: true };
  const records = await promoCodes.find(filter).sort({ createdAt: -1 }).toArray();
  return records.map(serializePromo);
}

export async function findPromoCode(code, session) {
  await ensureIndexes();
  const normalizedCode = typeof code === "string" ? code.trim().toUpperCase() : "";
  if (!normalizedCode) return null;
  const options = session ? { session } : {};
  return promoCodes.findOne({ code: normalizedCode }, options);
}

export async function createPromoCode(input) {
  await ensureIndexes();
  const normalized = normalizePromo(input);
  const document = {
    ...normalized,
    uses: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const result = await promoCodes.insertOne(document);
  return serializePromo({ ...document, _id: result.insertedId });
}

export async function updatePromoCode(id, input) {
  if (!isValidPromoId(id)) return null;
  await ensureIndexes();
  const _id = new ObjectId(id);
  const existing = await promoCodes.findOne({ _id });
  if (!existing) return null;

  if (Object.hasOwn(input ?? {}, "active")) {
    if (typeof input.active !== "boolean" || Object.keys(input).length !== 1) {
      throw new PromoCodeError("Only a valid active/paused status update is supported.");
    }
    const updated = {
      ...existing,
      active: input.active,
      updatedAt: new Date(),
    };
    await promoCodes.updateOne({ _id }, { $set: { active: updated.active, updatedAt: updated.updatedAt } });
    return serializePromo(updated);
  }

  const normalized = normalizePromo(input, existing);
  const updated = { ...existing, ...normalized, updatedAt: new Date() };
  await promoCodes.updateOne({ _id }, { $set: normalized });
  return serializePromo(updated);
}

export async function deletePromoCode(id) {
  if (!isValidPromoId(id)) return false;
  const result = await promoCodes.deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount === 1;
}

export async function reservePromoCode(code, eligibleAmount, session) {
  if (!Number.isSafeInteger(eligibleAmount) || eligibleAmount <= 0) {
    throw new PromoCodeError("Promo codes apply only to full-price product items.");
  }
  const promo = await findPromoCode(code, session);
  const now = new Date();
  if (
    !promo ||
    !promo.active ||
    (promo.expiresAt && promo.expiresAt < now) ||
    (promo.usageLimit != null && promo.uses >= promo.usageLimit)
  ) {
    throw new PromoCodeError("This promo code is invalid, expired, paused, or fully used.");
  }
  const discount = Math.min(
    eligibleAmount,
    promo.discountType === "percent"
      ? Math.floor((eligibleAmount * promo.value) / 100)
      : promo.value,
  );
  if (discount <= 0) {
    throw new PromoCodeError("This promo code does not apply to the current items.");
  }

  const filter = {
    _id: promo._id,
    active: true,
    $and: [
      { $or: [{ expiresAt: null }, { expiresAt: { $gte: now } }] },
      ...(promo.usageLimit == null ? [] : [{ uses: { $lt: promo.usageLimit } }]),
    ],
  };
  const result = await promoCodes.updateOne(filter, { $inc: { uses: 1 } }, { session });
  if (result.modifiedCount !== 1) {
    throw new PromoCodeError("This promo code is no longer available.");
  }

  return { id: promo._id, code: promo.code, discount };
}

export async function releasePromoCode(id, session) {
  if (!id) return;
  await promoCodes.updateOne(
    { _id: id, uses: { $gt: 0 } },
    { $inc: { uses: -1 } },
    { session },
  );
}
