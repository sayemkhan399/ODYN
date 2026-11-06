"use client";

import { useEffect, useState } from "react";
import ProductCard from "@/components/ProductCard";
import { useWishlist } from "@/context/WishlistContext";

export default function AccountWishlistPage() {
  const { removeFromWishlist } = useWishlist();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/account/wishlist", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Wishlist could not be loaded.");
        setProducts(result.products);
      })
      .catch((loadError) => {
        if (loadError.name !== "AbortError") {
          console.error("Could not load the ODYN wishlist.", loadError);
          setError(loadError.message || "Wishlist could not be loaded.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  async function remove(productId) {
    try {
      await removeFromWishlist(productId);
      setProducts((current) => current.filter((product) => product.id !== productId));
    } catch (removeError) {
      console.error("Could not remove a product from the ODYN wishlist.", removeError);
      setError(removeError.message || "Wishlist item could not be removed.");
    }
  }

  return (
    <div>
      <h2 className="font-serif text-2xl text-[#252b24]">Wishlist</h2>
      <p className="mt-1 text-xs text-[#74776d]">Products saved to your account.</p>
      {error && <p role="alert" className="mt-5 rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
      {loading ? <p className="mt-8 text-sm text-[#74776d]">Loading wishlist…</p> : products.length ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {products.map((product) => (
            <div key={product.id}>
              <ProductCard product={product} />
              <button className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-rose-700 underline underline-offset-4" onClick={() => remove(product.id)} type="button">Remove from wishlist</button>
            </div>
          ))}
        </div>
      ) : <p className="mt-8 rounded-xl border border-dashed border-[#d8d7ce] p-8 text-center text-sm text-[#74776d]">Your wishlist is empty. Save products with the heart icon.</p>}
    </div>
  );
}
