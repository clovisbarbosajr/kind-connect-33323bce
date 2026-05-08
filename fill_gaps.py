#!/usr/bin/env python3
"""
INWISE Movies - Fill Gaps
Scrapes only titles that are missing data (no poster, no torrents, or bad title).
Also scans the first 3 pages of 2026 for brand-new titles not yet in the DB.

Usage:
    python fill_gaps.py

Safe to run at any time — skips titles that already have complete data.
Much faster than full_sync.py (only processes incomplete records).
"""

import re
import time
import logging
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from full_sync import (
    log, db, REAL_SITE,
    navigate_gateway, close_any_popup, safe_goto,
    get_card_urls, scrape_title, save_title, slugify
)

LOG_FILE = os.path.join(os.path.dirname(__file__), "fill_gaps.log")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    datefmt="%H:%M:%S",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(LOG_FILE, encoding="utf-8", mode="a"),
    ],
)
log = logging.getLogger("inwise.gaps")

# Patterns that indicate a dirty/SEO title that needs re-scrape
_SEO_PATTERN = re.compile(
    r'\b(torrent|download|dual\s*[áa]udio|legendado|dublado|4k|1080p|720p|blu-ray)\b',
    re.IGNORECASE,
)

NEW_RELEASE_SECTIONS = [
    f"{REAL_SITE}/",
    f"{REAL_SITE}/?year=2026",
    f"{REAL_SITE}/?year=2025",
    f"{REAL_SITE}/filmes/",
    f"{REAL_SITE}/series/",
    f"{REAL_SITE}/animes/",
]
NEW_RELEASE_PAGES = 3


def get_incomplete_titles() -> list:
    """Return titles that need re-scraping: missing poster, missing torrents, or dirty title."""
    try:
        res = db.table("titles").select("id, slug, title, source_url, type").execute()
        all_titles = res.data or []
    except Exception as e:
        log.error("Failed to fetch titles: %s", e)
        return []

    needs = []
    for t in all_titles:
        reason = None
        if not t.get("source_url"):
            continue  # No URL to re-scrape, skip
        if not t.get("poster") or t.get("poster", "").startswith("https://images.unsplash.com"):
            reason = "no poster"
        elif _SEO_PATTERN.search(t.get("title") or ""):
            reason = "dirty title"

        if reason:
            t["_reason"] = reason
            needs.append(t)

    # Also find titles with zero torrent_options
    try:
        torrent_res = db.table("torrent_options").select("title_id", count="exact").execute()
        titles_with_torrents = {r["title_id"] for r in (torrent_res.data or [])}
        for t in all_titles:
            if t["id"] not in titles_with_torrents and t.get("source_url") and t not in needs:
                t["_reason"] = "no torrents"
                needs.append(t)
    except Exception as e:
        log.warning("Could not check torrent counts: %s", e)

    return needs


def scan_new_releases(page, existing_slugs: set) -> list:
    """Scan recent pages for titles not yet in the DB."""
    new_urls = []
    seen = set()

    for section in NEW_RELEASE_SECTIONS:
        for page_num in range(1, NEW_RELEASE_PAGES + 1):
            if page_num == 1:
                url = section
            else:
                from urllib.parse import urlparse
                parsed = urlparse(section)
                if parsed.query:
                    url = f"{parsed.scheme}://{parsed.netloc}{parsed.path.rstrip('/')}/page/{page_num}/?{parsed.query}"
                else:
                    url = f"{section.rstrip('/')}/page/{page_num}/"

            log.info("[scan] %s", url)
            if not safe_goto(page, url):
                break

            found = get_card_urls(page, REAL_SITE)
            new_on_page = 0
            for u in found:
                slug = u.rstrip("/").split("/")[-1]
                if slug not in existing_slugs and u not in seen:
                    new_urls.append(u)
                    seen.add(u)
                    new_on_page += 1

            log.info("[scan] page %d: %d new titles found", page_num, new_on_page)
            if new_on_page == 0:
                break
            time.sleep(1)

    return new_urls


def main():
    from playwright.sync_api import sync_playwright

    log.info("=" * 60)
    log.info("  INWISE Fill Gaps  —  %s", time.strftime("%Y-%m-%d %H:%M"))
    log.info("=" * 60)

    incomplete = get_incomplete_titles()
    log.info("[gaps] %d titles need re-scraping", len(incomplete))
    for t in incomplete[:10]:
        log.info("  slug=%-40s reason=%s", t["slug"], t.get("_reason"))
    if len(incomplete) > 10:
        log.info("  ... and %d more", len(incomplete) - 10)

    try:
        existing_slugs_res = db.table("titles").select("slug").execute()
        existing_slugs = {r["slug"] for r in (existing_slugs_res.data or [])}
    except Exception as e:
        log.error("Cannot fetch existing slugs: %s", e)
        existing_slugs = set()

    saved = updated = failed = 0

    with sync_playwright() as pw:
        is_interactive = sys.stdin.isatty()
        browser = pw.chromium.launch(
            headless=not is_interactive,
            args=["--disable-blink-features=AutomationControlled"],
        )
        ctx = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 800},
        )
        page = ctx.new_page()

        navigate_gateway(page)

        # Phase 1: new releases
        log.info("\n[phase 1] Scanning for new 2026/2025 releases...")
        new_urls = scan_new_releases(page, existing_slugs)
        log.info("[phase 1] %d new titles to add", len(new_urls))

        # Phase 2: fix incomplete titles
        log.info("\n[phase 2] Re-scraping %d incomplete titles...", len(incomplete))
        gap_urls = [t["source_url"] for t in incomplete if t.get("source_url")]

        all_urls = new_urls + gap_urls
        log.info("\n[scrape] Total URLs to process: %d", len(all_urls))

        for i, url in enumerate(all_urls, 1):
            is_new = url in new_urls
            log.info("[%d/%d] %s  (%s)", i, len(all_urls), url, "NEW" if is_new else "FIX")
            close_any_popup(page)
            data = scrape_title(page, url)
            if data:
                if save_title(data):
                    if is_new:
                        saved += 1
                    else:
                        updated += 1
                else:
                    failed += 1
            else:
                failed += 1
            time.sleep(1.2)

        browser.close()

    log.info("\n" + "=" * 60)
    log.info("  FILL GAPS DONE:  %d new  |  %d fixed  |  %d failed", saved, updated, failed)
    log.info("=" * 60)

    summary = os.path.join(os.path.dirname(__file__), "update_summary.log")
    with open(summary, "a", encoding="utf-8") as f:
        f.write(f"{time.strftime('%Y-%m-%d %H:%M')}  [fill_gaps] new={saved} fixed={updated} failed={failed}\n")

    if sys.stdin.isatty():
        input("\nPressione ENTER para fechar...")


if __name__ == "__main__":
    main()
