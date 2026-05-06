export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      episodes: {
        Row: {
          created_at: string
          episode_number: number
          id: string
          quality: string | null
          season_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          episode_number: number
          id?: string
          quality?: string | null
          season_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          episode_number?: number
          id?: string
          quality?: string | null
          season_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "episodes_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      genres: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      movies: {
        Row: {
          audio_type: string | null
          backdrop: string | null
          category_id: string | null
          created_at: string
          description: string | null
          external_id: string | null
          genres: string[] | null
          id: string
          is_hero: boolean | null
          last_sync_at: string | null
          magnet: string | null
          poster: string | null
          rating: number | null
          resolution: string | null
          seasons: Json | null
          size: string | null
          slug: string
          title: string
          type: Database["public"]["Enums"]["content_type"] | null
          updated_at: string
          year: number | null
        }
        Insert: {
          audio_type?: string | null
          backdrop?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          external_id?: string | null
          genres?: string[] | null
          id?: string
          is_hero?: boolean | null
          last_sync_at?: string | null
          magnet?: string | null
          poster?: string | null
          rating?: number | null
          resolution?: string | null
          seasons?: Json | null
          size?: string | null
          slug: string
          title: string
          type?: Database["public"]["Enums"]["content_type"] | null
          updated_at?: string
          year?: number | null
        }
        Update: {
          audio_type?: string | null
          backdrop?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          external_id?: string | null
          genres?: string[] | null
          id?: string
          is_hero?: boolean | null
          last_sync_at?: string | null
          magnet?: string | null
          poster?: string | null
          rating?: number | null
          resolution?: string | null
          seasons?: Json | null
          size?: string | null
          slug?: string
          title?: string
          type?: Database["public"]["Enums"]["content_type"] | null
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "movies_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string
          id: string
          season_number: number
          title_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          season_number: number
          title_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          season_number?: number
          title_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seasons_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_logs: {
        Row: {
          artifact_path: string | null
          base_url: string | null
          created_at: string | null
          duration_seconds: number | null
          failed: number | null
          failed_at_step: string | null
          finished_at: string | null
          id: string
          ignored: number | null
          imported: number | null
          raw_error: string | null
          started_at: string
          status: string | null
          updated: number | null
        }
        Insert: {
          artifact_path?: string | null
          base_url?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          failed?: number | null
          failed_at_step?: string | null
          finished_at?: string | null
          id?: string
          ignored?: number | null
          imported?: number | null
          raw_error?: string | null
          started_at?: string
          status?: string | null
          updated?: number | null
        }
        Update: {
          artifact_path?: string | null
          base_url?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          failed?: number | null
          failed_at_step?: string | null
          finished_at?: string | null
          id?: string
          ignored?: number | null
          imported?: number | null
          raw_error?: string | null
          started_at?: string
          status?: string | null
          updated?: number | null
        }
        Relationships: []
      }
      sync_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      sync_sources: {
        Row: {
          id: string
          imported_count: number | null
          page_number: number | null
          source_type: string
          source_url: string
          synced_at: string
        }
        Insert: {
          id?: string
          imported_count?: number | null
          page_number?: number | null
          source_type: string
          source_url: string
          synced_at?: string
        }
        Update: {
          id?: string
          imported_count?: number | null
          page_number?: number | null
          source_type?: string
          source_url?: string
          synced_at?: string
        }
        Relationships: []
      }
      system_health: {
        Row: {
          created_at: string
          id: string
          message: string | null
          metadata: Json | null
          source: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          source: string
          status: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          source?: string
          status?: string
        }
        Relationships: []
      }
      title_genres: {
        Row: {
          genre_id: string
          title_id: string
        }
        Insert: {
          genre_id: string
          title_id: string
        }
        Update: {
          genre_id?: string
          title_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "title_genres_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "title_genres_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      titles: {
        Row: {
          backdrop: string | null
          category: string | null
          created_at: string
          external_id: string
          id: string
          imdb_rating: number | null
          poster: string | null
          slug: string
          source_url: string | null
          synopsis: string | null
          title: string
          type: string
          updated_at: string
          year: number | null
        }
        Insert: {
          backdrop?: string | null
          category?: string | null
          created_at?: string
          external_id: string
          id?: string
          imdb_rating?: number | null
          poster?: string | null
          slug: string
          source_url?: string | null
          synopsis?: string | null
          title: string
          type: string
          updated_at?: string
          year?: number | null
        }
        Update: {
          backdrop?: string | null
          category?: string | null
          created_at?: string
          external_id?: string
          id?: string
          imdb_rating?: number | null
          poster?: string | null
          slug?: string
          source_url?: string | null
          synopsis?: string | null
          title?: string
          type?: string
          updated_at?: string
          year?: number | null
        }
        Relationships: []
      }
      torrent_options: {
        Row: {
          audio_type: string | null
          codec: string | null
          created_at: string
          episode_id: string | null
          id: string
          language: string | null
          magnet: string
          quality: string | null
          size: string | null
          title_id: string | null
          updated_at: string
        }
        Insert: {
          audio_type?: string | null
          codec?: string | null
          created_at?: string
          episode_id?: string | null
          id?: string
          language?: string | null
          magnet: string
          quality?: string | null
          size?: string | null
          title_id?: string | null
          updated_at?: string
        }
        Update: {
          audio_type?: string | null
          codec?: string | null
          created_at?: string
          episode_id?: string | null
          id?: string
          language?: string | null
          magnet?: string
          quality?: string | null
          size?: string | null
          title_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "torrent_options_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "torrent_options_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      content_category: "movie" | "series"
      content_type: "movie" | "series" | "anime"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      content_category: ["movie", "series"],
      content_type: ["movie", "series", "anime"],
    },
  },
} as const
