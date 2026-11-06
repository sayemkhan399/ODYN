"use client";

import { useEffect, useState } from "react";

export default function useCatalogLooks() {
  const [looks, setLooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadLooks() {
      try {
        const response = await fetch("/api/looks", {
          cache: "no-store",
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Try the Look could not be loaded.");
        }
        setLooks(result.looks);
        setError("");
      } catch (loadError) {
        if (loadError.name !== "AbortError") {
          console.error("Could not load storefront Try the Look avatars.", loadError);
          setError(loadError.message || "Try the Look could not be loaded.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadLooks();
    return () => controller.abort();
  }, []);

  return { looks, loading, error };
}
