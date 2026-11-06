import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const PAGE_SIZE = 25;

async function getAdminSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { error: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }
  if (session.user.role !== "admin") {
    return { error: NextResponse.json({ error: "Admin access required." }, { status: 403 }) };
  }
  return { session };
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : "The request could not be completed.";
}

export async function GET(request) {
  try {
    const access = await getAdminSession();
    if (access.error) return access.error;

    const searchParams = new URL(request.url).searchParams;
    const rawOffset = Number(searchParams.get("offset") ?? 0);
    const offset =
      Number.isSafeInteger(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
    const searchValue = searchParams.get("search")?.trim();
    const searchField = searchParams.get("field") === "name" ? "name" : "email";
    const result = await auth.api.listUsers({
      headers: await headers(),
      query: {
        filterField: "role",
        filterValue: "customer",
        filterOperator: "eq",
        limit: PAGE_SIZE,
        offset,
        sortBy: "createdAt",
        sortDirection: "desc",
        ...(searchValue ? { searchValue, searchField, searchOperator: "contains" } : {}),
      },
    });

    return NextResponse.json({
      users: result.users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        banned: Boolean(user.banned),
        banReason: user.banReason ?? null,
        banExpires: user.banExpires ?? null,
      })),
      total: result.total,
      offset,
      limit: PAGE_SIZE,
    });
  } catch (error) {
    console.error("Could not load ODYN customer accounts.", error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}

export async function PATCH(request) {
  try {
    const expectedOrigin = new URL(request.url).origin;
    if (request.headers.get("origin") !== expectedOrigin) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }

    const access = await getAdminSession();
    if (access.error) return access.error;

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Valid JSON is required." }, { status: 400 });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "A customer status update is required." }, { status: 400 });
    }
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";
    const status = body.status;
    if (!userId || !["active", "paused", "blocked"].includes(status)) {
      return NextResponse.json(
        { error: "A customer id and valid account status are required." },
        { status: 400 },
      );
    }

    const targetUser = await auth.api.getUser({
      headers: await headers(),
      query: { id: userId },
    });
    if (!targetUser || targetUser.role !== "customer") {
      return NextResponse.json(
        { error: "Customer account was not found." },
        { status: 404 },
      );
    }

    const user =
      status === "active"
        ? (
            await auth.api.unbanUser({
              headers: await headers(),
              body: { userId },
            })
          ).user
        : (
            await auth.api.banUser({
              headers: await headers(),
              body: {
                userId,
                banReason:
                  status === "paused"
                    ? "ODYN_ACCOUNT_PAUSED"
                    : "ODYN_ACCOUNT_BLOCKED",
              },
            })
          ).user;

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        banned: Boolean(user.banned),
        banReason: user.banReason ?? null,
        banExpires: user.banExpires ?? null,
      },
    });
  } catch (error) {
    console.error("Could not update ODYN customer account status.", error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}
