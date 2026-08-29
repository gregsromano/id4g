/**
 * Lifestyle gallery constants shared by server and client code.
 *
 * Kept out of lifestyle.ts because that file is `server-only` (it holds the
 * service-role queries), and both the storefront mosaic and the admin grid —
 * client components — need the page size to agree with the server. A single
 * definition here is what keeps "Page 2" in the admin badge and page 2 of the
 * storefront showing the same images.
 */

/** How many images fill one page of the storefront mosaic. */
export const LIFESTYLE_PAGE_SIZE = 5;
