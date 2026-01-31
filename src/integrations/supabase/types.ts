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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          city: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          description: string | null
          end_datetime: string
          event_type: string
          id: string
          is_active: boolean
          is_online: boolean
          location: string | null
          organizer: string
          registration_url: string | null
          start_datetime: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_datetime: string
          event_type: string
          id?: string
          is_active?: boolean
          is_online?: boolean
          location?: string | null
          organizer: string
          registration_url?: string | null
          start_datetime: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_datetime?: string
          event_type?: string
          id?: string
          is_active?: boolean
          is_online?: boolean
          location?: string | null
          organizer?: string
          registration_url?: string | null
          start_datetime?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      flight_blocks: {
        Row: {
          airline: string
          created_at: string
          destination: string
          end_date: string
          id: string
          is_active: boolean
          notes: string | null
          operator: string
          start_date: string
          updated_at: string
        }
        Insert: {
          airline: string
          created_at?: string
          destination: string
          end_date: string
          id?: string
          is_active?: boolean
          notes?: string | null
          operator: string
          start_date: string
          updated_at?: string
        }
        Update: {
          airline?: string
          created_at?: string
          destination?: string
          end_date?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          operator?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      generated_content: {
        Row: {
          content_type: string
          created_at: string
          detected_benefits: string[] | null
          detected_destination: string | null
          detected_info: Json | null
          generated_text: string
          id: string
          original_file_name: string | null
          original_file_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content_type: string
          created_at?: string
          detected_benefits?: string[] | null
          detected_destination?: string | null
          detected_info?: Json | null
          generated_text: string
          id?: string
          original_file_name?: string | null
          original_file_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content_type?: string
          created_at?: string
          detected_benefits?: string[] | null
          detected_destination?: string | null
          detected_info?: Json | null
          generated_text?: string
          id?: string
          original_file_name?: string | null
          original_file_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      itineraries: {
        Row: {
          budget_level: string
          created_at: string
          destination: string
          end_date: string
          id: string
          share_token: string | null
          start_date: string
          status: string
          travelers_count: number
          trip_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_level: string
          created_at?: string
          destination: string
          end_date: string
          id?: string
          share_token?: string | null
          start_date: string
          status?: string
          travelers_count?: number
          trip_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_level?: string
          created_at?: string
          destination?: string
          end_date?: string
          id?: string
          share_token?: string | null
          start_date?: string
          status?: string
          travelers_count?: number
          trip_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      itinerary_activities: {
        Row: {
          created_at: string
          day_id: string
          description: string | null
          estimated_cost: string | null
          estimated_duration: string | null
          id: string
          is_approved: boolean
          location: string | null
          order_index: number
          period: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_id: string
          description?: string | null
          estimated_cost?: string | null
          estimated_duration?: string | null
          id?: string
          is_approved?: boolean
          location?: string | null
          order_index?: number
          period: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_id?: string
          description?: string | null
          estimated_cost?: string | null
          estimated_duration?: string | null
          id?: string
          is_approved?: boolean
          location?: string | null
          order_index?: number
          period?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_activities_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "itinerary_days"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_days: {
        Row: {
          created_at: string
          date: string
          day_number: number
          id: string
          itinerary_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          day_number: number
          id?: string
          itinerary_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          day_number?: number
          id?: string
          itinerary_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_days_itinerary_id_fkey"
            columns: ["itinerary_id"]
            isOneToOne: false
            referencedRelation: "itineraries"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          category: string
          created_at: string
          file_url: string | null
          id: string
          is_active: boolean
          material_type: string
          published_at: string
          supplier_id: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          category: string
          created_at?: string
          file_url?: string | null
          id?: string
          is_active?: boolean
          material_type: string
          published_at?: string
          supplier_id?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          file_url?: string | null
          id?: string
          is_active?: boolean
          material_type?: string
          published_at?: string
          supplier_id?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "materials_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "trade_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      news: {
        Row: {
          category: string
          created_at: string
          id: string
          is_active: boolean
          source: string
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          is_active?: boolean
          source: string
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          source?: string
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          client_id: string
          created_at: string
          destination: string
          end_date: string | null
          estimated_value: number
          id: string
          notes: string | null
          passengers_count: number
          stage: string
          start_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          destination: string
          end_date?: string | null
          estimated_value?: number
          id?: string
          notes?: string | null
          passengers_count?: number
          stage?: string
          start_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          destination?: string
          end_date?: string | null
          estimated_value?: number
          id?: string
          notes?: string | null
          passengers_count?: number
          stage?: string
          start_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_history: {
        Row: {
          changed_at: string
          from_stage: string | null
          id: string
          notes: string | null
          opportunity_id: string
          to_stage: string
        }
        Insert: {
          changed_at?: string
          from_stage?: string | null
          id?: string
          notes?: string | null
          opportunity_id: string
          to_stage: string
        }
        Update: {
          changed_at?: string
          from_stage?: string | null
          id?: string
          notes?: string | null
          opportunity_id?: string
          to_stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_history_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address_number: string | null
          agency_name: string | null
          avatar_url: string | null
          city: string | null
          cnpj: string | null
          cpf: string | null
          created_at: string
          has_password: boolean | null
          id: string
          name: string
          neighborhood: string | null
          phone: string | null
          state: string | null
          street: string | null
          updated_at: string
          user_id: string
          zip_code: string | null
        }
        Insert: {
          address_number?: string | null
          agency_name?: string | null
          avatar_url?: string | null
          city?: string | null
          cnpj?: string | null
          cpf?: string | null
          created_at?: string
          has_password?: boolean | null
          id?: string
          name: string
          neighborhood?: string | null
          phone?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
          user_id: string
          zip_code?: string | null
        }
        Update: {
          address_number?: string | null
          agency_name?: string | null
          avatar_url?: string | null
          city?: string | null
          cnpj?: string | null
          cpf?: string | null
          created_at?: string
          has_password?: boolean | null
          id?: string
          name?: string
          neighborhood?: string | null
          phone?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
          user_id?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      quote_services: {
        Row: {
          amount: number
          created_at: string
          id: string
          order_index: number
          quote_id: string
          service_data: Json
          service_type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          order_index?: number
          quote_id: string
          service_data?: Json
          service_type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          order_index?: number
          quote_id?: string
          service_data?: Json
          service_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_services_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          adults_count: number
          children_count: number
          client_name: string
          created_at: string
          destination: string
          end_date: string
          id: string
          share_token: string | null
          start_date: string
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          adults_count?: number
          children_count?: number
          client_name: string
          created_at?: string
          destination: string
          end_date: string
          id?: string
          share_token?: string | null
          start_date: string
          status?: string
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          adults_count?: number
          children_count?: number
          client_name?: string
          created_at?: string
          destination?: string
          end_date?: string
          id?: string
          share_token?: string | null
          start_date?: string
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      supplier_contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          position: string | null
          supplier_id: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          position?: string | null
          supplier_id: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          position?: string | null
          supplier_id?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_contacts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "trade_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          created_at: string
          description: string
          icon: string
          id: string
          is_active: boolean
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          description: string
          icon?: string
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      trade_suppliers: {
        Row: {
          category: string
          created_at: string
          how_to_sell: string | null
          id: string
          instagram_url: string | null
          is_active: boolean
          name: string
          other_social_media: Json | null
          practical_notes: string | null
          sales_channel: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          category: string
          created_at?: string
          how_to_sell?: string | null
          id?: string
          instagram_url?: string | null
          is_active?: boolean
          name: string
          other_social_media?: Json | null
          practical_notes?: string | null
          sales_channel?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          how_to_sell?: string | null
          id?: string
          instagram_url?: string | null
          is_active?: boolean
          name?: string
          other_social_media?: Json | null
          practical_notes?: string | null
          sales_channel?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      trade_updates: {
        Row: {
          created_at: string
          description: string
          id: string
          is_active: boolean
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          is_active?: boolean
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      trip_services: {
        Row: {
          created_at: string
          id: string
          order_index: number
          service_data: Json
          service_type: string
          trip_id: string
          updated_at: string
          voucher_name: string | null
          voucher_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          order_index?: number
          service_data?: Json
          service_type: string
          trip_id: string
          updated_at?: string
          voucher_name?: string | null
          voucher_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          order_index?: number
          service_data?: Json
          service_type?: string
          trip_id?: string
          updated_at?: string
          voucher_name?: string | null
          voucher_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_services_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          client_name: string
          created_at: string
          destination: string
          end_date: string
          id: string
          share_token: string | null
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_name: string
          created_at?: string
          destination: string
          end_date: string
          id?: string
          share_token?: string | null
          start_date: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_name?: string
          created_at?: string
          destination?: string
          end_date?: string
          id?: string
          share_token?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "agente"
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
      app_role: ["admin", "agente"],
    },
  },
} as const
