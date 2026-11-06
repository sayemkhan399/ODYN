"use client";

import { useState } from "react";
import Image from "next/image";
import { Heart, Info, ShoppingBag } from "lucide-react";
import { useWishlist } from "@/context/WishlistContext";
import ProductDetailsModal from "@/components/ProductDetailsModal";
import { formatTaka } from "@/lib/currency";
import { useRouter } from "next/navigation";

export default function ProductCard({ product, imageOnly = false, recommendedSize = "" }) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [wishlistError, setWishlistError] = useState("");
  const { isWishlisted, addToWishlist, removeFromWishlist } = useWishlist();
  const router = useRouter();
  const isSaved = isWishlisted(product.id);
  const discountPercent = Math.min(Math.max(Number(product.discountPercent) || 0, 0), 100);
  const sellingPrice = Math.round(product.price * (1 - discountPercent / 100));
  const availableSizes = (product.sizes ?? [])
    .filter((size) => size.quantity > 0)
    .map((size) => size.size);
  const isOutOfStock = product.stock === 0;
  const description = product.description?.trim() || "No description available.";

  async function toggleWishlist() {
    setWishlistError("");
    try {
      if (isSaved) {
        await removeFromWishlist(product.id);
      } else {
        await addToWishlist(product.id);
      }
    } catch (error) {
      if (error.message === "Authentication required.") {
        router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      } else {
        console.error("Could not update the ODYN wishlist.", error);
        setWishlistError(error.message || "Wishlist could not be updated.");
      }
    }
  }

  return (
    <>
      {imageOnly ? (
        <article className="group grid h-36 w-full shrink-0 grid-cols-[92px_minmax(0,1fr)] overflow-hidden rounded-xl border border-[#e7e3da] bg-white shadow-[0_3px_14px_rgba(32,39,32,0.04)] transition duration-300 hover:border-[#d3c8b4] hover:shadow-[0_10px_28px_rgba(32,39,32,0.09)] sm:h-40 sm:grid-cols-[120px_minmax(0,1fr)] lg:h-44 lg:grid-cols-[140px_minmax(0,1fr)]">
          <div className="relative min-h-0 overflow-hidden bg-[#f0eee8]">
            <Image
              alt={product.name}
              className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              fill
              sizes="(max-width: 640px) 92px, (max-width: 1024px) 120px, 140px"
              src={product.image}
              unoptimized
            />
            {(product.badge || discountPercent > 0) && (
              <span className="absolute bottom-2 left-2 rounded-full bg-[#fbfaf7]/95 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.1em] text-[#394239] shadow-sm">
                {discountPercent > 0 ? `${discountPercent}% off` : product.badge}
              </span>
            )}
            <button
              aria-label={isSaved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
              aria-pressed={isSaved}
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#fbfaf7]/95 text-[#394239] shadow-sm transition hover:bg-[#293128] hover:text-white"
              onClick={toggleWishlist}
              type="button"
            >
              <Heart aria-hidden="true" className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
            </button>
          </div>
          <div className="flex min-w-0 flex-col p-2.5 sm:p-3.5 lg:p-4">
            <p className="truncate text-[8px] font-medium uppercase tracking-[0.12em] text-[#8a806f] sm:text-[9px]">
              {product.collection} · {product.taxonomy?.section ?? product.category}
            </p>
            <h3 className="mt-1 line-clamp-2 font-serif text-xs leading-snug text-[#252b24] sm:text-sm lg:text-base">
              {product.name}
            </h3>
            <p className="mt-1 line-clamp-2 text-[8px] leading-3 text-[#74776d] sm:text-[9px] sm:leading-4">
              {description}
            </p>
            {wishlistError && <p role="alert" className="mt-1 line-clamp-1 text-[8px] text-rose-700">{wishlistError}</p>}
            <div className="mt-auto flex min-w-0 items-end justify-between gap-2 pt-1.5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-1.5">
                  <p className="text-[11px] font-semibold text-[#293128] sm:text-xs">{formatTaka(sellingPrice)}</p>
                  {discountPercent > 0 && <p className="text-[8px] text-[#92958b] line-through">{formatTaka(product.price)}</p>}
                </div>
                <p className={`mt-0.5 truncate text-[8px] ${isOutOfStock ? "text-rose-700" : recommendedSize ? "font-medium text-[#526149]" : "text-[#85867d]"}`}>
                  {isOutOfStock ? "Out of stock" : recommendedSize ? `Your size: ${recommendedSize}` : availableSizes.length > 0 ? `${availableSizes.length} sizes available` : "Check availability"}
                </p>
              </div>
              <button
                aria-label={`View details for ${product.name}`}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-[#293128] px-2.5 text-[8px] font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:bg-[#414b3d] focus:outline-none focus:ring-2 focus:ring-[#858a70] focus:ring-offset-2 sm:h-9 sm:px-3 sm:text-[9px]"
                onClick={() => setIsDetailsOpen(true)}
                type="button"
              >
                <ShoppingBag aria-hidden="true" className="h-3.5 w-3.5" />
                <span>Details</span>
              </button>
            </div>
          </div>
        </article>
      ) : (
        <article className="group flex h-full min-w-0 flex-col">
          <div className="relative aspect-[4/5] w-full shrink-0 overflow-hidden bg-[#eeece5]">
            <Image
              alt={product.name}
              className="object-cover transition-transform duration-700 group-hover:scale-[1.035]"
              fill
              sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 22vw"
              src={product.image}
              unoptimized
            />
            {product.badge && (
              <span className="absolute left-2.5 top-2.5 bg-[#fbfaf7] px-2.5 py-1.5 text-[8px] font-semibold uppercase tracking-[0.13em] text-[#394239] sm:left-3 sm:top-3 sm:text-[9px]">
                {product.badge}
              </span>
            )}
            {discountPercent > 0 && (
              <span className="absolute right-2.5 top-2.5 bg-rose-700 px-2 py-1 text-[8px] font-semibold text-white sm:right-3 sm:top-3 sm:text-[9px]">
                {discountPercent}% OFF
              </span>
            )}
            <button
              aria-label={isSaved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
              aria-pressed={isSaved}
              className="absolute left-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-[#fbfaf7] text-[#394239] shadow-sm transition hover:bg-[#293128] hover:text-white sm:left-3 sm:top-3"
              onClick={toggleWishlist}
              type="button"
            >
              <Heart aria-hidden="true" className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
            </button>
            <button
              aria-label={isOutOfStock ? `${product.name} is out of stock` : `Choose a size for ${product.name}`}
              className="absolute bottom-2.5 right-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-[#fbfaf7] text-[#202720] shadow-sm transition-colors hover:bg-[#293128] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#858a70] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:bottom-3 sm:right-3"
              onClick={() => setIsDetailsOpen(true)}
              disabled={isOutOfStock}
              type="button"
            >
              <ShoppingBag aria-hidden="true" className="h-[17px] w-[17px]" />
            </button>
          </div>
          <div className="flex min-h-[62px] items-start justify-between gap-2 pt-3 sm:gap-3 sm:pt-4">
            <div className="min-w-0">
              <p className="truncate text-[9px] uppercase tracking-[0.1em] text-[#85867d] sm:tracking-[0.14em]">
                {product.collection} · {product.taxonomy?.section ?? product.category}
              </p>
              <h3 className="mt-1 line-clamp-2 text-xs font-bold leading-4 text-[#272520] sm:text-sm">
                {product.name}
              </h3>
            </div>
            <div className="shrink-0 pt-1 text-right">
              <p className="text-xs font-extrabold text-[#e86005] sm:text-sm">{formatTaka(sellingPrice)}</p>
              {discountPercent > 0 && <p className="mt-0.5 text-[10px] text-[#92958b] line-through">{formatTaka(product.price)}</p>}
            </div>
          </div>
          <p className="mt-1.5 min-h-8 line-clamp-2 text-[9px] leading-4 text-[#74776d]">{description}</p>
          {wishlistError && <p role="alert" className="mt-2 text-[10px] text-rose-700">{wishlistError}</p>}
          <div className="mt-2 min-h-4">
            {isOutOfStock ? (
              <p className="text-[9px] font-medium uppercase tracking-wide text-rose-700">Out of stock</p>
            ) : availableSizes.length > 0 ? (
              <p className={`truncate text-[9px] ${recommendedSize ? "font-medium text-[#526149]" : "text-[#85867d]"}`}>
                {recommendedSize ? `Your size: ${recommendedSize}` : `Available sizes: ${availableSizes.join(", ")}`}
              </p>
            ) : null}
          </div>
          <button
            aria-label={`View details for ${product.name}`}
            className="mt-auto inline-flex min-h-10 w-full items-center justify-center gap-2 border border-[#d8d7ce] px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#394239] transition-colors hover:border-[#293128] hover:bg-[#293128] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#858a70] focus:ring-offset-2"
            onClick={() => setIsDetailsOpen(true)}
            type="button"
          >
            <Info aria-hidden="true" className="h-3.5 w-3.5" />
            Product details
          </button>
        </article>
      )}
      {isDetailsOpen && (
        <ProductDetailsModal
          onClose={() => setIsDetailsOpen(false)}
          product={product}
        />
      )}
    </>
  );
}
