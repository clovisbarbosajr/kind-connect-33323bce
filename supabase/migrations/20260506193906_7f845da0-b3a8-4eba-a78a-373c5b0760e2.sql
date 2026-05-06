-- Tabela para logs de sincronização
CREATE TABLE public.sync_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    finished_at TIMESTAMP WITH TIME ZONE,
    imported INTEGER DEFAULT 0,
    updated INTEGER DEFAULT 0,
    failed INTEGER DEFAULT 0,
    raw_error TEXT,
    status TEXT DEFAULT 'running' -- running, success, error
);

-- Habilitar RLS para sync_logs
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- Política de leitura (admin/público dependendo da necessidade, aqui deixamos select livre para o dashboard)
CREATE POLICY "Leitura pública de logs" ON public.sync_logs FOR SELECT USING (true);

-- Adicionar colunas necessárias ao catálogo para sincronização
ALTER TABLE public.catalog ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE public.catalog ADD COLUMN IF NOT EXISTS seasons JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.catalog ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE;

-- Criar índice para o external_id
CREATE INDEX IF NOT EXISTS idx_catalog_external_id ON public.catalog(external_id);