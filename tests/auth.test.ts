import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as callback } from "@/app/api/auth/callback/untappd/route";
import { GET as login } from "@/app/api/auth/login/route";
import { SESSION_COOKIE, STATE_COOKIE, openSession, sealSession } from "@/lib/server/session";

const env = { ...process.env };
beforeEach(() => {
  process.env.SESSION_SECRET = "test-secret-one";
  process.env.APP_BASE_URL = "https://arntappd.example";
  process.env.UNTAPPD_CLIENT_ID = "cid";
  process.env.UNTAPPD_CLIENT_SECRET = "csecret";
});
afterEach(() => {
  process.env = { ...env };
  vi.unstubAllGlobals();
});

const now = () => Math.floor(Date.now() / 1000);

describe("session cookie", () => {
  it("round-trips and hides the token", () => {
    const sealed = sealSession({ token: "tok-123", userId: 7, userName: "jp", iat: now() })!;
    expect(sealed).not.toContain("tok-123");
    expect(openSession(sealed)).toMatchObject({ token: "tok-123", userId: 7, userName: "jp" });
  });
  it("rejects a tampered cookie, another secret, and an old session", () => {
    const sealed = sealSession({ token: "tok", userId: 1, userName: null, iat: now() })!;
    const flipped = sealed.slice(0, -2) + (sealed.endsWith("A") ? "BB" : "AA");
    expect(openSession(flipped)).toBeNull();
    process.env.SESSION_SECRET = "another-secret";
    expect(openSession(sealed)).toBeNull();
    process.env.SESSION_SECRET = "test-secret-one";
    expect(openSession(sealSession({ token: "tok", userId: 1, userName: null, iat: now() - 31 * 86400 })!)).toBeNull();
  });
});

describe("sign-in", () => {
  it("login sends the browser to Untappd with a state that matches the cookie", () => {
    const res = login();
    const target = new URL(res.headers.get("location")!);
    expect(target.origin + target.pathname).toBe("https://untappd.com/oauth/authenticate/");
    expect(target.searchParams.get("redirect_url")).toBe("https://arntappd.example/api/auth/callback/untappd");
    expect(target.searchParams.get("client_secret")).toBeNull();
    const cookie = res.cookies.get(STATE_COOKIE)!;
    expect(cookie.value).toBe(target.searchParams.get("state"));
    expect(cookie).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax" });
  });

  const callbackRequest = (query: string, state?: string) =>
    new NextRequest(`https://arntappd.example/api/auth/callback/untappd?${query}`, {
      headers: state ? { cookie: `${STATE_COOKIE}=${state}` } : {},
    });

  it("treats a missing code as cancelled", async () => {
    const res = await callback(callbackRequest("state=s1", "s1"));
    expect(res.headers.get("location")).toBe("https://arntappd.example/?auth=denied");
  });

  it("rejects a state that does not match the cookie, before contacting Untappd", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = await callback(callbackRequest("code=c1&state=evil", "s1"));
    expect(res.headers.get("location")).toBe("https://arntappd.example/?auth=expired");
    expect((await callback(callbackRequest("code=c1&state=s1"))).headers.get("location")).toBe("https://arntappd.example/?auth=expired");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("trades the code for a token and stores it in the encrypted session cookie", async () => {
    const seen: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      seen.push(url);
      const body = url.includes("/oauth/authorize/")
        ? { meta: { http_code: 200 }, response: { access_token: "user-token" } }
        : { meta: { code: 200 }, response: { user: { uid: 42, user_name: "jp" } } };
      return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
    });
    const res = await callback(callbackRequest("code=c1&state=s1", "s1"));
    expect(res.headers.get("location")).toBe("https://arntappd.example/?auth=ok");
    const authorize = new URL(seen[0]);
    expect(authorize.searchParams.get("code")).toBe("c1");
    expect(authorize.searchParams.get("redirect_url")).toBe("https://arntappd.example/api/auth/callback/untappd");
    const session = openSession(res.cookies.get(SESSION_COOKIE)!.value);
    expect(session).toMatchObject({ token: "user-token", userId: 42, userName: "jp" });
    expect(res.cookies.get(STATE_COOKIE)!.value).toBe("");
  });

  it("reports a failed token exchange without signing in", async () => {
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ meta: { http_code: 500 } }), { status: 500 }));
    const res = await callback(callbackRequest("code=c1&state=s1", "s1"));
    expect(res.headers.get("location")).toBe("https://arntappd.example/?auth=failed");
    expect(res.cookies.get(SESSION_COOKIE)).toBeUndefined();
  });
});
