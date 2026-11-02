import "server-only";
import { AppError } from "./errors";

/** Reject cross-site POSTs: the Origin header, when sent, must match this host. */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return; // Same-origin form posts from some browsers omit it.
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  let originHost: string | null = null;
  try {
    originHost = new URL(origin).host;
  } catch {
    originHost = null;
  }
  if (!host || originHost !== host) {
    throw new AppError("BAD_REQUEST", "Cross-site requests are not allowed.", 403);
  }
}

/** Read a request body, stopping as soon as it passes maxBytes. */
export async function readBodyCapped(request: Request, maxBytes: number): Promise<Buffer> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new AppError("IMAGE_TOO_LARGE", "That photo is too large. Please use one under 10 MB.", 413);
  }
  if (!request.body) return Buffer.alloc(0);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new AppError("IMAGE_TOO_LARGE", "That photo is too large. Please use one under 10 MB.", 413);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
