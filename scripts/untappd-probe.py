#!/usr/bin/env python3
"""Probe the Untappd API and record which fields it actually returns.

Step 1 of the MVP plan: before building anything, confirm what Untappd gives us
for search, beer details, personal history and the friends feed.

Credentials come from the environment and are never printed:

    UNTAPPD_CLIENT_ID       required
    UNTAPPD_CLIENT_SECRET   required
    UNTAPPD_ACCESS_TOKEN    optional; enables personal and friends endpoints

Usage:

    python3 scripts/untappd-probe.py                # run the probe
    python3 scripts/untappd-probe.py auth-url --redirect https://example.com/cb
    python3 scripts/untappd-probe.py --query "Pliny the Elder Russian River"

Raw responses are written to .probe/ (ignored by Git) for local inspection.
Stdout and .probe/shapes.md hold only field names, types and numeric ranges,
so they are safe to paste into an issue.
"""

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

API = "https://api.untappd.com/v4"
USER_AGENT = "Arntappd/0.1 (beer-menu discovery; probe)"
OUT = Path(".probe")
LIST_SAMPLE = 50


def env(name, required=True):
    value = os.environ.get(name, "").strip()
    if required and not value:
        sys.exit(f"Missing environment variable {name}.")
    return value or None


def call(path, params, auth):
    """GET an endpoint. Returns (status, headers, body). Never echoes the URL."""
    query = dict(params)
    query.update(auth)
    url = f"{API}{path}?{urllib.parse.urlencode(query)}"
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return response.status, dict(response.headers), json.load(response)
    except urllib.error.HTTPError as error:
        try:
            body = json.load(error)
        except Exception:
            body = None
        return error.code, dict(error.headers), body
    except urllib.error.URLError as error:
        sys.exit(f"Network error calling {path}: {error.reason}")


def shape(value, depth=0):
    """Summarize structure: keys, types and numeric ranges, no string values."""
    if isinstance(value, dict):
        return {key: shape(item, depth + 1) for key, item in value.items()}
    if isinstance(value, list):
        if not value:
            return ["<empty list>"]
        merged = {}
        for item in value[:LIST_SAMPLE]:
            merged = merge(merged, shape(item, depth + 1))
        return [merged, f"<{len(value)} items>"]
    if isinstance(value, bool):
        return "bool"
    if isinstance(value, (int, float)):
        return {"_num": [value, value, 1 if value == 0 else 0, 1]}
    if value is None:
        return "null"
    return "str" if value != "" else "str(empty)"


def merge(a, b):
    if a == {} or a is None:
        return b
    if isinstance(a, dict) and isinstance(b, dict):
        if "_num" in a and "_num" in b:
            (lo1, hi1, z1, n1), (lo2, hi2, z2, n2) = a["_num"], b["_num"]
            return {"_num": [min(lo1, lo2), max(hi1, hi2), z1 + z2, n1 + n2]}
        if "_num" in a or "_num" in b:
            return f"mixed({render(a)}|{render(b)})"
        keys = list(dict.fromkeys([*a, *b]))
        return {k: merge(a.get(k), b.get(k)) if k in a and k in b
                else (a.get(k) if k in a else b.get(k)) for k in keys}
    if isinstance(a, list) and isinstance(b, list):
        return [merge(a[0], b[0]), a[-1]] if len(a) == 2 and len(b) == 2 else a
    return a if a == b else f"{render(a)}|{render(b)}"


def render(node):
    if isinstance(node, dict) and "_num" in node:
        lo, hi, zeros, count = node["_num"]
        extra = f", {zeros}/{count} zero" if zeros else ""
        return f"number [{lo}..{hi}]{extra}" if count > 1 else "number"
    return node if isinstance(node, str) else "object"


def lines(node, prefix=""):
    if isinstance(node, dict) and "_num" not in node:
        for key, child in node.items():
            yield from lines(child, f"{prefix}.{key}" if prefix else key)
    elif isinstance(node, list):
        if len(node) == 2:
            yield f"{prefix}[]  {node[1]}"
            yield from lines(node[0], f"{prefix}[]")
        else:
            yield f"{prefix}  {node[0]}"
    else:
        yield f"{prefix}  {render(node)}"


def report(name, status, headers, body, summary):
    OUT.mkdir(exist_ok=True)
    (OUT / f"{name}.json").write_text(json.dumps(body, indent=2))
    limit = headers.get("X-Ratelimit-Limit") or headers.get("x-ratelimit-limit")
    left = headers.get("X-Ratelimit-Remaining") or headers.get("x-ratelimit-remaining")
    section = [f"## {name}", "", f"HTTP {status}; rate limit {limit}, remaining {left}", ""]
    if body is not None:
        meta = body.get("meta", {}) if isinstance(body, dict) else {}
        if status != 200:
            section.append(f"Error: {meta.get('error_type')} {meta.get('error_detail')}")
        section += ["```", *lines(shape(body.get("response", body))), "```", ""]
    summary.extend(section)
    print("\n".join(section))


def first_bid(body):
    items = (body or {}).get("response", {}).get("beers", {}).get("items", [])
    return items[0]["beer"]["bid"] if items else None


def run(query):
    client = {"client_id": env("UNTAPPD_CLIENT_ID"),
              "client_secret": env("UNTAPPD_CLIENT_SECRET")}
    token = env("UNTAPPD_ACCESS_TOKEN", required=False)
    summary = ["# Untappd probe: field shapes", ""]

    status, headers, body = call("/search/beer", {"q": query, "limit": 25}, client)
    report("search_beer", status, headers, body, summary)

    bid = first_bid(body)
    if bid:
        status, headers, body = call(f"/beer/info/{bid}", {"compact": "true"}, client)
        report("beer_info_compact", status, headers, body, summary)
        status, headers, body = call(f"/beer/info/{bid}", {}, client)
        report("beer_info_full", status, headers, body, summary)

    if token:
        auth = {"access_token": token}
        status, headers, body = call("/user/info", {"compact": "true"}, auth)
        report("user_info", status, headers, body, summary)
        status, headers, body = call("/user/beers", {"limit": 50}, auth)
        report("user_beers", status, headers, body, summary)
        status, headers, body = call("/checkin/recent", {"limit": 50}, auth)
        report("checkin_recent", status, headers, body, summary)
        if bid:
            status, headers, body = call(f"/beer/info/{bid}", {}, auth)
            report("beer_info_authenticated", status, headers, body, summary)
    else:
        print("UNTAPPD_ACCESS_TOKEN not set; skipped personal and friends endpoints.")

    (OUT / "shapes.md").write_text("\n".join(summary))


def auth_url(redirect):
    params = {"client_id": env("UNTAPPD_CLIENT_ID"), "response_type": "token",
              "redirect_url": redirect}
    print("https://untappd.com/oauth/authenticate/?" + urllib.parse.urlencode(params))


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("command", nargs="?", default="run", choices=["run", "auth-url"])
    parser.add_argument("--query", default="Bourbon County Brand Stout Goose Island")
    parser.add_argument("--redirect", help="Callback URL registered in Untappd API Central")
    args = parser.parse_args()
    if args.command == "auth-url":
        if not args.redirect:
            sys.exit("auth-url needs --redirect.")
        auth_url(args.redirect)
    else:
        run(args.query)


if __name__ == "__main__":
    main()
