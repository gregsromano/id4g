import "server-only";

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import { getSupabaseAdmin } from "./supabase";

/**
 * Admin user accounts, backed by the `admin_users` table.
 *
 * Passwords are hashed with Node's built-in scrypt (no new dependency, same
 * approach as the rest of the admin auth code) — never stored or compared as
 * plaintext. Each hash embeds its own random salt as `scrypt:<saltHex>:<hashHex>`
 * so a table dump alone isn't enough to check guesses against every account
 * with one rainbow table.
 */

const SCRYPT_KEYLEN = 64;
const MIN_PASSWORD_LENGTH = 8;

export type AdminUser = {
  id: string;
  email: string;
  createdAt: string;
};

type AdminUserRow = {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
};

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN);
  return `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPasswordHash(password: string, stored: string): boolean {
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;

  const [, saltHex, hashHex] = parts;
  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltHex, "hex");
    expected = Buffer.from(hashHex, "hex");
  } catch {
    return false;
  }
  if (expected.length !== SCRYPT_KEYLEN) return false;

  const candidate = scryptSync(password, salt, SCRYPT_KEYLEN);
  return timingSafeEqual(candidate, expected);
}

export function isValidNewPassword(password: string): boolean {
  return typeof password === "string" && password.length >= MIN_PASSWORD_LENGTH;
}

function toAdminUser(row: AdminUserRow): AdminUser {
  return { id: row.id, email: row.email, createdAt: row.created_at };
}

/** Used only to decide whether the login route should offer the one-time bootstrap path. */
export async function countAdminUsers(): Promise<number> {
  const { count, error } = await getSupabaseAdmin()
    .from("admin_users")
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function getAdminUserByEmailWithHash(
  email: string,
): Promise<(AdminUser & { passwordHash: string }) | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("admin_users")
    .select("id, email, password_hash, created_at")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as AdminUserRow;
  return { ...toAdminUser(row), passwordHash: row.password_hash };
}

export async function getAdminUserById(id: string): Promise<AdminUser | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("admin_users")
    .select("id, email, password_hash, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toAdminUser(data as AdminUserRow) : null;
}

export async function createAdminUser(email: string, password: string): Promise<AdminUser> {
  const { data, error } = await getSupabaseAdmin()
    .from("admin_users")
    .insert({ email: email.toLowerCase(), password_hash: hashPassword(password) })
    .select("id, email, password_hash, created_at")
    .single();
  if (error) throw error;
  return toAdminUser(data as AdminUserRow);
}

export async function updateAdminEmail(id: string, email: string): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("admin_users")
    .update({ email: email.toLowerCase(), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function updateAdminPassword(id: string, password: string): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("admin_users")
    .update({ password_hash: hashPassword(password), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
