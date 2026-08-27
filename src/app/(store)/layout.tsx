import { CartProvider } from "@/lib/cart-context";
import CartDrawer from "@/components/CartDrawer";
import SiteHeader from "@/components/SiteHeader";

/**
 * Storefront chrome.
 *
 * The cart used to live in the root layout, which meant it rendered on every
 * route — including the admin dashboard. It sits here instead so `(admin)`
 * routes get no cart, while `/` and `/success` are unchanged. Route groups are
 * parenthesized, so neither URL moved.
 */
export default function StoreLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <CartProvider>
      <SiteHeader />
      {children}
      <CartDrawer />
    </CartProvider>
  );
}
