import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, CheckCircle2, XCircle, Clock, Loader2, Play, Database, AlertCircle, ExternalLink, Image as ImageIcon, Activity, ShieldAlert, Globe } from "lucide-react";
import { motion } from "framer-motion";

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
  failed_at_step: string | null;
  artifact_path: string | null;
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
  const [movieCount, setMovieCount] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");


  useEffect(() => {
    const auth = localStorage.getItem("admin_auth");
    if (auth === "true") setIsAuthenticated(true);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "admin123") { // Senha padrão simples
      localStorage.setItem("admin_auth", "true");
      setIsAuthenticated(true);
    } else {
      alert("Senha incorreta");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_auth");
    setIsAuthenticated(false);
  };


  const fetchStats = async () => {
    // Fetch logs
    const { data: logData } = await supabase
      .from('sync_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(10);
    
    if (logData) setLogs(logData as SyncLog[]);

    // Fetch health
    const { data: healthData } = await supabase
      .from('system_health')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (healthData) setHealth(healthData as SystemHealth[]);

    // Fetch movie count
    const { count } = await supabase.from('movies').select('*', { count: 'exact', head: true });
    setMovieCount(count || 0);

    setLoading(false);
  };

  useEffect(() => {
    fetchStats();
    
    // Inscrever em mudanças nos logs e saúde
    const channel = supabase
      .channel('system_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sync_logs' }, () => {
        fetchStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_health' }, () => {
        fetchStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);


  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-catalog');
      if (error) throw error;
      console.log('Sync result:', data);
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
      fetchStats();
    }
  };

  const lastSync = logs.find(l => l.status === 'success');

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-8 rounded-2xl w-full max-w-md border border-white/5 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-black italic text-neon-green">INWISE ADMIN</h1>
            <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold">Acesso Restrito</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password" 
              placeholder="Digite a senha..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-neon-green"
              autoFocus
            />
            <button type="submit" className="neon-button w-full py-3 text-sm font-black uppercase tracking-widest">
              Entrar no Painel
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black italic text-neon-green">ADMIN DASHBOARD</h1>
            <p className="text-muted-foreground">Gerenciamento de Sincronização e Catálogo</p>
          </div>
          <button 
            onClick={handleManualSync}
            disabled={syncing}
            className="neon-button flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
            Sincronizar Agora
          </button>
        </header>

        {/* System Health Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card p-6 rounded-xl border border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2">
                  <Activity className="text-neon-green w-5 h-5" />
                  Status do Sistema
                </h3>
                <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-neon-green/10 border border-neon-green/20 text-[10px] font-black text-neon-green uppercase tracking-widest">
                  <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
                  Banco Online
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white/5 p-4 rounded-lg border border-white/5 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                    <Globe className="w-3 h-3" /> Supabase URL
                  </div>
                  <div className="text-xs font-mono break-all">{import.meta.env.VITE_SUPABASE_URL}</div>
                </div>
                <div className="bg-white/5 p-4 rounded-lg border border-white/5 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                    <Database className="w-3 h-3" /> Catálogo Local
                  </div>
                  <div className="text-xl font-black italic">{movieCount} <span className="text-xs font-normal not-italic text-muted-foreground">Títulos</span></div>
                </div>
              </div>

              {/* Health Feed */}
              <div className="space-y-2">
                <div className="text-[10px] uppercase font-bold text-muted-foreground">Últimos Eventos de Diagnóstico</div>
                <div className="space-y-1">
                  {health.map((h) => (
                    <div key={h.id} className="flex items-center justify-between p-2 rounded bg-white/[0.02] border border-white/5 text-[11px]">
                      <div className="flex items-center gap-2">
                        <StatusIcon status={h.status} />
                        <span className="font-bold uppercase opacity-50 text-[9px] w-12">{h.source}</span>
                        <span className="truncate max-w-[200px] sm:max-w-md">{h.message}</span>
                      </div>
                      <div className="text-[9px] text-muted-foreground font-mono">
                        {new Date(h.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                  {health.length === 0 && <div className="text-center py-4 text-xs text-muted-foreground italic">Nenhum evento registrado ainda.</div>}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <StatCard 
              title="Última Sincronização" 
              value={lastSync ? new Date(lastSync.finished_at!).toLocaleString() : 'Nunca'} 
              icon={<Clock className="text-neon-green" />}
            />
            <div className="glass-card p-6 rounded-xl border border-white/5 space-y-4">
              <div className="text-[10px] uppercase font-bold text-muted-foreground">Configuração</div>
              {import.meta.env.VITE_SUPABASE_URL !== health.find(h => h.source === 'crawler')?.metadata?.supabase_url && health.some(h => h.source === 'crawler' && h.metadata?.supabase_url) ? (
                <div className="p-3 rounded bg-red-500/10 border border-red-500/20 space-y-2">
                  <div className="flex items-center gap-2 text-red-500 font-bold text-xs">
                    <ShieldAlert className="w-4 h-4" /> DIVERGÊNCIA DETECTADA
                  </div>
                  <p className="text-[10px] leading-relaxed opacity-80">
                    O Crawler e o Frontend parecem estar usando projetos Supabase diferentes. Sincronização pode falhar.
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded bg-neon-green/5 border border-neon-green/10 flex items-center gap-2 text-neon-green font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4" /> Configuração Alinhada
                </div>
              )}
            </div>
          </div>
        </div>


        {/* Logs Table */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-6 border-b border-white/5 bg-white/5">
            <h3 className="font-bold flex items-center gap-2">
              <span className="w-1 h-6 bg-neon-green rounded-full" />
              Histórico de Sincronização
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/5 text-muted-foreground text-sm">
                  <th className="px-6 py-4">Início</th>
                  <th className="px-6 py-4">Duração</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">URL Base</th>
                  <th className="px-6 py-4 text-center">Importados</th>
                  <th className="px-6 py-4 text-center">Atualizados</th>
                  <th className="px-6 py-4 text-center">Ignorados</th>
                  <th className="px-6 py-4 text-center">Falhas</th>
                  <th className="px-6 py-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 opacity-20" />
                      Carregando logs...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      Nenhum log de sincronização encontrado.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 text-sm">
                        {new Date(log.started_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {log.finished_at 
                          ? `${Math.round((new Date(log.finished_at).getTime() - new Date(log.started_at).getTime()) / 1000)}s` 
                          : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={log.status} error={log.raw_error} step={log.failed_at_step} />
                      </td>
                      <td className="px-6 py-4">
                        {log.base_url ? (
                          <a href={log.base_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-400 hover:underline">
                            {new URL(log.base_url).hostname}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-neon-green">{log.imported}</td>
                      <td className="px-6 py-4 text-center font-bold">{log.updated}</td>
                      <td className="px-6 py-4 text-center font-bold text-muted-foreground">{log.ignored}</td>
                      <td className="px-6 py-4 text-center font-bold text-red-500">{log.failed}</td>
                      <td className="px-6 py-4 text-center">
                        {log.artifact_path && (
                          <a 
                            href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/sync-artifacts/${log.artifact_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center p-2 rounded bg-white/5 hover:bg-white/10 text-neon-green"
                            title="Ver Screenshot do Erro"
                          >
                            <ImageIcon className="w-4 h-4" />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-center pb-12">
          <button 
            onClick={handleLogout}
            className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 hover:text-red-500 transition-colors"
          >
            Encerrar Sessão Admin
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="glass-card p-6 rounded-xl space-y-2 border border-white/5">
      <div className="flex items-center justify-between text-muted-foreground text-sm uppercase tracking-wider font-bold">
        {title}
        {icon}
      </div>
      <div className="text-xl font-bold truncate">{value}</div>
    </div>
  );
}

function StatusBadge({ status, error, step }: { status: string, error?: string | null, step?: string | null }) {
  const config = {
    running: { icon: <Loader2 className="w-4 h-4 animate-spin" />, label: 'Rodando', color: 'text-blue-400 bg-blue-400/10' },
    success: { icon: <CheckCircle2 className="w-4 h-4" />, label: 'Sucesso', color: 'text-neon-green bg-neon-green/10' },
    error: { icon: <XCircle className="w-4 h-4" />, label: 'Erro', color: 'text-red-500 bg-red-500/10' },
  }[status as 'running' | 'success' | 'error'] || { icon: <AlertCircle className="w-4 h-4" />, label: status, color: 'text-gray-400 bg-gray-400/10' };

  return (
    <div className="flex flex-col gap-1">
      <div className={`flex items-center gap-1.5 w-fit px-2 py-0.5 rounded-full text-xs font-bold border border-current ${config.color}`}>
        {config.icon}
        {config.label}
      </div>
      {step && <div className="text-[10px] text-muted-foreground uppercase tracking-tight">Passo: {step}</div>}
      {error && <div className="text-[10px] text-red-500 max-w-[200px] truncate" title={error}>{error}</div>}
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'success':
    case 'online':
      return <div className="w-1.5 h-1.5 rounded-full bg-neon-green shadow-[0_0_5px_rgba(57,255,20,0.5)]" />;
    case 'error':
    case 'offline':
      return <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]" />;
    case 'warning':
      return <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 shadow-[0_0_5px_rgba(245,158,11,0.5)]" />;
    default:
      return <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_5px_rgba(96,165,250,0.5)]" />;
  }
}

