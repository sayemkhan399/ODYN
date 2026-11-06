"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import useCatalogLooks from "@/hooks/useCatalogLooks";
import useCatalogProducts from "@/hooks/useCatalogProducts";

export default function LookDetails({ lookId }) {
  const { looks, loading: looksLoading, error: looksError } = useCatalogLooks();
  const { products, loading: productsLoading, error: productsError } = useCatalogProducts();
  const loading = looksLoading || productsLoading;
  const error = looksError || productsError;
  const look = looks.find((item) => item.id === lookId);
  const productsById = new Map(products.map((product) => [product.id, product]));
  const lookProducts = (look?.products ?? [])
    .map((lookProduct) => productsById.get(lookProduct.id))
    .filter(Boolean);

  return (
    <main className="h-[calc(100dvh-5rem)] overflow-hidden bg-[#fbfaf7]">
      <div className="mx-auto flex h-full max-w-[1440px] flex-col px-3 py-3 sm:px-7 sm:py-4 lg:px-12">
        <Link
          href="/#try-the-look"
          className="mb-2 inline-flex shrink-0 items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#555d50] transition-colors hover:text-[#202720] sm:mb-3"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to Try the Look
        </Link>

        {loading ? (
          <p className="flex min-h-0 flex-1 items-center justify-center text-sm text-[#74776d]">Loading this look…</p>
        ) : error ? (
          <p role="alert" className="flex min-h-0 flex-1 items-center justify-center text-sm text-rose-700">{error}</p>
        ) : !look ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
            <h1 className="font-serif text-3xl text-[#202720]">This look is unavailable.</h1>
            <p className="mt-3 text-sm text-[#74776d]">It may have been removed or is no longer active.</p>
          </div>
        ) : (
          <section className="grid min-h-0 flex-1 grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] gap-3 sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] sm:gap-6">
            <div className="flex min-h-0 min-w-0 flex-col">
              <div className="mb-2 shrink-0 sm:mb-3">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#7b806f] sm:text-[10px]">
                  {look.gender} · Styled look
                </p>
                <h1 className="mt-1 break-words font-serif text-lg leading-tight tracking-tight text-[#202720] sm:text-2xl lg:text-3xl">
                  {look.name}
                </h1>
              </div>
              <div className="relative min-h-0 flex-1 bg-[#eeece5]">
                <Image
                  src={look.image}
                  alt={look.name}
                  fill
                  unoptimized
                  sizes="(max-width: 768px) 40vw, 35vw"
                  className="object-contain"
                  priority
                />
              </div>
            </div>
            <div className="flex min-h-0 min-w-0 flex-col">
              <div className="mb-2 shrink-0 border-b border-[#e8e6df] pb-2 sm:mb-3 sm:pb-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7b806f]">
                  The edit
                </p>
                <h2 className="mt-1 text-lg font-medium tracking-[-0.05em] text-[#202720] sm:text-2xl">
                  Products in this look
                </h2>
                <p className="mt-1 text-[10px] text-[#85867d]">
                  {lookProducts.length} {lookProducts.length === 1 ? "piece" : "pieces"}
                </p>
              </div>
              {lookProducts.length ? (
                <div className="flex min-h-0 flex-1 flex-col items-stretch gap-2 overflow-y-auto p-1 sm:gap-3 sm:p-2">
                  {lookProducts.map((product) => (
                    <ProductCard key={product.id} product={product} imageOnly />
                  ))}
                </div>
              ) : (
                <p className="flex min-h-0 flex-1 items-center justify-center text-center text-sm text-[#74776d]">
                  The products in this look are no longer available.
                </p>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
