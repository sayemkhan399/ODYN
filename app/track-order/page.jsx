import { Suspense } from "react";
import TrackOrderForm from "@/components/TrackOrderForm";

export default function TrackOrderPage() {
  return (
    <main className="min-h-[65vh] bg-[#fbfaf7] px-4 py-10 sm:px-7 sm:py-14 lg:px-10">
      <div className="mx-auto max-w-[1180px]">
        <p className="text-[9px] font-semibold uppercase tracking-[.18em] text-[#858a70]">Order support</p>
        <h1 className="mt-2 border-b border-[#e8e6df] pb-6 font-serif text-4xl tracking-[-.05em] text-[#252b24]">Track order</h1>
        <section className="mt-7">
          <Suspense fallback={<p className="text-sm text-[#74776d]">Loading order tracking…</p>}>
            <TrackOrderForm />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
