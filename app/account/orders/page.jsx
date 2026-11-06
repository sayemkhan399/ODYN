"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatTaka } from "@/lib/currency";

export default function AccountOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/orders", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Orders could not be loaded.");
        setOrders(result.orders);
      })
      .catch((loadError) => {
        if (loadError.name !== "AbortError") {
          console.error("Could not load ODYN customer orders.", loadError);
          setError(loadError.message || "Orders could not be loaded.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  return (
    <div>
      <h2 className="font-serif text-2xl text-[#252b24]">My orders</h2>
      <p className="mt-1 text-xs text-[#74776d]">Orders placed with this account.</p>
      {error && <p role="alert" className="mt-5 rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
      {loading ? <p className="mt-8 text-sm text-[#74776d]">Loading orders…</p> : orders.length ? (
        <div className="mt-6 space-y-3">
          {orders.map((order) => (
            <article key={order.id} className="rounded-xl border border-[#e8e6df] bg-white p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="text-xs font-semibold text-[#252b24]">Order {order.transactionId}</p><p className="mt-1 text-[10px] text-[#85867d]">{new Date(order.createdAt).toLocaleString()}</p></div>
                <span className="rounded-full bg-[#f4f2ec] px-2.5 py-1 text-[10px] capitalize text-[#555b50]">{order.status.replaceAll("-", " ")}</span>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#f0eee8] pt-3">
                <p className="text-xs text-[#555b50]">{order.items.reduce((sum, item) => sum + item.quantity, 0)} item(s) · {formatTaka(order.total)}</p>
                <Link className="text-[10px] font-semibold uppercase tracking-wide text-[#394239] underline underline-offset-4" href={`/account/track?order=${order.id}`}>Track order</Link>
              </div>
            </article>
          ))}
        </div>
      ) : <p className="mt-8 rounded-xl border border-dashed border-[#d8d7ce] p-8 text-center text-sm text-[#74776d]">There are no orders on this account yet.</p>}
    </div>
  );
}
