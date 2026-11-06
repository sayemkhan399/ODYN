import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-access";
import {
  listAdminOrders,
  OrderValidationError,
  updateOrder,
} from "@/lib/orders";

export async function GET(request) {
  try {
    const access = await requireAdmin(null, { checkOrigin: false });
    if (access.error) return access.error;
    const params = new URL(request.url).searchParams;
    const rawOffset = Number(params.get("offset") ?? 0);
    const offset = Number.isSafeInteger(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
    const result = await listAdminOrders({
      offset,
      limit: 25,
      search: params.get("search") ?? "",
    });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not load ODYN admin orders.", error);
    return NextResponse.json({ error: "Orders could not be loaded." }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const access = await requireAdmin(request);
    if (access.error) return access.error;
    const body = await request.json();
    const order = await updateOrder(body?.orderId, body);
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    return NextResponse.json({ order });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Valid JSON is required." }, { status: 400 });
    }
    if (error instanceof OrderValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Could not update an ODYN order.", error);
    return NextResponse.json({ error: "The order could not be updated." }, { status: 500 });
  }
}
