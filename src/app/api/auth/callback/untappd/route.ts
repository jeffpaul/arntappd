import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { CALLBACK_PATH, config } from "@/lib/server/config";
import { SESSION_COOKIE, SESSION_MAX_AGE, STATE_COOKIE, cookieOptions, sealSession } from "@/lib/server/session";
import { currentUser, exchangeCode } from "@/lib/server/untappd";

export const dynamic = "force-dynamic";

const sameState = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/**
 * Untappd sends the browser back here with ?code=...&state=... . Check the
 * state against the cookie set at login, trade the code for a token, store
 * the token in the encrypted session cookie, and go back to a clean app URL.
 */
export async function GET(request: NextRequest) {
  const base = config.appBaseUrl() ?? new URL(request.url).origin;
  const back = (result: string) => {
    const response = NextResponse.redirect(new URL(`/?auth=${result}`, base), 303);
    response.cookies.set(STATE_COOKIE, "", cookieOptions(0, "/api/auth"));
    return response;
  };

  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");
  const expected = request.cookies.get(STATE_COOKIE)?.value;

  if (!code) return back("denied");
  if (!state || !expected || !sameState(state, expected)) return back("expired");

  try {
    const token = await exchangeCode(code, base + CALLBACK_PATH);
    const user = await currentUser(token).catch(() => null);
    const sealed = sealSession({ token, userId: user?.uid ?? null, userName: user?.userName ?? null, iat: Math.floor(Date.now() / 1000) });
    if (!sealed) return back("unavailable");
    const response = back("ok");
    response.cookies.set(SESSION_COOKIE, sealed, cookieOptions(SESSION_MAX_AGE));
    return response;
  } catch {
    return back("failed");
  }
}
