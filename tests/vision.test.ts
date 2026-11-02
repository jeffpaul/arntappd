import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { normalizeImage } from "@/lib/server/image";
import { readMenu } from "@/lib/server/vision";

// A stand-in for the Messages API, so the request we send and the parsing of
// the reply are checked without a real key or a paid call.
let server: Server;
let lastBody: Record<string, any> | null = null;
let lastHeaders: Record<string, string | string[] | undefined> = {};
let reply: Record<string, unknown> = {};

const message = (text: string, stop_reason = "end_turn") => ({
  id: "msg_test", type: "message", role: "assistant", model: "claude-opus-5-5",
  content: [{ type: "text", text }], stop_reason, stop_sequence: null,
  usage: { input_tokens: 1, output_tokens: 1 },
});

beforeAll(async () => {
  server = createServer((req, res) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      lastBody = JSON.parse(data);
      lastHeaders = req.headers;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify(reply));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  process.env.ANTHROPIC_API_KEY = "test-key";
});

afterAll(() => {
  server.close();
  delete process.env.ANTHROPIC_API_KEY;
});

const tinyPng = () =>
  sharp({ create: { width: 40, height: 30, channels: 3, background: "#fff" } }).png().toBuffer();

describe("readMenu", () => {
  it("sends one image request with structured output and parses beers", async () => {
    reply = message(
      JSON.stringify({
        beers: [
          { name: "Pliny the Elder", brewery: "Russian River", style: "Double IPA", vintage: null, abv: 8, price: "$9",
            box: { left: 60, top: 250, right: 420, bottom: 290 } },
          { name: " ", brewery: null, style: null, vintage: null, abv: null, price: null, box: null },
        ],
      }),
    );
    const beers = await readMenu(await normalizeImage(await tinyPng()));
    expect(beers).toEqual([
      { name: "Pliny the Elder", brewery: "Russian River", style: "Double IPA", vintage: null, abv: 8, price: "$9",
        box: { x: 0.06, y: 0.25, width: 0.36, height: 0.04 } },
    ]);
    expect(lastBody?.model).toBe("claude-opus-5-5");
    expect(lastBody?.fallbacks).toBe("default");
    expect(lastBody?.output_config?.format?.type).toBe("json_schema");
    expect(lastBody?.messages[0].content[0]).toMatchObject({ type: "image", source: { type: "base64", media_type: "image/jpeg" } });
    expect(String(lastHeaders["anthropic-beta"])).toContain("server-side-fallback-2026-07-01");
  });

  it("reports a refusal as a readable failure", async () => {
    reply = message("", "refusal");
    await expect(readMenu(await normalizeImage(await tinyPng()))).rejects.toMatchObject({ code: "VISION_UNAVAILABLE" });
  });
});

describe("normalizeImage", () => {
  it("rejects bytes that are not an image", async () => {
    await expect(normalizeImage(Buffer.from("not an image"))).rejects.toMatchObject({ code: "IMAGE_UNSUPPORTED" });
  });
  it("shrinks large photos to 2,200 px and strips metadata", async () => {
    const big = await sharp({ create: { width: 4000, height: 3000, channels: 3, background: "#ccc" } })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();
    const out = await normalizeImage(big);
    // Orientation 6 means the camera was rotated; the result is upright portrait.
    expect([out.width, out.height]).toEqual([1650, 2200]);
    const meta = await sharp(out.data).metadata();
    expect(meta.orientation).toBeUndefined();
    expect(meta.exif).toBeUndefined();
  });
});
