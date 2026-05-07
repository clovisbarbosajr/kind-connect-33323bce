import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/debug")({
  component: Debug,
});

function Debug() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await supabase.from('titles').select('*, torrent_options(*), seasons(*, episodes(*, torrent_options(*)))').limit(50);
      setData(res);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="p-10 bg-black min-h-screen text-white font-mono text-xs">
      <h1 className="text-2xl text-primary mb-10">DATABASE DEBUG VIEW</h1>
      {loading ? <p>Loading...</p> : (
        <pre className="bg-zinc-900 p-4 rounded border border-zinc-800 overflow-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
