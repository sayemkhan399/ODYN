import "server-only";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function requireAdmin(request, { checkOrigin = true } = {}) {
  if (
    checkOrigin &&
    request &&
    request.headers.get("origin") !== new URL(request.url).origin
  ) {
    return {
      error: NextResponse.json({ error: "Invalid request origin." }, { status: 403 }),
    };
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return {
      error: NextResponse.json({ error: "Authentication required." }, { status: 401 }),
    };
  }
  if (session.user.role !== "admin") {
    return {
      error: NextResponse.json({ error: "Admin access required." }, { status: 403 }),
    };
  }

  return { session };
}

export async function requireCustomer(request, { checkOrigin = false } = {}) {
  if (
    checkOrigin &&
    request &&
    request.headers.get("origin") !== new URL(request.url).origin
  ) {
    return {
      error: NextResponse.json({ error: "Invalid request origin." }, { status: 403 }),
    };
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return {
      error: NextResponse.json({ error: "Authentication required." }, { status: 401 }),
    };
  }
  if (session.user.role !== "customer") {
    return {
      error: NextResponse.json({ error: "Customer access required." }, { status: 403 }),
    };
  }

  return { session };
}
