import type { Box } from "./types";

export type Rect = { x: number; y: number; width: number; height: number };
export type Placement = { id: string; rect: Rect | null; side: "right" | "left" | "below" | "above" | null };

const overlaps = (a: Rect, b: Rect, pad = 2) =>
  a.x < b.x + b.width + pad &&
  b.x < a.x + a.width + pad &&
  a.y < b.y + b.height + pad &&
  b.y < a.y + a.height + pad;

export const toPixels = (box: Box, w: number, h: number): Rect => ({
  x: box.x * w,
  y: box.y * h,
  width: box.width * w,
  height: box.height * h,
});

/**
 * Place one callout per beer next to its menu text, inside the photo, without
 * covering any beer's text or another callout. Tries right, left, below, then
 * above. A beer with no room gets rect null and is shown in the list only.
 */
export function placeCallouts(
  anchors: { id: string; box: Box; size?: { width: number; height: number } }[],
  defaultSize: { width: number; height: number },
  view: { width: number; height: number },
  gap = 6,
): Placement[] {
  const textRects = anchors.map((a) => toPixels(a.box, view.width, view.height));
  const placed: Rect[] = [];
  return anchors.map((anchor, i) => {
    const t = textRects[i];
    const size = anchor.size ?? defaultSize;
    const midY = t.y + t.height / 2 - size.height / 2;
    const options: [Placement["side"], Rect][] = [
      ["right", { x: t.x + t.width + gap, y: midY, ...size }],
      ["left", { x: t.x - gap - size.width, y: midY, ...size }],
      ["below", { x: t.x, y: t.y + t.height + gap, ...size }],
      ["above", { x: t.x, y: t.y - gap - size.height, ...size }],
    ];
    for (const [side, rect] of options) {
      const inside = rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= view.width && rect.y + rect.height <= view.height;
      if (!inside) continue;
      if (textRects.some((r) => overlaps(rect, r))) continue;
      if (placed.some((r) => overlaps(rect, r))) continue;
      placed.push(rect);
      return { id: anchor.id, rect, side };
    }
    return { id: anchor.id, rect: null, side: null };
  });
}
