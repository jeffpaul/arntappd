export const dynamic = "force-dynamic";

/** Cheap liveness check. Makes no provider calls. */
export function GET() {
  return Response.json({ ok: true });
}
