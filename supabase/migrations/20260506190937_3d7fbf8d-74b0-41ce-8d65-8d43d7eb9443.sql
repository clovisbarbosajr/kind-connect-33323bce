-- Habilitar extensão para busca por similaridade
create extension if not exists pg_trgm;

-- Enum para categoria
do $$ begin
    create type public.content_category as enum ('movie', 'series');
exception
    when duplicate_object then null;
end $$;

-- Tabela de catálogo
create table if not exists public.catalog (
    id uuid not null default gen_random_uuid() primary key,
    title text not null,
    slug text not null unique,
    description text,
    poster text,
    backdrop text,
    year integer,
    rating decimal(3,1),
    category public.content_category not null default 'movie',
    genres text[],
    type text default 'torrent',
    audio_type text, -- Dublado, Legendado, Dual Áudio
    resolution text, -- 4K, 1080p, 720p
    size text,
    magnet text,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

-- Habilitar RLS
alter table public.catalog enable row level security;

-- Política de leitura pública
create policy "Catálogo visível para todos"
on public.catalog
for select
using (true);

-- Criar índices para busca rápida
create index if not exists idx_catalog_slug on public.catalog(slug);
create index if not exists idx_catalog_category on public.catalog(category);
create index if not exists idx_catalog_title_trgm on public.catalog using gin (title gin_trgm_ops);

-- Função de atualização de timestamp (caso não exista)
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Trigger para atualização automática
create or replace trigger update_catalog_updated_at
before update on public.catalog
for each row
execute function public.update_updated_at_column();