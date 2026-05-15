-- Add imdb_id column to titles table for OpenSubtitles integration via webtor SDK.
-- The imdbId is used by webtor's built-in OpenSubtitles feature to find subtitles
-- when the torrent itself doesn't contain SRT files.
-- Format: 'tt1234567' (IMDb tt-prefixed ID)

ALTER TABLE public.titles
  ADD COLUMN IF NOT EXISTS imdb_id TEXT;

-- Index for fast lookup when syncing / updating IMDB IDs
CREATE INDEX IF NOT EXISTS titles_imdb_id_idx ON public.titles (imdb_id)
  WHERE imdb_id IS NOT NULL;
