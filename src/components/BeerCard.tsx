"use client";

import { useState } from "react";
import type { BeerCandidate } from "@/lib/types";
import type { Item } from "./model";
import { Ratings } from "./Ratings";

type Props = {
  item: Item;
  active: boolean;
  onConfirm: (id: number) => void;
  onChange: () => void;
  onSearch: (query: string) => void;
  onRetry: () => void;
  onRemove: () => void;
  onRestore: () => void;
  onFocus: () => void;
};

function menuLine(item: Item) {
  const m = item.menu;
  return [m.brewery, m.style, m.vintage, m.abv !== null ? `${m.abv}%` : null, m.price]
    .filter(Boolean)
    .join(" · ");
}

function Candidate({ c, suggested, onPick }: { c: BeerCandidate; suggested: boolean; onPick: () => void }) {
  return (
    <li className={suggested ? "candidate suggested" : "candidate"}>
      <div className="candidate-text">
        <span className="candidate-name">{c.name}</span>
        <span className="candidate-meta">
          {[c.brewery, c.style, c.abv ? `${c.abv}%` : null].filter(Boolean).join(" · ")}
        </span>
      </div>
      <button type="button" className={suggested ? "btn primary" : "btn"} onClick={onPick}>
        {suggested ? "Confirm" : "Pick"}
      </button>
    </li>
  );
}

export function BeerCard({ item, active, onConfirm, onChange, onSearch, onRetry, onRemove, onRestore, onFocus }: Props) {
  const [query, setQuery] = useState(item.menu.name);
  const [searching, setSearching] = useState(false);
  const number = item.index + 1;

  if (item.removed) {
    return (
      <li id={`beer-${item.key}`} className="card removed">
        <span className="pin static">{number}</span>
        <span className="removed-text">Removed “{item.menu.name}”</span>
        <button type="button" className="btn link" onClick={onRestore}>Undo</button>
      </li>
    );
  }

  const confirmed = item.selectedId !== null;
  const match = item.match;
  const details = item.details;

  return (
    <li id={`beer-${item.key}`} className={`card${active ? " active" : ""}${confirmed ? " confirmed" : ""}`} onClick={onFocus}>
      <div className="card-head">
        <span className="pin static" aria-label={`Beer ${number}`}>{number}</span>
        <div className="card-title">
          <h3>{confirmed && details.status === "done" ? details.data.name : item.menu.name}</h3>
          <p className="menu-line">
            {confirmed && details.status === "done"
              ? [details.data.brewery, details.data.style, details.data.abv ? `${details.data.abv}%` : null].filter(Boolean).join(" · ")
              : menuLine(item)}
          </p>
        </div>
      </div>

      {confirmed ? (
        <div className="card-body">
          {details.status === "loading" || details.status === "idle" ? <p className="muted">Loading ratings…</p> : null}
          {details.status === "error" ? (
            <p className="error">
              {details.message} <button type="button" className="btn link" onClick={onRetry}>Retry</button>
            </p>
          ) : null}
          {details.status === "done" ? <Ratings details={details.data} /> : null}
          <div className="actions">
            {details.status === "done" ? (
              <a className="btn link" href={details.data.untappdUrl} target="_blank" rel="noopener noreferrer">
                Open in Untappd
              </a>
            ) : null}
            <button type="button" className="btn link" onClick={onChange}>Wrong beer?</button>
          </div>
        </div>
      ) : (
        <div className="card-body">
          {match.status === "idle" ? <p className="muted">Waiting to search Untappd…</p> : null}
          {match.status === "loading" ? <p className="muted">Searching Untappd…</p> : null}
          {match.status === "error" ? (
            <p className="error">
              {match.message} <button type="button" className="btn link" onClick={onRetry}>Retry</button>
            </p>
          ) : null}
          {match.status === "done" ? (
            <>
              {match.data.candidates.length === 0 ? (
                <p className="muted">No Untappd match for “{match.data.query}”. Try searching by hand.</p>
              ) : (
                <>
                  <p className="muted small">
                    {match.data.suggestedId !== null ? "Suggested match. Confirm it or pick another:" : "No reliable match. Pick one if it is right:"}
                  </p>
                  <ul className="candidates">
                    {match.data.candidates.map((c) => (
                      <Candidate key={c.id} c={c} suggested={c.id === match.data.suggestedId} onPick={() => onConfirm(c.id)} />
                    ))}
                  </ul>
                </>
              )}
            </>
          ) : null}
          {searching ? (
            <form
              className="search"
              onSubmit={(e) => {
                e.preventDefault();
                if (query.trim().length >= 2) onSearch(query.trim());
              }}
            >
              <input
                type="search"
                value={query}
                maxLength={120}
                onChange={(e) => setQuery(e.target.value)}
                aria-label={`Search Untappd for beer ${number}`}
                enterKeyHint="search"
              />
              <button type="submit" className="btn">Search</button>
            </form>
          ) : null}
          <div className="actions">
            {!searching ? (
              <button type="button" className="btn link" onClick={() => setSearching(true)}>Search by hand</button>
            ) : null}
            <button type="button" className="btn link danger" onClick={onRemove}>Not a beer</button>
          </div>
        </div>
      )}
    </li>
  );
}
