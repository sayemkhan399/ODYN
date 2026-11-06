import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-access";
import {
  deletePromoCode,
  PromoCodeError,
  updatePromoCode,
} from "@/lib/promo-codes";

export async function PATCH(request, context) {
  try {
    const access = await requireAdmin(request);
    if (access.error) return access.error;
    const { id } = await context.params;
    const promoCode = await updatePromoCode(id, await request.json());
    if (!promoCode) return NextResponse.json({ error: "Promo code not found." }, { status: 404 });
    return NextResponse.json({ promoCode });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Valid JSON is required." }, { status: 400 });
    }
    if (error instanceof PromoCodeError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error?.code === 11000) {
      return NextResponse.json({ error: "That promo code already exists." }, { status: 409 });
    }
    console.error("Could not update an ODYN promo code.", error);
    return NextResponse.json({ error: "The promo code could not be updated." }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const access = await requireAdmin(request);
    if (access.error) return access.error;
    const { id } = await context.params;
    if (!(await deletePromoCode(id))) {
      return NextResponse.json({ error: "Promo code not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Could not delete an ODYN promo code.", error);
    return NextResponse.json({ error: "The promo code could not be deleted." }, { status: 500 });
  }
}
