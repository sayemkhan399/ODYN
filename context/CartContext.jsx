"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("men");

  const addToCart = useCallback((product, selectedSize) => {
    const stockSize = product.sizes?.find((entry) => entry.size === selectedSize);
    if (!stockSize || stockSize.quantity < 1) return false;
    const cartKey = `${product.id}:${selectedSize}`;
    setItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.cartKey === cartKey);

      if (existingItem) {
        if (existingItem.quantity >= stockSize.quantity) return currentItems;
        return currentItems.map((item) =>
          item.cartKey === cartKey
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [...currentItems, { ...product, selectedSize, cartKey, quantity: 1 }];
    });
    return true;
  }, []);

  const updateQuantity = useCallback((cartKey, quantity) => {
    setItems((currentItems) =>
      quantity < 1
        ? currentItems.filter((item) => item.cartKey !== cartKey)
        : currentItems.map((item) => {
            if (item.cartKey !== cartKey) return item;
            const stock = item.sizes?.find((entry) => entry.size === item.selectedSize)?.quantity ?? 0;
            return { ...item, quantity: Math.min(quantity, stock) };
          }),
    );
  }, []);

  const removeFromCart = useCallback((cartKey) => {
    setItems((currentItems) =>
      currentItems.filter((item) => item.cartKey !== cartKey),
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const subtotal = items.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );

  const value = useMemo(
    () => ({
      items,
      itemCount,
      subtotal,
      isCartOpen,
      setIsCartOpen,
      activeCategory,
      setActiveCategory,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
    }),
    [
      items,
      itemCount,
      subtotal,
      isCartOpen,
      activeCategory,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }

  return context;
}
