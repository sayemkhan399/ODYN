import "server-only";
import { GridFSBucket, ObjectId } from "mongodb";
import { mongoDatabase } from "@/lib/mongodb";

const products = mongoDatabase.collection("products");
const productImageBucket = new GridFSBucket(mongoDatabase, {
  bucketName: "productImages",
});
const IMAGE_DATA_URL_PATTERN =
  /^data:image\/(?:jpeg|png|webp|gif|avif);base64,[A-Za-z0-9+/]+={0,2}$/;
const MAX_IMAGE_DATA_URL_LENGTH = 7 * 1024 * 1024;
const SIZE_CHART_DIMENSIONS = ["age", "height", "chest", "waist", "hip", "footLength"];

export class ProductValidationError extends Error {}

export function isValidProductId(id) {
  return typeof id === "string" && ObjectId.isValid(id) && new ObjectId(id).toHexString() === id;
}

function requiredString(value, field, maxLength) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength) {
    throw new ProductValidationError(`${field} is required and must be at most ${maxLength} characters.`);
  }
  return value.trim();
}

export function normalizeProduct(input, existing = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ProductValidationError("A product is required.");
  }

  const image = input.image ?? existing.image;
  const isNewImage =
    typeof image === "string" && IMAGE_DATA_URL_PATTERN.test(image);
  if (
    typeof image !== "string" ||
    (isNewImage && image.length > MAX_IMAGE_DATA_URL_LENGTH) ||
    (!isNewImage && image !== existing.image)
  ) {
    throw new ProductValidationError("Upload a supported product image no larger than 5 MB.");
  }

  const taxonomyInput = input.taxonomy ?? existing.taxonomy;
  if (!taxonomyInput || typeof taxonomyInput !== "object" || Array.isArray(taxonomyInput)) {
    throw new ProductValidationError("Select the product department and categories.");
  }
  const taxonomy = {
    department: requiredString(taxonomyInput.department, "Department", 80),
    section: requiredString(taxonomyInput.section, "Category group", 80),
    category: requiredString(taxonomyInput.category, "Product category", 80),
    item: requiredString(taxonomyInput.item, "Style / type", 80),
  };

  const name = requiredString(input.name ?? existing.name, "Product name", 120);
  const descriptionInput = input.description ?? existing.description ?? "";
  if (typeof descriptionInput !== "string" || descriptionInput.length > 5000) {
    throw new ProductValidationError("Description must be at most 5,000 characters.");
  }

  const price = Number(input.price ?? existing.price);
  const discountPercent = Number(input.discountPercent ?? existing.discountPercent ?? 0);
  if (!Number.isSafeInteger(price) || price < 0) {
    throw new ProductValidationError("Price must be a non-negative whole number.");
  }
  if (!Number.isInteger(discountPercent) || discountPercent < 0 || discountPercent > 100) {
    throw new ProductValidationError("Discount must be a whole number between 0 and 100.");
  }

  const inputSizes = input.sizes ?? existing.sizes;
  if (!Array.isArray(inputSizes) || inputSizes.length === 0 || inputSizes.length > 100) {
    throw new ProductValidationError("Add at least one product size.");
  }
  const sizes = inputSizes.map((entry) => {
    const size = requiredString(entry?.size, "Size", 40);
    const quantity = Number(entry?.quantity);
    if (!Number.isSafeInteger(quantity) || quantity < 0) {
      throw new ProductValidationError(`Quantity for size ${size} must be a non-negative whole number.`);
    }
    return { size, quantity };
  });
  if (new Set(sizes.map(({ size }) => size)).size !== sizes.length) {
    throw new ProductValidationError("Each product size can only be listed once.");
  }

  const inputSizeChart = input.sizeChart ?? existing.sizeChart ?? [];
  if (!Array.isArray(inputSizeChart) || inputSizeChart.length > 100) {
    throw new ProductValidationError("Size chart must contain no more than 100 sizes.");
  }
  const sizeChart = inputSizeChart.map((entry) => {
    const size = requiredString(entry?.size, "Size chart size", 40);
    if (!sizes.some((productSize) => productSize.size === size)) {
      throw new ProductValidationError(`Size chart entry ${size} must match an inventory size.`);
    }

    const measurements = { size };
    for (const dimension of SIZE_CHART_DIMENSIONS) {
      const range = entry[dimension];
      if (range == null) continue;
      if (
        typeof range !== "object" ||
        Array.isArray(range) ||
        range.min == null ||
        range.max == null ||
        (typeof range.min === "string" && !range.min.trim()) ||
        (typeof range.max === "string" && !range.max.trim())
      ) {
        throw new ProductValidationError(
          `${dimension[0].toUpperCase()}${dimension.slice(1)} fit ranges need both a minimum and maximum.`,
        );
      }
      const min = Number(range.min);
      const max = Number(range.max);
      const upperLimit = dimension === "age" ? 120 : dimension === "footLength" ? 50 : 300;
      const lowerLimit = dimension === "age" ? 0 : 1;
      if (
        !Number.isFinite(min) ||
        !Number.isFinite(max) ||
        min < lowerLimit ||
        max > upperLimit ||
        min > max ||
        (dimension === "age" && (!Number.isInteger(min) || !Number.isInteger(max)))
      ) {
        throw new ProductValidationError(
          `${dimension[0].toUpperCase()}${dimension.slice(1)} fit ranges must have valid minimum and maximum values.`,
        );
      }
      measurements[dimension] = { min, max };
    }
    return measurements;
  });
  if (new Set(sizeChart.map(({ size }) => size)).size !== sizeChart.length) {
    throw new ProductValidationError("Each size can only have one fit chart entry.");
  }

  const isActive = input.isActive ?? existing.isActive ?? true;
  if (typeof isActive !== "boolean") {
    throw new ProductValidationError("Product status must be active or paused.");
  }

  return {
    name,
    description: descriptionInput.trim(),
    collection: taxonomy.department,
    category: taxonomy.category,
    taxonomy,
    price,
    discountPercent,
    sizes,
    sizeChart,
    stock: sizes.reduce((total, entry) => total + entry.quantity, 0),
    image,
    badge: typeof (input.badge ?? existing.badge) === "string"
      ? (input.badge ?? existing.badge).slice(0, 40)
      : "",
    isActive,
  };
}

export function serializeProduct(document) {
  const product = { ...document };
  const id = product._id.toString();
  delete product._id;
  delete product.imageId;
  return {
    ...product,
    image: `/api/products/${id}/image`,
    id,
  };
}

async function saveProductImage(dataUrl, productId) {
  const [header, encodedData] = dataUrl.split(",", 2);
  const contentType = header.slice("data:".length, header.indexOf(";"));
  const uploadStream = productImageBucket.openUploadStream(
    `product-${productId.toHexString()}`,
    { metadata: { contentType } },
  );
  return new Promise((resolve, reject) => {
    uploadStream.once("error", reject);
    uploadStream.once("finish", () => resolve(uploadStream.id));
    uploadStream.end(Buffer.from(encodedData, "base64"));
  });
}

async function removeProductImage(imageId) {
  if (imageId) await productImageBucket.delete(imageId);
}

export async function listProducts({ includeInactive = false } = {}) {
  const filter = includeInactive ? {} : { isActive: { $ne: false } };
  const documents = await products.find(filter).sort({ createdAt: -1, _id: -1 }).toArray();
  return documents.map(serializeProduct);
}

export async function createProduct(input) {
  const normalizedProduct = normalizeProduct(input);
  const _id = new ObjectId();
  const imageId = await saveProductImage(normalizedProduct.image, _id);
  const now = new Date();
  const document = {
    ...normalizedProduct,
    image: `/api/products/${_id.toHexString()}/image`,
    imageId,
    createdAt: now,
    updatedAt: now,
    _id,
  };
  try {
    await products.insertOne(document);
    return serializeProduct(document);
  } catch (error) {
    try {
      await removeProductImage(imageId);
    } catch (cleanupError) {
      console.error("Could not clean up an unused ODYN product image.", cleanupError);
    }
    throw error;
  }
}

export async function updateProduct(id, input) {
  if (!isValidProductId(id)) return null;
  const objectId = new ObjectId(id);
  const existing = await products.findOne({ _id: objectId });
  if (!existing) return null;

  const normalizedProduct = normalizeProduct(input, existing);
  const replacingImage = normalizedProduct.image.startsWith("data:image/");
  const imageId = replacingImage
    ? await saveProductImage(normalizedProduct.image, objectId)
    : existing.imageId;
  const document = {
    ...normalizedProduct,
    image: `/api/products/${objectId.toHexString()}/image`,
    imageId,
    createdAt: existing.createdAt,
    updatedAt: new Date(),
  };
  const result = await products.updateOne({ _id: objectId }, { $set: document });
  if (!result.matchedCount) {
    if (replacingImage) {
      try {
        await removeProductImage(imageId);
      } catch (cleanupError) {
        console.error("Could not clean up an unused ODYN product image.", cleanupError);
      }
    }
    return null;
  }
  if (replacingImage && existing.imageId) {
    try {
      await removeProductImage(existing.imageId);
    } catch (cleanupError) {
      console.error("Could not remove the replaced ODYN product image.", cleanupError);
    }
  }
  return serializeProduct({ ...document, _id: objectId });
}

export async function deleteProduct(id) {
  if (!isValidProductId(id)) return false;
  const objectId = new ObjectId(id);
  const product = await products.findOneAndDelete({ _id: objectId });
  if (!product) return false;
  try {
    await removeProductImage(product.imageId);
  } catch (error) {
    console.error("Could not remove the ODYN product image from GridFS.", error);
  }
  return true;
}

export async function getProductImage(id) {
  if (!isValidProductId(id)) return null;
  const product = await products.findOne(
    { _id: new ObjectId(id) },
    { projection: { imageId: 1, isActive: 1 } },
  );
  if (!product?.imageId) return null;
  const file = await productImageBucket.find({ _id: product.imageId }).next();
  if (!file) return null;
  return {
    stream: productImageBucket.openDownloadStream(product.imageId),
    contentType: file.metadata?.contentType ?? "application/octet-stream",
    isActive: product.isActive !== false,
  };
}
