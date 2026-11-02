"use client";

import { useEffect, useRef, useState } from "react";
import { placeCallouts } from "@/lib/overlay";
import type { Item } from "./model";
import { shortSummary } from "./Ratings";

const CALLOUT_HEIGHT = 22;
// Width for the callout text at 11.5px bold, plus padding.
const calloutWidth = (text: string) => Math.ceil(text.length * 7 + 14);
const PIN = 24;

type Props = {
  src: string;
  items: Item[];
  activeKey: string | null;
  onSelect: (key: string) => void;
};

/**
 * The menu photo with a numbered pin on each beer and, where there is room, a
 * short ratings callout. Beers whose callout does not fit stay reachable
 * through their pin and the list.
 */
export function PhotoView({ src, items, activeKey, onSelect }: Props) {
  const frame = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      const img = el.querySelector("img");
      if (img && img.clientWidth && img.clientHeight) setSize({ width: img.clientWidth, height: img.clientHeight });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const visible = items.filter((i) => !i.removed && i.menu.box);
  const withCallouts = visible.filter((i) => i.selectedId !== null && i.details.status === "done");
  const placements = size
    ? placeCallouts(
        withCallouts.map((i) => ({
          id: i.key,
          box: i.menu.box!,
          size: {
            width: calloutWidth(i.details.status === "done" ? shortSummary(i.details.data) : ""),
            height: CALLOUT_HEIGHT,
          },
        })),
        { width: 80, height: CALLOUT_HEIGHT },
        size,
      )
    : [];
  const hidden = placements.filter((p) => !p.rect).length;
  const missingBox = items.filter((i) => !i.removed && !i.menu.box).length;

  return (
    <div className="photo">
      <div className="photo-frame" ref={frame}>
        {/* eslint-disable-next-line @next/next/no-img-element -- local object URLs and a static sample */}
        <img
          src={src}
          alt="Menu photo with numbered beers"
          onLoad={(e) => setSize({ width: e.currentTarget.clientWidth, height: e.currentTarget.clientHeight })}
        />
        {size
          ? visible.map((item) => {
              const box = item.menu.box!;
              const left = Math.max(0, box.x * size.width - PIN - 2);
              const top = Math.min(size.height - PIN, Math.max(0, (box.y + box.height / 2) * size.height - PIN / 2));
              const confirmed = item.selectedId !== null;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`pin${confirmed ? " confirmed" : ""}${item.key === activeKey ? " active" : ""}`}
                  style={{ left, top }}
                  onClick={() => onSelect(item.key)}
                  aria-label={`Beer ${item.index + 1}: ${item.menu.name}${confirmed ? "" : ", not confirmed"}`}
                >
                  {item.index + 1}
                </button>
              );
            })
          : null}
        {size
          ? placements.map((p) => {
              if (!p.rect) return null;
              const item = withCallouts.find((i) => i.key === p.id)!;
              if (item.details.status !== "done") return null;
              return (
                <button
                  key={`c-${p.id}`}
                  type="button"
                  className={`callout${p.id === activeKey ? " active" : ""}`}
                  style={{ left: p.rect.x, top: p.rect.y, width: p.rect.width, height: p.rect.height }}
                  onClick={() => onSelect(p.id)}
                  aria-label={`Ratings for beer ${item.index + 1}`}
                >
                  {shortSummary(item.details.data)}
                </button>
              );
            })
          : null}
      </div>
      {placements.some((p) => p.rect) ? (
        <p className="fineprint">G = global rating, F = friends&apos; recent rating, Me = your rating.</p>
      ) : null}
      {hidden > 0 || missingBox > 0 ? (
        <p className="fineprint">
          {hidden > 0 ? `${hidden} rating${hidden === 1 ? "" : "s"} did not fit on the photo. ` : ""}
          {missingBox > 0 ? `${missingBox} beer${missingBox === 1 ? " has" : "s have"} no position on the photo. ` : ""}
          Tap a number or use List to see every beer.
        </p>
      ) : null}
    </div>
  );
}
