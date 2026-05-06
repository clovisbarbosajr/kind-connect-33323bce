import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/watch/$slug")({
  component: Watch,
});

function Watch() {
  const { slug } = Route.useParams();
  const [title, setTitle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    async function load() {
      try {
        console.log(`[Frontend] Carregando detalhes para slug: ${slug}`);
        const { data, error: fetchError } = await supabase
          .from('titles')
          .select(`
            *,
            torrent_options(*),
            seasons(
              *,
              episodes(
                *,
                torrent_options(*)
              )
            )
          `)
          .eq('slug', slug)
          .single();

        console.log("[Frontend] Resultado detalhes:", { data, error: fetchError });

        if (fetchError) throw fetchError;
        setTitle(data);
      } catch (e) {
        console.error("Erro ao carregar detalhes:", e);
        setError(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  if (loading) return <div style={{ color: 'white', padding: 20 }}>Carregando detalhes...</div>;
  if (error) return (
    <div style={{ color: 'red', padding: 20 }}>
      <h2>Erro ao carregar conteúdo</h2>
      <pre>{JSON.stringify(error, null, 2)}</pre>
      <a href="/" style={{ color: '#c8ff00' }}>Voltar para Home</a>
    </div>
  );
  if (!title) return (
    <div style={{ color: 'white', padding: 20 }}>
      <h2>Título não encontrado.</h2>
      <a href="/" style={{ color: '#c8ff00' }}>Voltar para Home</a>
    </div>
  );

  return (
    <div style={{ background: '#000', minHeight: '100vh', color: '#fff', padding: '20px' }}>
      <button onClick={() => window.history.back()} style={{ background: 'none', border: '1px solid #333', color: '#fff', padding: '5px 10px', cursor: 'pointer', marginBottom: '20px' }}>
        ← Voltar
      </button>

      <h1 style={{ color: '#c8ff00', margin: '10px 0' }}>{title.title}</h1>
      
      {title.backdrop && (
        <img src={title.backdrop} style={{ width: '100%', maxWidth: '800px', borderRadius: '8px', marginBottom: '20px' }} alt={title.title} />
      )}
      
      <p style={{ fontSize: '18px', lineHeight: '1.6', maxWidth: '800px' }}>{title.synopsis}</p>
      
      <div style={{ margin: '20px 0', padding: '15px', background: '#111', borderRadius: '8px' }}>
        <h3 style={{ margin: '0 0 10px 0' }}>Informações</h3>
        <p>Ano: {title.year} | Rating: {title.imdb_rating} | Tipo: {title.type}</p>
      </div>

      <h2 style={{ borderBottom: '1px solid #333', paddingBottom: '10px' }}>Opções de Torrent</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
        {title.torrent_options?.length > 0 ? title.torrent_options.map((opt: any) => (
          <div key={opt.id} style={{ background: '#1a1a1a', padding: '15px', borderRadius: '8px', border: '1px solid #333' }}>
            <strong style={{ display: 'block', fontSize: '18px' }}>{opt.quality}</strong>
            <span style={{ color: '#888' }}>{opt.audio_type} ({opt.language})</span>
            <br /><br />
            <a href={opt.magnet} style={{ background: '#c8ff00', color: '#000', padding: '8px 15px', borderRadius: '5px', textDecoration: 'none', fontWeight: 'bold' }}>
              Magnet Link
            </a>
          </div>
        )) : <p>Nenhum torrent direto encontrado.</p>}
      </div>

      {title.type === 'series' && title.seasons?.length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <h2 style={{ borderBottom: '1px solid #333', paddingBottom: '10px' }}>Temporadas e Episódios</h2>
          {title.seasons.sort((a: any, b: any) => a.season_number - b.season_number).map((season: any) => (
            <div key={season.id} style={{ margin: '20px 0', padding: '20px', background: '#0a0a0a', border: '1px solid #222', borderRadius: '10px' }}>
              <h3 style={{ color: '#c8ff00' }}>Temporada {season.season_number}</h3>
              <div style={{ display: 'grid', gap: '15px' }}>
                {season.episodes?.sort((a: any, b: any) => a.episode_number - b.episode_number).map((ep: any) => (
                  <div key={ep.id} style={{ borderBottom: '1px solid #1a1a1a', paddingBottom: '10px' }}>
                    <h4 style={{ margin: '0 0 10px 0' }}>Episódio {ep.episode_number}: {ep.title}</h4>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {ep.torrent_options?.map((opt: any) => (
                        <a key={opt.id} href={opt.magnet} style={{ fontSize: '12px', border: '1px solid #c8ff00', color: '#c8ff00', padding: '3px 8px', borderRadius: '4px', textDecoration: 'none' }}>
                          {opt.quality} {opt.audio_type}
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 60, borderTop: '1px solid #333', paddingTop: 20 }}>
        <details>
          <summary style={{ cursor: 'pointer', color: '#666' }}>RAW DEBUG JSON</summary>
          <pre style={{ background: '#111', padding: '10px', fontSize: '10px', overflow: 'auto' }}>
            {JSON.stringify(title, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}