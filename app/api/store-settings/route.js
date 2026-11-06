import { NextResponse } from "next/server";
import { getStoreSettings } from "@/lib/store-settings";
import { isSslcommerzConfigured } from "@/lib/sslcommerz";

export async function GET() {
  try {
    return NextResponse.json(
      {
        settings: await getStoreSettings(),
        payments: {
          cashOnDelivery: true,
          sslcommerzConfigured: isSslcommerzConfigured(),
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Could not load ODYN storefront settings.", error);
    return NextResponse.json({ error: "Store settings could not be loaded." }, { status: 500 });
  }
}
