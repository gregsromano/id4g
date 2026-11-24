/**
 * Where a photo's actual subject sits inside the square product card, so the
 * card can zoom in until the subject fills the square — and no further.
 *
 * Fractions (0–1) of the square the photo is letterboxed into by
 * object-contain: a wide 1536×1024 hoodie shot has empty bands left and
 * right and empty space around the garment, and cards used to show all of
 * that. Measured once, at upload (AddImageTile) or by the backfill, never on
 * a shopper's page load.
 */
export type CardFit = { l: number; t: number; r: number; b: number };

/** Never zoom further than this, even for a tiny subject — it would just look blurry. */
const MAX_CARD_ZOOM = 2;
/** Keep the subject a hair inside the edge rather than touching it. */
const EDGE_MARGIN = 0.98;
/** A pixel this close to the corner colour (each of r, g, b) counts as background. */
const BG_TOLERANCE = 18;
/** Alpha at or under this is transparent background (soft drop-shadow edges included). */
const ALPHA_FLOOR = 20;

/**
 * Finds the subject in raw RGBA pixels (row-major, 4 bytes each). Background
 * is anything transparent, or anything matching the top-left corner's colour
 * when that corner is opaque (a photo on solid black or white). Returns null
 * when there's nothing to gain — the subject already reaches the frame edges
 * — or when the whole image looks like background.
 */
export function measureCardFit(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
): CardFit | null {
  if (width <= 0 || height <= 0 || data.length < width * height * 4) return null;
  const cornerOpaque = data[3] > 200;
  const [cr, cg, cb] = [data[0], data[1], data[2]];

  let x0 = width;
  let x1 = -1;
  let y0 = height;
  let y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const a = data[i + 3];
      if (a <= ALPHA_FLOOR) continue;
      if (
        cornerOpaque &&
        Math.abs(data[i] - cr) <= BG_TOLERANCE &&
        Math.abs(data[i + 1] - cg) <= BG_TOLERANCE &&
        Math.abs(data[i + 2] - cb) <= BG_TOLERANCE
      ) {
        continue;
      }
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return null;

  // Into the square card's coordinates: object-contain centres the image in
  // a square as wide as its longer side.
  const side = Math.max(width, height);
  const ox = (side - width) / 2;
  const oy = (side - height) / 2;
  const round = (v: number) => Math.round(v * 10000) / 10000;
  const fit = {
    l: round((x0 + ox) / side),
    t: round((y0 + oy) / side),
    r: round((x1 + 1 + ox) / side),
    b: round((y1 + 1 + oy) / side),
  };
  return cardZoom(fit) > 1.01 ? fit : null;
}

/** Accepts only a well-formed fit (e.g. from a request or the database); anything else is null. */
export function parseCardFit(value: unknown): CardFit | null {
  if (!value || typeof value !== "object") return null;
  const { l, t, r, b } = value as Record<string, unknown>;
  const nums = [l, t, r, b];
  if (!nums.every((n) => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1)) return null;
  const fit = { l, t, r, b } as CardFit;
  if (fit.r - fit.l < 0.05 || fit.b - fit.t < 0.05) return null;
  return fit;
}

function cardZoom(fit: CardFit): number {
  const zoom = Math.min(1 / (fit.r - fit.l), 1 / (fit.b - fit.t)) * EDGE_MARGIN;
  return Math.min(zoom, MAX_CARD_ZOOM);
}

/**
 * CSS transform that zooms the photo so its subject fills the card and sits
 * centred in it, or undefined for no change. Translate is in % of the card
 * (the element is the full square), applied after the scale about the
 * centre: the subject's centre m lands at m·s + translate = 0.
 */
export function cardFitTransform(value: unknown): string | undefined {
  const fit = parseCardFit(value);
  if (!fit) return undefined;
  const zoom = cardZoom(fit);
  if (zoom <= 1.01) return undefined;
  const mx = (fit.l + fit.r) / 2 - 0.5;
  const my = (fit.t + fit.b) / 2 - 0.5;
  const pct = (v: number) => `${(-v * zoom * 100).toFixed(2)}%`;
  return `translate(${pct(mx)}, ${pct(my)}) scale(${zoom.toFixed(3)})`;
}
