-- Enable RLS
ALTER TABLE public.sync_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- Policies for sync_settings
CREATE POLICY "Public read sync_settings" ON public.sync_settings FOR SELECT USING (true);
CREATE POLICY "Service role can manage sync_settings" ON public.sync_settings 
    FOR ALL USING (true) WITH CHECK (true);

-- Policies for sync_logs
CREATE POLICY "Public read sync_logs" ON public.sync_logs FOR SELECT USING (true);
CREATE POLICY "Service role can manage sync_logs" ON public.sync_logs 
    FOR ALL USING (true) WITH CHECK (true);
