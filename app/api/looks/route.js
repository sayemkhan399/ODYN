import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  createLook,
  listLooks,
  LookValidationError,
} from "@/lib/looks";

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
    const results = await listLooks({ includeInactive });
    return NextResponse.json(
      { looks: results },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Could not load ODYN Try the Look avatars.", error);
    return NextResponse.json({ error: "Try the Look could not be loaded." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    if (request.headers.get("origin") !== new URL(request.url).origin) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }
    const authError = await requireAdmin();
    if (authError) return authError;
    const look = await createLook(await request.json());
    return NextResponse.json({ look }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Valid JSON is required." }, { status: 400 });
    }
    if (error instanceof LookValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Could not save an ODYN Try the Look avatar.", error);
    return NextResponse.json({ error: "The avatar could not be saved." }, { status: 500 });
  }
}
