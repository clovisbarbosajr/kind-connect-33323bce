-- Create system_health table
CREATE TABLE IF NOT EXISTS public.system_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL, -- 'frontend', 'crawler', 'worker'
    status TEXT NOT NULL, -- 'online', 'offline', 'error', 'warning', 'success'
    message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb, -- Store Supabase URL (masked), version, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.system_health ENABLE ROW LEVEL SECURITY;

-- Allow public read access to system_health (so we can see it on the dashboard without being logged in if needed, but we should probably protect it later)
CREATE POLICY "Enable read access for all users" ON public.system_health FOR SELECT USING (true);

-- Allow service role to insert
CREATE POLICY "Enable insert for authenticated users and service role" ON public.system_health FOR INSERT WITH CHECK (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_system_health_created_at ON public.system_health (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_health_source ON public.system_health (source);
