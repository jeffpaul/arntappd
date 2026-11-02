// Shared contracts between the server routes and the browser.

/** A rectangle in image space, each value a fraction (0..1) of the image size. */
export type Box = { x: number; y: number; width: number; height: number };

/** One beer as read off the menu photo, before any Untappd lookup. */
export type MenuBeer = {
  name: string;
  brewery: string | null;
  style: string | null;
  vintage: string | null;
  abv: number | null;
  price: string | null;
  box: Box | null;
};

export type ScanResult = {
  /** "vision" means the photo went through the vision model just now; "recorded" is the stored sample reading. */
  source: "vision" | "recorded";
  beers: MenuBeer[];
  warnings: string[];
};

export type BeerCandidate = {
  id: number;
  name: string;
  brewery: string;
  style: string | null;
  abv: number | null;
  checkinCount: number | null;
  untappdUrl: string;
  /** App ranking score, 0..1. Not a probability. */
  score: number;
};

export type MatchResult = {
  query: string;
  candidates: BeerCandidate[];
  /** Id of the candidate we suggest, or null when nothing is a reliable match. */
  suggestedId: number | null;
};

export type Coverage = "complete" | "partial" | "unavailable" | "signed_out";

export type Metric = {
  /** 0..5, or null when there is no rating. Never 0 as a stand-in for "no rating". */
  average: number | null;
  checkinCount: number | null;
  ratingCount: number | null;
  coverage: Coverage;
  explanation: string | null;
};

export type PersonalExperience =
  | "untried"
  | "tried_rated"
  | "tried_unrated"
  | "unknown"
  | "signed_out";

export type BeerDetails = {
  id: number;
  name: string;
  brewery: string;
  style: string | null;
  abv: number | null;
  vintage: string | null;
  untappdUrl: string;
  labelUrl: string | null;
  you: Metric & { experience: PersonalExperience };
  friends: Metric;
  global: Metric;
  fetchedAt: string;
};

export type ApiError = { error: { code: ErrorCode; message: string } };

export type ErrorCode =
  | "BAD_REQUEST"
  | "IMAGE_TOO_LARGE"
  | "IMAGE_UNSUPPORTED"
  | "NO_BEERS"
  | "VISION_UNAVAILABLE"
  | "LOOKUP_UNAVAILABLE"
  | "PROVIDER_LIMIT"
  | "NOT_FOUND"
  | "INTERNAL";

export type Status = {
  untappdConfigured: boolean;
  visionConfigured: boolean;
  personalConfigured: boolean;
  visionModel: string;
};
