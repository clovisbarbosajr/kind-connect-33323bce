-- Criar tipos enumerados se necessário
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_type') THEN
        CREATE TYPE content_type AS ENUM ('movie', 'series', 'anime');
    END IF;
END $$;

-- Tabela de Categorias
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Gêneros
CREATE TABLE IF NOT EXISTS public.genres (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Filmes/Séries (Movies)
CREATE TABLE IF NOT EXISTS public.movies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    poster TEXT,
    backdrop TEXT,
    year INTEGER,
    rating DECIMAL(3,1) DEFAULT 0,
    type content_type DEFAULT 'movie',
    external_id TEXT UNIQUE, -- Hash do magnet link para evitar duplicidade
    magnet TEXT,
    audio_type TEXT, -- 'Dual Áudio', 'Legendado', etc.
    resolution TEXT, -- '1080p', '4K', etc.
    size TEXT,
    seasons JSONB DEFAULT '[]'::jsonb,
    genres TEXT[] DEFAULT '{}'::text[],
    category_id UUID REFERENCES public.categories(id),
    is_hero BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Tabela de Logs de Sincronização
CREATE TABLE IF NOT EXISTS public.sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    finished_at TIMESTAMP WITH TIME ZONE,
    imported INTEGER DEFAULT 0,
    updated INTEGER DEFAULT 0,
    failed INTEGER DEFAULT 0,
    status TEXT DEFAULT 'running', -- 'running', 'success', 'error'
    raw_error TEXT,
    duration_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de Leitura Pública
CREATE POLICY "Leitura pública para categorias" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Leitura pública para gêneros" ON public.genres FOR SELECT USING (true);
CREATE POLICY "Leitura pública para filmes" ON public.movies FOR SELECT USING (true);
CREATE POLICY "Leitura pública para logs de sync" ON public.sync_logs FOR SELECT USING (true);

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_movies_title ON public.movies USING gin (to_tsvector('portuguese', title));
CREATE INDEX IF NOT EXISTS idx_movies_slug ON public.movies (slug);
CREATE INDEX IF NOT EXISTS idx_movies_type ON public.movies (type);
CREATE INDEX IF NOT EXISTS idx_movies_created_at ON public.movies (created_at DESC);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_movies_updated_at BEFORE UPDATE ON public.movies FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Inserir Categorias Iniciais
INSERT INTO public.categories (name, slug) VALUES 
('Filmes', 'filmes'),
('Séries', 'series'),
('Animes', 'animes')
ON CONFLICT (slug) DO NOTHING;
