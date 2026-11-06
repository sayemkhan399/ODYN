"use client";

import Link from "next/link";
import Image from "next/image";

const collectionLinks = [
  { label: "Men's Apparel", href: "/products?department=men" },
  { label: "Women's Line", href: "/products?department=women" },
  { label: "Kids Essentials", href: "/products?department=kids" },
  { label: "Limited Footwear", href: "/products?department=all&section=Footwear" },
  { label: "Lookbook 2026", href: "/#try-the-look" },
];

const serviceLinks = [
  { label: "Order Tracking", href: "/track-order" },
  { label: "Worldwide Shipping", href: "/information/shipping" },
  { label: "Returns & Exchanges", href: "/information/returns" },
  { label: "Size Guide", href: "/size-guide" },
  { label: "Contact Concierge", href: "/information/contact" },
];

export default function Footer() {
  return (
    <footer className="w-full border-t border-slate-800 bg-slate-950 pt-16 pb-12 text-slate-100">
      <div className="mx-auto mb-16 grid max-w-7xl grid-cols-1 gap-12 px-6 md:grid-cols-4 lg:px-12">
        <div className="space-y-4 md:col-span-1">
          <Link
            className="inline-flex items-center"
            href="/"
            aria-label="ODYN home"
          >
            <Image
              src="/odyn-logo.png"
              alt="ODYN"
              width={2172}
              height={724}
              className="h-auto w-32 object-contain brightness-0 invert transition-opacity hover:opacity-80 sm:w-36"
            />
          </Link>
          <p className="text-sm leading-relaxed font-light text-slate-400">
            Architectural luxury streetwear designed for modern nomads. Engineered with premium materials and minimal silhouettes.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <span className="h-2 w-2 animate-ping rounded-full bg-emerald-500" />
            <span className="font-mono text-xs tracking-widest text-slate-400 uppercase">
              DROP 004 IS LIVE
            </span>
          </div>
        </div>

        <nav aria-label="Collections">
          <h3 className="mb-4 font-mono text-xs font-bold tracking-widest text-amber-500 uppercase">
            Collections
          </h3>
          <ul className="space-y-2.5 text-sm font-medium text-slate-300">
            {collectionLinks.map(({ label, href }) => (
              <li key={label}>
                <Link className="transition-colors hover:text-amber-500" href={href}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Client services">
          <h3 className="mb-4 font-mono text-xs font-bold tracking-widest text-amber-500 uppercase">
            Client Services
          </h3>
          <ul className="space-y-2.5 text-sm font-medium text-slate-300">
            {serviceLinks.map(({ label, href }) => (
              <li key={label}>
                <Link className="transition-colors hover:text-amber-500" href={href}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h3 className="mb-4 font-mono text-xs font-bold tracking-widest text-amber-500 uppercase">
            Exclusive Access
          </h3>
          <p className="mb-4 text-xs text-slate-400">
            Subscribe to receive private drop alerts and early access codes.
          </p>
          <p className="text-xs leading-5 text-slate-500">
            Newsletter subscriptions are not available yet.
          </p>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 border-t border-slate-900 px-6 pt-8 font-mono text-xs text-slate-500 lg:flex-row lg:px-12">
        <p>© 2026 ODYN APPAREL CO. ALL RIGHTS RESERVED.</p>
        <nav aria-label="Legal" className="flex gap-6">
          <Link className="transition-colors hover:text-slate-300" href="/information/privacy">
            PRIVACY POLICY
          </Link>
          <Link className="transition-colors hover:text-slate-300" href="/information/terms">
            TERMS OF SERVICE
          </Link>
        </nav>
        <div className="flex flex-col items-center gap-2 lg:flex-row lg:gap-3">
          <span className="whitespace-nowrap">WE ACCEPT</span>
          <Image
            src="/ssl.webp"
            alt="Accepted payment methods"
            width={1920}
            height={310}
            className="h-14 w-auto rounded bg-transparent px-2 py-1"
          />
        </div>
      </div>
    </footer>
  );
}
