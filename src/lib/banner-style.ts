/**
 * Look of the announcement banner under the storefront menu, chosen in
 * /admin/menu. Client-safe: the admin form, the server action and the
 * storefront header all read these lists, so an option offered in the form
 * is always one the header knows how to draw.
 */

/** The banner's original colors — the site's accent cyan with near-black text. */
export const DEFAULT_BANNER_BG = "#24e0ff";
export const DEFAULT_BANNER_TEXT = "#04131a";

/** The SALE tag's original colors — the same accent pair as the banner. */
export const DEFAULT_SALE_BADGE = { bgColor: DEFAULT_BANNER_BG, textColor: DEFAULT_BANNER_TEXT };
export type SaleBadgeColors = { bgColor: string; textColor: string };

const HEX_RE = /^#[0-9a-f]{6}$/i;

/** "#RRGGBB" lowercased, or null if it isn't one. Also accepts "RRGGBB" and "#RGB". */
export function normalizeHex(input: string): string | null {
  let text = input.trim().toLowerCase();
  if (!text.startsWith("#")) text = `#${text}`;
  if (/^#[0-9a-f]{3}$/.test(text)) {
    text = `#${text[1]}${text[1]}${text[2]}${text[2]}${text[3]}${text[3]}`;
  }
  return HEX_RE.test(text) ? text : null;
}

/**
 * Fonts already loaded by the site (Montserrat, Bebas Neue) plus two system
 * stacks that every device has, so picking one never downloads anything.
 */
export const BANNER_FONTS = {
  body: { label: "Montserrat (site text)", className: "font-[family-name:var(--font-body)]" },
  block: { label: "Bebas Neue (headlines)", className: "font-[family-name:var(--font-block)]" },
  serif: { label: "Serif", className: "font-serif" },
  mono: { label: "Typewriter", className: "font-mono" },
} as const;
export type BannerFont = keyof typeof BANNER_FONTS;

export const BANNER_SIZES = {
  sm: { label: "Small", className: "text-xs" },
  md: { label: "Medium", className: "text-xs sm:text-sm" },
  lg: { label: "Large", className: "text-sm sm:text-lg" },
  xl: { label: "Extra large", className: "text-base sm:text-2xl" },
} as const;
export type BannerSize = keyof typeof BANNER_SIZES;

export type BannerStyle = {
  bgColor: string;
  textColor: string;
  bold: boolean;
  size: BannerSize;
  font: BannerFont;
};

export const DEFAULT_BANNER_STYLE: BannerStyle = {
  bgColor: DEFAULT_BANNER_BG,
  textColor: DEFAULT_BANNER_TEXT,
  bold: true,
  size: "md",
  font: "body",
};

export function isBannerFont(value: unknown): value is BannerFont {
  return typeof value === "string" && Object.hasOwn(BANNER_FONTS, value);
}

export function isBannerSize(value: unknown): value is BannerSize {
  return typeof value === "string" && Object.hasOwn(BANNER_SIZES, value);
}

/**
 * Class names and inline colors for the banner strip. The colors go inline
 * because they're arbitrary hex values; they're validated by normalizeHex on
 * save, so nothing but "#rrggbb" ever reaches the style attribute.
 */
export function bannerPresentation(style: BannerStyle): {
  className: string;
  style: { backgroundColor: string; color: string };
} {
  return {
    className: [
      "px-6 py-2.5 text-center uppercase tracking-widest",
      BANNER_FONTS[style.font].className,
      BANNER_SIZES[style.size].className,
      style.bold ? "font-bold" : "font-normal",
    ].join(" "),
    style: { backgroundColor: style.bgColor, color: style.textColor },
  };
}

/**
 * WCAG contrast ratio between two hex colors (1 to 21). The form warns
 * below 4.5:1, where text gets hard to read — it doesn't block, the colors
 * are Greg's call.
 */
export function contrastRatio(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
