#!/usr/bin/env python3
"""
INWISE Movies - Full Catalog Sync
Crawls starckfilmes-v11.com and saves everything to Supabase.

Usage:
    pip install playwright supabase beautifulsoup4
    playwright install chromium
    python full_sync.py
"""

import re
import time
import logging
from supabase import create_client

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("inwise")

# ─── CONFIG ───────────────────────────────────────────────────────────────────

SUPABASE_URL = "https://ylveejhawvxwhvfubeeu.supabase.co"
SUPABASE_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    ".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsdmVlamhhd3Z4d2h2ZnViZWV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEwMDgzNSwiZXhwIjoyMDkzNjc2ODM1fQ"
    ".eI5Yr9iSLIy5Yik0fsMXvIq2WaaK7RTcAvIXVqtqQgM"
)

GATEWAY_URL = "https://acesso-starck.com"
BASE_URL    = "https://www.starckfilmes-v11.com"

# Catalog sections to scrape (will paginate each automatically)
CATALOG_SECTIONS = [
    f"{BASE_URL}/",
    f"{BASE_URL}/filmes/",
    f"{BASE_URL}/series/",
    f"{BASE_URL}/animes/",
    f"{BASE_URL}/?year=2026",
]

db = create_client(SUPABASE_URL, SUPABASE_KEY)

# ─── HELPERS ──────────────────────────────────────────────────────────────────

def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-{2,}", "-", text)
    return text.strip("-")[:120]


def close_any_popup(page):
    """Aggressively close ALL popups: Comunicado, Telegram, Instagram, ads."""
    for _ in range(3):  # up to 3 passes in case multiple popups stack
        closed = False

        # 1. Escape key first
        try:
            page.keyboard.press("Escape")
            time.sleep(0.2)
        except Exception:
            pass

        # 2. All close/X button selectors
        candidates = [
            # Generic close buttons
            "button.close",
            "button[class*='close']",
            "button[class*='Close']",
            "a[class*='close']",
            ".fa-times",
            ".fa-close",
            ".fa-times-circle",
            "[class*='close-btn']",
            "[class*='closeBtn']",
            "[class*='popup-close']",
            "[class*='modal-close']",
            "[class*='dialog-close']",
            "[aria-label='Close']",
            "[aria-label='Fechar']",
            "[aria-label='close']",
            "[data-dismiss='modal']",
            "[data-dismiss='popup']",
            # Text-based close
            "button:has-text('×')",
            "button:has-text('✕')",
            "button:has-text('✖')",
            "button:has-text('Fechar')",
            "button:has-text('Não')",
            "button:has-text('Ignorar')",
            "button:has-text('Agora não')",
            "a:has-text('×')",
            "a:has-text('✕')",
            "a:has-text('Fechar')",
            "span:has-text('×')",
            # Overlay/modal containers
            ".notification-close",
            "#popup-close",
            ".popup .close",
            ".modal .close",
            ".overlay .close",
            # Instagram/Telegram specific
            "[class*='instagram'] button",
            "[class*='telegram'] .close",
            "[class*='social'] .close",
            # "Comunicado" popup specific
            "[class*='comunicado'] .close",
            "[class*='aviso'] .close",
            "[class*='notice'] .close",
            # Bootstrap/generic modal
            ".modal-header .close",
            ".modal-footer button:first-child",
        ]

        for sel in candidates:
            try:
                els = page.locator(sel).all()
                for el in els:
                    if el.is_visible(timeout=300):
                        el.click(timeout=600)
                        log.debug("[popup] closed via %r", sel)
                        time.sleep(0.3)
                        closed = True
                        break
                if closed:
                    break
            except Exception:
                pass

        # 3. Click outside any visible "Comunicado Importante" / modal overlay
        if not closed:
            try:
                for txt in ["Comunicado Importante", "Telegram", "Instagram", "novo endereço", "novo link"]:
                    if page.locator(f"text={txt}").is_visible(timeout=300):
                        # click top-left corner (outside modal)
                        page.mouse.click(5, 5)
                        time.sleep(0.4)
                        log.debug("[popup] outside-click to dismiss '%s' popup", txt)
                        closed = True
                        break
            except Exception:
                pass

        # 4. If modal backdrop visible, click it
        if not closed:
            try:
                backdrop = page.locator(".modal-backdrop, .overlay-bg, .popup-overlay, [class*='backdrop']").first
                if backdrop.is_visible(timeout=300):
                    backdrop.click(timeout=600)
                    time.sleep(0.4)
                    closed = True
            except Exception:
                pass

        if not closed:
            break  # no more popups found


def safe_goto(page, url: str, retries: int = 3) -> bool:
    """Navigate to URL with retries and popup cleanup."""
    for attempt in range(retries):
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=30_000)
            page.wait_for_timeout(2500)
            close_any_popup(page)
            page.wait_for_timeout(800)
            # Check if still on gateway/popup — try close again
            try:
                if page.locator("text=Comunicado Importante").is_visible(timeout=500):
                    page.keyboard.press("Escape")
                    page.mouse.click(10, 10)
                    page.wait_for_timeout(800)
            except Exception:
                pass
            return True
        except Exception as exc:
            log.warning(f"[nav] attempt {attempt + 1}/{retries} failed for {url}: {exc}")
            if attempt < retries - 1:
                time.sleep(3)
    return False


def try_text(page, selectors: list) -> str:
    for sel in selectors:
        try:
            el = page.locator(sel).first
            if el.is_visible(timeout=600):
                t = el.inner_text().strip()
                if t:
                    return t
        except Exception:
            pass
    return ""


def try_attr(page, selectors: list, attr: str = "src") -> str:
    for sel in selectors:
        try:
            el = page.locator(sel).first
            val = (
                el.get_attribute(attr, timeout=600)
                or el.get_attribute("data-src", timeout=600)
                or el.get_attribute("data-lazy-src", timeout=600)
            )
            if val:
                return val if val.startswith("http") else BASE_URL + val
        except Exception:
            pass
    return ""


# ─── GATEWAY ──────────────────────────────────────────────────────────────────

def click_novo_dominio(page) -> bool:
    """Click 'IR PARA O NOVO DOMÍNIO' if present. Returns True if clicked."""
    for text in ["IR PARA O NOVO DOMÍNIO", "Ir para o novo domínio", "NOVO DOMÍNIO", "novo domínio", "novo link"]:
        try:
            btn = page.locator(f"text={text}").first
            if btn.is_visible(timeout=1500):
                btn.click()
                log.info("[gateway] clicked novo dominio: %r", text)
                page.wait_for_timeout(5000)
                return True
        except Exception:
            pass
    return False


def navigate_gateway(page) -> str:
    """
    Navigate through gateway and all 'site moved' redirects.
    Returns the final BASE_URL (scheme + host) of the real site.
    """
    log.info("[gateway] Opening %s", GATEWAY_URL)
    page.goto(GATEWAY_URL, wait_until="domcontentloaded", timeout=30_000)
    page.wait_for_timeout(5000)

    # Step 1 – initial gateway "IR PARA O NOVO DOMÍNIO"
    click_novo_dominio(page)

    # Step 2 – #nt-btn-ok / "Próximo"
    for sel in ["#nt-btn-ok", "button:has-text('Próximo')", "button:has-text('Next')", ".nt-ok"]:
        try:
            btn = page.locator(sel).first
            if btn.is_visible(timeout=2000):
                btn.click()
                log.info("[gateway] step2 via %r", sel)
                page.wait_for_timeout(4000)
                break
        except Exception:
            pass

    # Step 3 – second #nt-btn-ok / "OK"
    for sel in ["#nt-btn-ok", "button:has-text('OK')", "button:has-text('Confirmar')"]:
        try:
            btn = page.locator(sel).first
            if btn.is_visible(timeout=2000):
                btn.click()
                log.info("[gateway] step3 via %r", sel)
                page.wait_for_timeout(5000)
                break
        except Exception:
            pass

    # Dismiss any remaining popups WITHOUT following redirects
    for _ in range(4):
        page.wait_for_timeout(2000)
        close_any_popup(page)
        try:
            url = page.url
            if "acesso-starck" not in url:
                break
        except Exception:
            pass

    from urllib.parse import urlparse
    final_url = page.url
    parsed = urlparse(final_url)
    real_base = f"{parsed.scheme}://{parsed.netloc}"
    log.info("[gateway] complete. Final domain: %s", real_base)
    return real_base


# ─── CATALOG LISTING ──────────────────────────────────────────────────────────

def get_card_urls(page) -> set:
    """Extract all title detail URLs from the current listing page."""
    urls: set = set()

    # First try specific content-path selectors
    path_patterns = ["/filme/", "/serie/", "/anime/", "/filmes/", "/series/", "/animes/"]
    selectors = [
        "a[href*='/filme/']",
        "a[href*='/serie/']",
        "a[href*='/anime/']",
        "a[href*='/filmes/']",
        "a[href*='/series/']",
        "a[href*='/animes/']",
        ".item a[href]",
        ".ml-item a[href]",
        "article a[href]",
        ".poster a[href]",
        ".movies-list a[href]",
        ".item-movie a[href]",
        ".content-item a[href]",
        ".card a[href]",
        "h2 a[href]",
        "h3 a[href]",
        ".entry-title a[href]",
        ".post-title a[href]",
    ]
    for sel in selectors:
        try:
            for el in page.locator(sel).all():
                href = el.get_attribute("href") or ""
                if href.startswith("/"):
                    href = BASE_URL + href
                if not href.startswith("http"):
                    continue
                # Accept links that contain known content path patterns OR
                # look like a single-word slug under the same domain
                if any(p in href for p in path_patterns):
                    urls.add(href.split("?")[0].rstrip("/") + "/")
        except Exception:
            pass

    # Fallback: grab ALL internal links that look like single-title slugs
    if not urls:
        try:
            for el in page.locator("a[href]").all():
                href = el.get_attribute("href") or ""
                if href.startswith("/"):
                    href = BASE_URL + href
                if BASE_URL not in href:
                    continue
                path = href.replace(BASE_URL, "").lstrip("/")
                # Single level path like "nome-do-filme/" or "nome-do-filme"
                parts = [p for p in path.split("/") if p]
                if len(parts) == 1 and len(parts[0]) > 4 and "?" not in parts[0]:
                    urls.add(href.split("?")[0].rstrip("/") + "/")
        except Exception:
            pass

    return urls


def scrape_section(page, section_url: str) -> list:
    """Paginate through a catalog section and return all found title URLs."""
    all_urls: list = []
    seen: set = set()
    empty_streak = 0
    page_num = 1

    while True:
        if page_num == 1:
            url = section_url
        else:
            base = section_url.rstrip("/")
            url = f"{base}/page/{page_num}/"

        log.info("[catalog] page %d → %s", page_num, url)
        if not safe_goto(page, url):
            log.warning("[catalog] failed to load %s", url)
            break

        # Stop on 404/empty
        if "404" in page.title().lower() or "not found" in page.title().lower():
            log.info("[catalog] 404 on page %d, stopping", page_num)
            break

        new = get_card_urls(page) - seen
        if not new:
            empty_streak += 1
            if empty_streak >= 3:
                log.info("[catalog] 3 empty pages in a row, stopping")
                break
        else:
            empty_streak = 0
            seen.update(new)
            all_urls.extend(new)
            log.info("[catalog] +%d new URLs (total: %d)", len(new), len(all_urls))

        page_num += 1
        time.sleep(1.0)

    return all_urls


# ─── TITLE PAGE SCRAPING ──────────────────────────────────────────────────────

def detect_type(url: str, page) -> str:
    if "/serie/" in url:
        return "series"
    if "/anime/" in url:
        return "anime"
    if "/filme/" in url:
        return "movie"
    # fallback: check content
    try:
        body = page.inner_text("body").lower()
        if "temporada" in body or "episódio" in body:
            return "series"
    except Exception:
        pass
    return "movie"


def extract_download_links(page) -> list:
    """
    Collect all download/torrent links from the page content area.
    Returns list of dicts: {href, label, quality, audio_type}
    """
    results = []
    seen = set()

    # Strategy A: explicit quality text links in content
    content_selectors = [
        ".entry-content a",
        ".wp-content a",
        ".content a",
        ".post-content a",
        ".single-content a",
        "article a",
        ".download a",
        ".downloads a",
        "[class*='download'] a",
        "[class*='torrent'] a",
        "a[href^='magnet:']",
        "a[href*='/download/']",
        "a[href*='.torrent']",
    ]

    quality_keywords = ["1080", "720", "2160", "4k", "uhd", "fhd", "hd", "bluray", "blu-ray", "hdr"]

    for sel in content_selectors:
        try:
            for link in page.locator(sel).all():
                href = link.get_attribute("href") or ""
                text = (link.inner_text() or "").strip()

                if not href or href in seen:
                    continue

                # Must look like a download link
                is_magnet = href.startswith("magnet:")
                is_quality_text = any(q in text.lower() for q in quality_keywords)
                is_quality_url  = any(q in href.lower() for q in quality_keywords)
                is_dl_path = any(p in href for p in ["/download/", ".torrent", "/torrent/"])

                if not (is_magnet or is_quality_text or is_quality_url or is_dl_path):
                    continue

                seen.add(href)

                # Resolve relative URLs
                if href.startswith("/"):
                    href = BASE_URL + href

                quality = "1080p"
                for q in ["4K", "2160p", "1080p", "720p", "480p", "HDR", "UHD", "FHD"]:
                    if q.lower() in text.lower() or q.lower() in href.lower():
                        quality = q
                        break

                audio_type = "Dual Áudio"
                tl = text.lower()
                if "leg" in tl:
                    audio_type = "Legendado"
                elif "nacional" in tl or "nacional" in href.lower():
                    audio_type = "Nacional"
                elif "dub" in tl:
                    audio_type = "Dublado"

                results.append({
                    "href": href,
                    "label": text[:120] or quality,
                    "quality": quality,
                    "audio_type": audio_type,
                })
        except Exception:
            pass

    log.debug("[links] found %d download links", len(results))
    return results


def parse_episodes_from_links(links: list) -> dict:
    """
    Group download links into seasons/episodes by detecting patterns like:
    "EPISÓDIO 01: 1080p", "EP 03 DUAL", "EPISÓDIOS 01 E 02: 1080p", "S01E05"
    Returns {season_number: [{"episode_number": N, "title": T, "href": H, "quality": Q, "audio": A}]}
    """
    seasons: dict = {}
    current_season = 1

    for link in links:
        label = link["label"]
        href  = link["href"]

        # Detect season change
        sm = re.search(r"temporada\s*(\d+)", label.lower())
        if sm:
            current_season = int(sm.group(1))

        # S01E05 pattern
        sxe = re.search(r"s(\d+)e(\d+)", label.lower())
        if sxe:
            sn = int(sxe.group(1))
            en = int(sxe.group(2))
            seasons.setdefault(sn, []).append({
                "episode_number": en,
                "title": label,
                "href": href,
                "quality": link["quality"],
                "audio_type": link["audio_type"],
            })
            continue

        # "EPISÓDIO(S) 01 (E 02):" pattern
        ep_m = re.search(r"ep[isód\w]*\s*(\d{1,3})(?:\s+e\s+(\d{1,3}))?", label.lower())
        if ep_m:
            en1 = int(ep_m.group(1))
            en2 = int(ep_m.group(2)) if ep_m.group(2) else None
            seasons.setdefault(current_season, []).append({
                "episode_number": en1,
                "title": label,
                "href": href,
                "quality": link["quality"],
                "audio_type": link["audio_type"],
            })
            if en2:  # double-episode link (e.g. "EP 01 e 02")
                seasons.setdefault(current_season, []).append({
                    "episode_number": en2,
                    "title": label,
                    "href": href,
                    "quality": link["quality"],
                    "audio_type": link["audio_type"],
                })
            continue

        # Pure quality link with no episode number → movie torrent (handled elsewhere)

    return seasons


def scrape_title(page, url: str) -> dict | None:
    """Scrape a full title page and return a structured dict."""
    log.info("[title] %s", url)
    if not safe_goto(page, url):
        return None

    try:
        title_type = detect_type(url, page)

        # ── Title text ──
        title_text = try_text(page, [
            "h1.title", "h1.movie-title", "h1",
            ".title h1", ".info h1", ".data h1",
            ".sheader h1", ".single-title",
        ])
        if not title_text:
            parts = url.rstrip("/").split("/")
            title_text = (parts[-1] or parts[-2]).replace("-", " ").title()

        # ── Poster ──
        poster = try_attr(page, [
            ".poster img", ".film-poster img", ".movie-thumbnail img",
            "img.attachment-poster", "img[itemprop='image']",
            ".cover img", ".thumb img", ".content-poster img",
            "img[class*='poster']", "img[class*='cover']",
        ])
        # Try og:image as fallback
        if not poster:
            try:
                og = page.locator("meta[property='og:image']").get_attribute("content", timeout=600)
                if og:
                    poster = og
            except Exception:
                pass

        # ── Backdrop ──
        backdrop = try_attr(page, [
            ".backdrop img", ".header-background img", ".hero-image img", ".banner img",
            "img[class*='backdrop']", "img[class*='background']",
        ])
        if not backdrop:
            # Try CSS background-image
            try:
                style = page.locator(
                    ".sheader, .hero, .backdrop, [class*='background'], [class*='header']"
                ).first.get_attribute("style", timeout=600) or ""
                m = re.search(r"url\(['\"]?(.+?)['\"]?\)", style)
                if m:
                    backdrop = m.group(1)
            except Exception:
                pass
        if not backdrop:
            backdrop = poster

        # ── Synopsis ──
        synopsis = try_text(page, [
            "p.sinopsis", ".sinopsis", ".synopsis", ".description p",
            ".overview", ".plot", "[itemprop='description']",
            ".wp-content p", ".entry-content p",
            ".info-content p", ".summary p",
        ])

        # ── IMDb rating ──
        rating_text = try_text(page, [
            ".imdb span", "span.imdb", ".rating span",
            "[class*='imdb']", "[class*='rating']", ".vote span",
        ])
        imdb_rating = None
        if rating_text:
            m = re.search(r"(\d+\.?\d*)", rating_text)
            if m:
                val = float(m.group(1))
                # Normalise: some sites show "86" meaning 8.6
                if val > 10:
                    val /= 10
                imdb_rating = round(val, 1)

        # ── Year ──
        year_text = try_text(page, [
            ".year", "span.year", ".date", ".release-year",
            "[class*='year']", "[class*='date']",
        ])
        year = None
        if year_text:
            m = re.search(r"(20\d{2}|19\d{2})", year_text)
            if m:
                year = int(m.group(1))

        # ── Genres ──
        genres: list = []
        try:
            for el in page.locator(
                ".genres a, .genre a, [class*='genre'] a, .cats a, .categories a"
            ).all():
                g = el.inner_text().strip()
                if g and len(g) < 60:
                    genres.append(g)
        except Exception:
            pass

        # ── Slug from URL ──
        parts = url.rstrip("/").split("/")
        url_slug = next((p for p in reversed(parts) if p), "")
        if not url_slug or len(url_slug) < 2:
            url_slug = slugify(title_text)

        # ── Download links ──
        dl_links = extract_download_links(page)

        movie_torrents: list = []
        series_seasons: dict = {}

        if title_type in ("series", "anime"):
            series_seasons = parse_episodes_from_links(dl_links)
            # If we couldn't detect episode numbers, put all links as season-1 episodes
            if not series_seasons and dl_links:
                series_seasons = {
                    1: [
                        {
                            "episode_number": i + 1,
                            "title": lnk["label"],
                            "href": lnk["href"],
                            "quality": lnk["quality"],
                            "audio_type": lnk["audio_type"],
                        }
                        for i, lnk in enumerate(dl_links)
                    ]
                }
        else:
            movie_torrents = dl_links

        return {
            "title":       title_text[:255],
            "slug":        url_slug[:255],
            "type":        title_type,
            "source_url":  url,
            "synopsis":    (synopsis or "")[:3000] or None,
            "poster":      poster or None,
            "backdrop":    backdrop or None,
            "imdb_rating": imdb_rating,
            "year":        year,
            "genres":      genres,
            "torrents":    movie_torrents,
            "seasons":     series_seasons,
        }

    except Exception as exc:
        log.error("[title] error on %s: %s", url, exc)
        return None


# ─── DATABASE ─────────────────────────────────────────────────────────────────

def save_title(data: dict) -> bool:
    """Upsert a title and all related data."""
    genres       = data.pop("genres", [])
    torrents     = data.pop("torrents", [])
    seasons_data = data.pop("seasons", {})

    try:
        row = {k: v for k, v in data.items() if k in {
            "title", "slug", "type", "source_url", "synopsis",
            "poster", "backdrop", "imdb_rating", "year",
        }}
        row["external_id"] = data.get("slug", data.get("title", "unknown"))

        res = db.table("titles").upsert(row, on_conflict="slug").execute()
        if not res.data:
            log.warning("[db] upsert returned no data for %r", data.get("title"))
            return False

        title_id = res.data[0]["id"]

        # Genres
        for gname in genres:
            gslug = slugify(gname)
            try:
                gr = db.table("genres").upsert(
                    {"name": gname, "slug": gslug}, on_conflict="slug"
                ).execute()
                if gr.data:
                    db.table("title_genres").upsert(
                        {"title_id": title_id, "genre_id": gr.data[0]["id"]},
                        on_conflict="title_id,genre_id",
                    ).execute()
            except Exception as exc:
                log.debug("[db] genre error: %s", exc)

        # Movie torrent options
        for t in torrents:
            if not t.get("href"):
                continue
            try:
                db.table("torrent_options").upsert({
                    "title_id":   title_id,
                    "quality":    t.get("quality", "1080p"),
                    "audio_type": t.get("audio_type", "Dual Áudio"),
                    "language":   "Português | Inglês",
                    "magnet":     t["href"],
                }).execute()
            except Exception as exc:
                log.debug("[db] torrent error: %s", exc)

        # Seasons / Episodes
        for season_num, episodes in seasons_data.items():
            try:
                sr = db.table("seasons").upsert(
                    {"title_id": title_id, "season_number": season_num},
                    on_conflict="title_id,season_number",
                ).execute()
                if not sr.data:
                    continue
                season_id = sr.data[0]["id"]

                for ep in episodes:
                    try:
                        er = db.table("episodes").upsert({
                            "season_id":      season_id,
                            "episode_number": ep.get("episode_number", 1),
                            "title":          ep.get("title", f"Episódio {ep.get('episode_number', 1)}")[:255],
                            "quality":        ep.get("quality", "1080p"),
                        }, on_conflict="season_id,episode_number").execute()

                        if er.data and ep.get("href"):
                            db.table("torrent_options").upsert({
                                "episode_id": er.data[0]["id"],
                                "quality":    ep.get("quality", "1080p"),
                                "audio_type": ep.get("audio_type", "Dual Áudio"),
                                "language":   "Português | Inglês",
                                "magnet":     ep["href"],
                            }).execute()
                    except Exception as exc:
                        log.debug("[db] episode error: %s", exc)
            except Exception as exc:
                log.debug("[db] season error: %s", exc)

        log.info("[db] saved ✓ %r  (id: %s)", data.get("title"), title_id)
        return True

    except Exception as exc:
        log.error("[db] save failed for %r: %s", data.get("title"), exc)
        return False


def log_sync(log_id: str, **kwargs):
    """Update the sync_logs row."""
    try:
        db.table("sync_logs").update(kwargs).eq("id", log_id).execute()
    except Exception:
        pass


# ─── MAIN ─────────────────────────────────────────────────────────────────────

def main():
    from playwright.sync_api import sync_playwright

    log.info("=" * 60)
    log.info("  INWISE Movies — Full Catalog Sync")
    log.info("=" * 60)

    # Create sync log entry
    log_res = db.table("sync_logs").insert({
        "status": "running", "base_url": GATEWAY_URL, "imported": 0, "updated": 0,
        "failed": 0, "ignored": 0,
    }).execute()
    sync_log_id = log_res.data[0]["id"] if log_res.data else None

    saved = failed = 0

    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=False,
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

        # ── Phase 1: Gateway ──────────────────────────────────────────
        real_base = navigate_gateway(page)
        BASE_URL = real_base  # use real domain for all sections below

        sections = [
            f"{BASE_URL}/",
            f"{BASE_URL}/filmes/",
            f"{BASE_URL}/series/",
            f"{BASE_URL}/animes/",
            f"{BASE_URL}/?year=2026",
            f"{BASE_URL}/?year=2025",
        ]
        log.info("[gateway] Using BASE_URL = %s", BASE_URL)

        # ── Phase 2: Collect all title URLs ──────────────────────────
        log.info("\n[phase 2] Collecting title URLs from all sections...")
        all_urls: list = []
        seen_urls: set = set()

        for section in sections:
            urls = scrape_section(page, section)
            new  = [u for u in urls if u not in seen_urls]
            seen_urls.update(new)
            all_urls.extend(new)
            log.info("[section] %-45s → %d URLs (%d new)", section, len(urls), len(new))
            time.sleep(1.5)

        log.info("\n[phase 2] Total unique URLs: %d\n", len(all_urls))

        # ── Phase 3: Scrape each title ────────────────────────────────
        log.info("[phase 3] Scraping individual title pages...\n")
        for i, url in enumerate(all_urls, 1):
            log.info("[%d/%d]", i, len(all_urls))
            close_any_popup(page)

            data = scrape_title(page, url)
            if data:
                if save_title(data):
                    saved += 1
                else:
                    failed += 1
            else:
                failed += 1

            if sync_log_id and i % 10 == 0:
                log_sync(sync_log_id, imported=saved, failed=failed)

            time.sleep(1.2)

    # ── Finalize ──────────────────────────────────────────────────────
    if sync_log_id:
        log_sync(
            sync_log_id,
            status="success" if failed == 0 else "error",
            imported=saved,
            failed=failed,
        )

    log.info("\n" + "=" * 60)
    log.info("  SYNC COMPLETE:  %d saved  |  %d failed", saved, failed)
    log.info("=" * 60)
    input("\nPressione ENTER para fechar o browser...")


if __name__ == "__main__":
    main()
