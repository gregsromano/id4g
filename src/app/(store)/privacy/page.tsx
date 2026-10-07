import type { Metadata } from "next";
import Link from "next/link";

import { CONTACT_URL } from "@/lib/nav-links";
import { SMS_CONSENT_TEXT, WELCOME_PERCENT_OFF } from "@/lib/subscribers";

export const metadata: Metadata = {
  title: "Privacy Policy — I'm Down For The Gospel",
  description:
    "How ID4G collects, uses and protects your information, including email and SMS marketing.",
};

/**
 * Privacy policy.
 *
 * Exists because the signup popup collects a phone number for SMS marketing:
 * US carriers and the TCPA both expect a reachable policy describing what is
 * collected and how to stop messages, and the consent disclosure links here.
 *
 * Written against what this app ACTUALLY does — Stripe for payments, Supabase
 * for storage, no third-party ad trackers — rather than from a generic
 * template that would claim practices the site does not have.
 *
 * The SMS consent wording is imported rather than retyped, so the policy
 * cannot drift from the text people actually agreed to in the popup.
 */

const LAST_UPDATED = "October 7, 2026";

export default function PrivacyPage() {
  return (
    <main className="flex-1 bg-[var(--bg-primary)]">
      <div className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
        <span className="section-label mb-3">Legal</span>
        <h1 className="!text-4xl text-[var(--text-primary)] sm:!text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          Last updated {LAST_UPDATED}
        </p>

        <div className="mt-10 space-y-10">
          <Section title="Who we are">
            <p>
              I&rsquo;m Down For The Gospel (&ldquo;ID4G&rdquo;, &ldquo;we&rdquo;) is a
              streetwear brand by Greg Romano, selling at{" "}
              <span className="text-[var(--text-primary)]">id4g.com</span>. This policy
              explains what we collect, why, and what you can do about it.
            </p>
          </Section>

          <Section title="What we collect">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-[var(--text-primary)]">Order information.</strong>{" "}
                When you buy something, we receive your name, email, shipping address and
                order details. Card numbers go directly to Stripe, our payment processor
                — we never see or store them.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Email address.</strong> If
                you sign up for our list, we store your email so we can tell you about new
                drops and sales.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Phone number.</strong> Only
                if you choose to give one and tick the consent box. It is optional, and
                leaving it blank does not affect your discount or your order.
              </li>
            </ul>
          </Section>

          <Section title="Text messages (SMS)">
            <p>
              If you give a phone number and tick the box, you agree to the following:
            </p>
            <blockquote className="mt-3 border-l-2 border-[var(--accent)] pl-4 text-[var(--text-body)]">
              {SMS_CONSENT_TEXT}
            </blockquote>
            <p className="mt-3">
              Message frequency varies. Consent is{" "}
              <strong className="text-[var(--text-primary)]">not</strong> a condition of
              any purchase. Message and data rates may apply.
            </p>
            <p className="mt-3">
              <strong className="text-[var(--text-primary)]">To stop:</strong> reply{" "}
              <strong className="text-[var(--text-primary)]">STOP</strong> to any message
              and we will stop texting you. Reply{" "}
              <strong className="text-[var(--text-primary)]">HELP</strong> for help, or
              contact us using the link below.
            </p>
          </Section>

          <Section title="How we use it">
            <p>
              To fulfil and ship your orders, to answer your questions, and — if you
              opted in — to send you marketing about new drops and sales. Your{" "}
              {WELCOME_PERCENT_OFF}% welcome code is issued through Stripe and tied to
              your signup.
            </p>
            <p className="mt-3">
              We do{" "}
              <strong className="text-[var(--text-primary)]">not sell or rent</strong>{" "}
              your personal information, and we do not share it for anyone else&rsquo;s
              advertising.
            </p>
          </Section>

          <Section title="Who we share it with">
            <p>
              Only the services that make the store work:{" "}
              <strong className="text-[var(--text-primary)]">Stripe</strong> (payments and
              discount codes), <strong className="text-[var(--text-primary)]">Supabase</strong>{" "}
              (our database), and{" "}
              <strong className="text-[var(--text-primary)]">Vercel</strong> (hosting).
              Each handles your data under its own privacy terms, and only to provide
              that service to us. We may also disclose information if the law requires it.
            </p>
          </Section>

          <Section title="Your choices">
            <ul className="list-disc space-y-2 pl-5">
              <li>Unsubscribe from marketing email at any time using the link in it.</li>
              <li>Reply STOP to any text message to stop SMS.</li>
              <li>
                Ask us to tell you what we hold about you, correct it, or delete it —
                just get in touch.
              </li>
            </ul>
          </Section>

          <Section title="Keeping it safe">
            <p>
              Signup records are stored in a database that is not publicly readable, and
              payment details never reach our servers. No system is perfectly secure, but
              we keep what we collect to the minimum we actually need.
            </p>
          </Section>

          <Section title="Children">
            <p>
              This store is not directed at children under 13, and we do not knowingly
              collect their information.
            </p>
          </Section>

          <Section title="Changes">
            <p>
              If this policy changes, the date at the top changes with it. Material
              changes to how we use your information will be made clear at signup.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Questions about this policy, or want your information removed? Reach us
              through our{" "}
              <Link
                href="/contact"
                className="text-[var(--accent)] underline-offset-4 hover:underline"
              >
                contact page
              </Link>{" "}
              or on{" "}
              <a
                href={CONTACT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent)] underline-offset-4 hover:underline"
              >
                Instagram
              </a>
              .
            </p>
          </Section>
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="!text-xl !normal-case text-[var(--text-primary)]">{title}</h2>
      <div className="mt-3 text-sm leading-relaxed text-[var(--text-body)]">
        {children}
      </div>
    </section>
  );
}
