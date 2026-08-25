"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  cartCount,
  cartSubtotalCents,
  shippingForCents,
  type CartItem,
} from "@/lib/product";

const STORAGE_KEY = "id4g_cart_v1";

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  /** Cart drawer open state. */
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  /** Add a variant to the cart (merges quantity if that variant is already present). */
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  setQuantity: (productId: string, variantId: string, quantity: number) => void;
  removeItem: (productId: string, variantId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function lineKey(productId: string, variantId: string) {
  return `${productId}::${variantId}`;
}

/** Guard against malformed data coming out of localStorage. */
function parseStored(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (i): i is CartItem =>
        i &&
        typeof i.productId === "string" &&
        typeof i.variantId === "string" &&
        typeof i.priceCents === "number" &&
        typeof i.quantity === "number" &&
        i.quantity > 0,
    );
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  // Server renders with an empty cart; the client re-reads from localStorage
  // once mounted (see the hydrate effect below) to avoid an SSR mismatch.
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage once, after mount. setState-in-effect is
  // intentional here: localStorage is unavailable during SSR, so the cart
  // must be read on the client after the initial (empty) render.
  useEffect(() => {
    const stored = parseStored(localStorage.getItem(STORAGE_KEY));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored.length > 0) setItems(stored);
    setHydrated(true);
  }, []);

  // Persist on change, but only after the initial hydrate so we don't clobber
  // stored data with the empty server-render state.
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  // Keep the cart in sync across tabs.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setItems(parseStored(e.newValue));
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const subtotalCents = cartSubtotalCents(items);
    const shippingCents = shippingForCents(items);
    return {
      items,
      count: cartCount(items),
      subtotalCents,
      shippingCents,
      totalCents: subtotalCents + shippingCents,
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      addItem: (item, quantity = 1) => {
        if (quantity <= 0) return;
        setItems((prev) => {
          const key = lineKey(item.productId, item.variantId);
          const existing = prev.find(
            (i) => lineKey(i.productId, i.variantId) === key,
          );
          if (existing) {
            return prev.map((i) =>
              lineKey(i.productId, i.variantId) === key
                ? { ...i, quantity: i.quantity + quantity }
                : i,
            );
          }
          return [...prev, { ...item, quantity }];
        });
        setIsOpen(true);
      },
      setQuantity: (productId, variantId, quantity) => {
        setItems((prev) => {
          const key = lineKey(productId, variantId);
          if (quantity <= 0) {
            return prev.filter((i) => lineKey(i.productId, i.variantId) !== key);
          }
          return prev.map((i) =>
            lineKey(i.productId, i.variantId) === key ? { ...i, quantity } : i,
          );
        });
      },
      removeItem: (productId, variantId) => {
        const key = lineKey(productId, variantId);
        setItems((prev) =>
          prev.filter((i) => lineKey(i.productId, i.variantId) !== key),
        );
      },
      clear: () => setItems([]),
    };
  }, [items, isOpen]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
