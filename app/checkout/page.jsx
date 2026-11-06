"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  LockKeyhole,
  ShoppingBag,
  Ticket,
  X,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatTaka } from "@/lib/currency";

function getDiscountPercent(item) {
  return Math.min(Math.max(Number(item.discountPercent) || 0, 0), 100);
}

export default function CheckoutPage() {
  const { items, itemCount, subtotal, clearCart } = useCart();
  const [city, setCity] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoMessage, setPromoMessage] = useState("");
  const [promoMessageIsError, setPromoMessageIsError] = useState(false);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [orderConfirmation, setOrderConfirmation] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [sslcommerzConfigured, setSslcommerzConfigured] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/store-settings", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Payment options could not be loaded.");
        setSslcommerzConfigured(Boolean(result.payments?.sslcommerzConfigured));
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Could not load ODYN checkout payment options.", error);
        }
      });
    return () => controller.abort();
  }, []);

  const productDiscount = items.reduce(
    (total, item) =>
      total +
      (item.price -
        Math.round(item.price * (1 - getDiscountPercent(item) / 100))) *
        item.quantity,
    0,
  );
  const eligibleSubtotal = items.reduce(
    (total, item) =>
      total +
      (getDiscountPercent(item) === 0 ? item.price * item.quantity : 0),
    0,
  );
  const discountedSubtotal = subtotal - productDiscount;
  const promoDiscount = appliedPromo?.discount ?? 0;
  const normalizedCity = city.trim().toLowerCase();
  const deliveryCharge = normalizedCity
    ? normalizedCity.includes("dhaka")
      ? 70
      : 120
    : null;
  const orderTotal =
    discountedSubtotal - promoDiscount + (deliveryCharge ?? 0);

  async function applyPromoCode(event) {
    event.preventDefault();
    setPromoMessage("");
    setPromoMessageIsError(false);

    const code = promoInput.trim().toUpperCase();
    if (!code) {
      setPromoMessage("Enter a promo code.");
      setPromoMessageIsError(true);
      setAppliedPromo(null);
      return;
    }

    setIsApplyingPromo(true);
    try {
      const response = await fetch("/api/promos/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, eligibleSubtotal }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "This promo code could not be applied.");
      setAppliedPromo(result.promo);
      setPromoMessage(`${result.promo.code} applied to eligible products.`);
    } catch (error) {
      setAppliedPromo(null);
      setPromoMessage(error.message || "Promo codes could not be loaded. Please try again.");
      setPromoMessageIsError(true);
    } finally {
      setIsApplyingPromo(false);
    }
  }

  function removePromoCode() {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoMessage("Promo code removed.");
    setPromoMessageIsError(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setCheckoutError("");
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const orderInput = {
      customer: {
        name: formData.get("name"),
        email: formData.get("email"),
        phone: formData.get("phone"),
        address: formData.get("address"),
        city: formData.get("city"),
        region: formData.get("region"),
        postalCode: formData.get("postalCode"),
        country: "BD",
      },
      items: items.map((item) => ({
        productId: item.id,
        size: item.selectedSize,
        quantity: item.quantity,
      })),
      promoCode: appliedPromo?.code ?? null,
      paymentMethod,
    };

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderInput),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The order could not be placed.");
      if (result.redirectUrl) {
        window.location.assign(result.redirectUrl);
        return;
      }
      setOrderConfirmation(result.order);
      clearCart();
    } catch (error) {
      setCheckoutError(error.message || "The order could not be placed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (orderConfirmation) {
    return (
      <main className="flex flex-1 items-center justify-center bg-[#fbfaf7] px-5 py-20">
        <section className="max-w-lg text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <ShoppingBag aria-hidden="true" className="h-7 w-7" />
          </span>
          <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#858a70]">Order received</p>
          <h1 className="mt-2 font-serif text-3xl tracking-[-0.04em] text-[#252b24]">Thank you for your order.</h1>
          <p className="mt-3 text-sm leading-6 text-[#74776d]">
            Your order reference is <strong>{orderConfirmation.id}</strong>. We will contact you about delivery.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link className="inline-flex min-h-11 items-center gap-2 bg-[#293128] px-5 text-[10px] font-semibold uppercase tracking-wider text-white" href={`${orderConfirmation.customerId ? "/account/track" : "/track-order"}?order=${orderConfirmation.id}`}>
              Track order <ArrowRight className="h-4 w-4" />
            </Link>
            <Link className="inline-flex min-h-11 items-center border border-[#d8d7ce] px-5 text-[10px] font-semibold uppercase tracking-wider text-[#394239]" href="/products">
              Continue shopping
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="flex flex-1 items-center justify-center bg-[#fbfaf7] px-5 py-20">
        <div className="max-w-md text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f0eee8] text-[#777e6b]">
            <ShoppingBag aria-hidden="true" className="h-7 w-7" />
          </span>
          <h1 className="mt-6 font-serif text-3xl tracking-[-0.04em] text-[#252b24]">
            Your bag is empty.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#74776d]">
            Add something considered to your bag before heading to checkout.
          </p>
          <Link
            className="mt-7 inline-flex min-h-12 items-center justify-center gap-3 bg-[#293128] px-6 text-[9px] font-semibold uppercase tracking-[0.15em] text-white transition-colors hover:bg-[#414b3d]"
            href="/products"
          >
            Explore the collection
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-[#fbfaf7]">
      <div className="mx-auto max-w-[1180px] px-4 py-9 sm:px-7 sm:py-14 lg:px-10">
        <Link
          className="inline-flex items-center gap-2 text-[9px] font-medium uppercase tracking-[0.13em] text-[#65695f] transition-colors hover:text-[#252b24]"
          href="/products"
        >
          <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
          Continue shopping
        </Link>

        <div className="mb-9 mt-6 border-b border-[#e8e6df] pb-7 sm:mb-11 sm:pb-9">
          <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.19em] text-[#858a70]">
            ODYN Studio · Secure checkout
          </p>
          <h1 className="font-serif text-4xl tracking-[-0.055em] text-[#252b24] sm:text-5xl">
            Checkout
          </h1>
        </div>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16">
          <form className="space-y-9" onSubmit={handleSubmit}>
            <section aria-labelledby="contact-heading">
              <div className="mb-5 flex items-baseline justify-between gap-4">
                <h2
                  className="font-serif text-2xl tracking-[-0.035em] text-[#252b24]"
                  id="contact-heading"
                >
                  Contact
                </h2>
                <p className="text-[10px] text-[#85867d]">
                  Required fields marked *
                </p>
              </div>
              <label className="mb-4 block">
                <span className="mb-2 block text-[9px] font-medium uppercase tracking-[0.12em] text-[#65695f]">
                  Email address *
                </span>
                <input
                  autoComplete="email"
                  className="h-12 w-full border border-[#d8d7ce] bg-white px-3 text-sm text-[#252b24] outline-none transition-colors placeholder:text-[#a3a399] focus:border-[#69725e]"
                  name="email"
                  placeholder="you@example.com"
                  required
                  type="email"
                />
              </label>
              <label className="mb-4 block">
                <span className="mb-2 block text-[9px] font-medium uppercase tracking-[0.12em] text-[#65695f]">
                  Phone number *
                </span>
                <input
                  autoComplete="tel"
                  className="h-12 w-full border border-[#d8d7ce] bg-white px-3 text-sm text-[#252b24] outline-none transition-colors placeholder:text-[#a3a399] focus:border-[#69725e]"
                  name="phone"
                  placeholder="+880 1..."
                  required
                  type="tel"
                />
              </label>
              <label className="flex items-start gap-2.5 text-xs leading-5 text-[#74776d]">
                <input
                  className="mt-1 h-4 w-4 accent-[#394239]"
                  name="updates"
                  type="checkbox"
                />
                Email me with news and considered updates.
              </label>
            </section>

            <section aria-labelledby="shipping-heading">
              <h2
                className="mb-5 font-serif text-2xl tracking-[-0.035em] text-[#252b24]"
                id="shipping-heading"
              >
                Shipping address
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="mb-2 block text-[9px] font-medium uppercase tracking-[0.12em] text-[#65695f]">
                    Full name *
                  </span>
                  <input
                    autoComplete="name"
                    className="h-12 w-full border border-[#d8d7ce] bg-white px-3 text-sm text-[#252b24] outline-none transition-colors placeholder:text-[#a3a399] focus:border-[#69725e]"
                    name="name"
                    placeholder="Your full name"
                    required
                  />
                </label>
                <label className="sm:col-span-2">
                  <span className="mb-2 block text-[9px] font-medium uppercase tracking-[0.12em] text-[#65695f]">
                    Address *
                  </span>
                  <input
                    autoComplete="street-address"
                    className="h-12 w-full border border-[#d8d7ce] bg-white px-3 text-sm text-[#252b24] outline-none transition-colors placeholder:text-[#a3a399] focus:border-[#69725e]"
                    name="address"
                    placeholder="Street address"
                    required
                  />
                </label>
                <label>
                  <span className="mb-2 block text-[9px] font-medium uppercase tracking-[0.12em] text-[#65695f]">
                    City *
                  </span>
                  <input
                    autoComplete="address-level2"
                    className="h-12 w-full border border-[#d8d7ce] bg-white px-3 text-sm text-[#252b24] outline-none transition-colors placeholder:text-[#a3a399] focus:border-[#69725e]"
                    name="city"
                    onChange={(event) => setCity(event.target.value)}
                    placeholder="City"
                    required
                  />
                  <span className="mt-1.5 block text-[10px] text-[#85867d]">
                    Delivery is calculated automatically: ৳70 for Dhaka, ৳120
                    for other cities.
                  </span>
                </label>
                <label>
                  <span className="mb-2 block text-[9px] font-medium uppercase tracking-[0.12em] text-[#65695f]">
                    State / region
                  </span>
                  <input
                    autoComplete="address-level1"
                    className="h-12 w-full border border-[#d8d7ce] bg-white px-3 text-sm text-[#252b24] outline-none transition-colors placeholder:text-[#a3a399] focus:border-[#69725e]"
                    name="region"
                    placeholder="State or region"
                  />
                </label>
                <label>
                  <span className="mb-2 block text-[9px] font-medium uppercase tracking-[0.12em] text-[#65695f]">
                    Postal code *
                  </span>
                  <input
                    autoComplete="postal-code"
                    className="h-12 w-full border border-[#d8d7ce] bg-white px-3 text-sm text-[#252b24] outline-none transition-colors placeholder:text-[#a3a399] focus:border-[#69725e]"
                    name="postalCode"
                    placeholder="Postal code"
                    required
                  />
                </label>
                <label>
                  <span className="mb-2 block text-[9px] font-medium uppercase tracking-[0.12em] text-[#65695f]">
                    Country *
                  </span>
                  <select
                    autoComplete="country-name"
                    className="h-12 w-full border border-[#d8d7ce] bg-white px-3 text-sm text-[#252b24] outline-none transition-colors focus:border-[#69725e]"
                    defaultValue="BD"
                    name="country"
                    disabled
                  >
                    <option value="BD">Bangladesh</option>
                  </select>
                </label>
              </div>
            </section>

            <section
              aria-labelledby="payment-heading"
              className="border-t border-[#e8e6df] pt-7"
            >
              <h2
                className="font-serif text-2xl tracking-[-0.035em] text-[#252b24]"
                id="payment-heading"
              >
                Payment
              </h2>
              <p className="mt-2 text-xs leading-5 text-[#74776d]">
                Choose how you would like to pay. Card details are entered only on the SSLCommerz hosted payment page.
              </p>
              <div className="mt-4 space-y-3">
                <label className="flex cursor-pointer items-start gap-3 border border-[#e8e6df] bg-white px-4 py-4 text-xs text-[#74776d]">
                  <input
                    checked={paymentMethod === "cod"}
                    className="mt-0.5 accent-[#394239]"
                    name="paymentMethod"
                    onChange={() => setPaymentMethod("cod")}
                    type="radio"
                    value="cod"
                  />
                  <span><strong className="block font-medium text-[#252b24]">Cash on delivery</strong><span className="mt-1 block">Pay the delivery person when your order arrives.</span></span>
                </label>
                <label className={`flex items-start gap-3 border border-[#e8e6df] bg-white px-4 py-4 text-xs text-[#74776d] ${sslcommerzConfigured ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}>
                  <input
                    checked={paymentMethod === "sslcommerz"}
                    className="mt-0.5 accent-[#394239]"
                    disabled={!sslcommerzConfigured}
                    name="paymentMethod"
                    onChange={() => setPaymentMethod("sslcommerz")}
                    type="radio"
                    value="sslcommerz"
                  />
                  <span><strong className="block font-medium text-[#252b24]">Online payment · SSLCommerz</strong><span className="mt-1 block">{sslcommerzConfigured ? "Pay securely through SSLCommerz." : "Unavailable until the store's SSLCommerz credentials are configured."}</span></span>
                </label>
              </div>
              <div className="mt-4 flex items-center gap-3 text-[10px] text-[#74776d]">
                <LockKeyhole aria-hidden="true" className="h-4 w-4 shrink-0 text-[#858a70]" />
                ODYN does not collect card details.
              </div>
            </section>

            {checkoutError && (
              <p
                className="border border-rose-200 bg-rose-50 px-4 py-3 text-xs leading-5 text-rose-800"
                role="alert"
              >
                {checkoutError}
              </p>
            )}

            <button
              className="flex min-h-12 w-full items-center justify-center gap-3 bg-[#293128] px-5 text-[9px] font-semibold uppercase tracking-[0.15em] text-white transition-colors hover:bg-[#414b3d] focus:outline-none focus:ring-2 focus:ring-[#858a70] focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Placing order…" : paymentMethod === "cod" ? "Place cash-on-delivery order" : "Continue to SSLCommerz"}
              {!isSubmitting && <ArrowRight aria-hidden="true" className="h-4 w-4" />}
            </button>
          </form>

          <aside className="h-fit border border-[#e8e6df] bg-[#f7f6f1] p-5 sm:p-7 lg:sticky lg:top-28">
            <h2 className="flex items-center justify-between font-serif text-2xl tracking-[-0.035em] text-[#252b24]">
              Order summary
              <span className="font-sans text-xs font-normal text-[#85867d]">
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </span>
            </h2>

            <ul className="mt-6 divide-y divide-[#e3e1d9]">
              {items.map((item) => {
                const discountPercent = getDiscountPercent(item);
                const lineTotal =
                  Math.round(item.price * (1 - discountPercent / 100)) *
                  item.quantity;

                return (
                  <li
                    className="flex gap-4 py-4 first:pt-0"
                    key={item.id}
                  >
                    <div className="relative h-20 w-16 shrink-0 overflow-hidden bg-[#eeece5]">
                      <Image
                        alt={item.name}
                        className="object-cover"
                        fill
                        sizes="64px"
                        src={item.image}
                        unoptimized
                      />
                      <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#69725e] px-1 text-[9px] text-white">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-[#252b24]">
                          {item.name}
                        </p>
                        <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-[#85867d]">
                          {item.category}
                        </p>
                      </div>
                      <p className="shrink-0 text-xs text-[#252b24]">
                        {discountPercent > 0 && (
                          <span className="mr-1 text-[10px] text-[#92958b] line-through">
                            {formatTaka(item.price * item.quantity)}
                          </span>
                        )}
                        {formatTaka(lineTotal)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>

            <form
              className="mt-6 border-t border-[#e3e1d9] pt-5"
              onSubmit={applyPromoCode}
            >
              <label
                className="mb-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.12em] text-[#65695f]"
                htmlFor="promo-code"
              >
                <Ticket aria-hidden="true" className="h-3.5 w-3.5" />
                Promo code
              </label>
              <div className="flex gap-2">
                <input
                  autoComplete="off"
                  className="h-10 min-w-0 flex-1 border border-[#d8d7ce] bg-white px-3 text-xs uppercase text-[#252b24] outline-none placeholder:normal-case placeholder:text-[#a3a399] focus:border-[#69725e]"
                  disabled={Boolean(appliedPromo)}
                  id="promo-code"
                  onChange={(event) => setPromoInput(event.target.value)}
                  placeholder="Enter code"
                  value={promoInput}
                />
                {appliedPromo ? (
                  <button
                    className="inline-flex h-10 items-center gap-1 border border-[#d8d7ce] px-3 text-[10px] font-medium text-[#65695f] hover:bg-white"
                    onClick={removePromoCode}
                    type="button"
                  >
                    <X aria-hidden="true" className="h-3.5 w-3.5" />
                    Remove
                  </button>
                ) : (
                  <button
                    className="h-10 bg-[#293128] px-4 text-[10px] font-medium uppercase tracking-[0.08em] text-white hover:bg-[#414b3d]"
                    type="submit"
                  >
                    Apply
                  </button>
                )}
              </div>
              {promoMessage && (
                <p
                  className={`mt-2 text-[10px] ${promoMessageIsError ? "text-rose-700" : "text-emerald-700"}`}
                  role={promoMessageIsError ? "alert" : "status"}
                >
                  {promoMessage}
                </p>
              )}
              <p className="mt-2 text-[10px] leading-5 text-[#85867d]">
                Promo codes apply only to products without an existing discount.
              </p>
            </form>

            <div className="mt-5 space-y-3 border-t border-[#e3e1d9] pt-5 text-xs">
              <div className="flex justify-between text-[#65695f]">
                <span>Subtotal</span>
                <span>{formatTaka(subtotal)}</span>
              </div>
              {productDiscount > 0 && (
                <div className="flex justify-between text-[#65695f]">
                  <span>Product discounts</span>
                  <span className="text-emerald-700">
                    −{formatTaka(productDiscount)}
                  </span>
                </div>
              )}
              {appliedPromo && promoDiscount > 0 && (
                <div className="flex justify-between text-[#65695f]">
                  <span>Promo · {appliedPromo.code}</span>
                  <span className="text-emerald-700">
                    −{formatTaka(promoDiscount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-[#65695f]">
                <span>Delivery charge</span>
                <span>{deliveryCharge == null ? "Enter city" : formatTaka(deliveryCharge)}</span>
              </div>
              <div className="flex justify-between border-t border-[#e3e1d9] pt-4 text-sm font-medium text-[#252b24]">
                <span>Total</span>
                <span>{formatTaka(orderTotal)}</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
