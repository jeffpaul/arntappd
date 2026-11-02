import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { singleton } from "./cache";
import { config, isProduction } from "./config";

/**
 * The signed-in Untappd account lives in an encrypted, HttpOnly cookie rather
 * than server memory, so a restart (or Render's free plan going to sleep)
 * does not sign people out. The browser can't read the token inside it.
 */
export type Session = { token: string; userId: number | null; userName: string | null; iat: number };

export const SESSION_COOKIE = "arntappd_session";
export const STATE_COOKIE = "arntappd_oauth_state";
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // seconds

// Without SESSION_SECRET in development, use a per-process key: sign-in works
// but ends when the dev server restarts. Production refuses to sign in instead.
const devKey = singleton("devSessionKey", () => randomBytes(32));

function key(): Buffer | null {
  const secret = config.sessionSecret();
  if (secret) return createHash("sha256").update(secret).digest();
  return isProduction() ? null : devKey;
}

export function sealSession(session: Session): string | null {
  const k = key();
  if (!k) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", k, iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(session), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

export function openSession(value: string | undefined): Session | null {
  const k = key();
  if (!k || !value) return null;
  try {
    const raw = Buffer.from(value, "base64url");
    if (raw.length < 29) return null;
    const decipher = createDecipheriv("aes-256-gcm", k, raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    const json = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
    const s = JSON.parse(json) as Session;
    if (typeof s.token !== "string" || !s.token) return null;
    if (typeof s.iat !== "number" || Date.now() / 1000 - s.iat > SESSION_MAX_AGE) return null;
    return s;
  } catch {
    return null;
  }
}

export const cookieOptions = (maxAge: number, path = "/") => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: (config.appBaseUrl() ?? "").startsWith("https://"),
  path,
  maxAge,
});

export async function currentSession(): Promise<Session | null> {
  const jar = await cookies();
  return openSession(jar.get(SESSION_COOKIE)?.value);
}

/**
 * The Untappd token to use for personal data: the signed-in person's, or the
 * optional development token when nobody is signed in.
 */
export async function personalToken(): Promise<{ token: string | null; source: "session" | "dev" | null }> {
  const session = await currentSession();
  if (session) return { token: session.token, source: "session" };
  const dev = config.untappdAccessToken();
  return dev ? { token: dev, source: "dev" } : { token: null, source: null };
}
