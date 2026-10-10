import { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext(null);
const STORAGE_KEY = "cart_items_v1";

// Each line: { variantId, sku, name, productName, price, quantity, maxStock }
function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadInitial);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (variant, product, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.variantId === variant.id);
      if (existing) {
        const nextQty = Math.min(existing.quantity + quantity, variant.stock);
        return prev.map((i) => (i.variantId === variant.id ? { ...i, quantity: nextQty } : i));
      }
      return [
        ...prev,
        {
          variantId: variant.id,
          sku: variant.sku,
          name: variant.name,
          productName: product.name,
          price: Number(variant.price),
          quantity: Math.min(quantity, variant.stock),
          maxStock: variant.stock,
        },
      ];
    });
  };

  const updateQuantity = (variantId, quantity) => {
    setItems((prev) =>
      prev
        .map((i) => (i.variantId === variantId ? { ...i, quantity: Math.max(1, Math.min(quantity, i.maxStock)) } : i))
    );
  };

  const removeItem = (variantId) => {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId));
  };

  const clearCart = () => setItems([]);

  const totalAmount = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items]
  );
  const totalCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);

  return (
    <CartContext.Provider
      value={{ items, addItem, updateQuantity, removeItem, clearCart, totalAmount, totalCount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
