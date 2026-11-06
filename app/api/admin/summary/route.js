import { connection, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-access";
import { getOrderSummary } from "@/lib/orders";
import { mongoDatabase } from "@/lib/mongodb";

export const instant = false;

export async function GET() {
  await connection();
  try {
    const access = await requireAdmin(null, { checkOrigin: false });
    if (access.error) return access.error;
    const [orderSummary, productCount, activeProductCount, lowStockCount] = await Promise.all([
      getOrderSummary(),
      mongoDatabase.collection("products").countDocuments(),
      mongoDatabase.collection("products").countDocuments({
        isActive: { $ne: false },
      }),
      mongoDatabase.collection("products").countDocuments({
        isActive: { $ne: false },
        stock: { $gt: 0, $lte: 10 },
      }),
    ]);
    return NextResponse.json({
      ...orderSummary,
      productCount,
      activeProductCount,
      lowStockCount,
    });
  } catch (error) {
    console.error("Could not load the ODYN admin summary.", error);
    return NextResponse.json({ error: "The admin summary could not be loaded." }, { status: 500 });
  }
}
