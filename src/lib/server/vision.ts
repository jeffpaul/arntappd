import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { normalizeReading } from "@/lib/reading";
import type { MenuBeer } from "@/lib/types";
import { config } from "./config";
import { AppError } from "./errors";
import type { NormalizedImage } from "./image";

const ReadingSchema = z.object({
  beers: z.array(
    z.object({
      name: z.string().describe("Beer name exactly as printed, without the brewery, price, size or ABV."),
      brewery: z.string().nullable().describe("Brewery as printed next to or under the beer, or null if none is shown."),
      style: z.string().nullable(),
      vintage: z.string().nullable().describe("Four-digit year if the menu gives one for this beer, else null."),
      abv: z.number().nullable(),
      price: z.string().nullable(),
      box: z
        .object({
          left: z.number(),
          top: z.number(),
          right: z.number(),
          bottom: z.number(),
        })
        .nullable()
        .describe("Bounding box around this beer's name and brewery text, on a 0-1000 grid over the whole image."),
    }),
  ),
});

const PROMPT = `This is a photo of a drinks menu. List every beer on it, in reading order (top to bottom, column by column).

For each beer give the name, the brewery if the menu shows one, and style, vintage year, ABV and price when printed. Copy names as printed; do not guess a brewery the menu does not show.

Skip headings, descriptions, food, wine, cocktails, cider, flights and other non-beer lines.

For "box", give the rectangle around that beer's name and brewery text on a 0-1000 grid, where (0,0) is the top-left of the image and (1000,1000) the bottom-right. Make it tight around the text.

If there are no beers, return an empty list.`;

/** One vision-model call that reads the beers and where they sit on the photo. */
export async function readMenu(image: NormalizedImage): Promise<MenuBeer[]> {
  const apiKey = config.anthropicApiKey();
  if (!apiKey) {
    throw new AppError("VISION_UNAVAILABLE", "Photo reading is not configured on this server yet.", 503);
  }
  const client = new Anthropic({ apiKey, timeout: 90_000, maxRetries: 1 });
  try {
    // create(), not parse(): parse() throws before we can see a refusal or a cut-off reply.
    const message = await client.beta.messages.create({
      model: config.visionModel(),
      max_tokens: 8000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(ReadingSchema) },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data.toString("base64") } },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    });
    if (message.stop_reason === "refusal") {
      throw new AppError("VISION_UNAVAILABLE", "The photo could not be read. Try another photo.", 422);
    }
    const text = message.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    let parsed: z.infer<typeof ReadingSchema> | null = null;
    if (message.stop_reason !== "max_tokens") {
      try {
        const result = ReadingSchema.safeParse(JSON.parse(text));
        parsed = result.success ? result.data : null;
      } catch {
        parsed = null;
      }
    }
    if (!parsed) {
      throw new AppError("VISION_UNAVAILABLE", "The menu reading came back incomplete. Try again.", 502);
    }
    return normalizeReading(parsed.beers);
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof Anthropic.RateLimitError) {
      throw new AppError("PROVIDER_LIMIT", "Photo reading is busy. Try again in a minute.", 429);
    }
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
      throw new AppError("VISION_UNAVAILABLE", "Photo reading is misconfigured on this server.", 503);
    }
    if (error instanceof Anthropic.APIError) {
      throw new AppError("VISION_UNAVAILABLE", "Photo reading failed. Try again.", 502);
    }
    throw error;
  }
}
