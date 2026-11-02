import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import sampleReading from "@/lib/sample-menu.reading.json";
import type { MenuBeer, ScanResult } from "@/lib/types";
import { singleton } from "@/lib/server/cache";
import { visionConfigured } from "@/lib/server/config";
import { AppError, errorResponse } from "@/lib/server/errors";
import { MAX_UPLOAD_BYTES, normalizeImage } from "@/lib/server/image";
import { assertSameOrigin, readBodyCapped } from "@/lib/server/request";
import { readMenu } from "@/lib/server/vision";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const SCANS_PER_HOUR = 30;
const MAX_CONCURRENT = 2;
const state = singleton("scanLimits", () => ({ inFlight: 0, windowStart: Date.now(), count: 0 }));

function takeScanSlot(): () => void {
  const now = Date.now();
  if (now - state.windowStart > 60 * 60 * 1000) {
    state.windowStart = now;
    state.count = 0;
  }
  if (state.count >= SCANS_PER_HOUR) {
    throw new AppError("PROVIDER_LIMIT", "This server has read its hourly limit of menu photos. Try again later.", 429);
  }
  if (state.inFlight >= MAX_CONCURRENT) {
    throw new AppError("PROVIDER_LIMIT", "Another menu is being read right now. Try again in a moment.", 429);
  }
  state.count++;
  state.inFlight++;
  return () => {
    state.inFlight--;
  };
}

/** The stored reading of the built-in sample menu, already in 0..1 boxes. */
function recordedSample(): MenuBeer[] {
  return sampleReading.beers.map((b) => ({ ...b, box: { ...b.box } }));
}

async function scan(image: Buffer): Promise<MenuBeer[]> {
  const normalized = await normalizeImage(image);
  if (!visionConfigured()) {
    throw new AppError("VISION_UNAVAILABLE", "Photo reading is not configured on this server yet.", 503);
  }
  const release = takeScanSlot();
  try {
    return await readMenu(normalized);
  } finally {
    release();
  }
}

/**
 * Read the beers on a menu photo. Body is multipart form data with either a
 * "photo" file, or "sample=1" for the built-in sample menu.
 */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await readBodyCapped(request, MAX_UPLOAD_BYTES + 1024 * 1024);
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.startsWith("multipart/form-data")) {
      throw new AppError("BAD_REQUEST", "Send the photo as form data.", 400);
    }
    const form = await new Response(new Uint8Array(body), { headers: { "content-type": contentType } }).formData();

    let result: ScanResult;
    if (form.get("sample") === "1") {
      if (visionConfigured()) {
        const png = await readFile(path.join(process.cwd(), "public", "sample-menu.png"));
        result = { source: "vision", beers: await scan(png), warnings: [] };
      } else {
        result = {
          source: "recorded",
          beers: recordedSample(),
          warnings: ["Photo reading is not configured, so this uses a stored reading of the sample menu."],
        };
      }
    } else {
      const photo = form.get("photo");
      if (!(photo instanceof File) || photo.size === 0) {
        throw new AppError("BAD_REQUEST", "Choose a photo first.", 400);
      }
      if (photo.size > MAX_UPLOAD_BYTES) {
        throw new AppError("IMAGE_TOO_LARGE", "That photo is too large. Please use one under 10 MB.", 413);
      }
      result = { source: "vision", beers: await scan(Buffer.from(await photo.arrayBuffer())), warnings: [] };
    }

    if (!result.beers.length) {
      throw new AppError("NO_BEERS", "No beers were found in that photo. Try a closer, sharper shot of the menu.", 422);
    }
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

