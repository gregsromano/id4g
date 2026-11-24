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
  /** Add a variant to the cart (merges quantity if that exact line — including any custom note — is already present). */
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  setQuantity: (productId: string, variantId: string, quantity: number, customNote?: string) => void;
  removeItem: (productId: string, variantId: string, customNote?: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

/**
 * Includes `customNote` so a made-to-order recreation (see ProductPurchasePanel's
 * custom-size flow) never merges with the plain original — same productId/variantId,
 * different fulfillment instructions.
 */
function lineKey(productId: string, variantId: string, customNote?: string) {
  return `${productId}::${variantId}::${customNote ?? ""}`;
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

  const lineSignature = items.map((i) => lineKey(i.productId, i.variantId, i.customNote)).join("|");

  // Re-price the cart whenever it opens (adding an item opens it too). Prices
  // are snapshots from add-to-cart time, so a sale that started or ended
  // since would otherwise show one total here and charge another at Stripe.
  // Only price/shipping change; a line that can't be bought any more is left
  // for checkout to reject with its usual message.
  useEffect(() => {
    if (!hydrated || !isOpen || items.length === 0) return;
    const controller = new AbortController();
    const sent = items.map((i) => ({
      productId: i.productId,
      variantId: i.variantId,
      customNote: i.customNote,
    }));
    fetch("/api/cart/prices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: sent }),
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { prices?: ({ priceCents: number; shippingCents: number } | null)[] } | null) => {
        const prices = data?.prices;
        if (!Array.isArray(prices) || prices.length !== sent.length) return;
        const fresh = new Map<string, { priceCents: number; shippingCents: number }>();
        sent.forEach((line, index) => {
          const price = prices[index];
          if (price) fresh.set(lineKey(line.productId, line.variantId, line.customNote), price);
        });
        setItems((prev) => {
          let changed = false;
          const next = prev.map((item) => {
            const price = fresh.get(lineKey(item.productId, item.variantId, item.customNote));
            if (!price) return item;
            if (price.priceCents === item.priceCents && price.shippingCents === item.shippingCents) {
              return item;
            }
            changed = true;
            return { ...item, ...price };
          });
          // Unchanged prices keep the same array, so this doesn't loop.
          return changed ? next : prev;
        });
      })
      .catch(() => {
        // Offline or aborted: keep showing the saved prices; checkout still charges the real ones.
      });
    return () => controller.abort();
    // Re-run on open and when the set of lines changes, not on quantity edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, isOpen, lineSignature]);

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
          const key = lineKey(item.productId, item.variantId, item.customNote);
          const existing = prev.find(
            (i) => lineKey(i.productId, i.variantId, i.customNote) === key,
          );
          if (existing) {
            return prev.map((i) =>
              lineKey(i.productId, i.variantId, i.customNote) === key
                ? { ...i, quantity: i.quantity + quantity }
                : i,
            );
          }
          return [...prev, { ...item, quantity }];
        });
        setIsOpen(true);
      },
      setQuantity: (productId, variantId, quantity, customNote) => {
        setItems((prev) => {
          const key = lineKey(productId, variantId, customNote);
          if (quantity <= 0) {
            return prev.filter((i) => lineKey(i.productId, i.variantId, i.customNote) !== key);
          }
          return prev.map((i) =>
            lineKey(i.productId, i.variantId, i.customNote) === key ? { ...i, quantity } : i,
          );
        });
      },
      removeItem: (productId, variantId, customNote) => {
        const key = lineKey(productId, variantId, customNote);
        setItems((prev) =>
          prev.filter((i) => lineKey(i.productId, i.variantId, i.customNote) !== key),
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
