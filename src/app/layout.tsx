import type { Metadata } from "next";
import { Bebas_Neue, Montserrat } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/lib/cart-context";
import CartButton from "@/components/CartButton";
import CartDrawer from "@/components/CartDrawer";

const bebasNeue = Bebas_Neue({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-block",
  display: "swap",
});

const montserrat = Montserrat({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.id4g.com";

const TITLE = "I Die For The Gospel — Greg Romano Art";
const DESCRIPTION =
  "A limited-edition t-shirt drop for Christians who count the cost and follow anyway. Wearable art by Greg Romano.";

export const metadata: Metadata = {
  // Required for the relative openGraph/twitter image paths below to resolve
  // to absolute URLs — social scrapers reject relative ones.
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "I Die For The Gospel",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ID4G — I'll Die For The Gospel",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bebasNeue.variable} ${montserrat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <CartProvider>
          <CartButton />
          {children}
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
