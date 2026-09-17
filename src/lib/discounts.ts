import "server-only";

import type Stripe from "stripe";
import { getStripe } from "./stripe";

/**
 * Discount codes, stored in Stripe rather than in our database.
 *
 * Stripe is the source of truth on purpose. Checkout renders its own "Add
 * promotion code" box and validates the code server-side at redemption, so
 * the rules that actually matter — does this code exist, is it still active,
 * has it hit its redemption cap — are enforced by the same system that takes
 * the money. A `discount_codes` table here would be a second copy of that
 * state that can only ever drift out of sync with it, and drift on this
 * particular object means either honoring a dead code or refusing a live one.
 *
 * It also keeps Stripe Tax correct for free: tax is computed on the
 * discounted subtotal automatically. Applying our own percentage before
 * handing Stripe a price would silently under-collect CA sales tax on every
 * discounted order.
 *
 * The shape is two Stripe objects per code:
 *   - a Coupon holds the discount itself (percent off)
 *   - a Promotion Code is the customer-facing string mapped to that coupon
 * We always create them as a pair, so the admin can present them as one row.
 */

/** One discount code, flattened from the coupon/promotion-code pair. */
export type DiscountCode = {
  /** Promotion code id (`promo_…`) — what actions address. */
  id: string;
  /** The customer-facing string, e.g. "LAUNCH20". Always uppercase. */
  code: string;
  /** Percent off the subtotal, e.g. 20 for 20% off. */
  percentOff: number;
  /**
   * Whether the code can be redeemed right now.
   *
   * Read from Stripe's own `active`, which already accounts for the coupon
   * being deleted or invalid — not just the flag we last wrote.
   */
  active: boolean;
  /** How many times it has been used. */
  timesRedeemed: number;
  /**
   * Redemption cap, or null for unlimited. Stripe stops accepting the code
   * once `timesRedeemed` reaches this — enforced at checkout by Stripe, not
   * by us, so there is no window where a 26th customer slips through.
   */
  maxRedemptions: number | null;
  /** Unix seconds when the code stops working, or null for never. */
  expiresAt: number | null;
  /**
   * Unix seconds before which the code should not work, or null to start
   * immediately.
   *
   * Stripe has no start date on promotion codes — only `expires_at` — so this
   * is ours: the code is created INACTIVE and stored here in metadata, and
   * `syncScheduledCodes()` flips it active once the time passes.
   */
  startsAt: number | null;
  /** True when a start date is set and has not yet arrived. */
  scheduled: boolean;
  createdAt: string;
};

/**
 * Codes are matched case-insensitively by Stripe at redemption, but stored
 * and displayed as typed. Normalizing to uppercase here means the admin list
 * cannot show two rows that look like the same code.
 */
export const DISCOUNT_CODE_RE = /^[A-Z0-9-]{3,40}$/;

export function normalizeDiscountCode(input: string): string {
  return input.trim().toUpperCase();
}

/**
 * Percent-off only, and whole percents only.
 *
 * Stripe accepts fractional percentages, but a "12.5% off" code is a support
 * conversation waiting to happen on a store this size, and rounding a
 * fractional percent against a cents subtotal is where off-by-one refund
 * disputes come from.
 */
export function parsePercentOff(input: string): number | null {
  const text = input.trim();
  if (!text) return null;
  const percent = Number(text);
  if (!Number.isInteger(percent)) return null;
  if (percent < 1 || percent > 100) return null;
  return percent;
}

/**
 * A blank limit field means "no limit", which is different from a bad one:
 * blank is the common case and must not be an error, while "abc" must not
 * silently become unlimited. Hence the explicit "invalid".
 */
export function parseMaxRedemptions(input: string): number | null | "invalid" {
  const text = input.trim();
  if (!text) return null;
  const value = Number(text);
  if (!Number.isInteger(value) || value < 1) return "invalid";
  return value;
}

/**
 * Parses a `datetime-local` value ("2026-09-20T09:00") into Unix seconds.
 *
 * `new Date("YYYY-MM-DDTHH:mm")` with no zone suffix is interpreted in the
 * runtime's LOCAL timezone — which on Vercel is UTC, not California. So a
 * sale typed as 9am would start at 2am Pacific. The offset is therefore sent
 * with the value from the browser (see NewDiscountForm) and applied here, so
 * the time means what the person typing it meant.
 */
export function parseLocalDateTime(input: string): number | null | "invalid" {
  const text = input.trim();
  if (!text) return null;

  // Accepts "2026-09-20T09:00" plus an explicit offset the form appends,
  // e.g. "2026-09-20T09:00-07:00".
  const parsed = Date.parse(text);
  if (Number.isNaN(parsed)) return "invalid";
  return Math.floor(parsed / 1000);
}

function toDiscountCode(promo: Stripe.PromotionCode): DiscountCode | null {
  const coupon = promo.promotion?.coupon;

  // A promotion code whose coupon was deleted directly in the Stripe
  // dashboard still lists, but has nothing to apply. Drop it rather than
  // rendering a row with a blank discount that cannot be acted on.
  if (!coupon || typeof coupon === "string" || coupon.deleted) return null;
  if (coupon.percent_off == null) return null;

  const startsAtRaw = promo.metadata?.starts_at;
  const startsAt = startsAtRaw ? Number(startsAtRaw) : null;
  const validStartsAt = startsAt !== null && Number.isFinite(startsAt) ? startsAt : null;

  return {
    id: promo.id,
    code: promo.code,
    percentOff: coupon.percent_off,
    active: promo.active,
    timesRedeemed: promo.times_redeemed,
    maxRedemptions: promo.max_redemptions ?? null,
    expiresAt: promo.expires_at ?? null,
    startsAt: validStartsAt,
    scheduled: validStartsAt !== null && validStartsAt > Math.floor(Date.now() / 1000),
    createdAt: new Date(promo.created * 1000).toISOString(),
  };
}

/**
 * Every discount code, newest first.
 *
 * Expands the coupon in the same call — the percent off lives on the coupon,
 * not the promotion code, so without this the list would need one extra API
 * round trip per row.
 */
export async function listDiscountCodes(): Promise<DiscountCode[]> {
  const promos = await getStripe().promotionCodes.list({
    limit: 100,
    expand: ["data.promotion.coupon"],
  });

  return promos.data
    .map(toDiscountCode)
    .filter((code): code is DiscountCode => code !== null);
}

export type CreateDiscountResult =
  | { ok: true; code: DiscountCode }
  | { ok: false; error: string };

/**
 * Create a coupon + promotion code pair.
 *
 * `duration: "once"` is the only sensible value for a one-off payment store —
 * the other durations only mean something for subscriptions.
 *
 * Note the ordering problem this has to handle: the coupon is created first,
 * so a duplicate-code failure on the promotion code would otherwise leave an
 * orphaned coupon behind on every retry. We delete it back out on failure.
 */
export type DiscountLimits = {
  /** Stop after this many redemptions; null for unlimited. */
  maxRedemptions?: number | null;
  /** Unix seconds when the code stops working; null for never. */
  expiresAt?: number | null;
  /** Unix seconds before which the code must not work; null for immediately. */
  startsAt?: number | null;
};

export async function createDiscountCode(
  rawCode: string,
  percentOff: number,
  limits: DiscountLimits = {},
): Promise<CreateDiscountResult> {
  const code = normalizeDiscountCode(rawCode);

  if (!DISCOUNT_CODE_RE.test(code)) {
    return {
      ok: false,
      error: "Use 3–40 characters: letters, numbers and dashes only.",
    };
  }

  // Stripe enforces uniqueness only across ACTIVE codes, so a deactivated
  // code does not block reusing the string. Checking here lets us say which
  // code collided instead of surfacing a raw Stripe error.
  const existing = await listDiscountCodes();
  if (existing.some((c) => c.code === code && c.active)) {
    return { ok: false, error: `${code} already exists and is active.` };
  }

  const { maxRedemptions = null, expiresAt = null, startsAt = null } = limits;

  // Validate the limits BEFORE creating the coupon, so a bad date cannot
  // leave an orphaned coupon behind on Stripe.
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (maxRedemptions !== null) {
    if (!Number.isInteger(maxRedemptions) || maxRedemptions < 1) {
      return { ok: false, error: "Total uses must be a whole number of 1 or more." };
    }
  }

  if (expiresAt !== null && expiresAt <= nowSeconds) {
    return { ok: false, error: "The end date must be in the future." };
  }

  if (startsAt !== null && expiresAt !== null && startsAt >= expiresAt) {
    return { ok: false, error: "The start date must be before the end date." };
  }

  const stripe = getStripe();
  const coupon = await stripe.coupons.create({
    percent_off: percentOff,
    duration: "once",
    name: `${code} — ${percentOff}% off`,
  });

  try {
    // A future start date is ours to enforce: Stripe has no start field, so
    // the code is created INACTIVE and syncScheduledCodes() turns it on once
    // the time arrives. Created active when there is no start date, which is
    // the existing behavior.
    const scheduled = startsAt !== null && startsAt > nowSeconds;

    const promo = await stripe.promotionCodes.create({
      code,
      promotion: { type: "coupon", coupon: coupon.id },
      // Both are create-only on Stripe: neither can be added or changed
      // later, which is exactly why they have to be offered here.
      ...(maxRedemptions !== null ? { max_redemptions: maxRedemptions } : {}),
      ...(expiresAt !== null ? { expires_at: expiresAt } : {}),
      ...(scheduled ? { active: false } : {}),
      ...(startsAt !== null ? { metadata: { starts_at: String(startsAt) } } : {}),
      expand: ["promotion.coupon"],
    });

    const created = toDiscountCode(promo);
    if (!created) return { ok: false, error: "Stripe returned an unreadable code." };
    return { ok: true, code: created };
  } catch (error) {
    // Roll the coupon back so a retry is not blocked by our own debris.
    await stripe.coupons.del(coupon.id).catch(() => {});

    const message =
      error instanceof Error ? error.message : "Could not create the code.";
    return { ok: false, error: message };
  }
}

/**
 * Turn a code on or off.
 *
 * Deactivating rather than deleting: a promotion code that has been redeemed
 * is referenced by those orders, and Stripe keeps the association for
 * reporting. Deactivating stops new redemptions while leaving the history of
 * what was already sold at that price intact.
 */
export async function setDiscountCodeActive(
  promotionCodeId: string,
  active: boolean,
): Promise<void> {
  await getStripe().promotionCodes.update(promotionCodeId, { active });
}

/**
 * Activates any scheduled code whose start time has passed.
 *
 * Stripe has no start date on promotion codes, so a scheduled code is stored
 * inactive with its start time in metadata and switched on here. This runs on
 * the storefront checkout path and on the admin list, rather than on a cron:
 * Vercel's Hobby plan allows only ONE daily cron, so a code scheduled for
 * 9am could stay dark until the next day's run. Checking when someone
 * actually tries to use the store means the code is live the first time
 * anyone could benefit from it.
 *
 * Never throws. A failure here must not be able to break checkout or the
 * admin page — the worst case is a scheduled code that turns on slightly
 * later, which is the same failure mode as the cron it replaces.
 */
export async function syncScheduledCodes(): Promise<void> {
  try {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const promos = await getStripe().promotionCodes.list({
      active: false,
      limit: 100,
    });

    const due = promos.data.filter((promo) => {
      const raw = promo.metadata?.starts_at;
      if (!raw) return false;
      const startsAt = Number(raw);
      if (!Number.isFinite(startsAt) || startsAt > nowSeconds) return false;
      // An expired code must stay off — turning it on because its start
      // passed would resurrect a finished promotion.
      if (promo.expires_at !== null && promo.expires_at <= nowSeconds) return false;
      return true;
    });

    await Promise.all(
      due.map((promo) =>
        getStripe()
          .promotionCodes.update(promo.id, { active: true })
          .catch(() => {}),
      ),
    );
  } catch {
    // Deliberately silent: see above.
  }
}
