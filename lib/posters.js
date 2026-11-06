import "server-only";
import { GridFSBucket, ObjectId } from "mongodb";
import { mongoDatabase } from "@/lib/mongodb";

const posters = mongoDatabase.collection("posters");
const posterImages = new GridFSBucket(mongoDatabase, { bucketName: "posterImages" });
const imagePattern = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
const MAX_IMAGE_DATA_URL_LENGTH = 7 * 1024 * 1024;
const PLACEMENTS = new Set(["Pop-up", "Hero"]);

export class PosterValidationError extends Error {}

export function isValidPosterId(id) {
  return typeof id === "string" && ObjectId.isValid(id) && new ObjectId(id).toHexString() === id;
}

function serializePoster(document) {
  const { _id, imageId, ...poster } = document;
  const id = _id.toString();
  return { ...poster, id, image: `/api/posters/${id}/image` };
}

async function saveImage(dataUrl, id) {
  const [header, encodedData] = dataUrl.split(",", 2);
  const contentType = header.slice("data:".length, header.indexOf(";"));
  const uploadStream = posterImages.openUploadStream(`poster-${id.toHexString()}`, {
    metadata: { contentType },
  });
  return new Promise((resolve, reject) => {
    uploadStream.once("error", reject);
    uploadStream.once("finish", () => resolve(uploadStream.id));
    uploadStream.end(Buffer.from(encodedData, "base64"));
  });
}

export async function listPosters({ includeInactive = false, placement } = {}) {
  const filter = {};
  if (!includeInactive) filter.active = true;
  if (PLACEMENTS.has(placement)) filter.placement = placement;
  const records = await posters.find(filter).sort({ createdAt: -1 }).toArray();
  return records.map(serializePoster);
}

export async function createPoster(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new PosterValidationError("Poster details are required.");
  }
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const placement = input.placement;
  const image = input.image;
  const link = input.link == null ? "" : input.link;
  if (!title || title.length > 80) {
    throw new PosterValidationError("Poster title is required and must be at most 80 characters.");
  }
  if (!PLACEMENTS.has(placement)) {
    throw new PosterValidationError("Choose Pop-up or Hero placement.");
  }
  if (
    typeof image !== "string" ||
    image.length > MAX_IMAGE_DATA_URL_LENGTH ||
    !imagePattern.test(image)
  ) {
    throw new PosterValidationError("Upload a JPG, PNG, or WebP image no larger than 5 MB.");
  }
  if (
    typeof link !== "string" ||
    link.length > 2048 ||
    (link && (!URL.canParse(link) || !["http:", "https:"].includes(new URL(link).protocol)))
  ) {
    throw new PosterValidationError("The poster link must be a valid HTTP or HTTPS URL.");
  }

  const _id = new ObjectId();
  const imageId = await saveImage(image, _id);
  const now = new Date();
  const document = {
    _id,
    title,
    placement,
    link: link.trim(),
    imageId,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
  try {
    await posters.insertOne(document);
    return serializePoster(document);
  } catch (error) {
    try {
      await posterImages.delete(imageId);
    } catch (cleanupError) {
      console.error("Could not clean up an unused ODYN poster image.", cleanupError);
    }
    throw error;
  }
}

export async function updatePoster(id, input) {
  if (!isValidPosterId(id)) return null;
  if (
    !input ||
    typeof input !== "object" ||
    typeof input.active !== "boolean" ||
    Object.keys(input).length !== 1
  ) {
    throw new PosterValidationError("Poster status must be active or paused.");
  }
  const _id = new ObjectId(id);
  const result = await posters.findOneAndUpdate(
    { _id },
    { $set: { active: input.active, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  return result ? serializePoster(result) : null;
}

export async function deletePoster(id) {
  if (!isValidPosterId(id)) return false;
  const result = await posters.findOneAndDelete({ _id: new ObjectId(id) });
  if (!result) return false;
  try {
    await posterImages.delete(result.imageId);
  } catch (error) {
    console.error("Could not remove the ODYN poster image from GridFS.", error);
  }
  return true;
}

export async function getPosterImage(id) {
  if (!isValidPosterId(id)) return null;
  const poster = await posters.findOne({ _id: new ObjectId(id) });
  if (!poster?.imageId) return null;
  const file = await posterImages.find({ _id: poster.imageId }).next();
  if (!file) return null;
  return {
    stream: posterImages.openDownloadStream(poster.imageId),
    contentType: file.metadata?.contentType ?? "application/octet-stream",
    active: poster.active !== false,
  };
}
