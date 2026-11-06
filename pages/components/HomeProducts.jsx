"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { useCart } from "@/context/CartContext";
import useCatalogProducts from "@/hooks/useCatalogProducts";

export default function HomeProducts() {
  const { activeCategory } = useCart();
  const { products: catalogProducts, loading, error } = useCatalogProducts();
  const products = catalogProducts.filter(
    (product) =>
      activeCategory === "all" ||
      product.collection.toLowerCase() === activeCategory ||
      (product.collection === "Unisex" &&
        ["men", "women"].includes(activeCategory)),
  );
  const categoryLabel =
    activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1);

  return (
    <section
      aria-labelledby="home-products-heading"
      className="bg-slate-50 py-16 sm:py-24"
      id="catalog"
    >
      <div className="mx-auto max-w-[1440px] px-4 sm:px-7 lg:px-12">
        <div className="mb-8 flex items-end justify-between gap-4 sm:mb-10">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.19em] text-[#7b806f]">
              Considered from the start
            </p>
            <h2
              className="text-3xl font-medium tracking-[-0.06em] text-[#202720] sm:text-4xl"
              id="home-products-heading"
            >
              The collection.
            </h2>
            <p className="mt-2 text-xs text-[#74776d] sm:text-sm">
              A considered edit of {categoryLabel.toLowerCase()} pieces made
              for every day.
            </p>
          </div>
          <span className="hidden pb-1 text-[10px] uppercase tracking-[0.15em] text-[#74776d] sm:block">
            {products.length} pieces · Collection 004
          </span>
        </div>

        {loading ? (
          <p className="py-16 text-center text-sm text-[#74776d]">Loading products…</p>
        ) : error ? (
          <p role="alert" className="py-16 text-center text-sm text-rose-700">{error}</p>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-10 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="flex min-h-56 flex-col items-center justify-center px-5 text-center">
            <p className="font-serif text-2xl text-[#202720]">
              No {activeCategory} products are available yet.
            </p>
            <p className="mt-2 text-sm text-[#74776d]">
              Products added to this collection will appear here.
            </p>
          </div>
        )}

        <div className="mt-10 flex justify-center border-t border-slate-200 pt-8 sm:mt-12 sm:pt-10">
          <Link
            className="inline-flex min-h-12 items-center gap-8 border border-[#202720]/30 px-6 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#202720] transition-colors hover:bg-[#202720] hover:text-white"
            href="/products"
          >
            Show all products
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
