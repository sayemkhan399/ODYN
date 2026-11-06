import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-access";
import {
  getStoreSettings,
  saveStoreSettings,
  StoreSettingsValidationError,
} from "@/lib/store-settings";
import { isSslcommerzConfigured } from "@/lib/sslcommerz";

export async function GET() {
  try {
    const access = await requireAdmin(null, { checkOrigin: false });
    if (access.error) return access.error;
    return NextResponse.json({
      settings: await getStoreSettings(),
      payments: {
        cashOnDelivery: true,
        sslcommerzConfigured: isSslcommerzConfigured(),
        sslcommerzMode: process.env.SSLCOMMERZ_IS_LIVE === "true" ? "live" : "sandbox",
      },
    });
  } catch (error) {
    console.error("Could not load ODYN admin settings.", error);
    return NextResponse.json({ error: "Store settings could not be loaded." }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const access = await requireAdmin(request);
    if (access.error) return access.error;
    const settings = await saveStoreSettings(await request.json());
    return NextResponse.json({ settings });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Valid JSON is required." }, { status: 400 });
    }
    if (error instanceof StoreSettingsValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Could not save ODYN admin settings.", error);
    return NextResponse.json({ error: "Store settings could not be saved." }, { status: 500 });
  }
}
