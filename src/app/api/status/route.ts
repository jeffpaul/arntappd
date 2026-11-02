import { NextResponse } from "next/server";
import { config, signInConfigured, untappdConfigured, visionConfigured } from "@/lib/server/config";
import { currentSession } from "@/lib/server/session";
import type { Status } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Which capabilities are configured, and who is signed in. Configured is not the same as verified working. */
export async function GET() {
  const session = await currentSession();
  const account: Status["account"] = session
    ? { source: "session", userName: session.userName }
    : config.untappdAccessToken()
      ? { source: "dev", userName: null }
      : null;
  const status: Status = {
    untappdConfigured: untappdConfigured(),
    visionConfigured: visionConfigured(),
    signInConfigured: signInConfigured(),
    account,
    visionModel: config.visionModel(),
  };
  return NextResponse.json(status, { headers: { "Cache-Control": "private, no-store" } });
}
