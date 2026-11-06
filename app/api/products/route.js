import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  createProduct,
  listProducts,
  ProductValidationError,
} from "@/lib/products";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  return null;
}

export async function GET(request) {
  try {
    const includeInactive = new URL(request.url).searchParams.get("admin") === "1";
    if (includeInactive) {
      const error = await requireAdmin();
      if (error) return error;
    }

    const products = await listProducts({ includeInactive });
    return NextResponse.json(
      { products },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Could not load the ODYN product catalog.", error);
    return NextResponse.json(
      { error: "The product catalog could not be loaded." },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    if (request.headers.get("origin") !== new URL(request.url).origin) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }
    const authError = await requireAdmin();
    if (authError) return authError;

    const input = await request.json();
    const product = await createProduct(input);
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Valid JSON is required." }, { status: 400 });
    }
    if (error instanceof ProductValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Could not save an ODYN product.", error);
    return NextResponse.json({ error: "The product could not be saved." }, { status: 500 });
  }
}
