"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatTaka } from "@/lib/currency";

export default function CartDrawer() {
  const {
    items,
    itemCount,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeFromCart,
  } = useCart();
  const subtotal = items.reduce(
    (total, item) =>
      total +
      Math.round(
        item.price *
          (1 - Math.min(Math.max(Number(item.discountPercent) || 0, 0), 100) / 100),
      ) *
        item.quantity,
    0,
  );

  useEffect(() => {
    if (!isCartOpen) return;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape") setIsCartOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [isCartOpen, setIsCartOpen]);

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex justify-end">
      <button
        aria-label="Close shopping bag"
        className="absolute inset-0 cursor-default bg-[#171b17]/45 backdrop-blur-[2px]"
        onClick={() => setIsCartOpen(false)}
        type="button"
      />

      <aside
        aria-label="Shopping bag"
        aria-modal="true"
        className="relative flex h-full w-full max-w-[440px] flex-col bg-[#fbfaf7] shadow-[-24px_0_70px_-28px_rgba(0,0,0,0.35)]"
        role="dialog"
      >
        <div className="flex items-center justify-between border-b border-[#e8e6df] px-5 py-5 sm:px-7">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#858a70]">
              Your selection
            </p>
            <h2 className="mt-1 text-xl font-medium tracking-[-0.04em] text-[#252b24]">
              The bag
              <span className="ml-2 text-sm font-normal text-[#85867d]">
                ({itemCount})
              </span>
            </h2>
          </div>
          <button
            aria-label="Close shopping bag"
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#555b50] transition-colors hover:bg-[#eeece5] hover:text-[#202720] focus:outline-none focus:ring-2 focus:ring-[#858a70]"
            onClick={() => setIsCartOpen(false)}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f0eee8] text-[#777e6b]">
              <ShoppingBag aria-hidden="true" className="h-7 w-7" />
            </span>
            <h3 className="mt-6 font-serif text-2xl tracking-[-0.03em] text-[#252b24]">
              Your bag is taking a breather.
            </h3>
            <p className="mt-2 max-w-[270px] text-sm leading-6 text-[#777a71]">
              Find a considered piece for your everyday and it will appear
              here.
            </p>
            <button
              className="mt-7 inline-flex h-12 items-center gap-3 bg-[#293128] px-5 text-[9px] font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#414b3d]"
              onClick={() => setIsCartOpen(false)}
              type="button"
            >
              Explore the looks
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 sm:px-7">
              <div className="my-5 border border-[#e4e2da] bg-white/70 px-4 py-3">
                <p className="text-[10px] leading-5 text-[#65695f]">
                  Delivery is ৳70 inside Dhaka or ৳120 outside Dhaka. Your area
                  is selected at checkout.
                </p>
              </div>

              <ul className="divide-y divide-[#e8e6df]">
                {items.map((item) => {
                  const discountPercent = Math.min(
                    Math.max(Number(item.discountPercent) || 0, 0),
                    100,
                  );
                  const sellingPrice = Math.round(
                    item.price * (1 - discountPercent / 100),
                  );
                  return (
                  <li className="flex gap-4 py-5" key={item.cartKey}>
                    <div className="relative h-28 w-[86px] shrink-0 overflow-hidden bg-[#eeece5]">
                      <Image
                        alt={item.name}
                        className="object-cover"
                        fill
                        sizes="86px"
                        src={item.image}
                        unoptimized
                      />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[9px] uppercase tracking-[0.14em] text-[#858a70]">
                            ODYN · {item.collection ?? item.category}
                          </p>
                          <h3 className="mt-1 truncate text-sm font-medium text-[#252b24]">
                            {item.name}
                          </h3>
                          <p className="mt-1 text-[10px] text-[#85867d]">Size: {item.selectedSize}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm text-[#252b24]">{formatTaka(sellingPrice * item.quantity)}</p>
                          {discountPercent > 0 && <p className="mt-0.5 text-[10px] text-[#92958b] line-through">{formatTaka(item.price * item.quantity)}</p>}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center border border-[#e4e2da] bg-white">
                          <button
                            aria-label={`Decrease ${item.name} quantity`}
                            className="flex h-8 w-8 items-center justify-center text-[#555b50] transition-colors hover:bg-[#f0eee8]"
                            onClick={() =>
                              updateQuantity(item.cartKey, item.quantity - 1)
                            }
                            type="button"
                          >
                            <Minus aria-hidden="true" className="h-3 w-3" />
                          </button>
                          <span
                            aria-label={`Quantity ${item.quantity}`}
                            className="min-w-7 text-center text-xs text-[#252b24]"
                          >
                            {item.quantity}
                          </span>
                          <button
                            disabled={item.quantity >= (item.sizes?.find((size) => size.size === item.selectedSize)?.quantity ?? 0)}
                            aria-label={`Increase ${item.name} quantity`}
                            className="flex h-8 w-8 items-center justify-center text-[#555b50] transition-colors hover:bg-[#f0eee8] disabled:cursor-not-allowed disabled:opacity-40"
                            onClick={() =>
                              updateQuantity(item.cartKey, item.quantity + 1)
                            }
                            type="button"
                          >
                            <Plus aria-hidden="true" className="h-3 w-3" />
                          </button>
                        </div>
                        <button
                          aria-label={`Remove ${item.name} from bag`}
                          className="flex h-8 w-8 items-center justify-center text-[#92948b] transition-colors hover:text-[#9d4c3d]"
                          onClick={() => removeFromCart(item.cartKey)}
                          type="button"
                        >
                          <Trash2 aria-hidden="true" className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                  );
                })}
              </ul>
            </div>

            <div className="border-t border-[#e8e6df] bg-[#f7f6f1] px-5 py-5 sm:px-7">
              <div className="flex items-center justify-between text-sm text-[#252b24]">
                <span>Subtotal</span>
                <span className="font-medium">{formatTaka(subtotal)}</span>
              </div>
              <p className="mt-2 text-[10px] leading-5 text-[#85867d]">
                Delivery charge is set at checkout based on your area.
              </p>
              <Link
                className="mt-4 flex h-12 w-full items-center justify-center gap-3 bg-[#293128] px-5 text-[9px] font-semibold uppercase tracking-[0.17em] text-white transition-colors hover:bg-[#414b3d] focus:outline-none focus:ring-2 focus:ring-[#858a70] focus:ring-offset-2"
                href="/checkout"
                onClick={() => setIsCartOpen(false)}
              >
                Continue to checkout
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
