import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-access";
import {
  deletePoster,
  PosterValidationError,
  updatePoster,
} from "@/lib/posters";

export async function PATCH(request, context) {
  try {
    const access = await requireAdmin(request);
    if (access.error) return access.error;
    const { id } = await context.params;
    const poster = await updatePoster(id, await request.json());
    if (!poster) return NextResponse.json({ error: "Poster not found." }, { status: 404 });
    return NextResponse.json({ poster });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Valid JSON is required." }, { status: 400 });
    }
    if (error instanceof PosterValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Could not update an ODYN poster.", error);
    return NextResponse.json({ error: "The poster could not be updated." }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const access = await requireAdmin(request);
    if (access.error) return access.error;
    const { id } = await context.params;
    if (!(await deletePoster(id))) {
      return NextResponse.json({ error: "Poster not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Could not delete an ODYN poster.", error);
    return NextResponse.json({ error: "The poster could not be deleted." }, { status: 500 });
  }
}
