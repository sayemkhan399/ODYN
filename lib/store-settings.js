import "server-only";
import { mongoDatabase } from "@/lib/mongodb";

const settings = mongoDatabase.collection("storeSettings");
const STORE_ID = "main";

export class StoreSettingsValidationError extends Error {}

const DEFAULT_SETTINGS = {
  name: "ODYN",
  email: "",
  description: "",
};

function serializeSettings(document) {
  return {
    name: document.name,
    email: document.email,
    description: document.description,
  };
}

export async function getStoreSettings() {
  const document = await settings.findOne({ _id: STORE_ID });
  return { ...DEFAULT_SETTINGS, ...(document ? serializeSettings(document) : {}) };
}

export async function saveStoreSettings(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new StoreSettingsValidationError("Store settings are required.");
  }
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim() : "";
  const description = typeof input.description === "string" ? input.description.trim() : "";
  if (!name || name.length > 100) {
    throw new StoreSettingsValidationError("Store name is required and must be at most 100 characters.");
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new StoreSettingsValidationError("Enter a valid contact email.");
  }
  if (email.length > 254 || description.length > 1000) {
    throw new StoreSettingsValidationError("Contact email or store description is too long.");
  }
  const document = {
    _id: STORE_ID,
    name,
    email,
    description,
    updatedAt: new Date(),
  };
  await settings.updateOne(
    { _id: STORE_ID },
    { $set: document, $setOnInsert: { createdAt: new Date() } },
    { upsert: true },
  );
  return serializeSettings(document);
}
