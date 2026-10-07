import EmailPopupToggle from "@/components/admin/EmailPopupToggle";
import SubscribersTable from "@/components/admin/SubscribersTable";
import { getSiteSettings } from "@/lib/settings";
import { listSubscribers, WELCOME_PERCENT_OFF } from "@/lib/subscribers";

// Signups arrive continuously, so this page must never be served stale.
export const dynamic = "force-dynamic";

export default async function AdminEmailPage() {
  const [settings, subscribers] = await Promise.all([
    getSiteSettings(),
    listSubscribers(),
  ]);

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div>
        <span className="section-label">Marketing</span>
        <h1 className="!text-4xl mt-1 text-[var(--text-primary)]">Email signups</h1>
        <p className="mt-3 max-w-xl text-sm text-[var(--text-muted)]">
          The homepage popup trades {WELCOME_PERCENT_OFF}% off for an email address.
          Each person gets their own code that works once and expires after 30 days,
          so a code that gets shared publicly is still only worth one order. The codes
          are real Stripe promotion codes — they also show on the Discounts page.
        </p>
      </div>

      <EmailPopupToggle enabled={settings.emailPopupEnabled} />

      <SubscribersTable subscribers={subscribers} />
    </div>
  );
}
