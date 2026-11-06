import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

const links = [
  ["Profile", "/account"],
  ["My orders", "/account/orders"],
  ["Wishlist", "/account/wishlist"],
  ["Track order", "/account/track"],
  ["Coupons", "/account/coupons"],
  ["Settings", "/account/settings"],
];

export const instant = false;

export default async function AccountLayout({ children }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login?next=account");
  if (session.user.role !== "customer") redirect("/admin");

  return (
    <main className="min-h-[70vh] bg-[#fbfaf7]">
      <div className="mx-auto max-w-[1180px] px-4 py-10 sm:px-7 sm:py-14 lg:px-10">
        <p className="text-[9px] font-semibold uppercase tracking-[.18em] text-[#858a70]">Your ODYN account</p>
        <div className="mt-2 border-b border-[#e8e6df] pb-6">
          <h1 className="font-serif text-4xl tracking-[-.05em] text-[#252b24]">Account</h1>
        </div>
        <div className="mt-7 grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
          <nav aria-label="Account navigation" className="flex gap-2 overflow-x-auto lg:block lg:space-y-1">
            {links.map(([label, href]) => (
              <Link key={href} className="block shrink-0 rounded px-3 py-2.5 text-xs text-[#555b50] transition hover:bg-[#efeee8] hover:text-[#252b24]" href={href}>
                {label}
              </Link>
            ))}
          </nav>
          <section className="min-w-0">{children}</section>
        </div>
      </div>
    </main>
  );
}
