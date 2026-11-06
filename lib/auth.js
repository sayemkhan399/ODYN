import "server-only";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { admin } from "better-auth/plugins";
import { mongoClient, mongoDatabase } from "@/lib/mongodb";

const secret = process.env.BETTER_AUTH_SECRET;
const baseURL = process.env.BETTER_AUTH_URL;

if (!secret || secret.length < 32) {
  throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters.");
}

if (!baseURL || !URL.canParse(baseURL)) {
  throw new Error("BETTER_AUTH_URL must be an absolute URL.");
}

const adminEmails = new Set(
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

export const auth = betterAuth({
  appName: "ODYN",
  baseURL,
  secret,
  database: mongodbAdapter(mongoDatabase, { client: mongoClient }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
  },
  plugins: [
    admin({
      defaultRole: "customer",
      adminRoles: ["admin"],
      bannedUserMessage:
        "Your ODYN account is paused or blocked. Contact support if you need help.",
    }),
  ],
  databaseHooks: {
    user: {
      create: {
        before: async (user) => ({
          data: {
            ...user,
            role: adminEmails.has(user.email.trim().toLowerCase())
              ? "admin"
              : "customer",
          },
        }),
      },
    },
  },
});
