import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { CALLBACK_PATH, config, signInConfigured } from "@/lib/server/config";
import { STATE_COOKIE, cookieOptions } from "@/lib/server/session";
import { authenticateUrl } from "@/lib/server/untappd";

export const dynamic = "force-dynamic";

/** Start Untappd sign-in: remember a one-time state in a cookie, then go to Untappd. */
export function GET() {
  const base = config.appBaseUrl();
  const state = randomBytes(24).toString("base64url");
  const target = base && signInConfigured() ? authenticateUrl(base + CALLBACK_PATH, state) : null;
  if (!base || !target) {
    return NextResponse.redirect(new URL("/?auth=unavailable", base ?? "http://localhost:3000"), 303);
  }
  const response = NextResponse.redirect(target, 303);
  response.cookies.set(STATE_COOKIE, state, cookieOptions(10 * 60, "/api/auth"));
  return response;
}
