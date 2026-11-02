import "server-only";

const read = (name: string): string | null => {
  const v = process.env[name]?.trim();
  return v ? v : null;
};

export const DEFAULT_VISION_MODEL = "claude-opus-5-5";
export const isProduction = () => process.env.NODE_ENV === "production";

/** Server configuration. Values are read on each call so tests can change env. */
export const config = {
  untappdClientId: () => read("UNTAPPD_CLIENT_ID"),
  untappdClientSecret: () => read("UNTAPPD_CLIENT_SECRET"),
  /** Optional development stand-in for sign-in: used only when nobody is signed in. */
  untappdAccessToken: () => read("UNTAPPD_ACCESS_TOKEN"),
  anthropicApiKey: () => read("ANTHROPIC_API_KEY"),
  visionModel: () => read("ANTHROPIC_MODEL") ?? DEFAULT_VISION_MODEL,
  /** Encrypts the sign-in cookie. Render generates one; see render.yaml. */
  sessionSecret: () => read("SESSION_SECRET"),
  /**
   * The app's public origin, used to build the Untappd callback URL. Never
   * taken from the request's Host header. Render sets RENDER_EXTERNAL_URL.
   */
  appBaseUrl: (): string | null => {
    const raw = read("APP_BASE_URL") ?? read("RENDER_EXTERNAL_URL");
    if (raw) return raw.replace(/\/+$/, "");
    return isProduction() ? null : "http://localhost:3000";
  },
};

export const CALLBACK_PATH = "/api/auth/callback/untappd";

export const untappdConfigured = () =>
  Boolean(config.untappdClientId() && config.untappdClientSecret());
export const visionConfigured = () => Boolean(config.anthropicApiKey());
export const signInConfigured = () =>
  untappdConfigured() && Boolean(config.appBaseUrl()) && (Boolean(config.sessionSecret()) || !isProduction());
