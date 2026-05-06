-- Adicionar restrições de unicidade se não existirem
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'titles_slug_unique') THEN
        ALTER TABLE public.titles ADD CONSTRAINT titles_slug_unique UNIQUE (slug);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'torrent_options_magnet_unique') THEN
        ALTER TABLE public.torrent_options ADD CONSTRAINT torrent_options_magnet_unique UNIQUE (magnet);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'genres_slug_unique') THEN
        ALTER TABLE public.genres ADD CONSTRAINT genres_slug_unique UNIQUE (slug);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'seasons_title_season_unique') THEN
        ALTER TABLE public.seasons ADD CONSTRAINT seasons_title_season_unique UNIQUE (title_id, season_number);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'episodes_season_episode_unique') THEN
        ALTER TABLE public.episodes ADD CONSTRAINT episodes_season_episode_unique UNIQUE (season_id, episode_number);
    END IF;
END $$;
