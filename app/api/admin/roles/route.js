import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin-access";

const PAGE_LIMIT = 100;

export async function GET() {
  try {
    const access = await requireAdmin(null, { checkOrigin: false });
    if (access.error) return access.error;
    const requestHeaders = await headers();
    const [admins, customers] = await Promise.all(
      ["admin", "customer"].map((role) =>
        auth.api.listUsers({
          headers: requestHeaders,
          query: {
            filterField: "role",
            filterValue: role,
            filterOperator: "eq",
            limit: PAGE_LIMIT,
            offset: 0,
            sortBy: "createdAt",
            sortDirection: "desc",
          },
        }),
      ),
    );
    const safeUsers = (result) => result.users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    }));
    return NextResponse.json({
      admins: safeUsers(admins),
      customers: safeUsers(customers),
      adminTotal: admins.total,
      customerTotal: customers.total,
      limit: PAGE_LIMIT,
    });
  } catch (error) {
    console.error("Could not load ODYN admin role management.", error);
    return NextResponse.json({ error: "Role management data could not be loaded." }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const access = await requireAdmin(request);
    if (access.error) return access.error;
    const body = await request.json();
    const userId = typeof body?.userId === "string" ? body.userId.trim() : "";
    const role = body?.role;
    if (!userId || !["admin", "customer"].includes(role)) {
      return NextResponse.json({ error: "Choose an account and a valid role." }, { status: 400 });
    }
    if (userId === access.session.user.id) {
      return NextResponse.json({ error: "You cannot change your own admin role." }, { status: 400 });
    }

    const requestHeaders = await headers();
    const target = await auth.api.getUser({ headers: requestHeaders, query: { id: userId } });
    if (!target || !["admin", "customer"].includes(target.role)) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }
    if (target.role === "admin" && role === "customer") {
      const admins = await auth.api.listUsers({
        headers: requestHeaders,
        query: {
          filterField: "role",
          filterValue: "admin",
          filterOperator: "eq",
          limit: 2,
          offset: 0,
        },
      });
      if (admins.total <= 1) {
        return NextResponse.json({ error: "At least one administrator must remain." }, { status: 409 });
      }
    }
    const updated = await auth.api.setRole({
      headers: requestHeaders,
      body: { userId, role },
    });
    return NextResponse.json({
      user: {
        id: updated.user.id,
        name: updated.user.name,
        email: updated.user.email,
        role: updated.user.role,
      },
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Valid JSON is required." }, { status: 400 });
    }
    console.error("Could not change an ODYN account role.", error);
    return NextResponse.json({ error: "The account role could not be changed." }, { status: 500 });
  }
}
