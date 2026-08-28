"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        router.replace("/admin");
        router.refresh();
        return;
      }
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Incorrect email or password");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-24">
      <div className="w-full max-w-sm border border-[var(--border)] p-8">
        <span className="section-label">Fulfillment</span>
        <h1 className="!text-3xl mt-2 text-[var(--text-primary)]">Sign in</h1>

        <form onSubmit={handleSubmit} className="mt-8">
          <label
            htmlFor="email"
            className="mb-2 block text-xs uppercase tracking-widest text-[var(--text-muted)]"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            autoFocus
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mb-5 w-full border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />

          <label
            htmlFor="password"
            className="mb-2 block text-xs uppercase tracking-widest text-[var(--text-muted)]"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />

          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading || email.length === 0 || password.length === 0}
            className="btn-primary mt-6 w-full"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
