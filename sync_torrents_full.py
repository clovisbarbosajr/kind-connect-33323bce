"""
sync_torrents_full.py — Roda em TODOS os títulos do banco
Extrai magnets do Starck v15 (/catalog/[slug]/) e salva em torrent_options.
Executa em lotes com retry e relatório final.

Uso: python sync_torrents_full.py
"""

import re, json, time, urllib.request, urllib.error, sys

SUPABASE_URL = "https://ylveejhawvxwhvfubeeu.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsdmVlamhhd3Z4d2h2ZnViZWV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEwMDgzNSwiZXhwIjoyMDkzNjc2ODM1fQ.eI5Yr9iSLIy5Yik0fsMXvIq2WaaK7RTcAvIXVqtqQgM"
STARCK_BASE  = "https://starckfilmes-v15.com"
BATCH_SIZE   = 50    # títulos por lote antes de pausa
SLEEP_BETWEEN = 1.2  # segundos entre requisições ao Starck
SLEEP_BATCH   = 5.0  # pausa entre lotes

HEADERS = {
    "apikey":        SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type":  "application/json",
}

# ── helpers ────────────────────────────────────────────────────────────────────

def sb_get(path):
    req = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/{path}", headers=HEADERS)
    return json.loads(urllib.request.urlopen(req, timeout=15).read())

def sb_post(path, payload):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/{path}",
        data=data, headers={**HEADERS, "Prefer": "return=representation"},
        method="POST"
    )
    try:
        return json.loads(urllib.request.urlopen(req, timeout=15).read())
    except urllib.error.HTTPError as e:
        return {"error": e.read().decode()}

def fetch_page(slug):
    url = f"{STARCK_BASE}/catalog/{slug}/"
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120",
        "Accept": "text/html",
        "Referer": STARCK_BASE + "/",
    })
    try:
        resp = urllib.request.urlopen(req, timeout=20)
        return resp.read().decode("utf-8", errors="ignore"), url
    except Exception as e:
        return None, url

def unshuffle(t):
    e = len(t)
    o = [''] * e
    n = [False] * e
    r = 0
    for a in range(e):
        while n[r]:
            r = (r + 1) % e
        n[r] = True
        o[a] = t[r]
        r = (r + 3) % e
    return ''.join(o)

def extract_torrents_from_html(html, title_id):
    results = []

    # ── 1) Formato FILME: buttons-content ─────────────────────────────────────
    blocks = re.findall(r'<div class="buttons-content">(.*?)</div>', html, re.DOTALL)
    for block in blocks:
        du_m = re.search(r'data-u="([^"]+)"', block)
        if not du_m:
            continue
        magnet = unshuffle(du_m.group(1))
        if not magnet or "magnet:" not in magnet:
            continue
        spans = re.findall(r'<span>(.*?)</span>', block, re.DOTALL)
        audio_type, quality, size = "", "", ""
        for span in spans:
            audio_m = re.match(r'([^<]+)<strong>[^<]+</strong>', span.strip())
            if audio_m:
                audio_type = audio_m.group(1).strip()
            qs_m = re.match(r'(\d+p|4K|2160p|720p|480p)\s*\(([^)]+)\)', span.strip())
            if qs_m:
                quality = qs_m.group(1).strip()
                size = qs_m.group(2).strip()
        results.append({
            "title_id": title_id,
            "magnet":   magnet,
            "quality":  quality,
            "size":     size,
            "language": audio_type,
        })

    if results:
        return results

    # ── 2) Formato SERIE: epsodios (findall para pegar Dual + Legendado) ────────
    ep_sections = re.findall(r'<div class="epsodios">(.*?)</div>', html, re.DOTALL)
    for section in ep_sections:
        h3_m = re.search(r'<h3><strong>([^<]+)</strong></h3>', section)
        raw_audio = h3_m.group(1).strip() if h3_m else ""
        if "DUAL" in raw_audio.upper():
            audio_type = "Dual Audio"
        elif "LEGENDA" in raw_audio.upper():
            audio_type = "Legendado"
        else:
            audio_type = raw_audio.title()

        for para in re.findall(r'<p>(.*?)</p>', section, re.DOTALL):
            du_m = re.search(r'data-u="([^"]+)"', para)
            if not du_m:
                continue
            magnet = unshuffle(du_m.group(1))
            if not magnet or "magnet:" not in magnet:
                continue
            ep_m = re.search(r'<strong>([^<]+)</strong>', para)
            ep_label = ep_m.group(1).strip().rstrip(":") if ep_m else ""
            # [^>]* para pular title="" antes do >
            lt_m = re.search(r'data-u="[^"]+"[^>]*>([^<]+)</a>', para)
            quality = lt_m.group(1).strip() if lt_m else "1080p"
            if ep_label:
                ep_short = re.sub(r'EP[IS]+[O-]+DIOS?\s*', 'Eps ', ep_label, flags=re.IGNORECASE)
                ep_short = ep_short.replace(" AO ", "-").replace(" E ", "+").strip()
                quality = f"{quality} | {ep_short}"
            results.append({
                "title_id": title_id,
                "magnet":   magnet,
                "quality":  quality,
                "size":     "",
                "language": audio_type,
            })

    return results

def get_all_titles():
    """Busca todos os títulos paginando em lotes de 1000."""
    all_titles = []
    page = 0
    page_size = 1000
    while True:
        offset = page * page_size
        rows = sb_get(
            f"titles?select=id,slug&order=id.asc"
            f"&limit={page_size}&offset={offset}"
        )
        if not rows:
            break
        all_titles.extend(rows)
        print(f"  Carregados {len(all_titles)} títulos...", end="\r")
        if len(rows) < page_size:
            break
        page += 1
    return all_titles

def get_existing_title_ids():
    all_ids = set()
    offset = 0
    while True:
        rows = sb_get(f"torrent_options?select=title_id&limit=1000&offset={offset}")
        if not rows:
            break
        for r in rows:
            if r.get("title_id"):
                all_ids.add(r["title_id"])
        if len(rows) < 1000:
            break
        offset += 1000
    return all_ids

# ── main ───────────────────────────────────────────────────────────────────────

def main():
    print("=" * 70)
    print("  SYNC TORRENTS FULL — Todos os títulos")
    print("=" * 70)

    print("\nCarregando todos os títulos do banco...")
    all_titles = get_all_titles()
    print(f"  Total de títulos: {len(all_titles)}")

    print("\nVerificando torrents já existentes...")
    existing = get_existing_title_ids()
    print(f"  Títulos com torrent: {len(existing)}")

    to_process = [t for t in all_titles if t["id"] not in existing]
    print(f"  Para processar: {len(to_process)}")

    if not to_process:
        print("\nTodos os títulos já têm torrents!")
        return

    print("\nIniciando extração...\n" + "-" * 70)

    total_saved = 0
    total_not_found = 0
    total_errors = 0
    not_found_slugs = []

    for i, title in enumerate(to_process):
        tid  = title["id"]
        slug = title["slug"]

        # Progresso
        pct = (i + 1) / len(to_process) * 100
        sys.stdout.write(f"\r[{i+1}/{len(to_process)}] {pct:.1f}% | salvos={total_saved} | sem_torrent={total_not_found}")
        sys.stdout.flush()

        html, url = fetch_page(slug)
        if not html:
            total_errors += 1
            time.sleep(SLEEP_BETWEEN)
            continue

        torrents = extract_torrents_from_html(html, tid)
        if not torrents:
            total_not_found += 1
            not_found_slugs.append(slug)
            time.sleep(SLEEP_BETWEEN)
            continue

        resp = sb_post("torrent_options", torrents)
        if isinstance(resp, list):
            total_saved += len(resp)
        else:
            total_errors += 1

        time.sleep(SLEEP_BETWEEN)

        # Pausa entre lotes
        if (i + 1) % BATCH_SIZE == 0:
            time.sleep(SLEEP_BATCH)

    print()  # nova linha após progresso
    print("\n" + "=" * 70)
    print(f"  RESULTADO FINAL:")
    print(f"    Torrents salvos: {total_saved}")
    print(f"    Títulos sem torrent no Starck: {total_not_found}")
    print(f"    Erros de rede/banco: {total_errors}")
    print("=" * 70)

    if not_found_slugs:
        print(f"\nSlugs sem torrent ({len(not_found_slugs)}):")
        for s in not_found_slugs[:30]:
            print(f"  - {s}")
        if len(not_found_slugs) > 30:
            print(f"  ... e mais {len(not_found_slugs)-30}")

if __name__ == "__main__":
    main()
