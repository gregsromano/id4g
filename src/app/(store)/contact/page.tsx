"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Submits via mailto: for now — opens the visitor's email client with the
 * message pre-filled to send. Swap this for a server-side send (Resend) once
 * that's set up; the form/fields stay the same either way.
 */
const CONTACT_EMAIL = "illdieforthegospel@gmail.com";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const bodyLines = [
      `Name: ${name}`,
      `Email: ${email}`,
      phone ? `Phone: ${phone}` : null,
      "",
      message,
    ].filter((line) => line !== null);

    const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
      `Message from ${name}`
    )}&body=${encodeURIComponent(bodyLines.join("\n"))}`;

    window.location.href = mailto;
  }

  return (
    <main className="relative flex-1 overflow-hidden bg-[var(--bg-primary)]">
      {/* Paint splatter texture — matches the homepage hero */}
      <Image
        src="/paint-drip.png"
        alt=""
        width={291}
        height={168}
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 z-0 w-[240px] opacity-90 mix-blend-screen sm:w-[340px] lg:w-[420px]"
      />
      <Image
        src="/paint-drip.png"
        alt=""
        width={291}
        height={168}
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 z-0 hidden w-[220px] rotate-180 opacity-60 mix-blend-screen sm:block sm:w-[300px]"
      />

      <section className="relative z-10 mx-auto max-w-2xl px-6 py-16 sm:py-24">
        <span className="section-label mb-4 !text-base sm:!text-lg">
          Get In Touch
        </span>
        <h1 className="mb-10 !text-5xl sm:!text-6xl">Contact</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Field label="Name" required>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
          </Field>

          <Field label="Email" required>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
          </Field>

          <Field label="Phone Number">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
          </Field>

          <Field label="Message" required>
            <textarea
              required
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full resize-none border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
          </Field>

          <button type="submit" className="btn-primary">
            Send Message
          </button>
        </form>
      </section>
    </main>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold uppercase tracking-widest text-[var(--text-body)]">
        {label}
        {required && <span className="text-[var(--accent)]"> *</span>}
      </span>
      {children}
    </label>
  );
}
