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
import os
from supabase import create_client

# Log to both console and file
LOG_FILE = os.path.join(os.path.dirname(__file__), "sync.log")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    datefmt="%H:%M:%S",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(LOG_FILE, encoding="utf-8", mode="w"),
    ]
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
    f"{BASE_URL}/?year=2025",
    f"{BASE_URL}/?year=2024",
    f"{BASE_URL}/?year=2023",
    f"{BASE_URL}/?year=2022",
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
    """Navigate to URL, wait for JS content, then close popups."""
    for attempt in range(retries):
        try:
            page.goto(url, wait_until="networkidle", timeout=40_000)
            page.wait_for_timeout(1500)
            close_any_popup(page)
            page.wait_for_timeout(500)
            # If popup still visible, try again
            try:
                if page.locator("text=Comunicado Importante").is_visible(timeout=400):
                    page.keyboard.press("Escape")
                    page.mouse.click(10, 10)
                    page.wait_for_timeout(600)
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

# Known real domain — used as fallback if gateway automation fails
REAL_SITE = "https://www.starckfilmes-v11.com"

GATEWAY_DOMAINS = {"acesso-starck.com", "starck.site", "starck.link"}


def _on_gateway(page) -> bool:
    """True if current URL is still a gateway/redirect domain."""
    try:
        from urllib.parse import urlparse
        host = urlparse(page.url).netloc.lower().lstrip("www.")
        return any(gd in host for gd in GATEWAY_DOMAINS)
    except Exception:
        return True


def _try_click_any(page, selectors_or_texts: list, label: str, wait_ms=4000) -> bool:
    """Try clicking the first visible element from a list of CSS selectors or text strings."""
    for s in selectors_or_texts:
        for loc in [page.locator(s), page.locator(f"text={s}")]:
            try:
                if loc.first.is_visible(timeout=1200):
                    loc.first.click(timeout=2000)
                    log.info("[gateway] clicked %s via %r", label, s)
                    page.wait_for_timeout(wait_ms)
                    return True
            except Exception:
                pass
    return False


def navigate_gateway(page) -> str:
    """
    Navigate through the gateway redirect sequence.
    Returns the final BASE_URL (scheme + host) of the real content site.
    Falls back to REAL_SITE if automation cannot complete the sequence.
    """
    log.info("[gateway] Opening %s", GATEWAY_URL)
    try:
        page.goto(GATEWAY_URL, wait_until="domcontentloaded", timeout=30_000)
    except Exception as e:
        log.warning("[gateway] initial load error: %s — jumping straight to real site", e)
        page.goto(REAL_SITE, wait_until="domcontentloaded", timeout=30_000)
        page.wait_for_timeout(3000)
        close_any_popup(page)
        return REAL_SITE

    page.wait_for_timeout(4000)
    log.info("[gateway] page title: %r  url: %s", page.title(), page.url)

    # ── Step 1: click "IR PARA O NOVO DOMÍNIO" or any redirect CTA ──
    step1_texts = [
        "IR PARA O NOVO DOMÍNIO",
        "Ir para o novo domínio",
        "NOVO DOMÍNIO",
        "novo domínio",
        "Acessar novo site",
        "ACESSAR",
        "novo link",
        "Clique aqui",
    ]
    step1_sels = [
        "a.btn-primary", "a[class*='btn']", ".btn-redirect",
        "a[href*='starck']", "#redirect-btn",
    ]
    _try_click_any(page, step1_texts + step1_sels, "step1-novo-dominio", wait_ms=5000)
    log.info("[gateway] after step1: url=%s", page.url)

    # If we jumped to the real site already, skip steps 2/3
    if not _on_gateway(page):
        log.info("[gateway] reached real site after step1")
    else:
        # ── Step 2: "Próximo" ──
        _try_click_any(page, [
            "#nt-btn-ok", ".nt-ok", "button:has-text('Próximo')",
            "Próximo", "Next", "Continuar",
        ], "step2-proximo", wait_ms=4000)
        log.info("[gateway] after step2: url=%s", page.url)

        # ── Step 3: "OK" / confirm ──
        _try_click_any(page, [
            "#nt-btn-ok", "button:has-text('OK')", "OK", "Confirmar", "Entrar",
        ], "step3-ok", wait_ms=5000)
        log.info("[gateway] after step3: url=%s", page.url)

    # ── Dismiss remaining popups ──
    for _ in range(5):
        page.wait_for_timeout(1500)
        close_any_popup(page)
        if not _on_gateway(page):
            break

    from urllib.parse import urlparse
    final_url = page.url
    parsed = urlparse(final_url)
    real_base = f"{parsed.scheme}://{parsed.netloc}"

    # ── FALLBACK: if still on gateway, go directly to real site ──
    if _on_gateway(page):
        log.warning("[gateway] still on gateway after all steps — navigating directly to %s", REAL_SITE)
        try:
            page.goto(REAL_SITE, wait_until="domcontentloaded", timeout=30_000)
            page.wait_for_timeout(3000)
            close_any_popup(page)
        except Exception as e:
            log.error("[gateway] fallback navigation failed: %s", e)
        real_base = REAL_SITE

    log.info("[gateway] complete. Final domain: %s", real_base)
    return real_base


# ─── CATALOG LISTING ──────────────────────────────────────────────────────────

def dump_page_html(page, label="debug"):
    """Save page HTML to file for inspection."""
    try:
        path = os.path.join(os.path.dirname(__file__), f"debug_{label}.html")
        html = page.content()
        with open(path, "w", encoding="utf-8") as f:
            f.write(html)
        log.info("[debug] HTML salvo em %s (%d bytes)", path, len(html))
    except Exception as e:
        log.warning("[debug] falha ao salvar HTML: %s", e)


def get_card_urls(page, base: str) -> set:
    """Extract /catalog/ title URLs from the current listing page."""
    from urllib.parse import urlparse
    host = urlparse(base).netloc
    urls: set = set()
    # Wait for at least one catalog card to appear in the DOM
    try:
        page.wait_for_selector("a[href*='/catalog/']", timeout=8000)
    except Exception:
        pass  # may genuinely have no catalog links on this page
    try:
        all_links = page.evaluate("""
            () => Array.from(document.querySelectorAll('a[href]'))
                       .map(a => a.href)
                       .filter(h => h && h.startsWith('http'))
        """)
    except Exception:
        all_links = []

    for href in all_links:
        if host not in href:
            continue
        # The site uses /catalog/slug/ for all content
        if "/catalog/" in href:
            clean = href.split("?")[0].rstrip("/") + "/"
            urls.add(clean)

    return urls


def scrape_section(page, section_url: str, base: str) -> list:
    """Paginate through a catalog section and return all found title URLs."""
    all_urls: list = []
    seen: set = set()
    empty_streak = 0
    page_num = 1
    first_page = True

    while True:
        if page_num == 1:
            url = section_url
        else:
            # Handle URLs with query strings like /?year=2026
            from urllib.parse import urlparse, urlencode, parse_qs, urlunparse
            parsed = urlparse(section_url)
            if parsed.query:
                # e.g. /?year=2026  → /page/2/?year=2026
                url = f"{parsed.scheme}://{parsed.netloc}{parsed.path.rstrip('/')}/page/{page_num}/?{parsed.query}"
            else:
                url = f"{section_url.rstrip('/')}/page/{page_num}/"

        log.info("[catalog] page %d → %s", page_num, url)
        if not safe_goto(page, url):
            log.warning("[catalog] failed to load %s", url)
            break

        # Stop on 404/empty
        title_lower = page.title().lower()
        if "404" in title_lower or "not found" in title_lower or "page not found" in title_lower:
            log.info("[catalog] 404 on page %d, stopping", page_num)
            break

        # Dump HTML of first page of first section for diagnosis
        if first_page:
            dump_page_html(page, label=section_url.split("/")[-2] or "home")
            first_page = False

        new = get_card_urls(page, base) - seen
        log.info("[catalog] page %d found %d links (new: %d)", page_num, len(new) + len(seen), len(new))

        if not new:
            empty_streak += 1
            if empty_streak >= 2:
                log.info("[catalog] 2 empty pages in a row, stopping")
                break
        else:
            empty_streak = 0
            seen.update(new)
            all_urls.extend(new)
            log.info("[catalog] +%d URLs  total so far: %d", len(new), len(all_urls))

        page_num += 1
        time.sleep(1.2)

    return all_urls


# ─── TITLE PAGE SCRAPING ──────────────────────────────────────────────────────

def _normalize_audio(raw: str) -> str:
    """Normalize audio type to a clean label."""
    s = (raw or "").lower()
    if "leg" in s or "subtitle" in s or "sub" in s:
        return "Legendado"
    if "dual" in s or "dublado" in s and "leg" in s:
        return "Dual Áudio"
    if "dub" in s or "dublado" in s:
        return "Dublado"
    if "nacional" in s or "ptbr" in s or "pt-br" in s:
        return "Dublado"
    return raw.strip() if raw.strip() else "Dual Áudio"


def extract_button_links(page) -> list:
    """
    Extract download options from the site's buttonLinks JS variable.
    Each top-level item in buttonLinks may represent a movie quality option
    or a series episode. Returns list of dicts preserving the item title.
    """
    import json
    results = []
    try:
        html = page.content()
        # Match buttonLinks=[{...}] JS variable (greedy to get full array)
        m = re.search(r'var\s+buttonLinks\s*=\s*(\[[\s\S]*?\])\s*;', html)
        if not m:
            m = re.search(r'buttonLinks\s*=\s*(\[[\s\S]*?\])\s*[,;]', html)
        if not m:
            log.debug("[btnlinks] buttonLinks not found in page")
            return results
        raw = m.group(1)
        # Fix JS object notation to valid JSON
        raw = re.sub(r'([{,]\s*)([a-zA-Z_]\w*)(\s*:)', r'\1"\2"\3', raw)
        raw = raw.replace("'", '"')
        # Remove trailing commas before } or ]
        raw = re.sub(r',\s*([}\]])', r'\1', raw)
        data = json.loads(raw)
        for item in data:
            item_title = item.get("title", "")
            btn_info = item.get("btnInfo", [])
            for opt in btn_info:
                magnet = opt.get("url", "")
                if not magnet or not magnet.startswith("magnet:"):
                    continue
                audio = _normalize_audio(opt.get("audioType", ""))
                res   = (opt.get("resolution") or "1080p").strip()
                size  = opt.get("size", "")
                codec = opt.get("dynamicRange", "")
                ftype = opt.get("fileType", "movie")
                results.append({
                    "item_title": item_title,   # used to identify episodes in series
                    "magnet":     magnet,
                    "quality":    res,
                    "audio_type": audio,
                    "size":       size,
                    "codec":      codec,
                    "file_type":  ftype,
                })
    except Exception as e:
        log.debug("[btnlinks] parse error: %s  (raw start: %.200s)", e, raw[:200] if 'raw' in dir() else "")
    return results


def scrape_title(page, url: str) -> dict | None:
    """Scrape a catalog title page and return structured data."""
    log.info("[title] %s", url)
    if not safe_goto(page, url):
        return None

    try:
        html = page.content()

        # ── Slug from URL ──
        parts = url.rstrip("/").split("/")
        url_slug = next((p for p in reversed(parts) if p), "")

        # ── Title ──
        title_text = try_text(page, ["h1", ".title", ".movie-title", "[class*='title'] h1"])
        if not title_text:
            # Try JS: find title in buttonLinks or page JS vars
            m = re.search(r'buttonLinks\s*=\s*\[\s*\{[^}]*title\s*:\s*["\']([^"\']+)', html)
            if m:
                title_text = m.group(1)
        if not title_text:
            title_text = url_slug.replace("-", " ").title()

        # ── Type: movie / series / anime ──
        title_type = "movie"
        body_lower = html.lower()
        if "temporada" in body_lower or "episódio" in body_lower or "episodio" in body_lower:
            title_type = "series"
        try:
            type_el = try_text(page, ["[class*='type']", "[class*='genre']", ".cat", ".tag"])
            if "anime" in (type_el or "").lower() or "anime" in body_lower[:500]:
                title_type = "anime"
        except Exception:
            pass

        # ── Poster: try multiple strategies ──
        poster = None
        # 1. og:image meta tag
        try:
            poster = page.locator("meta[property='og:image']").get_attribute("content", timeout=800)
        except Exception:
            pass
        # 2. imgBk JS variable (slide images)
        if not poster:
            m = re.search(r'imgBk\s*=\s*\[([^\]]+)\]', html)
            if m:
                imgs = re.findall(r'["\']([^"\']+\.(?:jpg|jpeg|png|webp))["\']', m.group(1))
                if imgs:
                    src = imgs[0]
                    poster = src if src.startswith("http") else f"https://www.starckfilmes-v11.com{src}"
        # 3. first <img> on page
        if not poster:
            poster = try_attr(page, ["img[src*='img/']", "img[src*='poster']", "img[src*='thumb']", "img"])

        # ── Backdrop (use poster as fallback) ──
        backdrop = poster
        try:
            m2 = re.search(r'imgBk\s*=\s*\[([^\]]+)\]', html)
            if m2:
                imgs = re.findall(r'["\']([^"\']+\.(?:jpg|jpeg|png|webp))["\']', m2.group(1))
                if imgs:
                    src = imgs[0]
                    backdrop = src if src.startswith("http") else f"https://www.starckfilmes-v11.com{src}"
        except Exception:
            pass

        # ── Synopsis ──
        synopsis = try_text(page, [
            "[class*='sinop']", "[class*='synopsis']", "[class*='description']",
            "[class*='overview']", "[class*='plot']", "[itemprop='description']",
            "p",
        ])

        # ── IMDb rating ──
        imdb_rating = None
        rating_text = try_text(page, ["[class*='imdb']", "[class*='rating']", "[class*='score']", "[class*='nota']"])
        if not rating_text:
            m3 = re.search(r'imdb["\s:]+(\d+\.?\d*)', html, re.IGNORECASE)
            if m3:
                rating_text = m3.group(1)
        if rating_text:
            m4 = re.search(r"(\d+\.?\d*)", rating_text)
            if m4:
                val = float(m4.group(1))
                if val > 10:
                    val /= 10
                imdb_rating = round(val, 1)

        # ── Year: extract from URL slug (slug often ends with -YYYY-DD-MM-YYYY) ──
        year = None
        ym = re.search(r'-(20\d{2}|19\d{2})-', url_slug)
        if ym:
            year = int(ym.group(1))
        if not year:
            yt = try_text(page, ["[class*='year']", "[class*='date']", "[class*='release']"])
            if yt:
                ym2 = re.search(r"(20\d{2}|19\d{2})", yt)
                if ym2:
                    year = int(ym2.group(1))

        # ── Genres ──
        genres: list = []
        try:
            for el in page.locator("a[href*='genre'], a[href*='genero'], [class*='genre'] a, [class*='tag'] a").all():
                g = el.inner_text().strip()
                if g and 2 < len(g) < 50:
                    genres.append(g)
        except Exception:
            pass
        # Also try from URL query params in page links
        if not genres:
            for g in re.findall(r'genre=([^&"\']+)', html):
                genres.append(g.replace("-", " ").title())
            genres = list(dict.fromkeys(genres))[:10]

        # ── Download links from buttonLinks JS ──
        btn_links = extract_button_links(page)
        log.info("[title] %d torrent options found", len(btn_links))

        movie_torrents: list = []
        series_seasons: dict = {}   # season_num → list of episode dicts

        if title_type in ("series", "anime"):
            # Each item_title may encode season/episode like:
            # "Episódio 1", "S01E02", "1x03", "Temporada 2 Episódio 5", etc.
            # Group torrent options by (season, episode)
            ep_map: dict = {}  # (season, ep) → {"title", "quality", "audio_type", "href", ...}

            for lnk in btn_links:
                it = lnk.get("item_title", "")
                # Try S01E02 or 1x02
                m_se = re.search(r'[Ss](\d+)[Ee](\d+)|(\d+)[xX](\d+)', it)
                if m_se:
                    s_num = int(m_se.group(1) or m_se.group(3))
                    e_num = int(m_se.group(2) or m_se.group(4))
                else:
                    # Try "Temporada N Episódio M" or just "Episódio N"
                    m_t = re.search(r'[Tt]emporada\s*(\d+)', it)
                    m_e = re.search(r'[Ee]pis[oó]d[io]+\s*(\d+)', it)
                    s_num = int(m_t.group(1)) if m_t else 1
                    e_num = int(m_e.group(1)) if m_e else 1

                key = (s_num, e_num)
                if key not in ep_map:
                    ep_map[key] = {
                        "season_number":  s_num,
                        "episode_number": e_num,
                        "title":          it or f"Episódio {e_num}",
                        "torrent_options": [],
                    }
                ep_map[key]["torrent_options"].append({
                    "magnet":     lnk["magnet"],
                    "quality":    lnk["quality"],
                    "audio_type": lnk["audio_type"],
                    "size":       lnk.get("size", ""),
                })

            # If no episode info was parsed, treat each item as a separate episode (batch/season pack)
            if not ep_map and btn_links:
                for i, lnk in enumerate(btn_links, 1):
                    ep_map[(1, i)] = {
                        "season_number":  1,
                        "episode_number": i,
                        "title":          lnk.get("item_title") or f"Episódio {i}",
                        "torrent_options": [{
                            "magnet":     lnk["magnet"],
                            "quality":    lnk["quality"],
                            "audio_type": lnk["audio_type"],
                            "size":       lnk.get("size", ""),
                        }],
                    }

            for (s_num, _), ep in sorted(ep_map.items()):
                series_seasons.setdefault(s_num, []).append(ep)
        else:
            movie_torrents = btn_links

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
            magnet_val = t.get("magnet") or t.get("href")
            if not magnet_val:
                continue
            try:
                db.table("torrent_options").upsert({
                    "title_id":   title_id,
                    "quality":    t.get("quality", "1080p"),
                    "audio_type": t.get("audio_type", "Dual Áudio"),
                    "language":   "Português | Inglês",
                    "magnet":     magnet_val,
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
                        ep_opts = ep.get("torrent_options", [])
                        # Quality label for episode row = best quality available
                        best_q = ep_opts[0].get("quality", "1080p") if ep_opts else ep.get("quality", "1080p")
                        er = db.table("episodes").upsert({
                            "season_id":      season_id,
                            "episode_number": ep.get("episode_number", 1),
                            "title":          (ep.get("title") or f"Episódio {ep.get('episode_number', 1)}")[:255],
                            "quality":        best_q,
                        }, on_conflict="season_id,episode_number").execute()

                        if er.data:
                            ep_id = er.data[0]["id"]
                            # Save ALL torrent options for this episode
                            for opt in ep_opts:
                                magnet_val = opt.get("magnet")
                                if not magnet_val:
                                    continue
                                db.table("torrent_options").upsert({
                                    "episode_id": ep_id,
                                    "quality":    opt.get("quality", "1080p"),
                                    "audio_type": opt.get("audio_type", "Dual Áudio"),
                                    "language":   "Português | Inglês",
                                    "magnet":     magnet_val,
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
            f"{BASE_URL}/filmes/",
            f"{BASE_URL}/series/",
            f"{BASE_URL}/animes/",
            f"{BASE_URL}/?year=2026",
            f"{BASE_URL}/?year=2025",
            f"{BASE_URL}/?year=2024",
            f"{BASE_URL}/?year=2023",
            f"{BASE_URL}/?year=2022",
            f"{BASE_URL}/?year=2021",
            f"{BASE_URL}/?year=2020",
            f"{BASE_URL}/",
        ]
        log.info("[gateway] Using BASE_URL = %s", BASE_URL)

        # ── Phase 2: Collect all title URLs ──────────────────────────
        log.info("\n[phase 2] Collecting title URLs from all sections...")
        all_urls: list = []
        seen_urls: set = set()

        for section in sections:
            urls = scrape_section(page, section, BASE_URL)
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
