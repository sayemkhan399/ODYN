import { NextResponse } from "next/server";
import { findGuestOrder } from "@/lib/orders";

export async function POST(request) {
  try {
    const body = await request.json();
    const order = await findGuestOrder(body?.orderId, body?.email);
    if (!order) {
      return NextResponse.json(
        { error: "No guest order matched that order reference and email." },
        { status: 404 },
      );
    }
    return NextResponse.json({ order });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Valid JSON is required." }, { status: 400 });
    }
    console.error("Could not track an ODYN guest order.", error);
    return NextResponse.json({ error: "Order tracking could not be completed." }, { status: 500 });
  }
}
