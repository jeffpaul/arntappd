import { config, untappdConfigured, visionConfigured } from "@/lib/server/config";
import type { Status } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Which capabilities are configured. Configured is not the same as verified working. */
export function GET() {
  const status: Status = {
    untappdConfigured: untappdConfigured(),
    visionConfigured: visionConfigured(),
    personalConfigured: Boolean(config.untappdAccessToken()),
    visionModel: config.visionModel(),
  };
  return Response.json(status);
}
