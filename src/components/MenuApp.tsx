"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { filterItems, sortItems, type Filter, type SortKey } from "@/lib/sort";
import type { BeerDetails, MatchResult, ScanResult, Status } from "@/lib/types";
import { BeerCard } from "./BeerCard";
import { getJson, newItems, type Item } from "./model";
import { PhotoView } from "./PhotoView";

type Phase =
  | { name: "start" }
  | { name: "preview"; file: File; url: string }
  | { name: "scanning"; url: string; sample: boolean }
  | { name: "results"; url: string; result: ScanResult }
  | { name: "failed"; url: string | null; message: string; retry: (() => void) | null };

const SAMPLE_URL = "/sample-menu.png";
const MATCH_CONCURRENCY = 2;

export function MenuApp() {
  const [status, setStatus] = useState<Status | null>(null);
  const [phase, setPhase] = useState<Phase>({ name: "start" });
  const [items, setItems] = useState<Item[]>([]);
  const [view, setView] = useState<"photo" | "list">("photo");
  const [sortKey, setSortKey] = useState<SortKey>("menu");
  const [filter, setFilter] = useState<Filter>("all");
  const [activeKey, setActiveKey] = useState<string | null>(null);

  // Responses from an older scan must never land on a newer one.
  const scanId = useRef(0);
  const itemsRef = useRef<Item[]>([]);
  itemsRef.current = items;
  const objectUrl = useRef<string | null>(null);

  const [authNotice, setAuthNotice] = useState<string | null>(null);

  useEffect(() => {
    getJson<Status>("/api/status").then(setStatus).catch(() => setStatus(null));
    // The sign-in callback lands on /?auth=...; show the outcome, then clean the URL.
    const auth = new URLSearchParams(window.location.search).get("auth");
    if (auth) {
      setAuthNotice(AUTH_MESSAGES[auth] ?? null);
      window.history.replaceState(null, "", "/");
    }
    return () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    };
  }, []);

  const update = useCallback((key: string, fn: (item: Item) => Item) => {
    setItems((list) => list.map((i) => (i.key === key ? fn(i) : i)));
  }, []);

  const runMatch = useCallback(
    async (key: string, params: Record<string, string>, scan: number) => {
      update(key, (i) => ({ ...i, match: { status: "loading" } }));
      try {
        const data = await getJson<MatchResult>(`/api/match?${new URLSearchParams(params)}`);
        if (scan !== scanId.current) return;
        update(key, (i) => ({ ...i, match: { status: "done", data } }));
      } catch (e) {
        if (scan !== scanId.current) return;
        update(key, (i) => ({ ...i, match: { status: "error", message: (e as Error).message } }));
      }
    },
    [update],
  );

  const matchParams = (item: Item) => {
    const p: Record<string, string> = { name: item.menu.name };
    if (item.menu.brewery) p.brewery = item.menu.brewery;
    if (item.menu.vintage) p.vintage = item.menu.vintage;
    if (item.menu.abv !== null) p.abv = String(item.menu.abv);
    return p;
  };

  /** Search Untappd for each beer, a couple at a time, in menu order. */
  const matchAll = useCallback(
    async (list: Item[], scan: number) => {
      const queue = [...list];
      const worker = async () => {
        for (let item = queue.shift(); item; item = queue.shift()) {
          if (scan !== scanId.current) return;
          await runMatch(item.key, matchParams(item), scan);
        }
      };
      await Promise.all(Array.from({ length: MATCH_CONCURRENCY }, worker));
    },
    [runMatch],
  );

  const loadDetails = useCallback(
    async (key: string, id: number) => {
      const scan = scanId.current;
      update(key, (i) => ({ ...i, details: { status: "loading" } }));
      try {
        const data = await getJson<BeerDetails>(`/api/beer/${id}`);
        if (scan !== scanId.current) return;
        // Only attach if this beer is still the selected one.
        update(key, (i) => (i.selectedId === id ? { ...i, details: { status: "done", data } } : i));
      } catch (e) {
        if (scan !== scanId.current) return;
        update(key, (i) => (i.selectedId === id ? { ...i, details: { status: "error", message: (e as Error).message } } : i));
      }
    },
    [update],
  );

  const confirm = useCallback(
    (key: string, id: number) => {
      update(key, (i) => ({ ...i, selectedId: id, details: { status: "loading" } }));
      void loadDetails(key, id);
    },
    [update, loadDetails],
  );

  const runScan = useCallback(
    async (opts: { sample: true } | { sample: false; file: File; url: string }) => {
      const scan = ++scanId.current;
      const url = opts.sample ? SAMPLE_URL : opts.url;
      setItems([]);
      setActiveKey(null);
      setSortKey("menu");
      setFilter("all");
      setPhase({ name: "scanning", url, sample: opts.sample });
      const form = new FormData();
      if (opts.sample) form.set("sample", "1");
      else form.set("photo", opts.file);
      try {
        const result = await getJson<ScanResult>("/api/scan", { method: "POST", body: form });
        if (scan !== scanId.current) return;
        const list = newItems(result.beers, scan);
        setItems(list);
        setPhase({ name: "results", url, result });
        setView("photo");
        void matchAll(list, scan);
      } catch (e) {
        if (scan !== scanId.current) return;
        setPhase({ name: "failed", url, message: (e as Error).message, retry: () => void runScan(opts) });
      }
    },
    [matchAll],
  );

  const pickFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhase({ name: "failed", url: null, message: "That file is not a photo.", retry: null });
      return;
    }
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    const url = URL.createObjectURL(file);
    objectUrl.current = url;
    scanId.current++;
    setItems([]);
    setPhase({ name: "preview", file, url });
  };

  const reset = () => {
    scanId.current++;
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null;
    setItems([]);
    setPhase({ name: "start" });
  };

  const confirmAllSuggested = () => {
    for (const item of itemsRef.current) {
      if (item.removed || item.selectedId !== null || item.match.status !== "done") continue;
      const id = item.match.data.suggestedId;
      if (id !== null) confirm(item.key, id);
    }
  };

  const select = (key: string) => {
    setActiveKey(key);
    requestAnimationFrame(() =>
      document.getElementById(`beer-${key}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
    );
  };

  const live = items.filter((i) => !i.removed);
  const suggestedWaiting = live.filter(
    (i) => i.selectedId === null && i.match.status === "done" && i.match.data.suggestedId !== null,
  ).length;
  const searched = live.filter((i) => i.match.status === "done" || i.selectedId !== null).length;
  const confirmedCount = live.filter((i) => i.selectedId !== null).length;
  const sortView = (i: Item) => ({
    index: i.index,
    details: i.selectedId !== null && i.details.status === "done" ? i.details.data : null,
  });
  const shown = filterItems(sortItems(items, sortKey, sortView), filter, sortView);
  const active = items.find((i) => i.key === activeKey) ?? null;

  const cardProps = (item: Item) => ({
    item,
    active: item.key === activeKey,
    onFocus: () => setActiveKey(item.key),
    onConfirm: (id: number) => confirm(item.key, id),
    onChange: () => update(item.key, (i) => ({ ...i, selectedId: null, details: { status: "idle" } })),
    onSearch: (q: string) => void runMatch(item.key, { name: q }, scanId.current),
    onRetry: () =>
      item.selectedId !== null ? void loadDetails(item.key, item.selectedId) : void runMatch(item.key, matchParams(item), scanId.current),
    onRemove: () => update(item.key, (i) => ({ ...i, removed: true })),
    onRestore: () => update(item.key, (i) => ({ ...i, removed: false })),
  });

  return (
    <main className="app">
      <header className="top">
        <button type="button" className="brand" onClick={reset}>
          Arntappd
        </button>
        <Account status={status} hasScan={items.length > 0} onSignedOut={() => {
          setStatus((s) => (s ? { ...s, account: null } : s));
          // Ratings on screen were for the signed-in account; reload them signed out.
          for (const item of itemsRef.current) if (item.selectedId !== null) void loadDetails(item.key, item.selectedId);
        }} />
      </header>
      {authNotice ? (
        <p className="banner" role="status">
          {authNotice}{" "}
          <button type="button" className="btn link" onClick={() => setAuthNotice(null)}>Dismiss</button>
        </p>
      ) : null}

      {phase.name === "start" ? (
        <section className="start">
          <h1>What should I order?</h1>
          <p className="lede">
            Photograph a beer menu and see Untappd ratings next to each beer: yours, your friends&apos; and everyone&apos;s.
          </p>
          <div className="start-actions">
            <label className="btn primary big">
              Take photo
              <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => pickFile(e.target.files?.[0])} />
            </label>
            <label className="btn big">
              Choose photo
              <input type="file" accept="image/*" hidden onChange={(e) => pickFile(e.target.files?.[0])} />
            </label>
            <button type="button" className="btn big ghost" onClick={() => void runScan({ sample: true })}>
              Try the sample menu
            </button>
          </div>
          <StatusNotes status={status} />
        </section>
      ) : null}

      {phase.name === "preview" ? (
        <section className="preview">
          {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
          <img src={phase.url} alt="Menu photo to scan" />
          <p className="consent">
            Scanning sends this photo to Anthropic&apos;s Claude to read the beer names. Arntappd does not store it.
          </p>
          <div className="row">
            <button type="button" className="btn primary" onClick={() => void runScan({ sample: false, file: phase.file, url: phase.url })}>
              Scan menu
            </button>
            <button type="button" className="btn" onClick={reset}>
              Cancel
            </button>
          </div>
        </section>
      ) : null}

      {phase.name === "scanning" ? (
        <section className="scanning" aria-live="polite">
          {/* eslint-disable-next-line @next/next/no-img-element -- local object URL or static sample */}
          <img src={phase.url} alt="" className="dim" />
          <p className="spinner">Reading the menu…</p>
        </section>
      ) : null}

      {phase.name === "failed" ? (
        <section className="failed" role="alert">
          <p className="error">{phase.message}</p>
          <div className="row">
            {phase.retry ? (
              <button type="button" className="btn primary" onClick={phase.retry}>
                Try again
              </button>
            ) : null}
            <button type="button" className="btn" onClick={reset}>
              Start over
            </button>
          </div>
        </section>
      ) : null}

      {phase.name === "results" ? (
        <section className="results">
          {phase.result.source === "recorded" ? (
            <p className="banner">Sample menu, read from a stored reading. Ratings below are live from Untappd.</p>
          ) : null}
          <div className="toolbar">
            <div className="tabs" role="tablist">
              <button type="button" role="tab" aria-selected={view === "photo"} className={view === "photo" ? "tab on" : "tab"} onClick={() => setView("photo")}>
                Photo
              </button>
              <button type="button" role="tab" aria-selected={view === "list"} className={view === "list" ? "tab on" : "tab"} onClick={() => setView("list")}>
                List
              </button>
            </div>
            <p className="progress" aria-live="polite">
              {live.length} beers · {searched} searched · {confirmedCount} confirmed
            </p>
          </div>
          {suggestedWaiting > 0 ? (
            <button type="button" className="btn primary wide" onClick={confirmAllSuggested}>
              Confirm all {suggestedWaiting} suggested matches
            </button>
          ) : null}

          {view === "photo" ? (
            <>
              <PhotoView src={phase.url} items={items} activeKey={activeKey} onSelect={select} />
              {active ? (
                <ul className="cards single">
                  <BeerCard key={active.key} {...cardProps(active)} />
                </ul>
              ) : (
                <p className="muted center">Tap a number to see that beer.</p>
              )}
            </>
          ) : (
            <>
              <div className="controls">
                <label>
                  Sort
                  <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
                    <option value="menu">Menu order</option>
                    <option value="global">Global rating</option>
                    <option value="friends">Friends&apos; rating</option>
                    <option value="you">My rating</option>
                  </select>
                </label>
                <label>
                  Show
                  <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
                    <option value="all">All beers</option>
                    <option value="new">New to me</option>
                    <option value="unknown">History unknown</option>
                  </select>
                </label>
              </div>
              {shown.length ? (
                <ul className="cards">
                  {shown.map((item) => (
                    <BeerCard key={item.key} {...cardProps(item)} />
                  ))}
                </ul>
              ) : (
                <p className="muted center">No beers match this filter yet. Confirm matches to see your history.</p>
              )}
            </>
          )}
          {phase.result.warnings.map((w) => (
            <p key={w} className="fineprint">{w}</p>
          ))}
          <button type="button" className="btn wide" onClick={reset}>
            Scan another menu
          </button>
        </section>
      ) : null}
    </main>
  );
}

const AUTH_MESSAGES: Record<string, string> = {
  ok: "Signed in with Untappd. You and Friends ratings are on.",
  denied: "Untappd sign-in was cancelled.",
  expired: "That sign-in link expired. Please try signing in again.",
  failed: "Untappd sign-in did not finish. Please try again.",
  unavailable: "Untappd sign-in is not set up on this server yet.",
};

function Account({ status, hasScan, onSignedOut }: { status: Status | null; hasScan: boolean; onSignedOut: () => void }) {
  const [busy, setBusy] = useState(false);
  if (!status) return <span className="account" />;
  const account = status.account;
  if (account?.source === "session") {
    return (
      <span className="account">
        {account.userName ? `@${account.userName}` : "Signed in"}
        <button
          type="button"
          className="btn link"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await getJson("/api/auth/logout", { method: "POST" });
              onSignedOut();
            } catch {
              // Leave the state as is; the person can retry.
            } finally {
              setBusy(false);
            }
          }}
        >
          Sign out
        </button>
      </span>
    );
  }
  if (!status.signInConfigured) {
    return <span className="account">{account?.source === "dev" ? "Dev account" : "Not signed in"}</span>;
  }
  return (
    <a
      className="btn link"
      href="/api/auth/login"
      onClick={(e) => {
        // Sign-in leaves the page, and the current scan is kept only in this page.
        if (hasScan && !window.confirm("Signing in leaves this page, so this scan will be cleared. Sign in now?")) e.preventDefault();
      }}
    >
      Sign in with Untappd
    </a>
  );
}

function StatusNotes({ status }: { status: Status | null }) {
  if (!status) return null;
  const notes: string[] = [];
  if (!status.untappdConfigured) notes.push("Untappd lookups are not configured on this server.");
  if (!status.visionConfigured) notes.push("Photo reading is not configured yet, so only the sample menu works.");
  if (!status.account) notes.push("Sign in with Untappd to see your own and your friends' ratings.");
  if (!notes.length) return null;
  return (
    <ul className="notes">
      {notes.map((n) => (
        <li key={n}>{n}</li>
      ))}
    </ul>
  );
}
