import "server-only";

import { createDiscountCode } from "./discounts";
import { assertServiceRoleConfigured, getSupabaseAdmin } from "./supabase";

/**
 * Email capture from the homepage popup, and the one-time welcome code each
 * signup earns.
 *
 * RLS is forced on `email_subscribers` with no policies, so everything here
 * goes through the service-role client — `server-only` makes an accidental
 * client import a build error. That matters more than usual here: the table
 * is a list of customer email addresses, and a browser-readable one would be
 * a scrapeable marketing list.
 */

export const WELCOME_PERCENT_OFF = 15;

/** How long a welcome code stays redeemable. */
const WELCOME_VALID_DAYS = 30;

/**
 * The exact disclosure the SMS consent checkbox carries, stored per signup.
 *
 * Exported so the popup renders the SAME string that gets recorded — if the
 * two drifted, the stored "proof of consent" would be to wording the person
 * never actually saw.
 */
export const SMS_CONSENT_TEXT =
  "I agree to receive recurring automated marketing text messages from ID4G at the number provided. Consent is not a condition of purchase. Msg & data rates may apply. Reply STOP to unsubscribe.";

export type SubscribeResult =
  | { ok: true; code: string; alreadySubscribed: boolean }
  | { ok: false; message: string };

/**
 * Deliberately permissive: one `@`, something either side, a dot in the
 * domain, no spaces. Anything stricter starts rejecting addresses that are
 * perfectly valid (plus-tags, new TLDs, unusual local parts), and the real
 * proof an address works is whether mail reaches it — which this app cannot
 * check today.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

/**
 * Keep only digits, then require 10 (US) or 11 starting with 1, and store as
 * E.164. Normalizing at the door means `(555) 123-4567`, `555-123-4567` and
 * `+15551234567` are one number rather than three, which matters the day
 * these are handed to an SMS provider that will only accept E.164.
 */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

export function isValidEmail(input: string): boolean {
  // Length cap mirrors the login route: 320 is the practical maximum for an
  // address, and bounding it keeps a huge body out of the database.
  return input.length <= 320 && EMAIL_RE.test(input);
}

/**
 * Four random characters from an alphabet with no 0/O or 1/I/L, so a code
 * read off a screen and typed by hand cannot be mistyped into someone
 * else's code. 32^4 is about a million combinations, which is ample given
 * each code is also single-use and expires.
 */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomSuffix(length = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

/**
 * Subscribe an address and return its welcome code.
 *
 * The INSERT happens before the Stripe code is created, and that order is the
 * whole safety property: the email is the primary key, so a duplicate submit
 * loses the race at the database and returns the existing row's code instead
 * of minting a second one. Doing it the other way round — check, then create,
 * then insert — races across serverless instances and hands the same person
 * two 15%-off codes.
 *
 * A row therefore briefly exists with `discount_code: null` while Stripe is
 * called. If that call fails, the row stays and the caller is told to try
 * again; the retry finds the row, sees a null code, and fills it in.
 */
export type SubscribeInput = {
  email: string;
  /** Optional: the popup's phone field may be left blank. */
  phone?: string;
  /** Whether the SMS consent box was ticked. */
  smsConsent?: boolean;
};

export async function subscribeEmail(input: SubscribeInput): Promise<SubscribeResult> {
  assertServiceRoleConfigured();

  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) {
    return { ok: false, message: "Enter a valid email address." };
  }

  // A phone is only stored when one was actually typed AND it parses. A
  // number that cannot be normalized is rejected rather than stored raw:
  // an unsendable number in the list is worse than no number, because it
  // looks like a reachable contact.
  const rawPhone = (input.phone ?? "").trim();
  let phone: string | null = null;
  if (rawPhone.length > 0) {
    phone = normalizePhone(rawPhone);
    if (!phone) {
      return { ok: false, message: "Enter a valid US phone number, or leave it blank." };
    }
  }

  // Consent is only meaningful alongside a number — ticking the box with no
  // phone consents to nothing, so it is not recorded as consent.
  const consented = Boolean(input.smsConsent) && phone !== null;

  const supabase = getSupabaseAdmin();

  // Claim the address. `ignoreDuplicates` turns a repeat submit into a no-op
  // rather than an error, so the existing row below is the single source of
  // truth for what this person was already given.
  const { error: insertError } = await supabase.from("email_subscribers").upsert(
    {
      email,
      source: "popup",
      phone,
      // Recorded together: the moment of consent and the exact wording shown.
      // "true" is not proof under TCPA — what has to be defensible is that
      // this person agreed to this text at this time.
      sms_consent_at: consented ? new Date().toISOString() : null,
      sms_consent_text: consented ? SMS_CONSENT_TEXT : null,
    },
    { onConflict: "email", ignoreDuplicates: true },
  );

  if (insertError) {
    console.error("[subscribers] failed to record email", {
      message: insertError.message,
    });
    return { ok: false, message: "Something went wrong. Please try again." };
  }

  const { data: row, error: readError } = await supabase
    .from("email_subscribers")
    .select("discount_code, phone")
    .eq("email", email)
    .maybeSingle();

  if (readError || !row) {
    console.error("[subscribers] failed to read subscriber back", {
      message: readError?.message,
    });
    return { ok: false, message: "Something went wrong. Please try again." };
  }

  const existing = row as { discount_code: string | null; phone: string | null };

  // A repeat signup that NOW includes a phone is new information, so fill it
  // in rather than discarding it. Only ever fills a blank: overwriting a
  // stored number from an unverified form would let anyone replace someone
  // else's number by re-submitting their email.
  if (phone && !existing.phone) {
    await supabase
      .from("email_subscribers")
      .update({
        phone,
        sms_consent_at: consented ? new Date().toISOString() : null,
        sms_consent_text: consented ? SMS_CONSENT_TEXT : null,
      })
      .eq("email", email);
  }

  const existingCode = existing.discount_code;
  if (existingCode) {
    // Already signed up: show the SAME code again rather than a second one.
    // Someone who lost the tab should not have to be told "no".
    return { ok: true, code: existingCode, alreadySubscribed: true };
  }

  const code = `WELCOME-${randomSuffix()}`;
  const expiresAt =
    Math.floor(Date.now() / 1000) + WELCOME_VALID_DAYS * 24 * 60 * 60;

  // max_redemptions 1 is what makes this genuinely one-time: Stripe refuses
  // the second redemption, so a code that gets screenshotted and posted
  // publicly is still only worth one order.
  const created = await createDiscountCode(code, WELCOME_PERCENT_OFF, {
    maxRedemptions: 1,
    expiresAt,
  });

  if (!created.ok) {
    console.error("[subscribers] failed to create welcome code", {
      error: created.error,
    });
    return { ok: false, message: "Could not create your code. Please try again." };
  }

  const { error: updateError } = await supabase
    .from("email_subscribers")
    .update({ discount_code: code })
    .eq("email", email);

  if (updateError) {
    // The Stripe code exists and works, so give it to them rather than
    // failing — losing the record is a reporting problem, not a customer one.
    console.error("[subscribers] code created but not recorded", {
      email,
      code,
      message: updateError.message,
    });
  }

  return { ok: true, code, alreadySubscribed: false };
}

export type Subscriber = {
  email: string;
  phone: string | null;
  /** ISO timestamp of SMS consent, or null if they never consented. */
  smsConsentAt: string | null;
  discountCode: string | null;
  source: string;
  createdAt: string;
};

/** Newest first, for the admin list. */
export async function listSubscribers(): Promise<Subscriber[]> {
  assertServiceRoleConfigured();

  const { data, error } = await getSupabaseAdmin()
    .from("email_subscribers")
    .select("email, phone, sms_consent_at, discount_code, source, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[subscribers] failed to list", { message: error.message });
    throw new Error("Failed to list subscribers");
  }

  return (
    data as {
      email: string;
      phone: string | null;
      sms_consent_at: string | null;
      discount_code: string | null;
      source: string;
      created_at: string;
    }[]
  ).map((row) => ({
    email: row.email,
    phone: row.phone,
    smsConsentAt: row.sms_consent_at,
    discountCode: row.discount_code,
    source: row.source,
    createdAt: row.created_at,
  }));
}
