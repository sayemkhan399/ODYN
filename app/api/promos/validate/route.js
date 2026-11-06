import { NextResponse } from "next/server";
import { findPromoCode } from "@/lib/promo-codes";

export async function POST(request) {
  try {
    const body = await request.json();
    const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
    const eligibleSubtotal = Number(body?.eligibleSubtotal);
    if (!code || !Number.isSafeInteger(eligibleSubtotal) || eligibleSubtotal < 1) {
      return NextResponse.json(
        { error: "Enter a promo code and have eligible full-price products in your bag." },
        { status: 400 },
      );
    }

    const promo = await findPromoCode(code);
    if (
      !promo ||
      !promo.active ||
      (promo.expiresAt && promo.expiresAt < new Date()) ||
      (promo.usageLimit != null && promo.uses >= promo.usageLimit)
    ) {
      return NextResponse.json(
        { error: "This promo code is invalid, expired, paused, or fully used." },
        { status: 400 },
      );
    }

    const discount = Math.min(
      eligibleSubtotal,
      promo.discountType === "percent"
        ? Math.floor((eligibleSubtotal * promo.value) / 100)
        : promo.value,
    );
    if (!discount) {
      return NextResponse.json(
        { error: "This promo code does not apply to the current items." },
        { status: 400 },
      );
    }

    return NextResponse.json({
      promo: {
        code: promo.code,
        discountType: promo.discountType,
        value: promo.value,
        discount,
      },
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Valid JSON is required." }, { status: 400 });
    }
    console.error("Could not validate an ODYN promo code.", error);
    return NextResponse.json({ error: "The promo code could not be validated." }, { status: 500 });
  }
}
