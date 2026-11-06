import Link from "next/link";
import { notFound } from "next/navigation";

const informationPages = {
  shipping: {
    title: "Shipping information",
    description:
      "ODYN currently accepts delivery addresses in Bangladesh only. Checkout calculates delivery at ৳70 for Dhaka and ৳120 for other cities. International shipping and delivery estimates are not currently published.",
    link: { href: "/track-order", label: "Track an order" },
  },
  returns: {
    title: "Returns & exchanges",
    description:
      "ODYN has not published return or exchange eligibility, time limits, or instructions yet. Please confirm the applicable terms with ODYN before placing an order.",
  },
  "size-guide": {
    title: "Size guide",
    description:
      "Use the dedicated ODYN fit guide to compare your measurements with product-specific size charts and available stock.",
    link: { href: "/size-guide", label: "Find my size" },
  },
  contact: {
    title: "Contact concierge",
    description:
      "A direct contact channel is not configured on this storefront yet. For an existing order, use the order reference and checkout email to view its current status.",
    link: { href: "/track-order", label: "Track an order" },
  },
  privacy: {
    title: "Privacy policy",
    description:
      "ODYN has not published a privacy policy for this storefront yet. The policy details that explain how customer information is handled will be added here when available.",
  },
  terms: {
    title: "Terms of service",
    description:
      "ODYN has not published terms of service for this storefront yet. Please check back for the terms that govern purchases and use of the store.",
  },
};

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = informationPages[slug];
  return page ? { title: `${page.title} | ODYN Studio` } : {};
}

export default async function InformationPage({ params }) {
  const { slug } = await params;
  const page = informationPages[slug];
  if (!page) notFound();

  return (
    <main className="min-h-[65vh] flex-1 bg-[#fbfaf7] px-4 py-10 sm:px-7 sm:py-14 lg:px-10">
      <article className="mx-auto max-w-[780px]">
        <p className="text-[9px] font-semibold uppercase tracking-[.18em] text-[#858a70]">
          ODYN Studio · Information
        </p>
        <h1 className="mt-2 border-b border-[#e8e6df] pb-6 font-serif text-4xl tracking-[-.05em] text-[#252b24]">
          {page.title}
        </h1>
        <p className="mt-7 text-sm leading-7 text-[#555b50]">{page.description}</p>
        {page.link && (
          <Link
            className="mt-8 inline-flex min-h-11 items-center bg-[#293128] px-5 text-[10px] font-semibold tracking-wider text-white uppercase transition-colors hover:bg-[#414b3d]"
            href={page.link.href}
          >
            {page.link.label}
          </Link>
        )}
      </article>
    </main>
  );
}
