#!/usr/bin/env node
// Generates the built-in sample menu image and its recorded reading.
//
//   public/sample-menu.png              the menu photo stand-in
//   src/lib/sample-menu.reading.json    what the vision call should return for it
//
// The reading lets the sample work without an Anthropic API key. With a key,
// the app sends this same image through the real vision call instead.
//
// Run with: npm run sample-menu

import { writeFile } from "node:fs/promises";
import sharp from "sharp";

const W = 1200;
const H = 1600;
const COLS = [
  { x: 80, title: "ON TAP" },
  { x: 640, title: "CANS & BOTTLES" },
];
const COL_W = 480;

const beers = [
  { col: 0, name: "Two Hearted IPA", brewery: "Bell's Brewery", style: "American IPA", abv: 7.0, price: "$8", note: "Centennial hops, pine and grapefruit." },
  { col: 0, name: "Pale Ale", brewery: "Sierra Nevada", style: "American Pale Ale", abv: 5.6, price: "$7" },
  { col: 0, name: "Pliny the Elder", brewery: "Russian River Brewing", style: "Double IPA", abv: 8.0, price: "$9", note: "Limited keg. Ask your server." },
  { col: 0, name: "KBS", brewery: "Founders Brewing Co.", style: "Imperial Stout", abv: 12.0, price: "$12" },
  { col: 1, name: "Guinness Draught", brewery: "Guinness", style: "Irish Dry Stout", abv: 4.2, price: "$7" },
  { col: 1, name: "Allagash White", brewery: "Allagash Brewing", style: "Witbier", abv: 5.2, price: "$8", note: "Coriander and orange peel." },
  { col: 1, name: "Bourbon County Stout", brewery: "Goose Island", style: "Imperial Stout", vintage: "2023", abv: 14.5, price: "$18" },
  { col: 1, name: "IPA", brewery: "Lagunitas", style: "American IPA", abv: 6.2, price: "$7" },
];

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// Rough advance width for the sans fonts used below.
const textWidth = (s, size, bold) => s.length * size * (bold ? 0.66 : 0.56);

const parts = [];
parts.push(`<rect width="${W}" height="${H}" fill="#f4ecd8"/>`);
parts.push(`<rect x="30" y="30" width="${W - 60}" height="${H - 60}" fill="none" stroke="#3b2a1a" stroke-width="4"/>`);
parts.push(`<text x="${W / 2}" y="130" text-anchor="middle" font-family="DejaVu Serif" font-weight="bold" font-size="64" fill="#3b2a1a">THE COPPER TAP</text>`);
parts.push(`<text x="${W / 2}" y="185" text-anchor="middle" font-family="DejaVu Sans" font-size="26" fill="#6b5640">Beer menu · Sample for Arntappd testing</text>`);
parts.push(`<line x1="80" y1="220" x2="${W - 80}" y2="220" stroke="#3b2a1a" stroke-width="2"/>`);

const reading = [];
const cursor = [300, 300];
for (const col of COLS) {
  parts.push(`<text x="${col.x}" y="275" font-family="DejaVu Sans" font-weight="bold" font-size="30" letter-spacing="3" fill="#8a3b12">${esc(col.title)}</text>`);
}

beers.forEach((beer) => {
  const col = COLS[beer.col];
  let y = cursor[beer.col] + 40;
  // Shrink long names so they never run into the price.
  const nameSize = Math.min(34, Math.floor((COL_W - 90) / (beer.name.length * 0.66)));
  const subSize = 22;
  const nameTop = y - nameSize * 0.8;
  parts.push(`<text x="${col.x}" y="${y}" font-family="DejaVu Sans" font-weight="bold" font-size="${nameSize}" fill="#1f160d">${esc(beer.name)}</text>`);
  parts.push(`<text x="${col.x + COL_W}" y="${y}" text-anchor="end" font-family="DejaVu Sans" font-weight="bold" font-size="${nameSize}" fill="#1f160d">${esc(beer.price)}</text>`);
  y += 34;
  const style = beer.vintage ? `${beer.vintage} ${beer.style}` : beer.style;
  const sub = `${beer.brewery} · ${style} · ${beer.abv.toFixed(1)}%`;
  parts.push(`<text x="${col.x}" y="${y}" font-family="DejaVu Sans" font-size="${subSize}" fill="#4a3a2a">${esc(sub)}</text>`);
  const bottom = y + subSize * 0.3;
  const width = Math.max(textWidth(beer.name, nameSize, true), textWidth(sub, subSize, false));
  reading.push({
    name: beer.name,
    brewery: beer.brewery,
    style: beer.style,
    vintage: beer.vintage ?? null,
    abv: beer.abv,
    price: beer.price,
    box: {
      x: +(col.x / W).toFixed(4),
      y: +(nameTop / H).toFixed(4),
      width: +(Math.min(width, COL_W) / W).toFixed(4),
      height: +((bottom - nameTop) / H).toFixed(4),
    },
  });
  if (beer.note) {
    y += 32;
    parts.push(`<text x="${col.x}" y="${y}" font-family="DejaVu Sans" font-style="italic" font-size="20" fill="#6b5640">${esc(beer.note)}</text>`);
  }
  cursor[beer.col] = y + 100;
});

parts.push(`<text x="${W / 2}" y="${H - 150}" text-anchor="middle" font-family="DejaVu Sans" font-size="24" fill="#6b5640">Flights of four 5 oz pours, $14 · Ask about our rotating cider</text>`);
parts.push(`<text x="${W / 2}" y="${H - 100}" text-anchor="middle" font-family="DejaVu Sans" font-size="20" fill="#6b5640">Prices and availability are illustrative. This is not a real venue.</text>`);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join("")}</svg>`;

await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile("public/sample-menu.png");
await writeFile(
  "src/lib/sample-menu.reading.json",
  JSON.stringify({ image: { width: W, height: H }, beers: reading }, null, 2) + "\n",
);
console.log(`Wrote public/sample-menu.png (${W}x${H}) and ${reading.length} recorded beers.`);
