import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [movies, setMovies] = useState<any[]>([]);
  const [debugData, setDebugData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      console.log("[Frontend] Iniciando select na tabela titles...");
      try {
        const { data, error } = await supabase
          .from('titles')
          .select(`
            *,
            torrent_options(*)
          `)
          .limit(20);
        
        console.log("[Frontend] Resultado (titles):", { 
          count: data?.length, 
          error,
          firstItem: data?.[0] 
        });

        if (error) {
          console.error("[Supabase Error]", error);
          setDebugData({ error });
        } else {
          setMovies(data || []);
          setDebugData(data);
        }
      } catch (e) {
        console.error("[Frontend] Crash na query titles:", e);
        setDebugData({ crash: e instanceof Error ? e.message : String(e) });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div style={{ color: 'white', padding: 20 }}>Carregando direto do banco...</div>;

  return (
    <div style={{ background: '#000', minHeight: '100vh', color: '#fff', padding: '20px' }}>
      <h1 style={{ color: '#c8ff00' }}>INWISE DEBUG VIEW</h1>
      <p>Total detectado: {movies.length}</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
        {movies.map(movie => (
          <Link 
            key={movie.id} 
            to="/watch/$slug" 
            params={{ slug: movie.slug }}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div style={{ border: '1px solid #333', borderRadius: '8px', overflow: 'hidden' }}>
              <img 
                src={movie.backdrop || movie.poster} 
                style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover' }} 
                alt=""
              />
              <div style={{ padding: '10px' }}>
                <h2 style={{ fontSize: '14px', margin: 0 }}>{movie.title}</h2>
                <small style={{ opacity: 0.5 }}>{movie.year} • {movie.type}</small>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {movies.length === 0 && (
        <div style={{ marginTop: 40, border: '1px solid red', padding: 20 }}>
          <h2 style={{ color: 'red' }}>DEBUG: Array de títulos vazio</h2>
          <pre style={{ background: '#111', padding: 10, fontSize: '12px', overflow: 'auto' }}>
            {JSON.stringify(debugData, null, 2)}
          </pre>
        </div>
      )}
      
      <div style={{ marginTop: 40, borderTop: '1px solid #333', paddingTop: 20 }}>
        <h3>RAW DEBUG DATA (Última Resposta)</h3>
        <pre style={{ background: '#111', padding: 10, fontSize: '10px', overflow: 'auto', maxH: '300px' }}>
          {JSON.stringify(debugData, null, 2)}
        </pre>
      </div>
    </div>
  );
}
