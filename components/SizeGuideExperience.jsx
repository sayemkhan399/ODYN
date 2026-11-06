"use client";

import Link from "next/link";
import SizeFinder from "@/components/SizeFinder";
import useCatalogProducts from "@/hooks/useCatalogProducts";

export default function SizeGuideExperience() {
  const { products, loading, error } = useCatalogProducts();

  return (
    <main className="min-h-[65vh] bg-[#fbfaf7] px-4 py-10 sm:px-7 sm:py-14 lg:px-10">
      <div className="mx-auto max-w-[1180px]">
        <nav
          aria-label="Breadcrumb"
          className="mb-5 text-[9px] uppercase tracking-[0.14em] text-[#85867d]"
        >
          <Link className="transition-colors hover:text-[#252b24]" href="/">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span className="text-[#394239]">Size guide</span>
        </nav>

        <header className="border-b border-[#e8e6df] pb-7 sm:pb-9">
          <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.19em] text-[#858a70]">
            ODYN fit guide
          </p>
          <h1 className="font-serif text-4xl tracking-[-0.055em] text-[#252b24] sm:text-5xl">
            Find your size
          </h1>
          <p className="mt-3 max-w-lg text-xs leading-6 text-[#74776d] sm:text-sm">
            Select Men, Women, or Kids and clothing or footwear. Enter
            measurements in centimeters to compare with available products.
          </p>
        </header>

        {loading ? (
          <p className="py-16 text-center text-sm text-[#74776d]">Loading products…</p>
        ) : error ? (
          <p role="alert" className="py-16 text-center text-sm text-rose-700">{error}</p>
        ) : products.length > 0 ? (
          <SizeFinder products={products} />
        ) : (
          <p className="py-16 text-center text-sm text-[#74776d]">
            No products are available for size recommendations yet.
          </p>
        )}
      </div>
    </main>
  );
}
