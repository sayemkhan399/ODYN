"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ShoppingBag, X } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatTaka } from "@/lib/currency";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function ProductDetailsModal({ product, onClose }) {
  const closeButtonRef = useRef(null);
  const { addToCart, setIsCartOpen } = useCart();
  const { data: sessionData, isPending: sessionPending } = authClient.useSession();
  const router = useRouter();
  const [selectedSize, setSelectedSize] = useState("");
  const [cartError, setCartError] = useState("");
  const discountPercent = Math.min(Math.max(Number(product.discountPercent) || 0, 0), 100);
  const sellingPrice = Math.round(product.price * (1 - discountPercent / 100));
  const availableSizes = (product.sizes ?? []).filter((size) => size.quantity > 0);
  const isOutOfStock = product.stock === 0 || availableSizes.length === 0;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  function handleAddToBag() {
    if (!selectedSize) {
      setCartError("Select a size before adding this product to your bag.");
      return;
    }
    if (sessionPending) {
      setCartError("Please wait while we verify your account.");
      return;
    }
    if (!sessionData?.user) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (sessionData.user.role !== "customer") {
      setCartError("Only customer accounts can add items to your bag.");
      return;
    }
    if (!addToCart(product, selectedSize)) {
      setCartError("The selected size is no longer available.");
      return;
    }
    onClose();
    setIsCartOpen(true);
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-[#171b17]/55 p-3 backdrop-blur-[2px] sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-labelledby="product-details-title"
        aria-modal="true"
        className="relative my-auto grid w-full max-w-3xl overflow-hidden bg-[#fbfaf7] shadow-2xl sm:grid-cols-2"
        role="dialog"
      >
        <button
          aria-label="Close product details"
          className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-[#fbfaf7]/90 text-[#394239] transition-colors hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#858a70]"
          onClick={onClose}
          ref={closeButtonRef}
          type="button"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>

        <div className="relative aspect-[4/3] bg-[#eeece5] sm:aspect-auto sm:min-h-[440px]">
          <Image
            alt={product.name}
            className="object-cover"
            fill
            sizes="(max-width: 640px) 100vw, 50vw"
            src={product.image}
            unoptimized
          />
          {product.badge && (
            <span className="absolute left-4 top-4 bg-[#fbfaf7] px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.13em] text-[#394239]">
              {product.badge}
            </span>
          )}
        </div>

        <div className="flex flex-col justify-center p-5 sm:p-9">
          <p className="text-[9px] font-semibold uppercase tracking-[0.17em] text-[#858a70]">
            {product.collection} · {product.taxonomy?.section ?? product.category} · {product.category}
          </p>
          <h2
            className="mt-3 font-serif text-3xl leading-tight tracking-[-0.04em] text-[#252b24] sm:text-4xl"
            id="product-details-title"
          >
            {product.name}
          </h2>
          <div className="mt-4 flex items-baseline gap-2">
            <p className="text-lg font-medium text-[#252b24]">{formatTaka(sellingPrice)}</p>
            {discountPercent > 0 && <><p className="text-sm text-[#92958b] line-through">{formatTaka(product.price)}</p><span className="text-xs font-medium text-rose-700">{discountPercent}% off</span></>}
          </div>
          <div className="my-6 border-t border-[#e8e6df]" />
          <p className="text-xs leading-6 text-[#74776d]">{product.description || `${product.name}, from the ODYN ${product.collection} ${product.category} collection.`}</p>
          {product.taxonomy?.item && <p className="mt-3 text-[10px] text-[#74776d]">Style: {product.taxonomy.item}</p>}
          {availableSizes.length > 0 && <fieldset className="mt-4"><legend className="text-[9px] font-semibold uppercase tracking-[.12em] text-[#85867d]">Choose a size</legend><div className="mt-2 flex flex-wrap gap-2">{availableSizes.map(({ size, quantity }) => <button aria-pressed={selectedSize === size} key={size} onClick={() => { setSelectedSize(size); setCartError(""); }} type="button" className={`min-w-12 rounded border px-2.5 py-2 text-[10px] transition ${selectedSize === size ? "border-[#293128] bg-[#293128] text-white" : "border-[#dedcd3] text-[#394239] hover:border-[#69725e]"}`}>{size}<span className="ml-1 text-[9px] opacity-70">({quantity})</span></button>)}</div></fieldset>}
          {cartError && <p className="mt-3 text-[10px] text-rose-700" role="alert">{cartError}</p>}

          <button
            className="mt-7 inline-flex min-h-12 items-center justify-center gap-3 bg-[#293128] px-5 text-[9px] font-semibold uppercase tracking-[0.15em] text-white transition-colors hover:bg-[#414b3d] focus:outline-none focus:ring-2 focus:ring-[#858a70] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleAddToBag}
            disabled={isOutOfStock || !selectedSize || sessionPending}
            type="button"
          >
            <ShoppingBag aria-hidden="true" className="h-4 w-4" />
            {isOutOfStock
              ? "Out of stock"
              : sessionPending
                ? "Checking account…"
                : `Add to bag · ${formatTaka(sellingPrice)}`}
          </button>
          <p className="mt-3 text-center text-[9px] uppercase tracking-[0.12em] text-[#85867d]">
            Delivery: ৳70 inside Dhaka · ৳120 outside Dhaka
          </p>
        </div>
      </section>
    </div>
  );
}
