-- 1. Titles table
CREATE TABLE IF NOT EXISTS public.titles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('movie', 'series', 'anime')),
    synopsis TEXT,
    poster TEXT,
    backdrop TEXT,
    year INTEGER,
    imdb_rating DECIMAL(3,1),
    category TEXT,
    source_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Genres table
CREATE TABLE IF NOT EXISTS public.genres (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Title Genres (Many-to-Many)
CREATE TABLE IF NOT EXISTS public.title_genres (
    title_id UUID REFERENCES public.titles(id) ON DELETE CASCADE,
    genre_id UUID REFERENCES public.genres(id) ON DELETE CASCADE,
    PRIMARY KEY (title_id, genre_id)
);

-- 4. Seasons table
CREATE TABLE IF NOT EXISTS public.seasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_id UUID REFERENCES public.titles(id) ON DELETE CASCADE NOT NULL,
    season_number INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(title_id, season_number)
);

-- 5. Episodes table
CREATE TABLE IF NOT EXISTS public.episodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE NOT NULL,
    episode_number INTEGER NOT NULL,
    title TEXT,
    quality TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(season_id, episode_number)
);

-- 6. Torrent Options
CREATE TABLE IF NOT EXISTS public.torrent_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_id UUID REFERENCES public.titles(id) ON DELETE CASCADE,
    episode_id UUID REFERENCES public.episodes(id) ON DELETE CASCADE,
    audio_type TEXT, -- 'Dublado', 'Legendado', 'Dual Áudio'
    quality TEXT, -- '1080p', '720p', '4K'
    magnet TEXT NOT NULL,
    size TEXT,
    codec TEXT,
    language TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT torrent_target CHECK (
        (title_id IS NOT NULL AND episode_id IS NULL) OR 
        (title_id IS NULL AND episode_id IS NOT NULL)
    )
);

-- 7. Sync Sources
CREATE TABLE IF NOT EXISTS public.sync_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type TEXT NOT NULL,
    source_url TEXT NOT NULL,
    page_number INTEGER DEFAULT 1,
    imported_count INTEGER DEFAULT 0,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for all tables
ALTER TABLE public.titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.title_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.torrent_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_sources ENABLE ROW LEVEL SECURITY;

-- Public Read access
CREATE POLICY "Public read access for titles" ON public.titles FOR SELECT USING (true);
CREATE POLICY "Public read access for genres" ON public.genres FOR SELECT USING (true);
CREATE POLICY "Public read access for title_genres" ON public.title_genres FOR SELECT USING (true);
CREATE POLICY "Public read access for seasons" ON public.seasons FOR SELECT USING (true);
CREATE POLICY "Public read access for episodes" ON public.episodes FOR SELECT USING (true);
CREATE POLICY "Public read access for torrent_options" ON public.torrent_options FOR SELECT USING (true);
CREATE POLICY "Public read access for sync_sources" ON public.sync_sources FOR SELECT USING (true);

-- Update updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they somehow exist to avoid conflicts
DROP TRIGGER IF EXISTS update_titles_updated_at ON public.titles;
DROP TRIGGER IF EXISTS update_genres_updated_at ON public.genres;
DROP TRIGGER IF EXISTS update_seasons_updated_at ON public.seasons;
DROP TRIGGER IF EXISTS update_episodes_updated_at ON public.episodes;
DROP TRIGGER IF EXISTS update_torrent_options_updated_at ON public.torrent_options;

-- Apply triggers
CREATE TRIGGER update_titles_updated_at BEFORE UPDATE ON public.titles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_genres_updated_at BEFORE UPDATE ON public.genres FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_seasons_updated_at BEFORE UPDATE ON public.seasons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_episodes_updated_at BEFORE UPDATE ON public.episodes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_torrent_options_updated_at BEFORE UPDATE ON public.torrent_options FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
