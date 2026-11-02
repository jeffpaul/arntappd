import type { BeerDetails, Metric } from "@/lib/types";
import { fmtCount, fmtRating } from "./model";

function personalLabel(d: BeerDetails): string {
  switch (d.you.experience) {
    case "untried":
      return "Not tried";
    case "tried_unrated":
      return "Checked in, not rated";
    case "tried_rated":
      return `${d.you.checkinCount}× checked in`;
    case "signed_out":
      return "Sign in to see";
    default:
      return "Unknown";
  }
}

function friendsLabel(m: Metric): string {
  if (m.coverage === "signed_out") return "Sign in to see";
  if (m.coverage === "unavailable") return "Unavailable";
  if (!m.checkinCount) return "No recent check-ins";
  const ratings = m.ratingCount ?? 0;
  return `${m.checkinCount} recent check-in${m.checkinCount === 1 ? "" : "s"}${ratings !== m.checkinCount ? `, ${ratings} rated` : ""}`;
}

function globalLabel(m: Metric): string {
  if (m.coverage === "unavailable") return "Unavailable";
  const parts = [];
  if (m.ratingCount !== null) parts.push(`${fmtCount(m.ratingCount)} ratings`);
  if (m.checkinCount !== null) parts.push(`${fmtCount(m.checkinCount)} check-ins`);
  return parts.join(" · ") || "No ratings yet";
}

/** The You / Friends / Global rows for a confirmed beer. */
export function Ratings({ details }: { details: BeerDetails }) {
  const rows = [
    { label: "You", metric: details.you, note: personalLabel(details) },
    { label: "Friends", metric: details.friends, note: friendsLabel(details.friends) },
    { label: "Global", metric: details.global, note: globalLabel(details.global) },
  ];
  return (
    <dl className="ratings">
      {rows.map((row) => (
        <div key={row.label} className="ratings-row" title={row.metric.explanation ?? undefined}>
          <dt>{row.label}</dt>
          <dd className={row.metric.average === null ? "rating none" : "rating"}>
            {fmtRating(row.metric.average)}
          </dd>
          <dd className="rating-note">{row.note}</dd>
        </div>
      ))}
      {details.friends.coverage === "partial" && details.friends.explanation ? (
        <p className="fineprint">Friends: {details.friends.explanation}</p>
      ) : null}
    </dl>
  );
}

/** One-line summary for the callout on the photo. */
export function shortSummary(details: BeerDetails): string {
  const parts = [`G ${fmtRating(details.global.average)}`];
  if (details.friends.average !== null) parts.push(`F ${fmtRating(details.friends.average)}`);
  if (details.you.average !== null) parts.push(`Me ${fmtRating(details.you.average)}`);
  else if (details.you.experience === "untried") parts.push("New");
  return parts.join(" · ");
}
