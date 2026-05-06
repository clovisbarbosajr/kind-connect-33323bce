import { supabase } from "@/integrations/supabase/client";

export const seedCatalog = async () => {
  const fakeData = [
    {
      title: "The Neon City",
      slug: "the-neon-city",
      description: "Um mergulho visual em uma metrópole futurista dominada por luzes e segredos.",
      poster: "https://images.unsplash.com/photo-1514539079130-25950c84af65?w=800&q=80",
      backdrop: "https://images.unsplash.com/photo-1514539079130-25950c84af65?w=1600&q=80",
      year: 2024,
      rating: 8.5,
      category: 'movie' as const,
      genres: ["Sci-Fi", "Cyberpunk"],
      audio_type: "Dual Áudio",
      resolution: "4K",
      size: "2.4 GB",
      magnet: "magnet:?xt=urn:btih:65349603348651811654156641564165"
    },
    {
      title: "Sombras da Lua",
      slug: "sombras-da-lua",
      description: "Uma expedição lunar descobre que não estamos sozinhos no satélite da Terra.",
      poster: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800&q=80",
      backdrop: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1600&q=80",
      year: 2023,
      rating: 7.9,
      category: 'series' as const,
      genres: ["Espaço", "Terror"],
      audio_type: "Legendado",
      resolution: "1080p",
      size: "1.2 GB",
      magnet: "magnet:?xt=urn:btih:08ada5a7a6106a04a1ce9ae8c338de59461d93c2"
    },
    {
      title: "Guerreiros de Asgard",
      slug: "guerreiros-de-asgard",
      description: "A épica jornada de heróis nórdicos para salvar os nove reinos da destruição total.",
      poster: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80",
      backdrop: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&q=80",
      year: 2024,
      rating: 9.1,
      category: 'movie' as const,
      genres: ["Ação", "Fantasia"],
      audio_type: "Dublado",
      resolution: "4K",
      size: "3.5 GB",
      magnet: "magnet:?xt=urn:btih:65349603348651811654156641564165"
    }
  ];

  const { error } = await supabase.from('catalog').insert(fakeData);
  if (error) console.error("Erro ao inserir dados fake:", error);
  else console.log("Catálogo populado com sucesso!");
};
