"use client";

import { useEffect, useState } from "react";
import { Ticket } from "lucide-react";
import { formatTaka } from "@/lib/currency";

export default function AccountCouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/promos", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Coupons could not be loaded.");
        setCoupons(result.promoCodes);
      })
      .catch((loadError) => {
        if (loadError.name !== "AbortError") {
          console.error("Could not load ODYN available coupons.", loadError);
          setError(loadError.message || "Coupons could not be loaded.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  return (
    <div>
      <h2 className="font-serif text-2xl text-[#252b24]">Available coupons</h2>
      <p className="mt-1 text-xs text-[#74776d]">Active codes that can be used at checkout. Discounts exclude sale items and delivery.</p>
      {error && <p role="alert" className="mt-5 rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
      {loading ? <p className="mt-8 text-sm text-[#74776d]">Loading coupons…</p> : coupons.length ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {coupons.map((coupon) => <article key={coupon.code} className="flex items-center gap-3 rounded-xl border border-[#e8e6df] bg-white p-4"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f4f2ec] text-[#8b7654]"><Ticket size={17} /></span><div><p className="font-mono text-xs font-semibold">{coupon.code}</p><p className="mt-1 text-[10px] text-[#74776d]">{coupon.discountType === "percent" ? `${coupon.value}% off eligible items` : `${formatTaka(coupon.value)} off eligible items`}{coupon.expiresAt ? ` · Expires ${coupon.expiresAt}` : ""}</p></div></article>)}
        </div>
      ) : <p className="mt-8 rounded-xl border border-dashed border-[#d8d7ce] p-8 text-center text-sm text-[#74776d]">There are no active coupons right now.</p>}
    </div>
  );
}
