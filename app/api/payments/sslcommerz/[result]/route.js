import { NextResponse } from "next/server";
import { getOrderByTransactionId, updatePaymentStatus } from "@/lib/orders";
import { validateSslcommerzPayment } from "@/lib/sslcommerz";

function redirectToOrder(request, orderId, result) {
  const url = new URL(
    result === "success" ? "/track-order" : "/checkout/complete",
    request.url,
  );
  if (orderId) url.searchParams.set("order", orderId);
  url.searchParams.set("result", result);
  return NextResponse.redirect(url, 303);
}

async function handleCallback(request, context) {
  const { result } = await context.params;
  if (!["success", "fail", "cancel"].includes(result)) {
    return NextResponse.json({ error: "Payment callback not found." }, { status: 404 });
  }
  const formData = await request.formData();
  const transactionId = formData.get("tran_id");
  if (typeof transactionId !== "string" || transactionId.length > 50) {
    return redirectToOrder(request, null, "invalid");
  }
  const order = await getOrderByTransactionId(transactionId);
  if (!order) return redirectToOrder(request, null, "not-found");

  if (result === "success") {
    try {
      const payment = await validateSslcommerzPayment(formData);
      const amount = Number(payment.amount);
      const isValid =
        ["VALID", "VALIDATED"].includes(payment.status) &&
        payment.tran_id === order.transactionId &&
        payment.currency === "BDT" &&
        Number.isFinite(amount) &&
        Math.round(amount * 100) === Math.round(order.total * 100);
      if (!isValid) {
        await updatePaymentStatus(order.transactionId, "failed");
        return redirectToOrder(request, order.id, "failed");
      }
      const updatedOrder = await updatePaymentStatus(order.transactionId, "paid");
      if (updatedOrder?.paymentStatus !== "paid") {
        return redirectToOrder(request, order.id, "failed");
      }
      return redirectToOrder(request, order.id, "success");
    } catch (error) {
      console.error("Could not validate an ODYN SSLCommerz return.", error);
      return redirectToOrder(request, order.id, "pending");
    }
  }

  try {
    await updatePaymentStatus(
      transactionId,
      result === "cancel" ? "cancelled" : "failed",
    );
  } catch (error) {
    console.error("Could not update an ODYN failed payment.", error);
    return redirectToOrder(request, order.id, "pending");
  }
  return redirectToOrder(request, order.id, result === "cancel" ? "cancelled" : "failed");
}

export async function POST(request, context) {
  return handleCallback(request, context);
}

export async function GET(request, context) {
  return handleCallback(request, context);
}
