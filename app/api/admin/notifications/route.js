import { connection, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-access";
import { mongoDatabase } from "@/lib/mongodb";

export const instant = false;

export async function GET() {
  await connection();
  try {
    const access = await requireAdmin(null, { checkOrigin: false });
    if (access.error) return access.error;
    const [newOrders, lowStockProducts] = await Promise.all([
      mongoDatabase.collection("orders")
        .find({ status: { $in: ["processing", "awaiting-payment"] } })
        .sort({ createdAt: -1 })
        .limit(10)
        .project({ transactionId: 1, "customer.name": 1, total: 1, status: 1, createdAt: 1 })
        .toArray(),
      mongoDatabase.collection("products")
        .find({ isActive: { $ne: false }, stock: { $gt: 0, $lte: 10 } })
        .sort({ stock: 1 })
        .limit(10)
        .project({ name: 1, stock: 1 })
        .toArray(),
    ]);
    return NextResponse.json({
      notifications: [
        ...newOrders.map((order) => ({
          id: `order-${order._id}`,
          type: "order",
          title: `Order ${order.transactionId}`,
          description: `${order.customer?.name ?? "Customer"} · ৳${order.total} · ${order.status}`,
          createdAt: order.createdAt,
        })),
        ...lowStockProducts.map((product) => ({
          id: `stock-${product._id}`,
          type: "stock",
          title: `Low stock: ${product.name}`,
          description: `${product.stock} unit(s) remain.`,
          createdAt: null,
        })),
      ],
    });
  } catch (error) {
    console.error("Could not load ODYN admin notifications.", error);
    return NextResponse.json({ error: "Notifications could not be loaded." }, { status: 500 });
  }
}
