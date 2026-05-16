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
      _infra_metrics: {
        Row: {
          captured_at: string
          id: number
          metric: string
          value: number
        }
        Insert: {
          captured_at?: string
          id?: number
          metric: string
          value: number
        }
        Update: {
          captured_at?: string
          id?: number
          metric?: string
          value?: number
        }
        Relationships: []
      }
      _migrations: {
        Row: {
          applied_at: string
          id: number
          name: string
        }
        Insert: {
          applied_at?: string
          id?: number
          name: string
        }
        Update: {
          applied_at?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      _page_analytics: {
        Row: {
          duration_sec: number
          id: number
          org_id: string | null
          page: string
          username: string | null
          visited_at: string
        }
        Insert: {
          duration_sec?: number
          id?: number
          org_id?: string | null
          page: string
          username?: string | null
          visited_at?: string
        }
        Update: {
          duration_sec?: number
          id?: number
          org_id?: string | null
          page?: string
          username?: string | null
          visited_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          author: string
          created_at: string
          destinataire: string
          id: string
          message: string
          org_id: string | null
        }
        Insert: {
          author: string
          created_at?: string
          destinataire?: string
          id?: string
          message: string
          org_id?: string | null
        }
        Update: {
          author?: string
          created_at?: string
          destinataire?: string
          id?: string
          message?: string
          org_id?: string | null
        }
        Relationships: []
      }
      crm: {
        Row: {
          assigned_to: string
          canal: string
          contact: string
          created_at: string
          email: string | null
          enseigne: string
          id: string
          last_contact: string | null
          modified_by: string
          next_followup: string | null
          notes: string
          org_id: string | null
          phone: string | null
          priority: string
          status: string
          type: string
          updated_at: string
          ville: string
        }
        Insert: {
          assigned_to?: string
          canal?: string
          contact?: string
          created_at?: string
          email?: string | null
          enseigne?: string
          id?: string
          last_contact?: string | null
          modified_by?: string
          next_followup?: string | null
          notes?: string
          org_id?: string | null
          phone?: string | null
          priority?: string
          status?: string
          type?: string
          updated_at?: string
          ville?: string
        }
        Update: {
          assigned_to?: string
          canal?: string
          contact?: string
          created_at?: string
          email?: string | null
          enseigne?: string
          id?: string
          last_contact?: string | null
          modified_by?: string
          next_followup?: string | null
          notes?: string
          org_id?: string | null
          phone?: string | null
          priority?: string
          status?: string
          type?: string
          updated_at?: string
          ville?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          date_end: string | null
          date_start: string | null
          description: string
          id: string
          modified_by: string
          org_id: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_end?: string | null
          date_start?: string | null
          description?: string
          id?: string
          modified_by?: string
          org_id?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_end?: string | null
          date_start?: string | null
          description?: string
          id?: string
          modified_by?: string
          org_id?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      ideas: {
        Row: {
          assigned_to: string
          category: string
          created_at: string
          description: string
          effort: string
          id: string
          modified_by: string
          org_id: string | null
          status: string
          title: string
          updated_at: string
          votes: number
        }
        Insert: {
          assigned_to?: string
          category?: string
          created_at?: string
          description?: string
          effort?: string
          id?: string
          modified_by?: string
          org_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          votes?: number
        }
        Update: {
          assigned_to?: string
          category?: string
          created_at?: string
          description?: string
          effort?: string
          id?: string
          modified_by?: string
          org_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          votes?: number
        }
        Relationships: []
      }
      notes: {
        Row: {
          contenu: string
          created_at: string
          id: string
          org_id: string | null
          shared_with: string[]
          titre: string
          updated_at: string
          utilisateur: string
        }
        Insert: {
          contenu?: string
          created_at?: string
          id?: string
          org_id?: string | null
          shared_with?: string[]
          titre?: string
          updated_at?: string
          utilisateur: string
        }
        Update: {
          contenu?: string
          created_at?: string
          id?: string
          org_id?: string | null
          shared_with?: string[]
          titre?: string
          updated_at?: string
          utilisateur?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          de: string
          id: string
          lu: boolean
          message: string
          pour: string
          type: string
        }
        Insert: {
          created_at?: string
          de?: string
          id?: string
          lu?: boolean
          message?: string
          pour?: string
          type?: string
        }
        Update: {
          created_at?: string
          de?: string
          id?: string
          lu?: boolean
          message?: string
          pour?: string
          type?: string
        }
        Relationships: []
      }
      org_members: {
        Row: {
          id: string
          joined_at: string | null
          org_id: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          org_id?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          org_id?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          granted_at: string | null
          granted_by: string | null
          user_id: string
        }
        Insert: {
          granted_at?: string | null
          granted_by?: string | null
          user_id: string
        }
        Update: {
          granted_at?: string | null
          granted_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      presence: {
        Row: {
          connected_at: string | null
          current_streak: number
          display_name: string | null
          ical_feed_url: string | null
          id: string
          last_seen: string
          last_streak_date: string | null
          longest_streak: number
          onboarding_done: boolean
          password_override: string | null
          username: string
        }
        Insert: {
          connected_at?: string | null
          current_streak?: number
          display_name?: string | null
          ical_feed_url?: string | null
          id?: string
          last_seen?: string
          last_streak_date?: string | null
          longest_streak?: number
          onboarding_done?: boolean
          password_override?: string | null
          username: string
        }
        Update: {
          connected_at?: string | null
          current_streak?: number
          display_name?: string | null
          ical_feed_url?: string | null
          id?: string
          last_seen?: string
          last_streak_date?: string | null
          longest_streak?: number
          onboarding_done?: boolean
          password_override?: string | null
          username?: string
        }
        Relationships: []
      }
      project_invitations: {
        Row: {
          created_at: string
          id: string
          invited_by: string
          invited_email: string
          org_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by: string
          invited_email: string
          org_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string
          invited_email?: string
          org_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string
          created_at: string
          date_end: string | null
          date_start: string | null
          description: string
          id: string
          modified_by: string
          module: string
          org_id: string | null
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string
          created_at?: string
          date_end?: string | null
          date_start?: string | null
          description?: string
          id?: string
          modified_by?: string
          module?: string
          org_id?: string | null
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string
          created_at?: string
          date_end?: string | null
          date_start?: string | null
          description?: string
          id?: string
          modified_by?: string
          module?: string
          org_id?: string | null
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      time_sessions: {
        Row: {
          categorie: string
          created_at: string
          debut: string
          duree: number | null
          fin: string | null
          id: string
          note: string
          org_id: string | null
          utilisateur: string
        }
        Insert: {
          categorie?: string
          created_at?: string
          debut?: string
          duree?: number | null
          fin?: string | null
          id?: string
          note?: string
          org_id?: string | null
          utilisateur: string
        }
        Update: {
          categorie?: string
          created_at?: string
          debut?: string
          duree?: number | null
          fin?: string | null
          id?: string
          note?: string
          org_id?: string | null
          utilisateur?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
