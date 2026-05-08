#!/usr/bin/env python3
"""
Fix titles and types directly in the DB — no web scraping needed.
- Strips SEO junk: "Torrent (2023) Dual Áudio Download" etc.
- Fixes type based on source_url path (/filmes/ → movie, /series/ → series, /animes/ → anime)
Runs in seconds.
"""
import re, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from full_sync import db

_SEO = re.compile(
    r'\s*(torrent|download|blu-?ray|4k|1080p|720p|legendado|dublado|dual[\s\-]?[áa]udio'
    r'|hdrip|bdrip|webrip|web-dl|hdtv|remux|hdcam|\bts\b|\bcam\b|nacional|completo|completa'
    r'|temporada\s+completa|\d+ª\s+temporada\s+completa)\s*',
    re.IGNORECASE,
)
_YEAR_PAREN = re.compile(r'\s*\(\s*(?:19|20)\d{2}\s*\)\s*$')
_SPACES     = re.compile(r'\s{2,}')

def clean_title(t: str) -> str:
    t = _SEO.sub(' ', t).strip()
    t = _YEAR_PAREN.sub('', t).strip()
    t = _SPACES.sub(' ', t).strip()
    return t

def infer_type(source_url: str, current_type: str, title: str) -> str:
    url = (source_url or '').lower()
    if '/animes/' in url or '/anime/' in url:
        return 'anime'
    if '/filmes/' in url or '/filme/' in url or '/movies/' in url:
        return 'movie'
    if '/series/' in url or '/serie/' in url:
        return 'series'
    # From title: if it has Nª Temporada, it's a series
    if re.search(r'\d+ª\s*temporada|s\d{2}e\d{2}', title, re.IGNORECASE):
        return 'series'
    return current_type  # keep as-is

def main():
    print("Fetching all titles...")
    res = db.table("titles").select("id,title,type,source_url").execute()
    titles = res.data or []
    print(f"  {len(titles)} titles loaded")

    fixed_title = 0
    fixed_type  = 0
    unchanged   = 0

    for t in titles:
        old_title = t.get("title") or ""
        old_type  = t.get("type") or "movie"
        url       = t.get("source_url") or ""

        new_title = clean_title(old_title)
        new_type  = infer_type(url, old_type, old_title)

        if new_title == old_title and new_type == old_type:
            unchanged += 1
            continue

        update = {}
        if new_title != old_title:
            update["title"] = new_title
            fixed_title += 1
        if new_type != old_type:
            update["type"] = new_type
            fixed_type += 1

        try:
            db.table("titles").update(update).eq("id", t["id"]).execute()
            print(f"  [{t['id']}] {old_title[:60]!r}")
            if new_title != old_title:
                print(f"       → title: {new_title[:60]!r}")
            if new_type != old_type:
                print(f"       → type:  {old_type} → {new_type}")
        except Exception as e:
            print(f"  ERROR id={t['id']}: {e}")

    print(f"\nDone — {fixed_title} titles cleaned, {fixed_type} types fixed, {unchanged} unchanged")

if __name__ == "__main__":
    main()
