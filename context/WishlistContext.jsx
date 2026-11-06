"use client";

import { createContext, Suspense, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authClient } from "@/lib/auth-client";

const WishlistContext = createContext(null);
const fallbackWishlist = {
  productIds: [],
  loaded: false,
  isWishlisted: () => false,
  addToWishlist: async () => { throw new Error("Authentication required."); },
  removeFromWishlist: async () => { throw new Error("Authentication required."); },
};

export function WishlistProvider({ children }) {
  return (
    <Suspense fallback={<WishlistContext.Provider value={fallbackWishlist}>{children}</WishlistContext.Provider>}>
      <AuthenticatedWishlistProvider>{children}</AuthenticatedWishlistProvider>
    </Suspense>
  );
}

function AuthenticatedWishlistProvider({ children }) {
  const { data: sessionData } = authClient.useSession();
  const [productIds, setProductIds] = useState([]);
  const [loadedForUser, setLoadedForUser] = useState("");

  useEffect(() => {
    const userId = sessionData?.user?.role === "customer" ? sessionData.user.id : "";
    if (!userId) return undefined;

    const controller = new AbortController();
    fetch("/api/account/wishlist", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Wishlist could not be loaded.");
        setProductIds(result.products.map((product) => product.id));
        setLoadedForUser(userId);
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Could not load the ODYN wishlist state.", error);
        }
      });
    return () => controller.abort();
  }, [sessionData?.user?.id, sessionData?.user?.role]);

  const currentUserId = sessionData?.user?.role === "customer" ? sessionData.user.id : "";

  const changeWishlist = useCallback(async (productId, action) => {
    const response = await fetch("/api/account/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, action }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Wishlist could not be updated.");
    setProductIds((current) =>
      action === "add"
        ? [...new Set([...current, productId])]
        : current.filter((id) => id !== productId),
    );
  }, []);

  const value = useMemo(() => ({
    productIds: currentUserId && loadedForUser === currentUserId ? productIds : [],
    loaded: Boolean(currentUserId && loadedForUser === currentUserId),
    isWishlisted: (productId) =>
      Boolean(currentUserId && loadedForUser === currentUserId) && productIds.includes(productId),
    addToWishlist: (productId) => changeWishlist(productId, "add"),
    removeFromWishlist: (productId) => changeWishlist(productId, "remove"),
  }), [changeWishlist, currentUserId, loadedForUser, productIds]);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error("useWishlist must be used within a WishlistProvider");
  return context;
}
