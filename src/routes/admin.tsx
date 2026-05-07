import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, CheckCircle2, XCircle, Loader2, Play, Database, AlertCircle, Activity, ShieldAlert, Globe } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InwiseLogo } from "@/components/InwiseLogo";

export const Route = createFileRoute("/admin")({
  component: AdminDashboard,
});

interface SyncLog {
  id: string;
  started_at: string;
  finished_at: string | null;
  imported: number;
  updated: number;
  ignored: number;
  failed: number;
  status: 'running' | 'success' | 'error';
  raw_error: string | null;
  base_url: string | null;
}

interface SystemHealth {
  id: string;
  source: string;
  status: string;
  message: string;
  metadata: any;
  created_at: string;
}

function AdminDashboard() {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [health, setHealth] = useState<SystemHealth[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ titles: 0, torrents: 0, episodes: 0, genres: 0 });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (localStorage.getItem("admin_auth") === "true") setIsAuthenticated(true);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "admin123") {
      localStorage.setItem("admin_auth", "true");
      setIsAuthenticated(true);
    } else {
      alert("Senha incorreta");
    }
  };

  const fetchStats = async () => {
    const [logRes, healthRes, titlesRes, torrentsRes, episodesRes, genresRes] = await Promise.all([
      supabase.from('sync_logs').select('*').order('started_at', { ascending: false }).limit(10),
      supabase.from('system_health').select('*').order('created_at', { ascending: false }).limit(10),
      supabase.from('titles').select('*', { count: 'exact', head: true }),
      supabase.from('torrent_options').select('*', { count: 'exact', head: true }),
      supabase.from('episodes').select('*', { count: 'exact', head: true }),
      supabase.from('genres').select('*', { count: 'exact', head: true }),
    ]);

    if (logRes.data) setLogs(logRes.data as SyncLog[]);
    if (healthRes.data) setHealth(healthRes.data as SystemHealth[]);
    setStats({
      titles: titlesRes.count || 0,
      torrents: torrentsRes.count || 0,
      episodes: episodesRes.count || 0,
      genres: genresRes.count || 0,
    });
    setLoading(false);
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchStats();
    const channel = supabase
      .channel('admin_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sync_logs' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_health' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'titles' }, fetchStats)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAuthenticated]);

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      await supabase.functions.invoke('sync-catalog');
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
      fetchStats();
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl w-full max-w-sm shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <InwiseLogo size="lg" className="mb-2" />
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mt-3">Painel de Administração</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="SENHA DE ACESSO"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-2xl px-5 py-4 outline-none focus:border-primary text-center font-black tracking-widest text-sm"
              autoFocus
            />
            <button type="submit" className="w-full bg-[#00d4ff] text-black py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] transition-transform text-sm">
              Desbloquear Painel
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 lg:p-10">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <InwiseLogo size="md" />
              <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black tracking-widest uppercase ml-2">Admin v2.0</Badge>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-900 text-[8px] font-black text-zinc-500 uppercase">
                <Activity className="w-2.5 h-2.5 text-primary" /> Sistema Live
              </div>
            </div>
            <p className="text-zinc-600 font-bold uppercase tracking-widest text-[10px]">Monitoramento do Crawler &amp; Catálogo</p>
          </div>
          <div className="flex gap-3">
            <Button asChild variant="outline" className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 rounded-xl h-11 px-6 font-black uppercase tracking-widest text-xs">
              <Link to="/">Voltar ao Site</Link>
            </Button>
            <Button
              onClick={handleManualSync}
              disabled={syncing}
              className="bg-primary text-black hover:bg-white transition-colors rounded-xl h-11 px-6 font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20"
            >
              {syncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Forçar Sync
            </Button>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Títulos" value={loading ? '...' : stats.titles.toLocaleString()} icon={<Database className="w-5 h-5 text-primary" />} />
          <StatCard title="Torrents" value={loading ? '...' : stats.torrents.toLocaleString()} icon={<Play className="w-5 h-5 text-primary" />} />
          <StatCard title="Episódios" value={loading ? '...' : stats.episodes.toLocaleString()} icon={<Activity className="w-5 h-5 text-primary" />} />
          <StatCard title="Gêneros" value={loading ? '...' : stats.genres.toLocaleString()} icon={<Globe className="w-5 h-5 text-primary" />} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Health Monitor */}
          <div className="lg:col-span-2">
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-900 bg-zinc-900/30 flex items-center justify-between">
                <h3 className="font-black uppercase tracking-widest text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-primary" /> Monitor de Saúde
                </h3>
                <Badge variant="outline" className="border-primary/20 text-primary font-black text-[9px]">Online</Badge>
              </div>
              <div className="p-2 max-h-80 overflow-y-auto">
                {health.length > 0 ? health.map((h) => (
                  <div key={h.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-900/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <StatusDot status={h.status} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black uppercase text-zinc-600">{h.source}</span>
                          <span className="text-[11px] font-medium text-zinc-300">{h.message}</span>
                        </div>
                        {h.metadata?.url && (
                          <span className="text-[8px] font-mono text-zinc-700 block truncate max-w-xs">{h.metadata.url}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-[9px] font-black text-zinc-700 font-mono flex-shrink-0 ml-4">
                      {new Date(h.created_at).toLocaleTimeString('pt-BR')}
                    </span>
                  </div>
                )) : (
                  <div className="p-10 text-center text-zinc-800 font-black uppercase text-[10px] tracking-widest">
                    Nenhum evento registrado
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Config sidebar */}
          <div className="space-y-4">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-4">
              <h3 className="font-black uppercase tracking-widest text-[10px] text-zinc-500">Configuração</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Supabase Endpoint</p>
                  <p className="text-[10px] font-mono text-zinc-400 break-all leading-relaxed">{import.meta.env.VITE_SUPABASE_URL}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Status do Crawler</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(0,212,255,0.5)]" />
                    <span className="text-[10px] font-black uppercase text-primary">Pronto para Captura</span>
                  </div>
                </div>
                <div>
                  <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Crawler</p>
                  <p className="text-[10px] text-zinc-500 font-medium">Execute <span className="font-mono text-zinc-400">python full_sync.py</span> na pasta do projeto</p>
                </div>
              </div>
              <div className="pt-3 border-t border-zinc-800">
                <button
                  onClick={() => { localStorage.removeItem("admin_auth"); setIsAuthenticated(false); }}
                  className="text-[9px] font-black uppercase tracking-[0.3em] text-red-500/50 hover:text-red-500 transition-colors"
                >
                  Encerrar Sessão
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sync Logs Table */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-zinc-900 bg-zinc-900/20">
            <h3 className="text-lg font-black uppercase italic tracking-tighter flex items-center gap-3">
              <span className="w-1 h-6 bg-primary rounded-full" />
              Sincronizações Recentes
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-zinc-900/50 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">
                  <th className="px-6 py-4 text-left">Data/Hora</th>
                  <th className="px-6 py-4 text-left">Status</th>
                  <th className="px-6 py-4 text-center">Importados</th>
                  <th className="px-6 py-4 text-center">Atualizados</th>
                  <th className="px-6 py-4 text-center">Falhas</th>
                  <th className="px-6 py-4 text-left">Origem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-900/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-zinc-300">
                          {new Date(log.started_at).toLocaleDateString('pt-BR')}
                        </span>
                        <span className="text-[10px] text-zinc-600 font-mono">
                          {new Date(log.started_at).toLocaleTimeString('pt-BR')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={log.status} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-black text-primary">{log.imported ?? 0}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-black text-zinc-400">{log.updated ?? 0}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-black text-red-500/70">{log.failed ?? 0}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] text-zinc-600 font-mono truncate max-w-[120px] block">
                        {log.base_url ? new URL(log.base_url).hostname : 'LOCAL'}
                      </span>
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-zinc-800 font-black uppercase text-xs tracking-widest">
                      Nenhuma sincronização registrada ainda
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-5 flex flex-col gap-3 hover:border-primary/20 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{title}</span>
        {icon}
      </div>
      <div className="text-3xl font-black text-white tracking-tight">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: React.ReactNode; label: string; cls: string }> = {
    running: { icon: <Loader2 className="w-3 h-3 animate-spin" />, label: 'Rodando', cls: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
    success: { icon: <CheckCircle2 className="w-3 h-3" />, label: 'Sucesso', cls: 'text-primary bg-primary/10 border-primary/20' },
    error: { icon: <XCircle className="w-3 h-3" />, label: 'Erro', cls: 'text-red-500 bg-red-500/10 border-red-500/20' },
  };
  const cfg = map[status] || { icon: <AlertCircle className="w-3 h-3" />, label: status, cls: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20' };
  return (
    <div className={`flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full text-[10px] font-black border ${cfg.cls}`}>
      {cfg.icon} {cfg.label}
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const cls = status === 'success' || status === 'online'
    ? 'bg-primary shadow-[0_0_5px_rgba(0,212,255,0.5)]'
    : status === 'error' || status === 'offline'
      ? 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]'
      : 'bg-blue-400 shadow-[0_0_5px_rgba(96,165,250,0.5)]';
  return <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cls}`} />;
}

