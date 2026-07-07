export default function Success() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-[var(--bg-primary)] px-6 py-32 text-center">
      <span className="section-label">Order Confirmed</span>
      <h1 className="max-w-lg">You&apos;re In.</h1>
      <p className="lead max-w-md">
        Thanks for your order. A confirmation email is on its way. Wear it
        boldly.
      </p>
    </main>
  );
}
