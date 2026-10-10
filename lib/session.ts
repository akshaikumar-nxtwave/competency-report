import { createHmac, timingSafeEqual } from "node:crypto";
import { cacheLife } from "next/cache";
import { cookies } from "next/headers";

const COOKIE_NAME = "cr_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type Session = { email: string; name: string; exp: number };

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET must be set (16+ chars)");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function encode(session: Session): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decode(token: string): Session | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
    return session.exp > Date.now() ? session : null;
  } catch {
    return null;
  }
}

/** Reads and verifies the session cookie. Use in Server Actions. */
export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  return token ? decode(token) : null;
}

/**
 * Same as getSession, for rendering. The private cache scope lets the expiry check
 * use Date.now() while the per-session shell is prerendered, and keeps the result
 * out of any server-side cache.
 */
export async function readSession(): Promise<Session | null> {
  "use cache: private";
  cacheLife("minutes");
  return getSession();
}

export async function createSession(email: string, name: string): Promise<void> {
  const token = encode({ email, name, exp: Date.now() + MAX_AGE_SECONDS * 1000 });
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}
