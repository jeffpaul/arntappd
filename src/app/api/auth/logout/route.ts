import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/server/errors";
import { assertSameOrigin } from "@/lib/server/request";
import { SESSION_COOKIE, cookieOptions } from "@/lib/server/session";

export const dynamic = "force-dynamic";

/**
 * Sign out of Arntappd by deleting the session cookie. This does not revoke
 * Arntappd's access on Untappd; that is done from Untappd's own settings.
 */
export function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, "", cookieOptions(0));
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
