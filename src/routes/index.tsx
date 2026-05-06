import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [movies, setMovies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      console.log("[Frontend] Iniciando select direto...");
      try {
        const { data, error } = await supabase
          .from('movies')
          .select('*')
          .limit(20);
        
        console.log("[Frontend] Resultado:", { 
          count: data?.length, 
          error,
          firstItem: data?.[0] 
        });

        if (data) setMovies(data);
      } catch (e) {
        console.error("[Frontend] Crash na query:", e);
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
                style={{ width: '100%', aspectRatio: '16/9', objectCover: 'cover' }} 
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
          Nenhum filme retornado pelo Supabase.
        </div>
      )}
    </div>
  );
}
