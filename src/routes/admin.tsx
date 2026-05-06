import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, CheckCircle2, XCircle, Clock, Loader2, Play, Database } from "lucide-react";
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
  failed: number;
  status: 'running' | 'success' | 'error';
  raw_error: string | null;
}

function AdminDashboard() {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('sync_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(10);
    
    if (!error && data) {
      setLogs(data as SyncLog[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
    
    // Inscrever em mudanças nos logs
    const channel = supabase
      .channel('sync_logs_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sync_logs' }, () => {
        fetchLogs();
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
      fetchLogs();
    }
  };

  const lastSync = logs.find(l => l.status === 'success');

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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            title="Última Sincronização" 
            value={lastSync ? new Date(lastSync.finished_at!).toLocaleString() : 'Nunca'} 
            icon={<Clock className="text-neon-green" />}
          />
          <StatCard 
            title="Total Importado (Última)" 
            value={lastSync ? lastSync.imported.toString() : '0'} 
            icon={<Database className="text-neon-green" />}
          />
          <StatCard 
            title="Status Atual" 
            value={syncing ? 'Sincronizando...' : 'Ocioso'} 
            icon={syncing ? <Loader2 className="animate-spin text-neon-green" /> : <CheckCircle2 className="text-neon-green" />}
          />
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
                  <th className="px-6 py-4 text-center">Importados</th>
                  <th className="px-6 py-4 text-center">Atualizados</th>
                  <th className="px-6 py-4 text-center">Falhas</th>
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
                        <StatusBadge status={log.status} error={log.raw_error} />
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-neon-green">{log.imported}</td>
                      <td className="px-6 py-4 text-center font-bold">{log.updated}</td>
                      <td className="px-6 py-4 text-center font-bold text-red-500">{log.failed}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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

function StatusBadge({ status, error }: { status: string, error?: string | null }) {
  const config = {
    running: { icon: <Loader2 className="w-4 h-4 animate-spin" />, label: 'Rodando', color: 'text-blue-400 bg-blue-400/10' },
    success: { icon: <CheckCircle2 className="w-4 h-4" />, label: 'Sucesso', color: 'text-neon-green bg-neon-green/10' },
    error: { icon: <XCircle className="w-4 h-4" />, label: 'Erro', color: 'text-red-500 bg-red-500/10' },
  }[status as 'running' | 'success' | 'error'];

  return (
    <div className="flex flex-col gap-1">
      <div className={`flex items-center gap-1.5 w-fit px-2 py-0.5 rounded-full text-xs font-bold border border-current ${config.color}`}>
        {config.icon}
        {config.label}
      </div>
      {error && <div className="text-[10px] text-red-500 max-w-[200px] truncate">{error}</div>}
    </div>
  );
}
