-- Create sync_settings table
CREATE TABLE IF NOT EXISTS public.sync_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Initialize with a default key if not exists
INSERT INTO public.sync_settings (key, value)
VALUES ('last_discovered_url', 'https://acesso-starck.com')
ON CONFLICT (key) DO NOTHING;

-- Update sync_logs to include more debug info
ALTER TABLE public.sync_logs ADD COLUMN IF NOT EXISTS base_url TEXT;
ALTER TABLE public.sync_logs ADD COLUMN IF NOT EXISTS artifact_path TEXT;
ALTER TABLE public.sync_logs ADD COLUMN IF NOT EXISTS failed_at_step TEXT;

-- Create a storage bucket for logs/screenshots
INSERT INTO storage.buckets (id, name, public) 
VALUES ('sync-artifacts', 'sync-artifacts', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for storage (public read, authenticated/service_role write)
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'sync-artifacts');
CREATE POLICY "Service Role Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'sync-artifacts');
