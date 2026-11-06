"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { formatTaka } from "@/lib/currency";
import { authClient } from "@/lib/auth-client";

export default function TrackOrderForm() {
  const searchParams = useSearchParams();
  const { data: sessionData } = authClient.useSession();
  const [orderId, setOrderId] = useState(searchParams.get("order") ?? "");
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function track(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setOrder(null);
    try {
      const isCustomer = sessionData?.user?.role === "customer";
      const response = isCustomer
        ? await fetch(`/api/orders?id=${encodeURIComponent(orderId)}`, { cache: "no-store" })
        : await fetch("/api/orders/track", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId, email }),
          });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Order could not be found.");
      setOrder(result.order);
    } catch (trackError) {
      setError(trackError.message || "Order could not be found.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h2 className="font-serif text-2xl text-[#252b24]">Track an order</h2>
      <p className="mt-1 text-xs text-[#74776d]">
        Enter your order reference{sessionData?.user?.role === "customer" ? "." : " and checkout email."}
      </p>
      <form className="mt-6 grid gap-3 sm:grid-cols-2" onSubmit={track}>
        <label className="text-[10px] font-medium uppercase tracking-wide text-[#65695f] sm:col-span-2">Order reference
          <input className="mt-2 h-11 w-full rounded border border-[#d8d7ce] px-3 text-sm normal-case tracking-normal text-[#252b24]" onChange={(event) => setOrderId(event.target.value)} required value={orderId} />
        </label>
        {sessionData?.user?.role !== "customer" && <label className="text-[10px] font-medium uppercase tracking-wide text-[#65695f] sm:col-span-2">Checkout email
          <input className="mt-2 h-11 w-full rounded border border-[#d8d7ce] px-3 text-sm normal-case tracking-normal text-[#252b24]" onChange={(event) => setEmail(event.target.value)} required type="email" value={email || sessionData?.user?.email || ""} />
        </label>}
        <button className="h-11 rounded bg-[#293128] px-5 text-[10px] font-semibold uppercase tracking-wider text-white disabled:opacity-50 sm:col-span-2" disabled={loading} type="submit">{loading ? "Looking up…" : "Track order"}</button>
      </form>
      {error && <p role="alert" className="mt-4 text-xs text-rose-700">{error}</p>}
      {order && (
        <article className="mt-6 rounded-xl border border-[#e8e6df] bg-white p-5">
          <div className="flex flex-wrap justify-between gap-3"><div><p className="text-xs font-semibold">Order {order.transactionId}</p><p className="mt-1 text-[10px] text-[#85867d]">{new Date(order.createdAt).toLocaleString()}</p></div><span className="rounded-full bg-[#f4f2ec] px-2.5 py-1 text-[10px] capitalize">{order.status.replaceAll("-", " ")}</span></div>
          <p className="mt-4 border-t border-[#f0eee8] pt-4 text-xs text-[#555b50]">Payment: {order.paymentMethod === "cod" ? "Cash on delivery" : `Online · ${order.paymentStatus}`}</p>
          <p className="mt-2 text-xs font-medium">Order total: {formatTaka(order.total)}</p>
        </article>
      )}
    </div>
  );
}
