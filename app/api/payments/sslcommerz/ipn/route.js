import { NextResponse } from "next/server";
import { getOrderByTransactionId, updatePaymentStatus } from "@/lib/orders";
import { validateSslcommerzPayment } from "@/lib/sslcommerz";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const transactionId = formData.get("tran_id");
    if (typeof transactionId !== "string" || transactionId.length > 50) {
      return NextResponse.json({ error: "Transaction reference is invalid." }, { status: 400 });
    }
    const order = await getOrderByTransactionId(transactionId);
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

    const payment = await validateSslcommerzPayment(formData);
    const amount = Number(payment.amount);
    const isValid =
      ["VALID", "VALIDATED"].includes(payment.status) &&
      payment.tran_id === order.transactionId &&
      payment.currency === "BDT" &&
      Number.isFinite(amount) &&
      Math.round(amount * 100) === Math.round(order.total * 100);
    if (!isValid) {
      return NextResponse.json({ error: "Payment validation failed." }, { status: 400 });
    }

    const updatedOrder = await updatePaymentStatus(order.transactionId, "paid");
    if (updatedOrder?.paymentStatus !== "paid") {
      return NextResponse.json({ error: "The order is no longer awaiting payment." }, { status: 409 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Could not process an ODYN SSLCommerz IPN.", error);
    return NextResponse.json({ error: "Payment notification could not be processed." }, { status: 500 });
  }
}
