-- Criar esquema para extensões se não existir
create schema if not exists extensions;

-- Mover pg_trgm para o esquema de extensões
create extension if not exists pg_trgm with schema extensions;

-- Atualizar função de timestamp com search_path seguro
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;