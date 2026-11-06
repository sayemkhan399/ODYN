import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-access";
import {
  createPromoCode,
  listPromoCodes,
  PromoCodeError,
} from "@/lib/promo-codes";

export async function GET(request) {
  try {
    const includeInactive = new URL(request.url).searchParams.get("admin") === "1";
    if (includeInactive) {
      const access = await requireAdmin(null, { checkOrigin: false });
      if (access.error) return access.error;
    }
    const codes = await listPromoCodes({ includeInactive });
    const promoCodes = includeInactive
      ? codes
      : codes.map(({ code, discountType, value, expiresAt }) => ({
          code,
          discountType,
          value,
          expiresAt,
        }));
    return NextResponse.json(
      { promoCodes },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Could not load ODYN promo codes.", error);
    return NextResponse.json({ error: "Promo codes could not be loaded." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const access = await requireAdmin(request);
    if (access.error) return access.error;
    const promoCode = await createPromoCode(await request.json());
    return NextResponse.json({ promoCode }, { status: 201 });
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
    console.error("Could not create an ODYN promo code.", error);
    return NextResponse.json({ error: "The promo code could not be saved." }, { status: 500 });
  }
}
