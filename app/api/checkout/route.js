import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { createOrder, OrderValidationError, updatePaymentStatus } from "@/lib/orders";
import { initiateSslcommerzPayment, isSslcommerzConfigured } from "@/lib/sslcommerz";

export async function POST(request) {
  try {
    if (request.headers.get("origin") !== new URL(request.url).origin) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }

    const body = await request.json();
    if (body?.paymentMethod === "sslcommerz" && !isSslcommerzConfigured()) {
      return NextResponse.json(
        { error: "Online payment is not configured yet. Add the SSLCommerz credentials to the server environment or choose cash on delivery." },
        { status: 503 },
      );
    }

    const session = await auth.api.getSession({ headers: await headers() });
    const order = await createOrder(body, session?.user ?? null);
    if (order.paymentMethod === "cod") {
      return NextResponse.json({ order }, { status: 201 });
    }

    try {
      const redirectUrl = await initiateSslcommerzPayment(order, new URL(request.url).origin);
      return NextResponse.json({ order, redirectUrl }, { status: 201 });
    } catch (error) {
      console.error("Could not start the ODYN SSLCommerz payment session.", error);
      try {
        await updatePaymentStatus(order.transactionId, "failed");
      } catch (releaseError) {
        console.error("Could not release inventory for a failed ODYN payment session.", releaseError);
      }
      return NextResponse.json(
        { error: "Online payment could not be started. Your order was not placed; please try again or choose cash on delivery." },
        { status: 502 },
      );
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Valid JSON is required." }, { status: 400 });
    }
    if (error instanceof OrderValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Could not place an ODYN order.", error);
    return NextResponse.json(
      { error: "The order could not be placed. Please try again." },
      { status: 500 },
    );
  }
}
