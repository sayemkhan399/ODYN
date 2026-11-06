"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpDown,
  ChevronDown,
  SlidersHorizontal,
  X,
} from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { formatTaka } from "@/lib/currency";
import useCatalogProducts from "@/hooks/useCatalogProducts";
import { useCart } from "@/context/CartContext";

export default function AllProducts() {
  const { products, loading, error } = useCatalogProducts();
  const { activeCategory, setActiveCategory } = useCart();
  const router = useRouter();
  const searchParams = useSearchParams();
  const routeDepartment = searchParams.get("department");
  const routeSection = searchParams.get("section");
  const [selectedCollections, setSelectedCollections] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [maxPrice, setMaxPrice] = useState(null);
  const [sortOrder, setSortOrder] = useState("featured");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  useEffect(() => {
    if (["all", "men", "women", "kids"].includes(routeDepartment)) {
      setActiveCategory(routeDepartment);
    }
  }, [products, routeDepartment, routeSection, setActiveCategory]);

  const collections = [...new Set(products.map((product) => product.collection))].sort();
  const sections = [...new Set(products.map((product) => product.taxonomy?.section).filter(Boolean))].sort();
  const departments = [...new Set(products.map((product) => product.taxonomy?.department ?? product.collection))].sort();
  const categories = [...new Set(products.map((product) => product.category))].sort();
  const productPrices = products.map((product) =>
    Math.round(product.price * (1 - (product.discountPercent ?? 0) / 100)),
  );
  const minPrice = productPrices.length ? Math.min(...productPrices) : 0;
  const maxAvailablePrice = productPrices.length ? Math.max(...productPrices) : 0;

  const selectedMaxPrice = maxPrice ?? maxAvailablePrice;

  const filteredProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      const matchesCollection =
        selectedCollections.length === 0 ||
        selectedCollections.includes(product.collection);
      const matchesCategory =
        selectedCategories.length === 0 ||
        selectedCategories.includes(product.category);
      const matchesSection =
        !routeSection ||
        (product.taxonomy?.section ?? "").toLowerCase() === routeSection.toLowerCase();
      const department = product.taxonomy?.department ?? product.collection;
      const matchesDepartment =
        activeCategory === "all" ||
        department.toLowerCase() === activeCategory ||
        (department === "Unisex" && ["men", "women"].includes(activeCategory));

      return (
        matchesCollection &&
        matchesSection &&
        matchesCategory &&
        matchesDepartment &&
        Math.round(product.price * (1 - (product.discountPercent ?? 0) / 100)) <= selectedMaxPrice
      );
    });

    if (sortOrder === "price-low") {
      return filtered.toSorted((a, b) =>
        a.price * (1 - (a.discountPercent ?? 0) / 100) -
        b.price * (1 - (b.discountPercent ?? 0) / 100),
      );
    }

    if (sortOrder === "price-high") {
      return filtered.toSorted((a, b) =>
        b.price * (1 - (b.discountPercent ?? 0) / 100) -
        a.price * (1 - (a.discountPercent ?? 0) / 100),
      );
    }

    return filtered;
  }, [activeCategory, products, routeSection, selectedCategories, selectedCollections, selectedMaxPrice, sortOrder]);

  function toggleValue(value, selectedValues, setSelectedValues) {
    setSelectedValues((currentValues) =>
      currentValues.includes(value)
        ? currentValues.filter((currentValue) => currentValue !== value)
        : [...currentValues, value],
    );
  }

  function clearFilters() {
    setActiveCategory("all");
    setSelectedCollections([]);
    setSelectedCategories([]);
    setMaxPrice(null);
    setSortOrder("featured");
    router.replace("/products", { scroll: false });
  }

  function toggleSection(section) {
    const params = new URLSearchParams(searchParams.toString());
    if (routeSection?.toLowerCase() === section.toLowerCase()) {
      params.delete("section");
    } else {
      params.set("section", section);
    }
    const query = params.toString();
    router.replace(query ? `/products?${query}` : "/products", { scroll: false });
  }

  const activeFilterCount =
    (activeCategory !== "all" ? 1 : 0) +
    selectedCollections.length +
    (sections.some((section) => routeSection?.toLowerCase() === section.toLowerCase()) ? 1 : 0) +
    selectedCategories.length +
    (selectedMaxPrice < maxAvailablePrice ? 1 : 0);

  const filterContent = (
    <>
      <div className="flex items-center justify-between border-b border-[#e8e6df] pb-4">
        <h2 className="text-sm font-semibold text-[#252b24]">Filters</h2>
        {activeFilterCount > 0 && (
          <button
            className="text-[9px] font-medium uppercase tracking-[0.12em] text-[#777e6b] underline underline-offset-4 hover:text-[#252b24]"
            onClick={clearFilters}
            type="button"
          >
            Clear all
          </button>
        )}
      </div>

      <fieldset className="border-b border-[#e8e6df] py-5">
        <legend className="mb-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#394239]">
          Category group
        </legend>
        <div className="space-y-3">
          {sections.map((section) => (
            <label
              className="flex cursor-pointer items-center justify-between gap-3 text-xs text-[#65695f]"
              key={section}
            >
              <span className="flex items-center gap-2.5">
                <input
                  checked={routeSection?.toLowerCase() === section.toLowerCase()}
                  className="h-4 w-4 accent-[#394239]"
                  onChange={() => toggleSection(section)}
                  type="checkbox"
                />
                {section}
              </span>
              <span className="text-[10px] text-[#98998f]">
                {products.filter((product) => product.taxonomy?.section === section).length}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="border-b border-[#e8e6df] py-5">
        <legend className="mb-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#394239]">
          Department
        </legend>
        <select
          aria-label="Filter products by department"
          className="h-10 w-full border border-[#d8d7ce] bg-white px-2 text-xs text-[#394239] outline-none focus:border-[#69725e]"
          onChange={(event) => setActiveCategory(event.target.value)}
          value={activeCategory}
        >
          <option value="all">All departments</option>
          {departments.map((department) => (
            <option key={department} value={department.toLowerCase()}>{department}</option>
          ))}
        </select>
      </fieldset>

      <fieldset className="border-b border-[#e8e6df] py-5">
        <legend className="mb-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#394239]">
          Collection
        </legend>
        <div className="space-y-3">
          {collections.map((collection) => (
            <label
              className="flex cursor-pointer items-center justify-between gap-3 text-xs text-[#65695f]"
              key={collection}
            >
              <span className="flex items-center gap-2.5">
                <input
                  checked={selectedCollections.includes(collection)}
                  className="h-4 w-4 accent-[#394239]"
                  onChange={() =>
                    toggleValue(
                      collection,
                      selectedCollections,
                      setSelectedCollections,
                    )
                  }
                  type="checkbox"
                />
                {collection}
              </span>
              <span className="text-[10px] text-[#98998f]">
                {products.filter(
                  (product) => product.collection === collection,
                ).length}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="border-b border-[#e8e6df] py-5">
        <legend className="mb-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#394239]">
          Product type
        </legend>
        <div className="space-y-3">
          {categories.map((category) => (
            <label
              className="flex cursor-pointer items-center justify-between gap-3 text-xs text-[#65695f]"
              key={category}
            >
              <span className="flex items-center gap-2.5">
                <input
                  checked={selectedCategories.includes(category)}
                  className="h-4 w-4 accent-[#394239]"
                  onChange={() =>
                    toggleValue(
                      category,
                      selectedCategories,
                      setSelectedCategories,
                    )
                  }
                  type="checkbox"
                />
                {category}
              </span>
              <span className="text-[10px] text-[#98998f]">
                {
                  products.filter((product) => product.category === category)
                    .length
                }
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="py-5">
        <legend className="mb-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#394239]">
          Maximum price
        </legend>
        <label
          className="sr-only"
          htmlFor="maximum-price"
        >{`Maximum price: ${formatTaka(selectedMaxPrice)}`}</label>
        <input
          className="w-full cursor-pointer accent-[#394239]"
          id="maximum-price"
          max={maxAvailablePrice}
          min={minPrice}
          onChange={(event) => setMaxPrice(Number(event.target.value))}
          step="100"
          type="range"
          value={selectedMaxPrice}
        />
        <div className="mt-2 flex justify-between text-[10px] text-[#85867d]">
          <span>{formatTaka(minPrice)}</span>
          <span>Up to {formatTaka(selectedMaxPrice)}</span>
        </div>
      </fieldset>
    </>
  );

  return (
    <main className="min-h-[70vh] bg-[#fbfaf7]">
      <div className="mx-auto max-w-[1440px] px-4 pb-20 pt-9 sm:px-7 sm:pt-14 lg:px-12">
        <nav
          aria-label="Breadcrumb"
          className="mb-5 text-[9px] uppercase tracking-[0.14em] text-[#85867d]"
        >
          <Link className="transition-colors hover:text-[#252b24]" href="/">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span className="text-[#394239]">All products</span>
        </nav>

        <div className="flex flex-col justify-between gap-5 border-b border-[#e8e6df] pb-7 sm:flex-row sm:items-end sm:pb-9">
          <div>
            <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.19em] text-[#858a70]">
              The considered edit
            </p>
            <h1 className="font-serif text-4xl tracking-[-0.055em] text-[#252b24] sm:text-5xl">
              All products
            </h1>
            <p className="mt-3 max-w-lg text-xs leading-6 text-[#74776d] sm:text-sm">
              Thoughtful layers, everyday essentials, and the details that earn
              a place in your rotation.
            </p>
          </div>
          <span className="text-[9px] uppercase tracking-[0.14em] text-[#85867d]">
            Collection 004 · 2026
          </span>
        </div>

        <div className="flex items-center justify-between gap-4 py-5 lg:hidden">
          <button
            aria-expanded={isFilterOpen}
            className="inline-flex h-10 items-center gap-2 border border-[#d8d7ce] px-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#394239]"
            onClick={() => setIsFilterOpen(true)}
            type="button"
          >
            <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
            Filter
            {activeFilterCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#394239] px-1 text-[9px] text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
          <label className="flex items-center gap-2 text-[9px] uppercase tracking-[0.1em] text-[#65695f]">
            <ArrowUpDown aria-hidden="true" className="h-3.5 w-3.5" />
            <span className="sr-only">Sort products</span>
            <select
              className="max-w-[150px] bg-transparent py-2 text-[9px] outline-none"
              onChange={(event) => setSortOrder(event.target.value)}
              value={sortOrder}
            >
              <option value="featured">Featured</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
            </select>
          </label>
          <label className="sr-only">
            Filter by department
            <select onChange={(event) => setActiveCategory(event.target.value)} value={activeCategory}>
              <option value="all">All departments</option>
              {departments.map((department) => <option key={department} value={department.toLowerCase()}>{department}</option>)}
            </select>
          </label>
        </div>

        <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
          <aside className="hidden lg:block">
            <div className="sticky top-28">{filterContent}</div>
          </aside>

          <section aria-label="Product results">
            <div className="mb-5 hidden items-center justify-between lg:flex">
              <p
                aria-live="polite"
                className="text-[10px] uppercase tracking-[0.12em] text-[#85867d]"
              >
                {filteredProducts.length}{" "}
                {filteredProducts.length === 1 ? "piece" : "pieces"}
              </p>
              <label className="flex items-center gap-2 text-[9px] font-medium uppercase tracking-[0.12em] text-[#65695f]">
                Sort by
                <select
                  className="min-w-[155px] border-b border-[#d8d7ce] bg-transparent px-1 py-2 text-[10px] normal-case tracking-normal text-[#394239] outline-none focus:border-[#394239]"
                  onChange={(event) => setSortOrder(event.target.value)}
                  value={sortOrder}
                >
                  <option value="featured">Featured</option>
                  <option value="price-low">Price: low to high</option>
                  <option value="price-high">Price: high to low</option>
                </select>
              </label>
            </div>

            <p aria-live="polite" className="sr-only">
              Showing {filteredProducts.length} products
            </p>

            {loading ? (
              <p className="py-16 text-center text-sm text-[#74776d]">Loading products…</p>
            ) : error ? (
              <p role="alert" className="py-16 text-center text-sm text-rose-700">{error}</p>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-10">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="flex min-h-72 flex-col items-center justify-center px-5 text-center">
                <p className="font-serif text-2xl text-[#252b24]">
                  {products.length === 0 ? "No products are available yet." : "Nothing in this edit just yet."}
                </p>
                <p className="mt-2 text-sm text-[#74776d]">
                  {products.length === 0 ? "Products added to the catalog will appear here." : "Try adjusting your filters to see more pieces."}
                </p>
                {products.length > 0 && <button
                  className="mt-5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#394239] underline underline-offset-4"
                  onClick={clearFilters}
                  type="button"
                >
                  Clear filters
                </button>}
              </div>
            )}
          </section>
        </div>
      </div>

      {isFilterOpen && (
        <div className="fixed inset-0 z-[80] flex justify-end lg:hidden">
          <button
            aria-label="Close filters"
            className="absolute inset-0 bg-[#171b17]/45"
            onClick={() => setIsFilterOpen(false)}
            type="button"
          />
          <aside
            aria-label="Filter products"
            aria-modal="true"
            className="relative flex h-full w-full max-w-[360px] flex-col overflow-y-auto bg-[#fbfaf7] px-5 py-5 shadow-2xl"
            role="dialog"
          >
            <div className="mb-5 flex items-center justify-between">
              <p className="text-[9px] font-semibold uppercase tracking-[0.17em] text-[#858a70]">
                Refine your edit
              </p>
              <button
                aria-label="Close filters"
                className="flex h-9 w-9 items-center justify-center rounded-full text-[#555b50] hover:bg-[#eeece5]"
                onClick={() => setIsFilterOpen(false)}
                type="button"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
            {filterContent}
            <div className="sticky bottom-0 mt-auto bg-[#fbfaf7] pt-5">
              <button
                className="h-12 w-full bg-[#293128] text-[9px] font-semibold uppercase tracking-[0.15em] text-white transition-colors hover:bg-[#414b3d]"
                onClick={() => setIsFilterOpen(false)}
                type="button"
              >
                Show {filteredProducts.length} pieces
              </button>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}