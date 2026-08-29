import { requireAdminUser } from "@/lib/admin-dal";
import AvatarForm from "./AvatarForm";
import EmailForm from "./EmailForm";
import PasswordForm from "./PasswordForm";

export const dynamic = "force-dynamic";

export default async function AdminProfilePage() {
  const user = await requireAdminUser();

  return (
    <div className="mx-auto w-full max-w-lg">
      <span className="section-label">Account</span>
      <h1 className="!text-3xl mt-1 text-[var(--text-primary)]">Profile</h1>

      <section className="mt-8 border border-[var(--border)] p-6">
        <span className="section-label">Profile photo</span>
        <AvatarForm avatarUrl={user.avatarUrl} email={user.email} />
      </section>

      <section className="mt-6 border border-[var(--border)] p-6">
        <span className="section-label">Email</span>
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          Currently <span className="text-[var(--text-primary)]">{user.email}</span>
        </p>
        <EmailForm />
      </section>

      <section className="mt-6 border border-[var(--border)] p-6">
        <span className="section-label">Password</span>
        <PasswordForm />
      </section>
    </div>
  );
}
