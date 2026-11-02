import "server-only";

const read = (name: string): string | null => {
  const v = process.env[name]?.trim();
  return v ? v : null;
};

export const DEFAULT_VISION_MODEL = "claude-opus-5-5";

/** Server configuration. Values are read on each call so tests can change env. */
export const config = {
  untappdClientId: () => read("UNTAPPD_CLIENT_ID"),
  untappdClientSecret: () => read("UNTAPPD_CLIENT_SECRET"),
  /** Development stand-in for sign-in (MVP step 3 replaces it with OAuth). */
  untappdAccessToken: () => read("UNTAPPD_ACCESS_TOKEN"),
  anthropicApiKey: () => read("ANTHROPIC_API_KEY"),
  visionModel: () => read("ANTHROPIC_MODEL") ?? DEFAULT_VISION_MODEL,
};

export const untappdConfigured = () =>
  Boolean(config.untappdClientId() && config.untappdClientSecret());
export const visionConfigured = () => Boolean(config.anthropicApiKey());
