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
      achievement_definitions: {
        Row: {
          created_at: string
          criteria_type: string
          criteria_value: number
          description: string | null
          icon: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          criteria_type?: string
          criteria_value?: number
          description?: string | null
          icon?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          criteria_type?: string
          criteria_value?: number
          description?: string | null
          icon?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      agency_events: {
        Row: {
          client_id: string | null
          color: string | null
          created_at: string
          description: string | null
          event_date: string
          event_time: string | null
          event_type: string
          id: string
          opportunity_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          event_date: string
          event_time?: string | null
          event_type?: string
          id?: string
          opportunity_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          event_date?: string
          event_time?: string | null
          event_type?: string
          id?: string
          opportunity_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_events_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      agenda_filter_preferences: {
        Row: {
          created_at: string
          hidden_types: string[]
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hidden_types?: string[]
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hidden_types?: string[]
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          city: string | null
          created_at: string
          email: string | null
          id: string
          internal_notes: string | null
          last_interaction_at: string | null
          name: string
          notes: string | null
          phone: string | null
          status: string | null
          travel_preferences: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          internal_notes?: string | null
          last_interaction_at?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          status?: string | null
          travel_preferences?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          internal_notes?: string | null
          last_interaction_at?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string | null
          travel_preferences?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      community_highlights: {
        Row: {
          contribution_summary: string
          created_at: string
          id: string
          is_winner: boolean
          month: number
          updated_at: string
          user_id: string
          vote_count: number
          year: number
        }
        Insert: {
          contribution_summary: string
          created_at?: string
          id?: string
          is_winner?: boolean
          month: number
          updated_at?: string
          user_id: string
          vote_count?: number
          year: number
        }
        Update: {
          contribution_summary?: string
          created_at?: string
          id?: string
          is_winner?: boolean
          month?: number
          updated_at?: string
          user_id?: string
          vote_count?: number
          year?: number
        }
        Relationships: []
      }
      community_votes: {
        Row: {
          created_at: string
          highlight_id: string
          id: string
          month: number
          voter_id: string
          year: number
        }
        Insert: {
          created_at?: string
          highlight_id: string
          id?: string
          month: number
          voter_id: string
          year: number
        }
        Update: {
          created_at?: string
          highlight_id?: string
          id?: string
          month?: number
          voter_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "community_votes_highlight_id_fkey"
            columns: ["highlight_id"]
            isOneToOne: false
            referencedRelation: "community_highlights"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_event_types: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          payment_date: string
          payment_method: string
          sale_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          sale_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          sale_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
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
      expense_entries: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string
          entry_date: string
          id: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          description: string
          entry_date?: string
          id?: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string
          entry_date?: string
          id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
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
      fun_trips: {
        Row: {
          available_spots: number
          created_at: string
          description: string | null
          destination: string
          id: string
          image_url: string | null
          is_active: boolean
          partner_company: string
          registration_url: string | null
          trip_date: string
          updated_at: string
        }
        Insert: {
          available_spots?: number
          created_at?: string
          description?: string | null
          destination: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          partner_company: string
          registration_url?: string | null
          trip_date: string
          updated_at?: string
        }
        Update: {
          available_spots?: number
          created_at?: string
          description?: string | null
          destination?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          partner_company?: string
          registration_url?: string | null
          trip_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      gamification_daily_login: {
        Row: {
          created_at: string
          id: string
          login_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          login_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          login_date?: string
          user_id?: string
        }
        Relationships: []
      }
      gamification_daily_visits: {
        Row: {
          created_at: string
          id: string
          section_key: string
          user_id: string
          visit_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          section_key: string
          user_id: string
          visit_date?: string
        }
        Update: {
          created_at?: string
          id?: string
          section_key?: string
          user_id?: string
          visit_date?: string
        }
        Relationships: []
      }
      gamification_points: {
        Row: {
          action: string
          created_at: string
          id: string
          points: number
          reference_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          points?: number
          reference_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          points?: number
          reference_id?: string | null
          user_id?: string
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
      global_popups: {
        Row: {
          button_link: string | null
          button_text: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          has_button: boolean
          id: string
          image_url: string | null
          is_active: boolean
          start_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          button_link?: string | null
          button_text?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          has_button?: boolean
          id?: string
          image_url?: string | null
          is_active?: boolean
          start_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          button_link?: string | null
          button_text?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          has_button?: boolean
          id?: string
          image_url?: string | null
          is_active?: boolean
          start_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      hidden_preset_events: {
        Row: {
          hidden_at: string
          id: string
          preset_event_id: string
          user_id: string
        }
        Insert: {
          hidden_at?: string
          id?: string
          preset_event_id: string
          user_id: string
        }
        Update: {
          hidden_at?: string
          id?: string
          preset_event_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hidden_preset_events_preset_event_id_fkey"
            columns: ["preset_event_id"]
            isOneToOne: false
            referencedRelation: "preset_events"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_recommendations: {
        Row: {
          created_at: string
          hotel_data: Json | null
          hotel_id: string | null
          id: string
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hotel_data?: Json | null
          hotel_id?: string | null
          id?: string
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hotel_data?: Json | null
          hotel_id?: string | null
          id?: string
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_recommendations_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      hotels: {
        Row: {
          accessible: boolean
          address: string | null
          air_conditioning: boolean
          bar: boolean
          brand: string | null
          breakfast_included: boolean
          category: string | null
          city: string | null
          country: string
          created_at: string
          destination: string
          family_friendly: boolean
          favorite_brazilians: boolean
          free_cancellation: boolean
          free_wifi: boolean
          google_maps_link: string | null
          gym: boolean
          iconic_hotel: boolean
          id: string
          is_active: boolean
          most_booked_brazilians: boolean
          name: string
          neighborhood: string | null
          parking: boolean
          pet_friendly: boolean
          pool: boolean
          price_from: number | null
          property_type: string | null
          region: string | null
          restaurant: boolean
          review_score: number | null
          spa: boolean
          special_offers: boolean
          star_rating: number | null
          state: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          accessible?: boolean
          address?: string | null
          air_conditioning?: boolean
          bar?: boolean
          brand?: string | null
          breakfast_included?: boolean
          category?: string | null
          city?: string | null
          country?: string
          created_at?: string
          destination: string
          family_friendly?: boolean
          favorite_brazilians?: boolean
          free_cancellation?: boolean
          free_wifi?: boolean
          google_maps_link?: string | null
          gym?: boolean
          iconic_hotel?: boolean
          id?: string
          is_active?: boolean
          most_booked_brazilians?: boolean
          name: string
          neighborhood?: string | null
          parking?: boolean
          pet_friendly?: boolean
          pool?: boolean
          price_from?: number | null
          property_type?: string | null
          region?: string | null
          restaurant?: boolean
          review_score?: number | null
          spa?: boolean
          special_offers?: boolean
          star_rating?: number | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          accessible?: boolean
          address?: string | null
          air_conditioning?: boolean
          bar?: boolean
          brand?: string | null
          breakfast_included?: boolean
          category?: string | null
          city?: string | null
          country?: string
          created_at?: string
          destination?: string
          family_friendly?: boolean
          favorite_brazilians?: boolean
          free_cancellation?: boolean
          free_wifi?: boolean
          google_maps_link?: string | null
          gym?: boolean
          iconic_hotel?: boolean
          id?: string
          is_active?: boolean
          most_booked_brazilians?: boolean
          name?: string
          neighborhood?: string | null
          parking?: boolean
          pet_friendly?: boolean
          pool?: boolean
          price_from?: number | null
          property_type?: string | null
          region?: string | null
          restaurant?: boolean
          review_score?: number | null
          spa?: boolean
          special_offers?: boolean
          star_rating?: number | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      in_person_events: {
        Row: {
          city: string
          created_at: string
          event_date: string
          id: string
          image_url: string | null
          is_active: boolean
          location: string
          registration_url: string | null
          theme: string
          updated_at: string
        }
        Insert: {
          city: string
          created_at?: string
          event_date: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          location: string
          registration_url?: string | null
          theme: string
          updated_at?: string
        }
        Update: {
          city?: string
          created_at?: string
          event_date?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          location?: string
          registration_url?: string | null
          theme?: string
          updated_at?: string
        }
        Relationships: []
      }
      income_entries: {
        Row: {
          amount: number
          created_at: string
          entry_date: string
          id: string
          notes: string | null
          payment_method: string
          sale_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          entry_date?: string
          id?: string
          notes?: string | null
          payment_method?: string
          sale_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          entry_date?: string
          id?: string
          notes?: string | null
          payment_method?: string
          sale_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "income_entries_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      itineraries: {
        Row: {
          budget_level: string
          created_at: string
          destination: string
          end_date: string
          id: string
          share_expires_at: string | null
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
          share_expires_at?: string | null
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
          share_expires_at?: string | null
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
      learning_trails: {
        Row: {
          certificate_template_url: string | null
          created_at: string
          description: string | null
          destination: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          order_index: number
          overview_pdf_url: string | null
          playbook_destination_id: string | null
          total_hours: number
          updated_at: string
        }
        Insert: {
          certificate_template_url?: string | null
          created_at?: string
          description?: string | null
          destination: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          order_index?: number
          overview_pdf_url?: string | null
          playbook_destination_id?: string | null
          total_hours?: number
          updated_at?: string
        }
        Update: {
          certificate_template_url?: string | null
          created_at?: string
          description?: string | null
          destination?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          order_index?: number
          overview_pdf_url?: string | null
          playbook_destination_id?: string | null
          total_hours?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_trails_playbook_destination_id_fkey"
            columns: ["playbook_destination_id"]
            isOneToOne: false
            referencedRelation: "playbook_destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          canva_url: string | null
          caption: string | null
          category: string
          created_at: string
          destination: string | null
          file_url: string | null
          id: string
          is_active: boolean
          is_permanent: boolean
          material_type: string
          order_index: number
          published_at: string
          supplier_id: string | null
          thumbnail_url: string | null
          title: string
          trail_id: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          canva_url?: string | null
          caption?: string | null
          category: string
          created_at?: string
          destination?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean
          is_permanent?: boolean
          material_type: string
          order_index?: number
          published_at?: string
          supplier_id?: string | null
          thumbnail_url?: string | null
          title: string
          trail_id?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          canva_url?: string | null
          caption?: string | null
          category?: string
          created_at?: string
          destination?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean
          is_permanent?: boolean
          material_type?: string
          order_index?: number
          published_at?: string
          supplier_id?: string | null
          thumbnail_url?: string | null
          title?: string
          trail_id?: string | null
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
          {
            foreignKeyName: "materials_trail_id_fkey"
            columns: ["trail_id"]
            isOneToOne: false
            referencedRelation: "learning_trails"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorship_lessons: {
        Row: {
          created_at: string
          description: string | null
          id: string
          module_id: string
          order_index: number
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          module_id: string
          order_index?: number
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          module_id?: string
          order_index?: number
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "mentorship_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorship_materials: {
        Row: {
          created_at: string
          description: string | null
          file_type: string | null
          file_url: string
          id: string
          mentorship_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_type?: string | null
          file_url: string
          id?: string
          mentorship_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_type?: string | null
          file_url?: string
          id?: string
          mentorship_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_materials_mentorship_id_fkey"
            columns: ["mentorship_id"]
            isOneToOne: false
            referencedRelation: "mentorships"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorship_meetings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_past: boolean
          meeting_date: string
          meeting_url: string | null
          mentorship_id: string
          recording_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_past?: boolean
          meeting_date: string
          meeting_url?: string | null
          mentorship_id: string
          recording_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_past?: boolean
          meeting_date?: string
          meeting_url?: string | null
          mentorship_id?: string
          recording_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_meetings_mentorship_id_fkey"
            columns: ["mentorship_id"]
            isOneToOne: false
            referencedRelation: "mentorships"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorship_modules: {
        Row: {
          created_at: string
          description: string | null
          id: string
          mentorship_id: string
          order_index: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          mentorship_id: string
          order_index?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          mentorship_id?: string
          order_index?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_modules_mentorship_id_fkey"
            columns: ["mentorship_id"]
            isOneToOne: false
            referencedRelation: "mentorships"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorship_videos: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          mentorship_id: string
          order_index: number
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          mentorship_id: string
          order_index?: number
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          mentorship_id?: string
          order_index?: number
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_videos_mentorship_id_fkey"
            columns: ["mentorship_id"]
            isOneToOne: false
            referencedRelation: "mentorships"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorships: {
        Row: {
          created_at: string
          full_description: string | null
          id: string
          is_active: boolean
          mentor_name: string
          mentor_photo_url: string | null
          name: string
          objectives: string | null
          order_index: number
          short_description: string | null
          specialty: string
          target_audience: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_description?: string | null
          id?: string
          is_active?: boolean
          mentor_name: string
          mentor_photo_url?: string | null
          name: string
          objectives?: string | null
          order_index?: number
          short_description?: string | null
          specialty: string
          target_audience?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_description?: string | null
          id?: string
          is_active?: boolean
          mentor_name?: string
          mentor_photo_url?: string | null
          name?: string
          objectives?: string | null
          order_index?: number
          short_description?: string | null
          specialty?: string
          target_audience?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      monthly_prizes: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          month: number
          prize_description: string | null
          prize_image_url: string | null
          prize_name: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          month: number
          prize_description?: string | null
          prize_image_url?: string | null
          prize_name: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          month?: number
          prize_description?: string | null
          prize_image_url?: string | null
          prize_name?: string
          year?: number
        }
        Relationships: []
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
      notes: {
        Row: {
          client_id: string | null
          content: string | null
          created_at: string
          event_id: string | null
          id: string
          is_favorite: boolean | null
          opportunity_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          content?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          is_favorite?: boolean | null
          opportunity_id?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          content?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          is_favorite?: boolean | null
          opportunity_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "agency_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      noticias_brutas: {
        Row: {
          conteudo: string | null
          created_at: string
          data_coleta: string
          data_publicacao: string | null
          fonte: string
          id: string
          processado: boolean
          titulo_original: string
          url: string
        }
        Insert: {
          conteudo?: string | null
          created_at?: string
          data_coleta?: string
          data_publicacao?: string | null
          fonte: string
          id?: string
          processado?: boolean
          titulo_original: string
          url: string
        }
        Update: {
          conteudo?: string | null
          created_at?: string
          data_coleta?: string
          data_publicacao?: string | null
          fonte?: string
          id?: string
          processado?: boolean
          titulo_original?: string
          url?: string
        }
        Relationships: []
      }
      noticias_dashboard: {
        Row: {
          alerta_trade: boolean
          aprovado_em: string | null
          aprovado_por: string | null
          categoria: string
          created_at: string
          data_publicacao: string
          fonte: string
          id: string
          nivel_alerta: string
          noticia_bruta_id: string | null
          relevancia_score: number
          resumo: string
          status: string
          tipo_exibicao: string
          titulo_curto: string
          updated_at: string
          url_original: string
        }
        Insert: {
          alerta_trade?: boolean
          aprovado_em?: string | null
          aprovado_por?: string | null
          categoria: string
          created_at?: string
          data_publicacao?: string
          fonte: string
          id?: string
          nivel_alerta?: string
          noticia_bruta_id?: string | null
          relevancia_score?: number
          resumo: string
          status?: string
          tipo_exibicao?: string
          titulo_curto: string
          updated_at?: string
          url_original: string
        }
        Update: {
          alerta_trade?: boolean
          aprovado_em?: string | null
          aprovado_por?: string | null
          categoria?: string
          created_at?: string
          data_publicacao?: string
          fonte?: string
          id?: string
          nivel_alerta?: string
          noticia_bruta_id?: string | null
          relevancia_score?: number
          resumo?: string
          status?: string
          tipo_exibicao?: string
          titulo_curto?: string
          updated_at?: string
          url_original?: string
        }
        Relationships: [
          {
            foreignKeyName: "noticias_dashboard_noticia_bruta_id_fkey"
            columns: ["noticia_bruta_id"]
            isOneToOne: false
            referencedRelation: "noticias_brutas"
            referencedColumns: ["id"]
          },
        ]
      }
      online_meetings: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_past: boolean
          meeting_datetime: string
          meeting_url: string | null
          recording_url: string | null
          topic: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_past?: boolean
          meeting_datetime: string
          meeting_url?: string | null
          recording_url?: string | null
          topic: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_past?: boolean
          meeting_datetime?: string
          meeting_url?: string | null
          recording_url?: string | null
          topic?: string
          updated_at?: string
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
          follow_up_date: string | null
          id: string
          notes: string | null
          passengers_count: number
          stage: string
          stage_entered_at: string | null
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
          follow_up_date?: string | null
          id?: string
          notes?: string | null
          passengers_count?: number
          stage?: string
          stage_entered_at?: string | null
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
          follow_up_date?: string | null
          id?: string
          notes?: string | null
          passengers_count?: number
          stage?: string
          stage_entered_at?: string | null
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
      paid_trainings: {
        Row: {
          apply_url: string | null
          compensation: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          partner_company: string
          topic: string
          updated_at: string
        }
        Insert: {
          apply_url?: string | null
          compensation: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          partner_company: string
          topic: string
          updated_at?: string
        }
        Update: {
          apply_url?: string | null
          compensation?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          partner_company?: string
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      playbook_destinations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          order_index: number
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          order_index?: number
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          order_index?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      playbook_sections: {
        Row: {
          content: Json
          created_at: string
          destination_id: string
          id: string
          order_index: number
          tab_key: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          destination_id: string
          id?: string
          order_index?: number
          tab_key: string
          title?: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          destination_id?: string
          id?: string
          order_index?: number
          tab_key?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "playbook_sections_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "playbook_destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      preset_events: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          event_date: string
          event_type: string
          id: string
          is_active: boolean
          recurring_yearly: boolean
          title: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          event_date: string
          event_type?: string
          id?: string
          is_active?: boolean
          recurring_yearly?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          event_date?: string
          event_type?: string
          id?: string
          is_active?: boolean
          recurring_yearly?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      professional_workshops: {
        Row: {
          category: Database["public"]["Enums"]["workshop_category"]
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          instructor: string | null
          is_active: boolean
          materials_url: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["workshop_category"]
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          instructor?: string | null
          is_active?: boolean
          materials_url?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["workshop_category"]
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          instructor?: string | null
          is_active?: boolean
          materials_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address_number: string | null
          agency_logo_url: string | null
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
          agency_logo_url?: string | null
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
          agency_logo_url?: string | null
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
      promoter_monthly_winners: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          is_confirmed: boolean
          month: number
          prize_description: string | null
          prize_image_url: string | null
          prize_name: string | null
          ranking_criteria: string
          total_revenue: number
          total_sales_count: number
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          is_confirmed?: boolean
          month: number
          prize_description?: string | null
          prize_image_url?: string | null
          prize_name?: string | null
          ranking_criteria?: string
          total_revenue?: number
          total_sales_count?: number
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          is_confirmed?: boolean
          month?: number
          prize_description?: string | null
          prize_image_url?: string | null
          prize_name?: string | null
          ranking_criteria?: string
          total_revenue?: number
          total_sales_count?: number
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      promoter_presentation_usage: {
        Row: {
          feature_name: string
          id: string
          presentation_id: string
          used_at: string
        }
        Insert: {
          feature_name: string
          id?: string
          presentation_id: string
          used_at?: string
        }
        Update: {
          feature_name?: string
          id?: string
          presentation_id?: string
          used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promoter_presentation_usage_presentation_id_fkey"
            columns: ["presentation_id"]
            isOneToOne: false
            referencedRelation: "promoter_presentations"
            referencedColumns: ["id"]
          },
        ]
      }
      promoter_presentations: {
        Row: {
          agency_name: string
          agent_email: string
          agent_name: string
          agent_whatsapp: string
          city: string
          created_at: string
          ended_at: string | null
          id: string
          is_active: boolean
          promoter_id: string
          started_at: string
          state: string
          updated_at: string
        }
        Insert: {
          agency_name: string
          agent_email: string
          agent_name: string
          agent_whatsapp: string
          city: string
          created_at?: string
          ended_at?: string | null
          id?: string
          is_active?: boolean
          promoter_id: string
          started_at?: string
          state: string
          updated_at?: string
        }
        Update: {
          agency_name?: string
          agent_email?: string
          agent_name?: string
          agent_whatsapp?: string
          city?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          is_active?: boolean
          promoter_id?: string
          started_at?: string
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      promoter_settings: {
        Row: {
          current_month_prize_description: string | null
          current_month_prize_image_url: string | null
          current_month_prize_name: string | null
          id: string
          ranking_criteria: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          current_month_prize_description?: string | null
          current_month_prize_image_url?: string | null
          current_month_prize_name?: string | null
          id?: string
          ranking_criteria?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          current_month_prize_description?: string | null
          current_month_prize_image_url?: string | null
          current_month_prize_name?: string | null
          id?: string
          ranking_criteria?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      qa_answers: {
        Row: {
          content: string
          created_at: string
          id: string
          is_best_answer: boolean
          question_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_best_answer?: boolean
          question_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_best_answer?: boolean
          question_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qa_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "qa_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_questions: {
        Row: {
          answers_count: number
          category: string
          created_at: string
          description: string | null
          id: string
          is_resolved: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answers_count?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_resolved?: boolean
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answers_count?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_resolved?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_options: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          option_text: string
          order_index: number
          question_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean
          option_text: string
          order_index?: number
          question_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          option_text?: string
          order_index?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          created_at: string
          id: string
          order_index: number
          question_text: string
          question_type: string
          training_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_index?: number
          question_text: string
          question_type?: string
          training_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          order_index?: number
          question_text?: string
          question_type?: string
          training_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
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
          share_expires_at: string | null
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
          share_expires_at?: string | null
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
          share_expires_at?: string | null
          share_token?: string | null
          start_date?: string
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sale_products: {
        Row: {
          commission_type: string
          commission_value: number
          cost_price: number
          created_at: string
          description: string | null
          id: string
          product_type: string
          sale_id: string
          sale_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          commission_type?: string
          commission_value?: number
          cost_price?: number
          created_at?: string
          description?: string | null
          id?: string
          product_type: string
          sale_id: string
          sale_price?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          commission_type?: string
          commission_value?: number
          cost_price?: number
          created_at?: string
          description?: string | null
          id?: string
          product_type?: string
          sale_id?: string
          sale_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_products_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          client_id: string | null
          client_name: string
          created_at: string
          destination: string
          id: string
          notes: string | null
          opportunity_id: string | null
          sale_amount: number
          sale_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          client_name: string
          created_at?: string
          destination: string
          id?: string
          notes?: string | null
          opportunity_id?: string | null
          sale_amount?: number
          sale_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          client_name?: string
          created_at?: string
          destination?: string
          id?: string
          notes?: string | null
          opportunity_id?: string | null
          sale_amount?: number
          sale_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_goals: {
        Row: {
          created_at: string | null
          id: string
          month: number
          target_amount: number
          updated_at: string | null
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          month: number
          target_amount?: number
          updated_at?: string | null
          user_id: string
          year: number
        }
        Update: {
          created_at?: string | null
          id?: string
          month?: number
          target_amount?: number
          updated_at?: string | null
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      specialties: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          ai_usage_count: number
          ai_usage_reset_at: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          plan: Database["public"]["Enums"]["subscription_plan"]
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_usage_count?: number
          ai_usage_reset_at?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          plan?: Database["public"]["Enums"]["subscription_plan"]
          started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_usage_count?: number
          ai_usage_reset_at?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          plan?: Database["public"]["Enums"]["subscription_plan"]
          started_at?: string
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
      supplier_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          payment_date: string
          payment_method: string
          sale_id: string | null
          sale_product_id: string | null
          supplier_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          sale_id?: string | null
          sale_product_id?: string | null
          supplier_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          sale_id?: string | null
          sale_product_id?: string | null
          supplier_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_sale_product_id_fkey"
            columns: ["sale_product_id"]
            isOneToOne: false
            referencedRelation: "sale_products"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_specialties: {
        Row: {
          created_at: string
          id: string
          specialty_id: string
          supplier_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          specialty_id: string
          supplier_id: string
        }
        Update: {
          created_at?: string
          id?: string
          specialty_id?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_specialties_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "specialties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_specialties_supplier_id_fkey"
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
          logo_url: string | null
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
          logo_url?: string | null
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
          logo_url?: string | null
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
      trail_exam_options: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          option_text: string
          order_index: number
          question_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean
          option_text: string
          order_index?: number
          question_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          option_text?: string
          order_index?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trail_exam_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "trail_exam_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      trail_exam_questions: {
        Row: {
          created_at: string
          id: string
          order_index: number
          question_text: string
          question_type: string
          trail_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_index?: number
          question_text: string
          question_type?: string
          trail_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          order_index?: number
          question_text?: string
          question_type?: string
          trail_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trail_exam_questions_trail_id_fkey"
            columns: ["trail_id"]
            isOneToOne: false
            referencedRelation: "learning_trails"
            referencedColumns: ["id"]
          },
        ]
      }
      trail_linked_materials: {
        Row: {
          created_at: string
          id: string
          material_id: string
          trail_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          material_id: string
          trail_id: string
        }
        Update: {
          created_at?: string
          id?: string
          material_id?: string
          trail_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trail_linked_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trail_linked_materials_trail_id_fkey"
            columns: ["trail_id"]
            isOneToOne: false
            referencedRelation: "learning_trails"
            referencedColumns: ["id"]
          },
        ]
      }
      trail_materials: {
        Row: {
          category: string
          created_at: string
          description: string | null
          file_url: string | null
          id: string
          is_premium: boolean
          material_type: string
          order_index: number
          thumbnail_url: string | null
          title: string
          trail_id: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          is_premium?: boolean
          material_type?: string
          order_index?: number
          thumbnail_url?: string | null
          title: string
          trail_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          is_premium?: boolean
          material_type?: string
          order_index?: number
          thumbnail_url?: string | null
          title?: string
          trail_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trail_materials_trail_id_fkey"
            columns: ["trail_id"]
            isOneToOne: false
            referencedRelation: "learning_trails"
            referencedColumns: ["id"]
          },
        ]
      }
      trail_speakers: {
        Row: {
          bio: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          linkedin_url: string | null
          order_index: number
          photo_url: string | null
          trail_id: string
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          linkedin_url?: string | null
          order_index?: number
          photo_url?: string | null
          trail_id: string
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          linkedin_url?: string | null
          order_index?: number
          photo_url?: string | null
          trail_id?: string
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trail_speakers_trail_id_fkey"
            columns: ["trail_id"]
            isOneToOne: false
            referencedRelation: "learning_trails"
            referencedColumns: ["id"]
          },
        ]
      }
      trail_trainings: {
        Row: {
          created_at: string
          id: string
          order_index: number
          trail_id: string
          training_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_index?: number
          trail_id: string
          training_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_index?: number
          trail_id?: string
          training_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trail_trainings_trail_id_fkey"
            columns: ["trail_id"]
            isOneToOne: false
            referencedRelation: "learning_trails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trail_trainings_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      trainings: {
        Row: {
          category: string
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          instructor: string | null
          is_active: boolean
          materials_url: string | null
          order_index: number
          scheduled_at: string | null
          thumbnail_url: string | null
          title: string
          training_type: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          instructor?: string | null
          is_active?: boolean
          materials_url?: string | null
          order_index?: number
          scheduled_at?: string | null
          thumbnail_url?: string | null
          title: string
          training_type?: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          instructor?: string | null
          is_active?: boolean
          materials_url?: string | null
          order_index?: number
          scheduled_at?: string | null
          thumbnail_url?: string | null
          title?: string
          training_type?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      trip_edit_history: {
        Row: {
          created_at: string
          field_changed: string
          id: string
          new_value: string | null
          old_value: string | null
          trip_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          field_changed: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          trip_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          field_changed?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_edit_history_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_reminders: {
        Row: {
          created_at: string
          days_before: number
          follow_up_note: string | null
          id: string
          is_completed: boolean
          reminder_date: string
          trip_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          days_before: number
          follow_up_note?: string | null
          id?: string
          is_completed?: boolean
          reminder_date: string
          trip_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          days_before?: number
          follow_up_note?: string | null
          id?: string
          is_completed?: boolean
          reminder_date?: string
          trip_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_reminders_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_services: {
        Row: {
          attachments: Json
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
          attachments?: Json
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
          attachments?: Json
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
          access_password: string | null
          client_name: string
          created_at: string
          destination: string
          end_date: string
          id: string
          share_expires_at: string | null
          share_token: string | null
          short_code: string | null
          slug: string | null
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_password?: string | null
          client_name: string
          created_at?: string
          destination: string
          end_date: string
          id?: string
          share_expires_at?: string | null
          share_token?: string | null
          short_code?: string | null
          slug?: string | null
          start_date: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_password?: string | null
          client_name?: string
          created_at?: string
          destination?: string
          end_date?: string
          id?: string
          share_expires_at?: string | null
          share_token?: string | null
          short_code?: string | null
          slug?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievement_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_certificates: {
        Row: {
          agent_name: string
          certificate_number: string
          created_at: string
          id: string
          issued_at: string
          trail_id: string
          user_id: string
        }
        Insert: {
          agent_name: string
          certificate_number: string
          created_at?: string
          id?: string
          issued_at?: string
          trail_id: string
          user_id: string
        }
        Update: {
          agent_name?: string
          certificate_number?: string
          created_at?: string
          id?: string
          issued_at?: string
          trail_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_certificates_trail_id_fkey"
            columns: ["trail_id"]
            isOneToOne: false
            referencedRelation: "learning_trails"
            referencedColumns: ["id"]
          },
        ]
      }
      user_exam_attempts: {
        Row: {
          answers: Json
          created_at: string
          id: string
          passed: boolean
          score: number
          trail_id: string
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          id?: string
          passed?: boolean
          score?: number
          trail_id: string
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          passed?: boolean
          score?: number
          trail_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_exam_attempts_trail_id_fkey"
            columns: ["trail_id"]
            isOneToOne: false
            referencedRelation: "learning_trails"
            referencedColumns: ["id"]
          },
        ]
      }
      user_quiz_attempts: {
        Row: {
          answers: Json
          created_at: string
          id: string
          passed: boolean
          score: number
          training_id: string
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          id?: string
          passed?: boolean
          score?: number
          training_id: string
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          passed?: boolean
          score?: number
          training_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_quiz_attempts_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
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
      user_training_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          is_completed: boolean
          training_id: string
          updated_at: string
          user_id: string
          watched_minutes: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          training_id: string
          updated_at?: string
          user_id: string
          watched_minutes?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          training_id?: string
          updated_at?: string
          user_id?: string
          watched_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_training_progress_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_community: {
        Row: {
          benefits: string[] | null
          id: string
          invite_url: string
          is_active: boolean
          rules: string[] | null
          updated_at: string
        }
        Insert: {
          benefits?: string[] | null
          id?: string
          invite_url: string
          is_active?: boolean
          rules?: string[] | null
          updated_at?: string
        }
        Update: {
          benefits?: string[] | null
          id?: string
          invite_url?: string
          is_active?: boolean
          rules?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_use_feature: {
        Args: { _feature: string; _user_id: string }
        Returns: boolean
      }
      check_ai_usage: { Args: { _user_id: string }; Returns: boolean }
      generate_secure_share_token: { Args: never; Returns: string }
      generate_trip_short_code: { Args: never; Returns: string }
      generate_trip_slug: {
        Args: {
          p_client_name: string
          p_destination: string
          p_start_date: string
        }
        Returns: string
      }
      get_active_presentation: { Args: { _user_id: string }; Returns: string }
      get_gamification_ranking: {
        Args: { limit_count?: number }
        Returns: {
          agency_name: string
          avatar_url: string
          total_points: number
          user_id: string
          user_name: string
        }[]
      }
      get_monthly_sales_ranking: {
        Args: { target_month: number; target_year: number }
        Returns: {
          avatar_url: string
          sales_count: number
          total_revenue: number
          user_id: string
          user_name: string
        }[]
      }
      get_user_plan: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["subscription_plan"]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_feature_access: {
        Args: { _feature: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_voted_this_month: {
        Args: { _month: number; _user_id: string; _year: number }
        Returns: boolean
      }
      has_won_this_year: {
        Args: { _user_id: string; _year: number }
        Returns: boolean
      }
      resolve_trip_short_code: { Args: { p_code: string }; Returns: Json }
      unaccent: { Args: { "": string }; Returns: string }
      verify_trip_access: {
        Args: { p_password: string; p_token: string }
        Returns: Json
      }
      verify_trip_access_by_slug: {
        Args: { p_password: string; p_slug: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "agente" | "promotor"
      subscription_plan: "essencial" | "profissional" | "premium"
      workshop_category:
        | "contabilidade"
        | "tributaria"
        | "impostos"
        | "juridico"
        | "gestao"
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
      app_role: ["admin", "agente", "promotor"],
      subscription_plan: ["essencial", "profissional", "premium"],
      workshop_category: [
        "contabilidade",
        "tributaria",
        "impostos",
        "juridico",
        "gestao",
      ],
    },
  },
} as const
