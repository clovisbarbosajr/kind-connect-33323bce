-- ============================================================
-- INWISE Movies - Database Setup for ylveejhawvxwhvfubeeu
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ylveejhawvxwhvfubeeu/sql
-- ============================================================

-- Titles (main catalog)
CREATE TABLE IF NOT EXISTS titles (
    id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    title       TEXT        NOT NULL,
    slug        TEXT        NOT NULL UNIQUE,
    type        TEXT        NOT NULL DEFAULT 'movie',  -- movie | series | anime
    synopsis    TEXT,
    backdrop    TEXT,
    poster      TEXT,
    imdb_rating NUMERIC(4,1),
    year        INTEGER,
    category    TEXT,
    source_url  TEXT,
    external_id TEXT        NOT NULL DEFAULT gen_random_uuid()::TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Genres
CREATE TABLE IF NOT EXISTS genres (
    id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name       TEXT NOT NULL,
    slug       TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Title ↔ Genre mapping
CREATE TABLE IF NOT EXISTS title_genres (
    title_id UUID REFERENCES titles(id) ON DELETE CASCADE,
    genre_id UUID REFERENCES genres(id)  ON DELETE CASCADE,
    PRIMARY KEY (title_id, genre_id)
);

-- Seasons (for series/anime)
CREATE TABLE IF NOT EXISTS seasons (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title_id      UUID NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
    season_number INTEGER NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (title_id, season_number)
);

-- Episodes
CREATE TABLE IF NOT EXISTS episodes (
    id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    season_id      UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    episode_number INTEGER NOT NULL,
    title          TEXT,
    quality        TEXT,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (season_id, episode_number)
);

-- Torrent options (for titles or episodes)
CREATE TABLE IF NOT EXISTS torrent_options (
    id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title_id   UUID REFERENCES titles(id)   ON DELETE CASCADE,
    episode_id UUID REFERENCES episodes(id) ON DELETE CASCADE,
    quality    TEXT,
    audio_type TEXT,
    language   TEXT,
    magnet     TEXT NOT NULL,
    codec      TEXT,
    size       TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sync logs (crawler history)
CREATE TABLE IF NOT EXISTS sync_logs (
    id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at      TIMESTAMPTZ,
    status           TEXT DEFAULT 'running',
    imported         INTEGER DEFAULT 0,
    updated          INTEGER DEFAULT 0,
    failed           INTEGER DEFAULT 0,
    ignored          INTEGER DEFAULT 0,
    base_url         TEXT,
    raw_error        TEXT,
    failed_at_step   TEXT,
    artifact_path    TEXT,
    duration_seconds INTEGER,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- System health (frontend heartbeats)
CREATE TABLE IF NOT EXISTS system_health (
    id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source     TEXT NOT NULL,
    status     TEXT NOT NULL,
    message    TEXT,
    metadata   JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sync settings (key/value config)
CREATE TABLE IF NOT EXISTS sync_settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Disable RLS (personal project, no auth needed) ──
ALTER TABLE titles        DISABLE ROW LEVEL SECURITY;
ALTER TABLE genres        DISABLE ROW LEVEL SECURITY;
ALTER TABLE title_genres  DISABLE ROW LEVEL SECURITY;
ALTER TABLE seasons       DISABLE ROW LEVEL SECURITY;
ALTER TABLE episodes      DISABLE ROW LEVEL SECURITY;
ALTER TABLE torrent_options DISABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs     DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_health DISABLE ROW LEVEL SECURITY;
ALTER TABLE sync_settings DISABLE ROW LEVEL SECURITY;

-- ── Performance indexes ──
CREATE INDEX IF NOT EXISTS idx_titles_type    ON titles(type);
CREATE INDEX IF NOT EXISTS idx_titles_slug    ON titles(slug);
CREATE INDEX IF NOT EXISTS idx_titles_year    ON titles(year DESC);
CREATE INDEX IF NOT EXISTS idx_titles_rating  ON titles(imdb_rating DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_seasons_title  ON seasons(title_id);
CREATE INDEX IF NOT EXISTS idx_episodes_season ON episodes(season_id);
CREATE INDEX IF NOT EXISTS idx_torrent_title  ON torrent_options(title_id);
CREATE INDEX IF NOT EXISTS idx_torrent_ep     ON torrent_options(episode_id);
CREATE INDEX IF NOT EXISTS idx_tgenres_title  ON title_genres(title_id);
CREATE INDEX IF NOT EXISTS idx_tgenres_genre  ON title_genres(genre_id);

-- ── Initial settings ──
INSERT INTO sync_settings (key, value) VALUES
  ('base_url',    'https://starckfilmes-v11.com'),
  ('gateway_url', 'https://acesso-starck.com'),
  ('max_pages',   '50')
ON CONFLICT (key) DO NOTHING;
