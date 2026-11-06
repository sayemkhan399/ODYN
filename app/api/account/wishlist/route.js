import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireCustomer } from "@/lib/admin-access";
import { mongoDatabase } from "@/lib/mongodb";
import { isValidProductId, serializeProduct } from "@/lib/products";

const wishlists = mongoDatabase.collection("wishlists");
let wishlistIndex;

async function ensureIndex() {
  wishlistIndex ??= wishlists.createIndex({ userId: 1 }, { unique: true });
  await wishlistIndex;
}

export async function GET() {
  try {
    const access = await requireCustomer(null);
    if (access.error) return access.error;
    await ensureIndex();
    const record = await wishlists.findOne({ userId: access.session.user.id });
    const productIds = record?.productIds ?? [];
    const products = productIds.length
      ? await mongoDatabase.collection("products")
          .find({ _id: { $in: productIds }, isActive: { $ne: false } })
          .toArray()
      : [];
    return NextResponse.json({
      products: products.map(serializeProduct),
    });
  } catch (error) {
    console.error("Could not load the ODYN customer wishlist.", error);
    return NextResponse.json({ error: "Wishlist could not be loaded." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const access = await requireCustomer(request, { checkOrigin: true });
    if (access.error) return access.error;
    const body = await request.json();
    if (!isValidProductId(body?.productId) || !["add", "remove"].includes(body?.action)) {
      return NextResponse.json({ error: "A valid product and wishlist action are required." }, { status: 400 });
    }
    await ensureIndex();
    const productId = new ObjectId(body.productId);
    if (body.action === "add") {
      const activeProduct = await mongoDatabase.collection("products").findOne({
        _id: productId,
        isActive: { $ne: false },
      });
      if (!activeProduct) {
        return NextResponse.json({ error: "That product is no longer available." }, { status: 404 });
      }
      await wishlists.updateOne(
        { userId: access.session.user.id },
        {
          $setOnInsert: { userId: access.session.user.id, createdAt: new Date() },
          $addToSet: { productIds: productId },
          $set: { updatedAt: new Date() },
        },
        { upsert: true },
      );
    } else {
      await wishlists.updateOne(
        { userId: access.session.user.id },
        { $pull: { productIds: productId }, $set: { updatedAt: new Date() } },
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Valid JSON is required." }, { status: 400 });
    }
    console.error("Could not update the ODYN customer wishlist.", error);
    return NextResponse.json({ error: "Wishlist could not be updated." }, { status: 500 });
  }
}
