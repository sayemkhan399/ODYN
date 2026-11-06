"use client";

import { useEffect, useState } from "react";

export default function useCatalogProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      try {
        const response = await fetch("/api/products", {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Products could not be loaded.");
        }
        setProducts(result.products);
        setError("");
      } catch (loadError) {
        if (loadError.name !== "AbortError") {
          console.error("Could not load the ODYN storefront catalog.", loadError);
          setError(loadError.message || "Products could not be loaded.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadProducts();
    return () => controller.abort();
  }, []);

  return { products, loading, error };
}
