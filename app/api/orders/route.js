import { connection, NextResponse } from "next/server";
import { requireCustomer } from "@/lib/admin-access";
import {
  getOrderById,
  listCustomerOrders,
} from "@/lib/orders";

export const instant = false;

export async function GET(request) {
  await connection();
  try {
    const access = await requireCustomer(null);
    if (access.error) return access.error;
    const id = new URL(request.url).searchParams.get("id");
    if (id) {
      const order = await getOrderById(id);
      if (!order || order.customerId !== access.session.user.id) {
        return NextResponse.json({ error: "Order not found." }, { status: 404 });
      }
      return NextResponse.json({ order });
    }
    const orders = await listCustomerOrders(access.session.user.id);
    return NextResponse.json(
      { orders },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Could not load ODYN customer orders.", error);
    return NextResponse.json({ error: "Orders could not be loaded." }, { status: 500 });
  }
}
