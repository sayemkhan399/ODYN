import { Readable } from "node:stream";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getLookImage } from "@/lib/looks";

export async function GET(_request, context) {
  try {
    const { id } = await context.params;
    const image = await getLookImage(id);
    if (!image) {
      return NextResponse.json({ error: "Avatar image not found." }, { status: 404 });
    }
    if (!image.isActive) {
      const session = await auth.api.getSession({ headers: await headers() });
      if (!session) {
        return NextResponse.json({ error: "Authentication required." }, { status: 401 });
      }
      if (session.user.role !== "admin") {
        return NextResponse.json({ error: "Admin access required." }, { status: 403 });
      }
    }
    return new Response(Readable.toWeb(image.stream), {
      headers: {
        "Content-Type": image.contentType,
        "Cache-Control": "public, max-age=60",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Could not load an ODYN avatar image.", error);
    return NextResponse.json({ error: "The avatar image could not be loaded." }, { status: 500 });
  }
}
