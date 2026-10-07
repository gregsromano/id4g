import Script from "next/script";

import { CartProvider } from "@/lib/cart-context";
import CartDrawer from "@/components/CartDrawer";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";

/** Google Analytics 4 measurement ID. */
const GA_ID = "G-BD5PFM2HKH";

/**
 * Storefront chrome.
 *
 * The cart used to live in the root layout, which meant it rendered on every
 * route — including the admin dashboard. It sits here instead so `(admin)`
 * routes get no cart, while `/` and `/success` are unchanged. Route groups are
 * parenthesized, so neither URL moved.
 *
 * Google Analytics is here for the same reason: this layout wraps every
 * customer-facing page and nothing else, so the admin back office is not
 * counted as traffic — Greg's own sessions would otherwise inflate pageviews,
 * and order pages would send customer data to Google.
 */
export default function StoreLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <CartProvider>
      {/* next/script, not raw <script> tags in <head>: React strips script
          tags written into JSX, so the snippet as Google supplies it would
          silently do nothing here. `afterInteractive` is the default and the
          right strategy for analytics — it loads as soon as the page is
          interactive without blocking first paint. Both parts are needed:
          the loader, then the inline config that Google's snippet runs. */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
      <SiteHeader />
      {children}
      <SiteFooter />
      <CartDrawer />
    </CartProvider>
  );
}
