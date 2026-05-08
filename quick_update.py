#!/usr/bin/env python3
"""
INWISE Movies - Quick Incremental Update
Runs daily to pick up:
  1. New titles added to the catalog (last 3 pages of recent sections)
  2. New episodes on existing series/animes already in the database

Usage:
    python quick_update.py

Schedule with Windows Task Scheduler to run daily.
"""

import re
import time
import logging
import os
import sys

# Reuse everything from full_sync
sys.path.insert(0, os.path.dirname(__file__))
from full_sync import (
    log, db, REAL_SITE,
    navigate_gateway, close_any_popup, safe_goto,
    get_card_urls, scrape_title, save_title, slugify
)

LOG_FILE = os.path.join(os.path.dirname(__file__), "update.log")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    datefmt="%H:%M:%S",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(LOG_FILE, encoding="utf-8", mode="a"),  # append mode
    ]
)
log = logging.getLogger("inwise.update")

# Daily schedule: only scan the most recent pages (2026 + homepage)
# Full historical sync is done once via full_sync.py; fill_gaps.py fixes missing data
NEW_TITLE_PAGES = 3

NEW_TITLE_SECTIONS = [
    f"{REAL_SITE}/?year=2026",
    f"{REAL_SITE}/",
]


def get_existing_slugs() -> set:
    """Fetch all slugs already in the database."""
    try:
        res = db.table("titles").select("slug").execute()
        return {r["slug"] for r in (res.data or [])}
    except Exception as e:
        log.error("Failed to fetch existing slugs: %s", e)
        return set()


def get_series_to_update() -> list:
    """Return all series/animes in the DB with their source_url."""
    try:
        res = db.table("titles").select("id,slug,title,source_url,type").in_("type", ["series", "anime"]).execute()
        return res.data or []
    except Exception as e:
        log.error("Failed to fetch series list: %s", e)
        return []


def count_episodes_in_db(title_id: int) -> int:
    """Count total episodes stored for a title."""
    try:
        res = (
            db.table("episodes")
            .select("id, season_id", count="exact")
            .eq("season_id",
                db.table("seasons").select("id").eq("title_id", title_id)
            )
            .execute()
        )
        return res.count or 0
    except Exception:
        # Simpler fallback
        try:
            seasons = db.table("seasons").select("id").eq("title_id", title_id).execute()
            season_ids = [s["id"] for s in (seasons.data or [])]
            if not season_ids:
                return 0
            total = 0
            for sid in season_ids:
                ep_res = db.table("episodes").select("id", count="exact").eq("season_id", sid).execute()
                total += ep_res.count or 0
            return total
        except Exception:
            return 0


def scan_for_new_titles(page, existing_slugs: set) -> list:
    """Scan recent catalog pages and return URLs not yet in the database."""
    new_urls = []
    seen = set()

    for section in NEW_TITLE_SECTIONS:
        for page_num in range(1, NEW_TITLE_PAGES + 1):
            if page_num == 1:
                url = section
            else:
                from urllib.parse import urlparse, urlencode, parse_qs, urlunparse
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
                break  # no new titles on this page, stop paginating this section
            time.sleep(1)

    return new_urls


def check_series_for_new_episodes(page, series_list: list) -> list:
    """
    Re-visit each series page. If the site has more episodes than the DB,
    return the source_url so it gets re-scraped.
    """
    needs_update = []
    for s in series_list:
        url = s.get("source_url")
        if not url:
            continue

        log.info("[series-check] %s — %s", s["title"], url)
        if not safe_goto(page, url):
            continue

        # Count torrent options on page (proxy for episode count)
        try:
            html = page.content()
            # Count buttonLinks entries
            m = re.search(r'var\s+buttonLinks\s*=\s*(\[[\s\S]*?\])\s*;', html)
            if not m:
                m = re.search(r'buttonLinks\s*=\s*(\[[\s\S]*?\])\s*[,;]', html)
            if m:
                import json
                raw = m.group(1)
                raw = re.sub(r'([{,]\s*)([a-zA-Z_]\w*)(\s*:)', r'\1"\2"\3', raw)
                raw = raw.replace("'", '"')
                raw = re.sub(r',\s*([}\]])', r'\1', raw)
                data = json.loads(raw)
                site_episode_count = len(data)
            else:
                site_episode_count = 0
        except Exception:
            site_episode_count = 0

        db_episode_count = count_episodes_in_db(s["id"])

        log.info("[series-check] DB=%d  site≈%d episodes", db_episode_count, site_episode_count)

        if site_episode_count > db_episode_count:
            log.info("[series-check] ✓ NEW EPISODES — queuing re-scrape: %s", s["title"])
            needs_update.append(url)

        time.sleep(1.2)

    return needs_update


def main():
    from playwright.sync_api import sync_playwright

    log.info("=" * 60)
    log.info("  INWISE Quick Update  —  %s", time.strftime("%Y-%m-%d %H:%M"))
    log.info("=" * 60)

    existing_slugs = get_existing_slugs()
    log.info("[db] %d titles already in database", len(existing_slugs))

    saved = updated = failed = 0

    with sync_playwright() as pw:
        # Run headless when no terminal is attached (scheduled task)
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

        # ── Phase 1: Gateway ─────────────────────────────────────────
        navigate_gateway(page)

        # ── Phase 2: Scan for NEW titles ─────────────────────────────
        log.info("\n[phase 1] Scanning for new titles...")
        new_urls = scan_for_new_titles(page, existing_slugs)
        log.info("[phase 1] Found %d new titles to add", len(new_urls))

        # ── Phase 3: Check series for new episodes ───────────────────
        log.info("\n[phase 2] Checking series for new episodes...")
        series_list = get_series_to_update()
        log.info("[phase 2] Checking %d series/animes", len(series_list))
        series_to_rescrape = check_series_for_new_episodes(page, series_list)
        log.info("[phase 2] %d series have new episodes", len(series_to_rescrape))

        # ── Phase 4: Scrape all queued URLs ──────────────────────────
        all_to_scrape = new_urls + series_to_rescrape
        log.info("\n[phase 3] Scraping %d pages total...", len(all_to_scrape))

        for i, url in enumerate(all_to_scrape, 1):
            is_new = url in new_urls
            log.info("[%d/%d] %s  (%s)", i, len(all_to_scrape), url, "NEW" if is_new else "UPDATE")
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

    log.info("\n" + "=" * 60)
    log.info("  UPDATE COMPLETE:  %d new  |  %d updated  |  %d failed", saved, updated, failed)
    log.info("=" * 60)

    # Write compact daily summary to separate file (easy audit)
    summary_file = os.path.join(os.path.dirname(__file__), "update_summary.log")
    with open(summary_file, "a", encoding="utf-8") as f:
        f.write(f"{time.strftime('%Y-%m-%d %H:%M')}  new={saved}  updated={updated}  failed={failed}\n")

    # If running interactively (terminal attached), pause; otherwise exit silently
    if sys.stdin.isatty():
        input("\nPressione ENTER para fechar...")


if __name__ == "__main__":
    main()
