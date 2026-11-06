import { Suspense } from "react";
import AllProducts from "@/pages/components/AllProducts";

export const metadata = {
  title: "All Products | ODYN Studio",
  description:
    "Explore the complete ODYN collection of considered everyday essentials and streetwear.",
};

export default function ProductsPage() {
  return (
    <Suspense fallback={<p className="px-4 py-16 text-center text-sm text-[#74776d]">Loading products…</p>}>
      <AllProducts />
    </Suspense>
  );
}
