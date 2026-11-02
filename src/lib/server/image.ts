import "server-only";
import sharp from "sharp";
import { AppError } from "./errors";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_INPUT_PIXELS = 40_000_000;
const LONG_SIDE = 2200;

export type NormalizedImage = { data: Buffer; width: number; height: number; mediaType: "image/jpeg" };

/**
 * Decode an uploaded photo safely, apply its EXIF rotation, shrink it to at
 * most 2,200 px on the long side, and re-encode as JPEG without metadata.
 */
export async function normalizeImage(input: Buffer): Promise<NormalizedImage> {
  try {
    const pipeline = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" })
      .rotate()
      .resize({ width: LONG_SIDE, height: LONG_SIDE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 88, mozjpeg: true });
    const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height, mediaType: "image/jpeg" };
  } catch {
    throw new AppError(
      "IMAGE_UNSUPPORTED",
      "That photo could not be read. Try a JPEG or PNG, or take the photo again.",
      415,
    );
  }
}
