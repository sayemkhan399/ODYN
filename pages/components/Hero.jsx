"use client";
import Link from "next/link";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import useCatalogProducts from "@/hooks/useCatalogProducts";
import { useCart } from "@/context/CartContext";
import { formatTaka } from "@/lib/currency";

export default function Hero() {
  const { setActiveCategory } = useCart();
  const { products, loading } = useCatalogProducts();
  const [heroPoster, setHeroPoster] = useState(null);
  const featuredProduct = products[0];
  const discountPercent = Number(featuredProduct?.discountPercent) || 0;
  const sellingPrice = featuredProduct
    ? Math.round(featuredProduct.price * (1 - discountPercent / 100))
    : 0;

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/posters?placement=Hero", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Hero poster could not be loaded.");
        setHeroPoster(result.posters?.[0] ?? null);
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Could not load the ODYN hero poster.", error);
        }
      });
    return () => controller.abort();
  }, []);

  return (
    <section className="relative w-full bg-slate-50  overflow-hidden py-16 lg:py-24 px-4 sm:px-8">
      {/* Background Subtle Lighting & Accent Glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-slate-300/20 rounded-full blur-2xl pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#CBD5E1_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* LEFT COLUMN: Hero Copy & CTA */}
        <div className="lg:col-span-7 flex flex-col items-start text-left">
          
          {/* Release Pill Badge */}
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm mb-6">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-mono text-[11px] tracking-widest text-slate-800 uppercase font-bold">
              ODYN COLLECTION
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 tracking-tighter uppercase leading-[0.95] mb-6">
            ARCHITECTURAL <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-700 to-amber-600">
              STREETWEAR
            </span>
          </h1>

          {/* Description */}
          <p className="max-w-xl text-slate-600 text-base sm:text-lg mb-8 font-normal leading-relaxed">
            Explore considered everyday essentials, thoughtfully selected for comfort, fit, and everyday wear.
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
            <Link
              href="#catalog"
              onClick={() => {
                setActiveCategory('men');
                const dropSection = document.getElementById('catalog');
                if (dropSection) dropSection.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-8 py-4 bg-slate-900 hover:bg-amber-600 text-white font-mono text-xs font-bold uppercase tracking-widest transition-colors duration-200 shadow-md text-center"
            >
              Shop Collection
            </Link>

            <Link
              href="/products"
              className="px-8 py-4 bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 font-mono text-xs font-bold uppercase tracking-widest transition-colors duration-200 shadow-sm text-center"
            >
              Explore Products
            </Link>
          </div>

          {/* Quick Stats Bar */}
          <div className="grid grid-cols-3 gap-6 pt-10 mt-10 border-t border-slate-200/80 w-full max-w-lg">
            <div>
              <span className="block font-mono text-xl sm:text-2xl font-black text-slate-900">{loading ? "—" : products.length}</span>
              <span className="font-mono text-[10px] text-slate-500 tracking-wider uppercase">Available products</span>
            </div>
            <div>
              <span className="block font-mono text-xl sm:text-2xl font-black text-slate-900">{new Set(products.map((product) => product.collection)).size}</span>
              <span className="font-mono text-[10px] text-slate-500 tracking-wider uppercase">Departments</span>
            </div>
            <div>
              <span className="block font-mono text-xl sm:text-2xl font-black text-slate-900">{products.filter((product) => product.discountPercent > 0).length}</span>
              <span className="font-mono text-[10px] text-slate-500 tracking-wider uppercase">On sale</span>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Featured Hero Look Showcase */}
        <div className="lg:col-span-5 relative w-full">
          <div className="relative aspect-[4/5] w-full bg-slate-200 border border-slate-300 rounded-none overflow-hidden shadow-xl group">
            {/* Image */}
            {heroPoster ? (
              <>
                {heroPoster.link ? (
                  <a href={heroPoster.link} aria-label={heroPoster.title || "View featured promotion"} className="absolute inset-0">
                    <Image src={heroPoster.image} alt={heroPoster.title || "Featured promotion"} fill sizes="(max-width: 1024px) 100vw, 42vw" unoptimized className="object-contain" />
                  </a>
                ) : (
                  <Image src={heroPoster.image} alt={heroPoster.title || "Featured promotion"} fill sizes="(max-width: 1024px) 100vw, 42vw" unoptimized className="object-contain" />
                )}
              </>
            ) : featuredProduct ? (
              <>
                <Image
                  src={featuredProduct.image}
                  alt={featuredProduct.name}
                  fill
                  sizes="(max-width: 1024px) 100vw, 42vw"
                  unoptimized
                  className="object-cover object-center contrast-105 group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md border border-slate-200 p-4 shadow-lg flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-mono text-[10px] text-amber-600 font-bold uppercase tracking-widest block">
                      FEATURED PIECE · {featuredProduct.collection}
                    </span>
                    <span className="block truncate text-xs font-bold text-slate-900 uppercase tracking-tight">
                      {featuredProduct.name}
                    </span>
                  </div>
                  <span className="shrink-0 font-mono text-sm font-bold text-slate-900">
                    {formatTaka(sellingPrice)}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center p-8 text-center text-sm text-slate-500">
                {loading ? "Loading the collection…" : "Products added to the catalog will appear here."}
              </div>
            )}
          </div>
        </div>

      </div>
    </section>
  );
}