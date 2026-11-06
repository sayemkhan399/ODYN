import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-access";
import {
  createPoster,
  listPosters,
  PosterValidationError,
} from "@/lib/posters";

export async function GET(request) {
  try {
    const params = new URL(request.url).searchParams;
    const includeInactive = params.get("admin") === "1";
    if (includeInactive) {
      const access = await requireAdmin(null, { checkOrigin: false });
      if (access.error) return access.error;
    }
    const results = await listPosters({
      includeInactive,
      placement: params.get("placement") ?? undefined,
    });
    return NextResponse.json(
      { posters: results },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Could not load ODYN posters.", error);
    return NextResponse.json({ error: "Posters could not be loaded." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const access = await requireAdmin(request);
    if (access.error) return access.error;
    const poster = await createPoster(await request.json());
    return NextResponse.json({ poster }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Valid JSON is required." }, { status: 400 });
    }
    if (error instanceof PosterValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Could not save an ODYN poster.", error);
    return NextResponse.json({ error: "The poster could not be saved." }, { status: 500 });
  }
}
