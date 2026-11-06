import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  deleteLook,
  LookValidationError,
  updateLook,
} from "@/lib/looks";

async function requireAdmin(request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  return null;
}

export async function PATCH(request, context) {
  try {
    const authError = await requireAdmin(request);
    if (authError) return authError;
    const { id } = await context.params;
    const look = await updateLook(id, await request.json());
    if (!look) return NextResponse.json({ error: "Avatar not found." }, { status: 404 });
    return NextResponse.json({ look });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Valid JSON is required." }, { status: 400 });
    }
    if (error instanceof LookValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Could not update an ODYN avatar.", error);
    return NextResponse.json({ error: "The avatar could not be updated." }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const authError = await requireAdmin(request);
    if (authError) return authError;
    const { id } = await context.params;
    if (!(await deleteLook(id))) {
      return NextResponse.json({ error: "Avatar not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Could not delete an ODYN avatar.", error);
    return NextResponse.json({ error: "The avatar could not be deleted." }, { status: 500 });
  }
}
