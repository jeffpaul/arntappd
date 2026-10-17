#!/usr/bin/env python3
"""Publish the reviewed backlog using GitHub CLI's configured authentication."""

import argparse
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile


ROOT = Path(__file__).resolve().parents[1]
BACKLOG = ROOT / "docs" / "backlog"


def gh(*args):
    result = subprocess.run(["gh", *args], text=True, capture_output=True)
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or "GitHub CLI failed")
    return result.stdout.strip()


def load_backlog():
    entries = json.loads((BACKLOG / "issues.json").read_text())
    seen_ids, seen_titles = set(), set()
    for entry in entries:
        ident, title = entry["id"], entry["title"]
        if ident in seen_ids or title in seen_titles:
            raise ValueError(f"Duplicate backlog ID or title: {ident}")
        path = (BACKLOG / entry["body_file"]).resolve()
        if path.parent != BACKLOG.resolve():
            raise ValueError(f"Invalid body path: {ident}")
        body = path.read_text()
        refs = set(re.findall(r"\{\{([A-Z]+-\d+)\}\}", body))
        if refs != set(entry["dependencies"]) or not refs <= seen_ids:
            raise ValueError(f"Invalid or out-of-order dependencies: {ident}")
        if not title.strip() or not body.strip() or "- [ ] " not in body:
            raise ValueError(f"Missing title, body or acceptance criteria: {ident}")
        seen_ids.add(ident)
        seen_titles.add(title)
    return entries


def publish(repo, entries):
    existing = json.loads(gh(
        "issue", "list", "--repo", repo, "--state", "all", "--limit", "1000",
        "--json", "number,title,url",
    ))
    if len(existing) >= 1000:
        raise RuntimeError("Issue-list limit reached; complete pagination before publishing")
    by_title = {}
    for issue in existing:
        if issue["title"] in by_title:
            raise RuntimeError(f"Duplicate remote title: {issue['title']}")
        by_title[issue["title"]] = issue
    links, receipts = {}, []
    receipt_path = ROOT / ".backlog-publish-receipt.json"
    for entry in entries:
        title, ident = entry["title"], entry["id"]
        issue = by_title.get(title)
        created = issue is None
        body = (BACKLOG / entry["body_file"]).read_text()
        for dep in entry["dependencies"]:
            body = body.replace("{{" + dep + "}}", links[dep])
        if created:
            with tempfile.TemporaryDirectory(prefix="arntappd-issue-") as tmp:
                body_file = Path(tmp) / "body.md"
                body_file.write_text(body)
                issue_url = gh("issue", "create", "--repo", repo,
                               "--title", title, "--body-file", str(body_file))
            issue = {"url": issue_url}
        # Read back every created or reused issue before recording success.
        verified = json.loads(gh("issue", "view", issue["url"], "--repo", repo,
                                 "--json", "number,title,url,body,state"))
        if verified["title"] != title or (created and verified["body"] != body):
            raise RuntimeError(f"Read-back mismatch for {ident}; inspect before retrying")
        links[ident] = verified["url"]
        receipts.append({"id": ident, "title": title, "url": verified["url"],
                         "number": verified["number"], "created": created})
        receipt_path.write_text(json.dumps(receipts, indent=2) + "\n")
        print(f"{'Created' if created else 'Reused'} {ident}: {verified['url']}", flush=True)
    print(f"Verified {len(receipts)} GitHub issues; receipt: {receipt_path}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", default="jeffpaul/arntappd")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", args.repo):
        parser.error("--repo must be owner/repository")
    try:
        entries = load_backlog()
        if args.dry_run:
            for entry in entries:
                print(f"{entry['id']}: {entry['title']}")
            print(f"Validated {len(entries)} issue bodies and their dependency order; no GitHub writes")
        else:
            publish(args.repo, entries)
    except (ValueError, OSError, RuntimeError, KeyError) as error:
        print(f"Backlog publishing stopped: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
