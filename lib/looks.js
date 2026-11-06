import "server-only";
import { GridFSBucket, ObjectId } from "mongodb";
import { mongoDatabase } from "@/lib/mongodb";

const looks = mongoDatabase.collection("looks");
const products = mongoDatabase.collection("products");
const imageBucket = new GridFSBucket(mongoDatabase, { bucketName: "lookImages" });
const avatarImagePattern = /^data:image\/(?:png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
const MAX_IMAGE_DATA_URL_LENGTH = 7 * 1024 * 1024;
const DEPARTMENTS = new Set(["Men", "Women", "Kids"]);

export class LookValidationError extends Error {}

export function isValidLookId(id) {
  return typeof id === "string" && ObjectId.isValid(id) && new ObjectId(id).toHexString() === id;
}

function serializeLook(document) {
  const { _id, imageId, productIds, ...look } = document;
  return {
    ...look,
    id: _id.toString(),
    image: `/api/looks/${_id.toString()}/image`,
  };
}

async function saveImage(dataUrl, id) {
  const [header, encodedData] = dataUrl.split(",", 2);
  const uploadStream = imageBucket.openUploadStream(`look-${id.toHexString()}`, {
    metadata: { contentType: header.slice("data:".length, header.indexOf(";")) },
  });
  return new Promise((resolve, reject) => {
    uploadStream.once("error", reject);
    uploadStream.once("finish", () => resolve(uploadStream.id));
    uploadStream.end(Buffer.from(encodedData, "base64"));
  });
}

async function removeImage(imageId) {
  if (imageId) await imageBucket.delete(imageId);
}

async function loadLookProducts(productIds, department) {
  if (!Array.isArray(productIds) || productIds.length < 1 || productIds.length > 30) {
    throw new LookValidationError("Select between 1 and 30 catalog products.");
  }
  if (productIds.some((id) => !ObjectId.isValid(id))) {
    throw new LookValidationError("One or more selected products are invalid.");
  }
  const ids = productIds.map((id) => new ObjectId(id));
  if (new Set(ids.map((id) => id.toHexString())).size !== ids.length) {
    throw new LookValidationError("A product can only be selected once.");
  }

  const records = await products.find({
    _id: { $in: ids },
    isActive: { $ne: false },
  }).toArray();
  if (records.length !== ids.length) {
    throw new LookValidationError("Every selected product must be active in the catalog.");
  }
  const wrongDepartment = records.find((product) => {
    const productDepartment = product.taxonomy?.department ?? product.collection;
    return productDepartment !== department &&
      productDepartment !== "Accessories" &&
      !(productDepartment === "Unisex" && ["Men", "Women"].includes(department));
  });
  if (wrongDepartment) {
    throw new LookValidationError("Selected products must match the avatar department.");
  }

  return records.map((product) => ({
    id: product._id.toString(),
    name: product.name,
    image: `/api/products/${product._id.toString()}/image`,
    category: product.taxonomy?.category ?? product.category,
  }));
}

export async function listLooks({ includeInactive = false } = {}) {
  const filter = includeInactive ? {} : { isActive: { $ne: false } };
  const records = await looks.find(filter).sort({ createdAt: -1, _id: -1 }).toArray();
  return records.map(serializeLook);
}

export async function createLook(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new LookValidationError("Avatar details are required.");
  }
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const department = input.department;
  const image = input.image;
  if (!name || name.length > 60) {
    throw new LookValidationError("Avatar name is required and must be at most 60 characters.");
  }
  if (!DEPARTMENTS.has(department)) {
    throw new LookValidationError("Select Men, Women, or Kids for the avatar department.");
  }
  if (
    typeof image !== "string" ||
    image.length > MAX_IMAGE_DATA_URL_LENGTH ||
    !avatarImagePattern.test(image)
  ) {
    throw new LookValidationError("Upload a transparent PNG or WebP avatar image no larger than 5 MB.");
  }

  const wornProducts = await loadLookProducts(input.productIds, department);
  const _id = new ObjectId();
  const imageId = await saveImage(image, _id);
  const now = new Date();
  const document = {
    _id,
    name,
    gender: department,
    products: wornProducts,
    productIds: wornProducts.map(({ id }) => new ObjectId(id)),
    imageId,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  try {
    await looks.insertOne(document);
    return serializeLook(document);
  } catch (error) {
    try {
      await removeImage(imageId);
    } catch (cleanupError) {
      console.error("Could not clean up an unused ODYN look image.", cleanupError);
    }
    throw error;
  }
}

export async function updateLook(id, input) {
  if (!isValidLookId(id)) return null;
  if (!input || typeof input !== "object" || typeof input.isActive !== "boolean") {
    throw new LookValidationError("Look status must be active or paused.");
  }
  const _id = new ObjectId(id);
  const result = await looks.findOneAndUpdate(
    { _id },
    { $set: { isActive: input.isActive, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  return result ? serializeLook(result) : null;
}

export async function deleteLook(id) {
  if (!isValidLookId(id)) return false;
  const result = await looks.findOneAndDelete({ _id: new ObjectId(id) });
  if (!result) return false;
  try {
    await removeImage(result.imageId);
  } catch (error) {
    console.error("Could not remove the ODYN look image from GridFS.", error);
  }
  return true;
}

export async function getLookImage(id) {
  if (!isValidLookId(id)) return null;
  const look = await looks.findOne(
    { _id: new ObjectId(id) },
    { projection: { imageId: 1, isActive: 1 } },
  );
  if (!look?.imageId) return null;
  const file = await imageBucket.find({ _id: look.imageId }).next();
  if (!file) return null;
  return {
    stream: imageBucket.openDownloadStream(look.imageId),
    contentType: file.metadata?.contentType ?? "application/octet-stream",
    isActive: look.isActive !== false,
  };
}
