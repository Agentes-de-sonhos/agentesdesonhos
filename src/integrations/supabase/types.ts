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
      academy_destinations: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      academy_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
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
      admin_action_logs: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string | null
          details: Json | null
          id: string
          target_user_id: string
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_user_id: string
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_user_id?: string
        }
        Relationships: []
      }
      admin_quick_access_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          is_active: boolean | null
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          is_active?: boolean | null
          token?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean | null
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_resource_access_logs: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          details: Json | null
          id: string
          resource_id: string
          resource_owner_id: string | null
          resource_type: string
          url_input: string | null
        }
        Insert: {
          action?: string
          admin_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
          resource_id: string
          resource_owner_id?: string | null
          resource_type: string
          url_input?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          resource_id?: string
          resource_owner_id?: string | null
          resource_type?: string
          url_input?: string | null
        }
        Relationships: []
      }
      advisor_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          item_id: string
          item_type: string
          review_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          review_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          review_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      advisor_suggestions: {
        Row: {
          advisor_type: string
          category: string | null
          city: string | null
          created_at: string
          destination: string
          extra_data: Json | null
          id: string
          name: string
          neighborhood: string | null
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          advisor_type: string
          category?: string | null
          city?: string | null
          created_at?: string
          destination: string
          extra_data?: Json | null
          id?: string
          name: string
          neighborhood?: string | null
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          advisor_type?: string
          category?: string | null
          city?: string | null
          created_at?: string
          destination?: string
          extra_data?: Json | null
          id?: string
          name?: string
          neighborhood?: string | null
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
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
          event_url: string | null
          id: string
          location_address: string | null
          location_city: string | null
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
          event_url?: string | null
          id?: string
          location_address?: string | null
          location_city?: string | null
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
          event_url?: string | null
          id?: string
          location_address?: string | null
          location_city?: string | null
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
      agency_showcases: {
        Row: {
          auto_categories: string[] | null
          auto_supplier_ids: string[] | null
          created_at: string
          disclaimer_text: string | null
          id: string
          is_active: boolean
          max_auto_items: number | null
          og_description: string | null
          og_title: string | null
          showcase_mode: string
          slug: string
          tagline: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_categories?: string[] | null
          auto_supplier_ids?: string[] | null
          created_at?: string
          disclaimer_text?: string | null
          id?: string
          is_active?: boolean
          max_auto_items?: number | null
          og_description?: string | null
          og_title?: string | null
          showcase_mode?: string
          slug: string
          tagline?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_categories?: string[] | null
          auto_supplier_ids?: string[] | null
          created_at?: string
          disclaimer_text?: string | null
          id?: string
          is_active?: boolean
          max_auto_items?: number | null
          og_description?: string | null
          og_title?: string | null
          showcase_mode?: string
          slug?: string
          tagline?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      air_blocks: {
        Row: {
          airline: string
          arrival_date: string | null
          arrival_time: string | null
          block_code: string | null
          created_at: string
          currency: string | null
          deadline: string | null
          departure_date: string
          departure_time: string | null
          destination: string
          id: string
          operator: string | null
          origin: string
          price: number | null
          price_text: string | null
          return_arrival_date: string | null
          return_arrival_time: string | null
          return_date: string | null
          return_departure_date: string | null
          return_departure_time: string | null
          return_time: string | null
          seats_available: number | null
        }
        Insert: {
          airline: string
          arrival_date?: string | null
          arrival_time?: string | null
          block_code?: string | null
          created_at?: string
          currency?: string | null
          deadline?: string | null
          departure_date: string
          departure_time?: string | null
          destination: string
          id?: string
          operator?: string | null
          origin: string
          price?: number | null
          price_text?: string | null
          return_arrival_date?: string | null
          return_arrival_time?: string | null
          return_date?: string | null
          return_departure_date?: string | null
          return_departure_time?: string | null
          return_time?: string | null
          seats_available?: number | null
        }
        Update: {
          airline?: string
          arrival_date?: string | null
          arrival_time?: string | null
          block_code?: string | null
          created_at?: string
          currency?: string | null
          deadline?: string | null
          departure_date?: string
          departure_time?: string | null
          destination?: string
          id?: string
          operator?: string | null
          origin?: string
          price?: number | null
          price_text?: string | null
          return_arrival_date?: string | null
          return_arrival_time?: string | null
          return_date?: string | null
          return_departure_date?: string | null
          return_departure_time?: string | null
          return_time?: string | null
          seats_available?: number | null
        }
        Relationships: []
      }
      attractions: {
        Row: {
          address: string | null
          average_visit_time: string | null
          category: string | null
          city: string
          country: string
          created_at: string
          destination: string
          expert_tip: string | null
          full_description: string | null
          gallery_urls: string[] | null
          google_maps_link: string | null
          id: string
          image_url: string | null
          is_active: boolean
          must_visit: boolean
          name: string
          neighborhood: string | null
          review_score: number | null
          short_description: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          average_visit_time?: string | null
          category?: string | null
          city: string
          country?: string
          created_at?: string
          destination: string
          expert_tip?: string | null
          full_description?: string | null
          gallery_urls?: string[] | null
          google_maps_link?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          must_visit?: boolean
          name: string
          neighborhood?: string | null
          review_score?: number | null
          short_description?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          average_visit_time?: string | null
          category?: string | null
          city?: string
          country?: string
          created_at?: string
          destination?: string
          expert_tip?: string | null
          full_description?: string | null
          gallery_urls?: string[] | null
          google_maps_link?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          must_visit?: boolean
          name?: string
          neighborhood?: string | null
          review_score?: number | null
          short_description?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      benefit_comments: {
        Row: {
          benefit_id: string
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          benefit_id: string
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          benefit_id?: string
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "benefit_comments_benefit_id_fkey"
            columns: ["benefit_id"]
            isOneToOne: false
            referencedRelation: "benefits"
            referencedColumns: ["id"]
          },
        ]
      }
      benefit_confirmations: {
        Row: {
          benefit_id: string
          confirmation_type: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          benefit_id: string
          confirmation_type?: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          benefit_id?: string
          confirmation_type?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "benefit_confirmations_benefit_id_fkey"
            columns: ["benefit_id"]
            isOneToOne: false
            referencedRelation: "benefits"
            referencedColumns: ["id"]
          },
        ]
      }
      benefits: {
        Row: {
          category: string
          company_logo_url: string | null
          company_name: string
          confirmations_count: number
          created_at: string
          destination: string | null
          full_description: string | null
          how_to_claim: string | null
          id: string
          is_active: boolean
          not_available_count: number
          official_link: string | null
          requirements: string | null
          short_description: string | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          company_logo_url?: string | null
          company_name: string
          confirmations_count?: number
          created_at?: string
          destination?: string | null
          full_description?: string | null
          how_to_claim?: string | null
          id?: string
          is_active?: boolean
          not_available_count?: number
          official_link?: string | null
          requirements?: string | null
          short_description?: string | null
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          company_logo_url?: string | null
          company_name?: string
          confirmations_count?: number
          created_at?: string
          destination?: string | null
          full_description?: string | null
          how_to_claim?: string | null
          id?: string
          is_active?: boolean
          not_available_count?: number
          official_link?: string | null
          requirements?: string | null
          short_description?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      booking_commissions: {
        Row: {
          booking_service_id: string
          commission_amount: number
          created_at: string
          expected_date: string | null
          id: string
          internal_notes: string | null
          invoice_issued_date: string | null
          invoice_number: string | null
          invoice_sent_date: string | null
          invoice_status: string | null
          payment_days: number
          payment_rule: string
          received_date: string | null
          requires_invoice: boolean
          status: string
          supplier_id: string | null
          user_id: string
        }
        Insert: {
          booking_service_id: string
          commission_amount?: number
          created_at?: string
          expected_date?: string | null
          id?: string
          internal_notes?: string | null
          invoice_issued_date?: string | null
          invoice_number?: string | null
          invoice_sent_date?: string | null
          invoice_status?: string | null
          payment_days?: number
          payment_rule?: string
          received_date?: string | null
          requires_invoice?: boolean
          status?: string
          supplier_id?: string | null
          user_id: string
        }
        Update: {
          booking_service_id?: string
          commission_amount?: number
          created_at?: string
          expected_date?: string | null
          id?: string
          internal_notes?: string | null
          invoice_issued_date?: string | null
          invoice_number?: string | null
          invoice_sent_date?: string | null
          invoice_status?: string | null
          payment_days?: number
          payment_rule?: string
          received_date?: string | null
          requires_invoice?: boolean
          status?: string
          supplier_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_commissions_booking_service_id_fkey"
            columns: ["booking_service_id"]
            isOneToOne: false
            referencedRelation: "booking_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_commissions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_documents: {
        Row: {
          booking_id: string
          created_at: string
          doc_type: string
          file_url: string | null
          id: string
          user_id: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          doc_type: string
          file_url?: string | null
          id?: string
          user_id: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          doc_type?: string
          file_url?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_documents_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_payments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          due_date: string | null
          id: string
          installment_number: number | null
          payment_date: string | null
          payment_method: string
          receipt_type: string
          status: string
          total_installments: number | null
          user_id: string
        }
        Insert: {
          amount?: number
          booking_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          installment_number?: number | null
          payment_date?: string | null
          payment_method: string
          receipt_type?: string
          status?: string
          total_installments?: number | null
          user_id: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          installment_number?: number | null
          payment_date?: string | null
          payment_method?: string
          receipt_type?: string
          status?: string
          total_installments?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_services: {
        Row: {
          booking_id: string
          commission_type: string
          commission_value: number
          cost_price: number
          created_at: string
          description: string | null
          du_type: string
          du_value: number
          expected_commission: number
          expected_commission_date: string | null
          id: string
          non_commissionable_taxes: number
          sale_price: number
          service_type: string
          status: string
          supplier_id: string | null
          user_id: string
        }
        Insert: {
          booking_id: string
          commission_type?: string
          commission_value?: number
          cost_price?: number
          created_at?: string
          description?: string | null
          du_type?: string
          du_value?: number
          expected_commission?: number
          expected_commission_date?: string | null
          id?: string
          non_commissionable_taxes?: number
          sale_price?: number
          service_type: string
          status?: string
          supplier_id?: string | null
          user_id: string
        }
        Update: {
          booking_id?: string
          commission_type?: string
          commission_value?: number
          cost_price?: number
          created_at?: string
          description?: string | null
          du_type?: string
          du_value?: number
          expected_commission?: number
          expected_commission_date?: string | null
          id?: string
          non_commissionable_taxes?: number
          sale_price?: number
          service_type?: string
          status?: string
          supplier_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_services_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_services_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          client_id: string | null
          created_at: string
          end_date: string | null
          id: string
          notes: string | null
          start_date: string | null
          status: string
          total_amount: number
          trip_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          start_date?: string | null
          status?: string
          total_amount?: number
          trip_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          start_date?: string | null
          status?: string
          total_amount?: number
          trip_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      business_card_stats: {
        Row: {
          card_id: string
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
        }
        Insert: {
          card_id: string
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
        }
        Update: {
          card_id?: string
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_card_stats_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "business_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      business_cards: {
        Row: {
          agency_name: string | null
          buttons: Json | null
          cover_url: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          label: string | null
          logos: Json | null
          name: string
          phone: string | null
          photo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          slug: string
          social_links: Json | null
          title: string | null
          updated_at: string | null
          user_id: string | null
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          agency_name?: string | null
          buttons?: Json | null
          cover_url?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          logos?: Json | null
          name?: string
          phone?: string | null
          photo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          slug: string
          social_links?: Json | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          agency_name?: string | null
          buttons?: Json | null
          cover_url?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          logos?: Json | null
          name?: string
          phone?: string | null
          photo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string
          social_links?: Json | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      card_activations: {
        Row: {
          activation_token: string
          created_at: string
          email: string
          expires_at: string
          id: string
          payment_status: string
          plan: string
          stripe_customer_id: string | null
          stripe_session_id: string
          stripe_subscription_id: string | null
          used: boolean
        }
        Insert: {
          activation_token: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          payment_status?: string
          plan?: string
          stripe_customer_id?: string | null
          stripe_session_id: string
          stripe_subscription_id?: string | null
          used?: boolean
        }
        Update: {
          activation_token?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          payment_status?: string
          plan?: string
          stripe_customer_id?: string | null
          stripe_session_id?: string
          stripe_subscription_id?: string | null
          used?: boolean
        }
        Relationships: []
      }
      client_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          order_index: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          order_index?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          order_index?: number
        }
        Relationships: []
      }
      client_subcategories: {
        Row: {
          category_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "client_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          birthday_day: number | null
          birthday_month: number | null
          birthday_year: number | null
          category_id: string | null
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
          subcategory_id: string | null
          travel_preferences: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          birthday_day?: number | null
          birthday_month?: number | null
          birthday_year?: number | null
          category_id?: string | null
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
          subcategory_id?: string | null
          travel_preferences?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          birthday_day?: number | null
          birthday_month?: number | null
          birthday_year?: number | null
          category_id?: string | null
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
          subcategory_id?: string | null
          travel_preferences?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "client_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "client_subcategories"
            referencedColumns: ["id"]
          },
        ]
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
      community_members: {
        Row: {
          bio: string | null
          cnpj: string | null
          created_at: string | null
          entry_method: string
          id: string
          segments: string[] | null
          specialties: string[] | null
          status: string
          updated_at: string | null
          user_id: string
          years_experience: number | null
        }
        Insert: {
          bio?: string | null
          cnpj?: string | null
          created_at?: string | null
          entry_method: string
          id?: string
          segments?: string[] | null
          specialties?: string[] | null
          status?: string
          updated_at?: string | null
          user_id: string
          years_experience?: number | null
        }
        Update: {
          bio?: string | null
          cnpj?: string | null
          created_at?: string | null
          entry_method?: string
          id?: string
          segments?: string[] | null
          specialties?: string[] | null
          status?: string
          updated_at?: string | null
          user_id?: string
          years_experience?: number | null
        }
        Relationships: []
      }
      community_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          room_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          room_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "community_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      community_post_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_post_likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          comments_count: number | null
          content: string
          created_at: string | null
          id: string
          is_pinned: boolean | null
          likes_count: number | null
          tags: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comments_count?: number | null
          content: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          likes_count?: number | null
          tags?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comments_count?: number | null
          content?: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          likes_count?: number | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      community_rooms: {
        Row: {
          created_at: string | null
          description: string | null
          emoji: string | null
          id: string
          is_active: boolean | null
          is_general: boolean | null
          name: string
          order_index: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          emoji?: string | null
          id?: string
          is_active?: boolean | null
          is_general?: boolean | null
          name: string
          order_index?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          emoji?: string | null
          id?: string
          is_active?: boolean | null
          is_general?: boolean | null
          name?: string
          order_index?: number | null
          updated_at?: string | null
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
      companhias_maritimas: {
        Row: {
          ativo: boolean
          categoria: string
          commercial_contacts: string | null
          created_at: string
          descricao_curta: string | null
          how_to_sell: string | null
          id: string
          logo_url: string | null
          nome: string
          sales_channels: string | null
          social_links: Json | null
          specialties: string | null
          subtipo: string | null
          tipo: string
          updated_at: string
          website: string | null
        }
        Insert: {
          ativo?: boolean
          categoria?: string
          commercial_contacts?: string | null
          created_at?: string
          descricao_curta?: string | null
          how_to_sell?: string | null
          id?: string
          logo_url?: string | null
          nome: string
          sales_channels?: string | null
          social_links?: Json | null
          specialties?: string | null
          subtipo?: string | null
          tipo?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          ativo?: boolean
          categoria?: string
          commercial_contacts?: string | null
          created_at?: string
          descricao_curta?: string | null
          how_to_sell?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          sales_channels?: string | null
          social_links?: Json | null
          specialties?: string | null
          subtipo?: string | null
          tipo?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      companhias_maritimas_perfis: {
        Row: {
          companhia_id: string
          id: string
          perfil_id: string
        }
        Insert: {
          companhia_id: string
          id?: string
          perfil_id: string
        }
        Update: {
          companhia_id?: string
          id?: string
          perfil_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "companhias_maritimas_perfis_companhia_id_fkey"
            columns: ["companhia_id"]
            isOneToOne: false
            referencedRelation: "companhias_maritimas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companhias_maritimas_perfis_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis_cliente"
            referencedColumns: ["id"]
          },
        ]
      }
      companhias_maritimas_regioes: {
        Row: {
          companhia_id: string
          id: string
          regiao_id: string
        }
        Insert: {
          companhia_id: string
          id?: string
          regiao_id: string
        }
        Update: {
          companhia_id?: string
          id?: string
          regiao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "companhias_maritimas_regioes_companhia_id_fkey"
            columns: ["companhia_id"]
            isOneToOne: false
            referencedRelation: "companhias_maritimas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companhias_maritimas_regioes_regiao_id_fkey"
            columns: ["regiao_id"]
            isOneToOne: false
            referencedRelation: "regioes"
            referencedColumns: ["id"]
          },
        ]
      }
      connections: {
        Row: {
          created_at: string
          id: string
          receiver_id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          receiver_id: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          receiver_id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_card_captures: {
        Row: {
          address: string | null
          capture_origin: string | null
          captured_at: string | null
          city: string | null
          company_name: string | null
          contact_type: string | null
          country: string | null
          created_at: string | null
          crm_contact_id: string | null
          email: string | null
          event_origin: string | null
          geographic_scope: string | null
          id: string
          is_existing_client: boolean | null
          job_title: string | null
          lead_temperature: string | null
          logo_url: string | null
          next_action: string | null
          notes: string | null
          person_name: string | null
          phone: string | null
          social_links: Json | null
          state: string | null
          supplier_category: string | null
          updated_at: string | null
          user_id: string
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          capture_origin?: string | null
          captured_at?: string | null
          city?: string | null
          company_name?: string | null
          contact_type?: string | null
          country?: string | null
          created_at?: string | null
          crm_contact_id?: string | null
          email?: string | null
          event_origin?: string | null
          geographic_scope?: string | null
          id?: string
          is_existing_client?: boolean | null
          job_title?: string | null
          lead_temperature?: string | null
          logo_url?: string | null
          next_action?: string | null
          notes?: string | null
          person_name?: string | null
          phone?: string | null
          social_links?: Json | null
          state?: string | null
          supplier_category?: string | null
          updated_at?: string | null
          user_id: string
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          capture_origin?: string | null
          captured_at?: string | null
          city?: string | null
          company_name?: string | null
          contact_type?: string | null
          country?: string | null
          created_at?: string | null
          crm_contact_id?: string | null
          email?: string | null
          event_origin?: string | null
          geographic_scope?: string | null
          id?: string
          is_existing_client?: boolean | null
          job_title?: string | null
          lead_temperature?: string | null
          logo_url?: string | null
          next_action?: string | null
          notes?: string | null
          person_name?: string | null
          phone?: string | null
          social_links?: Json | null
          state?: string | null
          supplier_category?: string | null
          updated_at?: string | null
          user_id?: string
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      crm_contacts: {
        Row: {
          category: string | null
          category_id: string | null
          created_at: string
          email: string
          empresa: string | null
          id: string
          nome: string
          origem: string | null
          status: string
          subcategory: string | null
          subcategory_id: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          category_id?: string | null
          created_at?: string
          email: string
          empresa?: string | null
          id?: string
          nome: string
          origem?: string | null
          status?: string
          subcategory?: string | null
          subcategory_id?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          category_id?: string | null
          created_at?: string
          email?: string
          empresa?: string | null
          id?: string
          nome?: string
          origem?: string | null
          status?: string
          subcategory?: string | null
          subcategory_id?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contacts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "client_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contacts_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "client_subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_email_logs: {
        Row: {
          assunto: string
          contact_id: string | null
          email: string
          id: string
          mensagem: string
          sent_at: string
          status: string
          template_id: string | null
        }
        Insert: {
          assunto: string
          contact_id?: string | null
          email: string
          id?: string
          mensagem: string
          sent_at?: string
          status?: string
          template_id?: string | null
        }
        Update: {
          assunto?: string
          contact_id?: string | null
          email?: string
          id?: string
          mensagem?: string
          sent_at?: string
          status?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_email_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_email_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "crm_email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_email_templates: {
        Row: {
          assunto: string
          created_at: string
          id: string
          mensagem: string
          nome_template: string
        }
        Insert: {
          assunto: string
          created_at?: string
          id?: string
          mensagem: string
          nome_template: string
        }
        Update: {
          assunto?: string
          created_at?: string
          id?: string
          mensagem?: string
          nome_template?: string
        }
        Relationships: []
      }
      cruise_review_moderation_log: {
        Row: {
          comment: string | null
          created_at: string
          cruise_id: string
          id: string
          moderated_by: string
          rating: number
          reaction: string | null
          reason: string | null
          review_id: string
          reviewer_user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          cruise_id: string
          id?: string
          moderated_by: string
          rating: number
          reaction?: string | null
          reason?: string | null
          review_id: string
          reviewer_user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          cruise_id?: string
          id?: string
          moderated_by?: string
          rating?: number
          reaction?: string | null
          reason?: string | null
          review_id?: string
          reviewer_user_id?: string
        }
        Relationships: []
      }
      cruise_reviews: {
        Row: {
          comment: string | null
          created_at: string
          cruise_id: string
          id: string
          rating: number
          reaction: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          cruise_id: string
          id?: string
          rating: number
          reaction?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          cruise_id?: string
          id?: string
          rating?: number
          reaction?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cruise_reviews_cruise_id_fkey"
            columns: ["cruise_id"]
            isOneToOne: false
            referencedRelation: "companhias_maritimas"
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
      daily_feature_usage: {
        Row: {
          created_at: string
          feature: string
          id: string
          usage_count: number
          usage_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feature: string
          id?: string
          usage_count?: number
          usage_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feature?: string
          id?: string
          usage_count?: number
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      dashboard_banners: {
        Row: {
          button_link: string | null
          button_text: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          order_index: number
          title: string
          updated_at: string
        }
        Insert: {
          button_link?: string | null
          button_text?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          order_index?: number
          title: string
          updated_at?: string
        }
        Update: {
          button_link?: string | null
          button_text?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          order_index?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      dining_places: {
        Row: {
          address: string | null
          city: string
          country: string
          created_at: string
          cuisine_type: string | null
          destination: string
          expert_tip: string | null
          full_description: string | null
          gallery_urls: string[] | null
          google_maps_link: string | null
          has_view: boolean
          id: string
          image_url: string | null
          is_active: boolean
          local_favorite: boolean
          michelin: boolean
          must_visit: boolean
          name: string
          neighborhood: string | null
          price_range: string | null
          review_score: number | null
          rooftop: boolean
          short_description: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city: string
          country?: string
          created_at?: string
          cuisine_type?: string | null
          destination: string
          expert_tip?: string | null
          full_description?: string | null
          gallery_urls?: string[] | null
          google_maps_link?: string | null
          has_view?: boolean
          id?: string
          image_url?: string | null
          is_active?: boolean
          local_favorite?: boolean
          michelin?: boolean
          must_visit?: boolean
          name: string
          neighborhood?: string | null
          price_range?: string | null
          review_score?: number | null
          rooftop?: boolean
          short_description?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string
          country?: string
          created_at?: string
          cuisine_type?: string | null
          destination?: string
          expert_tip?: string | null
          full_description?: string | null
          gallery_urls?: string[] | null
          google_maps_link?: string | null
          has_view?: boolean
          id?: string
          image_url?: string | null
          is_active?: boolean
          local_favorite?: boolean
          michelin?: boolean
          must_visit?: boolean
          name?: string
          neighborhood?: string | null
          price_range?: string | null
          review_score?: number | null
          rooftop?: boolean
          short_description?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      direct_conversations: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "direct_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      drive_import_config: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          last_sync_at: string | null
          root_folder_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          root_folder_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          root_folder_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      drive_import_logs: {
        Row: {
          category: string | null
          deleted_at: string | null
          drive_file_id: string
          drive_file_name: string
          drive_folder_name: string
          error_message: string | null
          expires_at: string
          id: string
          imported_at: string
          material_id: string | null
          status: string
          supplier_id: string | null
          supplier_name: string | null
        }
        Insert: {
          category?: string | null
          deleted_at?: string | null
          drive_file_id: string
          drive_file_name: string
          drive_folder_name: string
          error_message?: string | null
          expires_at?: string
          id?: string
          imported_at?: string
          material_id?: string | null
          status?: string
          supplier_id?: string | null
          supplier_name?: string | null
        }
        Update: {
          category?: string | null
          deleted_at?: string | null
          drive_file_id?: string
          drive_file_name?: string
          drive_folder_name?: string
          error_message?: string | null
          expires_at?: string
          id?: string
          imported_at?: string
          material_id?: string | null
          status?: string
          supplier_id?: string | null
          supplier_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drive_import_logs_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drive_import_logs_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "tour_operators"
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
          expense_type: string
          id: string
          is_recurring: boolean
          notes: string | null
          sale_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          description: string
          entry_date?: string
          expense_type?: string
          id?: string
          is_recurring?: boolean
          notes?: string | null
          sale_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string
          entry_date?: string
          expense_type?: string
          id?: string
          is_recurring?: boolean
          notes?: string | null
          sale_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_entries_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      experiences: {
        Row: {
          address: string | null
          average_duration: string | null
          average_price: number | null
          booking_url: string | null
          category: string | null
          city: string
          country: string
          created_at: string
          destination: string
          expert_tip: string | null
          full_description: string | null
          gallery_urls: string[] | null
          google_maps_link: string | null
          id: string
          image_url: string | null
          is_active: boolean
          must_visit: boolean
          name: string
          neighborhood: string | null
          review_score: number | null
          short_description: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          average_duration?: string | null
          average_price?: number | null
          booking_url?: string | null
          category?: string | null
          city: string
          country?: string
          created_at?: string
          destination: string
          expert_tip?: string | null
          full_description?: string | null
          gallery_urls?: string[] | null
          google_maps_link?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          must_visit?: boolean
          name: string
          neighborhood?: string | null
          review_score?: number | null
          short_description?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          average_duration?: string | null
          average_price?: number | null
          booking_url?: string | null
          category?: string | null
          city?: string
          country?: string
          created_at?: string
          destination?: string
          expert_tip?: string | null
          full_description?: string | null
          gallery_urls?: string[] | null
          google_maps_link?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          must_visit?: boolean
          name?: string
          neighborhood?: string | null
          review_score?: number | null
          short_description?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      feedback_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      financial_goals: {
        Row: {
          commission_margin: number
          created_at: string
          id: string
          month: number
          profit_goal: number
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          commission_margin?: number
          created_at?: string
          id?: string
          month: number
          profit_goal?: number
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          commission_margin?: number
          created_at?: string
          id?: string
          month?: number
          profit_goal?: number
          updated_at?: string
          user_id?: string
          year?: number
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
      flight_cache: {
        Row: {
          created_at: string
          flight_date: string | null
          flight_number: string
          id: string
          response_data: Json
        }
        Insert: {
          created_at?: string
          flight_date?: string | null
          flight_number: string
          id?: string
          response_data: Json
        }
        Update: {
          created_at?: string
          flight_date?: string | null
          flight_number?: string
          id?: string
          response_data?: Json
        }
        Relationships: []
      }
      flight_status_updates: {
        Row: {
          arrival_actual: string | null
          arrival_scheduled: string | null
          created_at: string
          delay_minutes: number | null
          departure_actual: string | null
          departure_scheduled: string | null
          flight_date: string
          flight_number: string
          gate: string | null
          id: string
          last_checked_at: string
          status: string
          status_label: string
          terminal: string | null
          trip_service_id: string
          updated_at: string
        }
        Insert: {
          arrival_actual?: string | null
          arrival_scheduled?: string | null
          created_at?: string
          delay_minutes?: number | null
          departure_actual?: string | null
          departure_scheduled?: string | null
          flight_date: string
          flight_number: string
          gate?: string | null
          id?: string
          last_checked_at?: string
          status?: string
          status_label?: string
          terminal?: string | null
          trip_service_id: string
          updated_at?: string
        }
        Update: {
          arrival_actual?: string | null
          arrival_scheduled?: string | null
          created_at?: string
          delay_minutes?: number | null
          departure_actual?: string | null
          departure_scheduled?: string | null
          flight_date?: string
          flight_number?: string
          gate?: string | null
          id?: string
          last_checked_at?: string
          status?: string
          status_label?: string
          terminal?: string | null
          trip_service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flight_status_updates_trip_service_id_fkey"
            columns: ["trip_service_id"]
            isOneToOne: false
            referencedRelation: "trip_services"
            referencedColumns: ["id"]
          },
        ]
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
      gamification_mission_completions: {
        Row: {
          completed_at: string | null
          id: string
          mission_key: string
          period_key: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          mission_key: string
          period_key: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          mission_key?: string
          period_key?: string
          user_id?: string
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
          forced_at: string | null
          has_button: boolean
          id: string
          image_url: string | null
          is_active: boolean
          is_forced: boolean
          start_date: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          button_link?: string | null
          button_text?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          forced_at?: string | null
          has_button?: boolean
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_forced?: boolean
          start_date?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          button_link?: string | null
          button_text?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          forced_at?: string | null
          has_button?: boolean
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_forced?: boolean
          start_date?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      google_calendar_sync: {
        Row: {
          agency_event_id: string | null
          created_at: string | null
          google_event_id: string
          id: string
          last_synced_at: string | null
          sync_direction: string | null
          user_id: string
        }
        Insert: {
          agency_event_id?: string | null
          created_at?: string | null
          google_event_id: string
          id?: string
          last_synced_at?: string | null
          sync_direction?: string | null
          user_id: string
        }
        Update: {
          agency_event_id?: string | null
          created_at?: string | null
          google_event_id?: string
          id?: string
          last_synced_at?: string | null
          sync_direction?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_calendar_sync_agency_event_id_fkey"
            columns: ["agency_event_id"]
            isOneToOne: false
            referencedRelation: "agency_events"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendar_tokens: {
        Row: {
          access_token: string
          calendar_id: string | null
          created_at: string | null
          id: string
          last_sync_at: string | null
          refresh_token: string
          sync_enabled: boolean | null
          sync_token: string | null
          token_expires_at: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          calendar_id?: string | null
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          refresh_token: string
          sync_enabled?: boolean | null
          sync_token?: string | null
          token_expires_at: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          calendar_id?: string | null
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          refresh_token?: string
          sync_enabled?: boolean | null
          sync_token?: string | null
          token_expires_at?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      google_drive_tokens: {
        Row: {
          access_token: string
          created_at: string
          google_email: string | null
          id: string
          refresh_token: string | null
          token_expires_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          google_email?: string | null
          id?: string
          refresh_token?: string | null
          token_expires_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          google_email?: string | null
          id?: string
          refresh_token?: string | null
          token_expires_at?: string
          updated_at?: string
          user_id?: string
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
      highlighted_events: {
        Row: {
          created_at: string
          event_id: string
          event_source: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          event_source?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          event_source?: string
          id?: string
          user_id?: string
        }
        Relationships: []
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
      hotel_rx_cache: {
        Row: {
          cache_key: string
          city: string
          country: string
          created_at: string
          hotel_name: string
          id: string
          place_id: string | null
          result: Json
          updated_at: string | null
        }
        Insert: {
          cache_key: string
          city: string
          country: string
          created_at?: string
          hotel_name: string
          id?: string
          place_id?: string | null
          result: Json
          updated_at?: string | null
        }
        Update: {
          cache_key?: string
          city?: string
          country?: string
          created_at?: string
          hotel_name?: string
          id?: string
          place_id?: string | null
          result?: Json
          updated_at?: string | null
        }
        Relationships: []
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
      impersonation_logs: {
        Row: {
          admin_id: string
          created_at: string
          ended_at: string | null
          id: string
          started_at: string
          target_user_id: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          started_at?: string
          target_user_id: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          started_at?: string
          target_user_id?: string
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
          expected_date: string | null
          id: string
          notes: string | null
          payment_method: string
          sale_id: string | null
          sale_product_id: string | null
          source: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          entry_date?: string
          expected_date?: string | null
          id?: string
          notes?: string | null
          payment_method?: string
          sale_id?: string | null
          sale_product_id?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          entry_date?: string
          expected_date?: string | null
          id?: string
          notes?: string | null
          payment_method?: string
          sale_id?: string | null
          sale_product_id?: string | null
          source?: string | null
          status?: string
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
          {
            foreignKeyName: "income_entries_sale_product_id_fkey"
            columns: ["sale_product_id"]
            isOneToOne: false
            referencedRelation: "sale_products"
            referencedColumns: ["id"]
          },
        ]
      }
      itineraries: {
        Row: {
          budget_level: string
          client_id: string | null
          created_at: string
          destination: string
          end_date: string
          id: string
          public_access_code: string | null
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
          client_id?: string | null
          created_at?: string
          destination: string
          end_date: string
          id?: string
          public_access_code?: string | null
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
          client_id?: string | null
          created_at?: string
          destination?: string
          end_date?: string
          id?: string
          public_access_code?: string | null
          share_expires_at?: string | null
          share_token?: string | null
          start_date?: string
          status?: string
          travelers_count?: number
          trip_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "itineraries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
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
      itinerary_period_images: {
        Row: {
          created_at: string
          day_date: string
          id: string
          image_url: string
          itinerary_id: string
          period: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_date: string
          id?: string
          image_url: string
          itinerary_id: string
          period: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_date?: string
          id?: string
          image_url?: string
          itinerary_id?: string
          period?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_period_images_itinerary_id_fkey"
            columns: ["itinerary_id"]
            isOneToOne: false
            referencedRelation: "itineraries"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_capture_forms: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          token: string
          updated_at: string | null
          user_id: string
          welcome_message: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          token?: string
          updated_at?: string | null
          user_id: string
          welcome_message?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          token?: string
          updated_at?: string | null
          user_id?: string
          welcome_message?: string | null
        }
        Relationships: []
      }
      lead_captures: {
        Row: {
          additional_info: string | null
          agent_user_id: string
          ai_suggestion: string | null
          budget: string | null
          created_at: string | null
          destination: string | null
          form_id: string
          id: string
          is_read: boolean | null
          lead_name: string
          lead_phone: string
          status: string | null
          travel_dates: string | null
          travelers_count: string | null
          whatsapp_message: string | null
        }
        Insert: {
          additional_info?: string | null
          agent_user_id: string
          ai_suggestion?: string | null
          budget?: string | null
          created_at?: string | null
          destination?: string | null
          form_id: string
          id?: string
          is_read?: boolean | null
          lead_name: string
          lead_phone: string
          status?: string | null
          travel_dates?: string | null
          travelers_count?: string | null
          whatsapp_message?: string | null
        }
        Update: {
          additional_info?: string | null
          agent_user_id?: string
          ai_suggestion?: string | null
          budget?: string | null
          created_at?: string | null
          destination?: string | null
          form_id?: string
          id?: string
          is_read?: boolean | null
          lead_name?: string
          lead_phone?: string
          status?: string | null
          travel_dates?: string | null
          travelers_count?: string | null
          whatsapp_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_captures_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "lead_capture_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_trails: {
        Row: {
          banner_url: string | null
          certificate_available: boolean
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
          banner_url?: string | null
          certificate_available?: boolean
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
          banner_url?: string | null
          certificate_available?: boolean
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
      marketplace_comments: {
        Row: {
          content: string
          course_id: string
          created_at: string
          id: string
          lesson_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          course_id: string
          created_at?: string
          id?: string
          lesson_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          course_id?: string
          created_at?: string
          id?: string
          lesson_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_comments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "marketplace_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_comments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "marketplace_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_courses: {
        Row: {
          category: string
          cover_image_url: string | null
          created_at: string
          creator_id: string
          description: string | null
          enrolled_count: number
          id: string
          is_active: boolean
          level: string
          price: number
          product_type: string
          rejection_reason: string | null
          status: string
          title: string
          total_duration_minutes: number
          total_lessons: number
          updated_at: string
        }
        Insert: {
          category?: string
          cover_image_url?: string | null
          created_at?: string
          creator_id: string
          description?: string | null
          enrolled_count?: number
          id?: string
          is_active?: boolean
          level?: string
          price?: number
          product_type?: string
          rejection_reason?: string | null
          status?: string
          title: string
          total_duration_minutes?: number
          total_lessons?: number
          updated_at?: string
        }
        Update: {
          category?: string
          cover_image_url?: string | null
          created_at?: string
          creator_id?: string
          description?: string | null
          enrolled_count?: number
          id?: string
          is_active?: boolean
          level?: string
          price?: number
          product_type?: string
          rejection_reason?: string | null
          status?: string
          title?: string
          total_duration_minutes?: number
          total_lessons?: number
          updated_at?: string
        }
        Relationships: []
      }
      marketplace_enrollments: {
        Row: {
          amount_paid: number
          course_id: string
          enrolled_at: string
          id: string
          stripe_session_id: string | null
          user_id: string
        }
        Insert: {
          amount_paid?: number
          course_id: string
          enrolled_at?: string
          id?: string
          stripe_session_id?: string | null
          user_id: string
        }
        Update: {
          amount_paid?: number
          course_id?: string
          enrolled_at?: string
          id?: string
          stripe_session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "marketplace_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_lesson_progress: {
        Row: {
          completed_at: string
          enrollment_id: string
          id: string
          lesson_id: string
        }
        Insert: {
          completed_at?: string
          enrollment_id: string
          id?: string
          lesson_id: string
        }
        Update: {
          completed_at?: string
          enrollment_id?: string
          id?: string
          lesson_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_lesson_progress_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "marketplace_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "marketplace_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_lessons: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_preview: boolean
          material_name: string | null
          material_url: string | null
          module_id: string
          order_index: number
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_preview?: boolean
          material_name?: string | null
          material_url?: string | null
          module_id: string
          order_index?: number
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_preview?: boolean
          material_name?: string | null
          material_url?: string | null
          module_id?: string
          order_index?: number
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "marketplace_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_meetings: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          meeting_date: string
          meeting_url: string | null
          recording_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          meeting_date: string
          meeting_url?: string | null
          recording_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          meeting_date?: string
          meeting_url?: string | null
          recording_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_meetings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "marketplace_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_modules: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          order_index: number
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "marketplace_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          batch_id: string | null
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
          batch_id?: string | null
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
          batch_id?: string | null
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
            referencedRelation: "tour_operators"
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
      media_files: {
        Row: {
          created_at: string
          file_type: string
          folder_id: string | null
          id: string
          mime_type: string
          name: string
          original_name: string
          size_bytes: number
          storage_path: string
          updated_at: string
          uploaded_by: string | null
          url: string
        }
        Insert: {
          created_at?: string
          file_type: string
          folder_id?: string | null
          id?: string
          mime_type: string
          name: string
          original_name: string
          size_bytes?: number
          storage_path: string
          updated_at?: string
          uploaded_by?: string | null
          url: string
        }
        Update: {
          created_at?: string
          file_type?: string
          folder_id?: string | null
          id?: string
          mime_type?: string
          name?: string
          original_name?: string
          size_bytes?: number
          storage_path?: string
          updated_at?: string
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_files_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "media_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      media_folders: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "media_folders"
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
      menu_order: {
        Row: {
          created_at: string
          id: string
          item_key: string
          order_index: number
          section: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_key: string
          order_index?: number
          section?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_key?: string
          order_index?: number
          section?: string
          updated_at?: string
        }
        Relationships: []
      }
      monthly_payments: {
        Row: {
          created_at: string
          id: string
          is_paid: boolean
          marked_by: string | null
          month: number
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_paid?: boolean
          marked_by?: string | null
          month: number
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          is_paid?: boolean
          marked_by?: string | null
          month?: number
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      monthly_phrases: {
        Row: {
          created_at: string
          id: string
          month: number
          phrase: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          month: number
          phrase: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          month?: number
          phrase?: string
          updated_at?: string
        }
        Relationships: []
      }
      monthly_popup_views: {
        Row: {
          id: string
          user_id: string
          viewed_at: string
          viewed_month: number
          viewed_year: number
        }
        Insert: {
          id?: string
          user_id: string
          viewed_at?: string
          viewed_month: number
          viewed_year: number
        }
        Update: {
          id?: string
          user_id?: string
          viewed_at?: string
          viewed_month?: number
          viewed_year?: number
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
      news_curation_feedback: {
        Row: {
          categoria: string | null
          created_at: string
          created_by: string | null
          decisao: string
          fonte: string | null
          id: string
          motivo: string | null
          noticia_id: string | null
          resumo: string | null
          score_final: number | null
          score_ia: number | null
          titulo: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          decisao: string
          fonte?: string | null
          id?: string
          motivo?: string | null
          noticia_id?: string | null
          resumo?: string | null
          score_final?: number | null
          score_ia?: number | null
          titulo: string
        }
        Update: {
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          decisao?: string
          fonte?: string | null
          id?: string
          motivo?: string | null
          noticia_id?: string | null
          resumo?: string | null
          score_final?: number | null
          score_ia?: number | null
          titulo?: string
        }
        Relationships: []
      }
      news_likes: {
        Row: {
          created_at: string
          id: string
          noticia_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          noticia_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          noticia_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_likes_noticia_id_fkey"
            columns: ["noticia_id"]
            isOneToOne: false
            referencedRelation: "noticias_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          client_id: string | null
          content: string | null
          created_at: string
          event_id: string | null
          id: string
          is_favorite: boolean | null
          is_template: boolean
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
          is_template?: boolean
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
          is_template?: boolean
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
          aderencia_perfil: string | null
          alerta_trade: boolean
          aprovado_em: string | null
          aprovado_por: string | null
          categoria: string
          created_at: string
          data_publicacao: string
          fonte: string
          id: string
          is_noticia_do_dia: boolean
          nivel_alerta: string
          noticia_bruta_id: string | null
          relevancia_score: number
          resumo: string
          score_explicacao: string | null
          score_perfil: number | null
          status: string
          tipo_exibicao: string
          titulo_curto: string
          top5_position: number | null
          updated_at: string
          url_original: string
        }
        Insert: {
          aderencia_perfil?: string | null
          alerta_trade?: boolean
          aprovado_em?: string | null
          aprovado_por?: string | null
          categoria: string
          created_at?: string
          data_publicacao?: string
          fonte: string
          id?: string
          is_noticia_do_dia?: boolean
          nivel_alerta?: string
          noticia_bruta_id?: string | null
          relevancia_score?: number
          resumo: string
          score_explicacao?: string | null
          score_perfil?: number | null
          status?: string
          tipo_exibicao?: string
          titulo_curto: string
          top5_position?: number | null
          updated_at?: string
          url_original: string
        }
        Update: {
          aderencia_perfil?: string | null
          alerta_trade?: boolean
          aprovado_em?: string | null
          aprovado_por?: string | null
          categoria?: string
          created_at?: string
          data_publicacao?: string
          fonte?: string
          id?: string
          is_noticia_do_dia?: boolean
          nivel_alerta?: string
          noticia_bruta_id?: string | null
          relevancia_score?: number
          resumo?: string
          score_explicacao?: string | null
          score_perfil?: number | null
          status?: string
          tipo_exibicao?: string
          titulo_curto?: string
          top5_position?: number | null
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
      operator_review_moderation_log: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          moderated_by: string
          operator_id: string
          rating: number
          reaction: string | null
          reason: string | null
          review_id: string
          reviewer_user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          moderated_by: string
          operator_id: string
          rating: number
          reaction?: string | null
          reason?: string | null
          review_id: string
          reviewer_user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          moderated_by?: string
          operator_id?: string
          rating?: number
          reaction?: string | null
          reason?: string | null
          review_id?: string
          reviewer_user_id?: string
        }
        Relationships: []
      }
      operator_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          operator_id: string
          rating: number
          reaction: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          operator_id: string
          rating: number
          reaction?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          operator_id?: string
          rating?: number
          reaction?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operator_reviews_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "tour_operators"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          adults_count: number
          children_count: number
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
          adults_count?: number
          children_count?: number
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
          adults_count?: number
          children_count?: number
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
      opportunity_label_assignments: {
        Row: {
          created_at: string
          id: string
          label_id: string
          opportunity_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label_id: string
          opportunity_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label_id?: string
          opportunity_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_label_assignments_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "opportunity_labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_label_assignments_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_labels: {
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
      opportunity_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          opportunity_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          opportunity_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          opportunity_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_notes_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      page_banners: {
        Row: {
          banner_url: string | null
          created_at: string
          id: string
          page_key: string
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          created_at?: string
          id?: string
          page_key: string
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          created_at?: string
          id?: string
          page_key?: string
          updated_at?: string
        }
        Relationships: []
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
      perfis_cliente: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          ordem_exibicao: number
          slug: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          ordem_exibicao?: number
          slug: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          ordem_exibicao?: number
          slug?: string
        }
        Relationships: []
      }
      place_cache: {
        Row: {
          address: string | null
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          photo_url: string | null
          photo_urls: string[] | null
          place_id: string
          place_type: string | null
          raw_data: Json | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          photo_url?: string | null
          photo_urls?: string[] | null
          place_id: string
          place_type?: string | null
          raw_data?: Json | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          photo_url?: string | null
          photo_urls?: string[] | null
          place_id?: string
          place_type?: string | null
          raw_data?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      platform_updates: {
        Row: {
          created_at: string
          description: string
          id: string
          release_date: string
          title: string
          version: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          release_date?: string
          title: string
          version: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          release_date?: string
          title?: string
          version?: string
        }
        Relationships: []
      }
      playbook_destinations: {
        Row: {
          banner_url: string | null
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
          banner_url?: string | null
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
          banner_url?: string | null
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
          bio: string | null
          city: string | null
          cnpj: string | null
          cover_image_url: string | null
          cpf: string | null
          created_at: string
          has_password: boolean | null
          help_offer: string | null
          id: string
          name: string
          neighborhood: string | null
          niche: string | null
          niches: string[] | null
          partnership_interests: string[] | null
          phone: string | null
          services: string[] | null
          specialties: string[] | null
          state: string | null
          street: string | null
          updated_at: string
          user_id: string
          years_in_business: number | null
          zip_code: string | null
        }
        Insert: {
          address_number?: string | null
          agency_logo_url?: string | null
          agency_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          cnpj?: string | null
          cover_image_url?: string | null
          cpf?: string | null
          created_at?: string
          has_password?: boolean | null
          help_offer?: string | null
          id?: string
          name: string
          neighborhood?: string | null
          niche?: string | null
          niches?: string[] | null
          partnership_interests?: string[] | null
          phone?: string | null
          services?: string[] | null
          specialties?: string[] | null
          state?: string | null
          street?: string | null
          updated_at?: string
          user_id: string
          years_in_business?: number | null
          zip_code?: string | null
        }
        Update: {
          address_number?: string | null
          agency_logo_url?: string | null
          agency_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          cnpj?: string | null
          cover_image_url?: string | null
          cpf?: string | null
          created_at?: string
          has_password?: boolean | null
          help_offer?: string | null
          id?: string
          name?: string
          neighborhood?: string | null
          niche?: string | null
          niches?: string[] | null
          partnership_interests?: string[] | null
          phone?: string | null
          services?: string[] | null
          specialties?: string[] | null
          state?: string | null
          street?: string | null
          updated_at?: string
          user_id?: string
          years_in_business?: number | null
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
      qa_answer_likes: {
        Row: {
          answer_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          answer_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          answer_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qa_answer_likes_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "qa_answers"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_answer_votes: {
        Row: {
          answer_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          answer_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          answer_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qa_answer_votes_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "qa_answers"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_answers: {
        Row: {
          content: string
          created_at: string
          id: string
          is_best_answer: boolean
          question_id: string
          updated_at: string
          useful_count: number
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_best_answer?: boolean
          question_id: string
          updated_at?: string
          useful_count?: number
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_best_answer?: boolean
          question_id?: string
          updated_at?: string
          useful_count?: number
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
      quote_documents: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          is_public: boolean
          quote_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_public?: boolean
          quote_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_public?: boolean
          quote_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_documents_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_services: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          discount_type: string | null
          discount_value: number | null
          entry_value: number | null
          id: string
          image_url: string | null
          image_urls: string[] | null
          installments: number | null
          is_custom_payment: boolean
          option_label: string | null
          order_index: number
          payment_method: string | null
          payment_type: string | null
          quote_id: string
          service_data: Json
          service_type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          entry_value?: number | null
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          installments?: number | null
          is_custom_payment?: boolean
          option_label?: string | null
          order_index?: number
          payment_method?: string | null
          payment_type?: string | null
          quote_id: string
          service_data?: Json
          service_type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          entry_value?: number | null
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          installments?: number | null
          is_custom_payment?: boolean
          option_label?: string | null
          order_index?: number
          payment_method?: string | null
          payment_type?: string | null
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
          client_id: string | null
          client_name: string
          created_at: string
          currency: string
          currency_mode: string
          destination: string
          destination_intro_images: string[] | null
          destination_intro_text: string | null
          end_date: string
          entry_percentage: number | null
          exchange_rate: number | null
          full_payment_discount_percent: number | null
          id: string
          installments_count: number | null
          opportunity_id: string | null
          payment_display_mode: string
          payment_method_label: string | null
          payment_terms: string | null
          public_access_code: string | null
          share_expires_at: string | null
          share_token: string | null
          show_destination_intro: boolean
          show_detailed_prices: boolean
          show_investment_section: boolean
          start_date: string
          status: string
          total_amount: number
          trip_title: string | null
          updated_at: string
          use_service_payment: boolean
          user_id: string
          valid_until: string | null
          validity_disclaimer: string
        }
        Insert: {
          adults_count?: number
          children_count?: number
          client_id?: string | null
          client_name: string
          created_at?: string
          currency?: string
          currency_mode?: string
          destination: string
          destination_intro_images?: string[] | null
          destination_intro_text?: string | null
          end_date: string
          entry_percentage?: number | null
          exchange_rate?: number | null
          full_payment_discount_percent?: number | null
          id?: string
          installments_count?: number | null
          opportunity_id?: string | null
          payment_display_mode?: string
          payment_method_label?: string | null
          payment_terms?: string | null
          public_access_code?: string | null
          share_expires_at?: string | null
          share_token?: string | null
          show_destination_intro?: boolean
          show_detailed_prices?: boolean
          show_investment_section?: boolean
          start_date: string
          status?: string
          total_amount?: number
          trip_title?: string | null
          updated_at?: string
          use_service_payment?: boolean
          user_id: string
          valid_until?: string | null
          validity_disclaimer?: string
        }
        Update: {
          adults_count?: number
          children_count?: number
          client_id?: string | null
          client_name?: string
          created_at?: string
          currency?: string
          currency_mode?: string
          destination?: string
          destination_intro_images?: string[] | null
          destination_intro_text?: string | null
          end_date?: string
          entry_percentage?: number | null
          exchange_rate?: number | null
          full_payment_discount_percent?: number | null
          id?: string
          installments_count?: number | null
          opportunity_id?: string | null
          payment_display_mode?: string
          payment_method_label?: string | null
          payment_terms?: string | null
          public_access_code?: string | null
          share_expires_at?: string | null
          share_token?: string | null
          show_destination_intro?: boolean
          show_detailed_prices?: boolean
          show_investment_section?: boolean
          start_date?: string
          status?: string
          total_amount?: number
          trip_title?: string | null
          updated_at?: string
          use_service_payment?: boolean
          user_id?: string
          valid_until?: string | null
          validity_disclaimer?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      regioes: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          ordem_exibicao: number
          slug: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          ordem_exibicao?: number
          slug: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          ordem_exibicao?: number
          slug?: string
        }
        Relationships: []
      }
      registration_links: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          max_uses: number
          notes: string | null
          plan: string
          role: string
          token: string
          updated_at: string
          uses_count: number
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          max_uses?: number
          notes?: string | null
          plan?: string
          role?: string
          token?: string
          updated_at?: string
          uses_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          max_uses?: number
          notes?: string | null
          plan?: string
          role?: string
          token?: string
          updated_at?: string
          uses_count?: number
        }
        Relationships: []
      }
      sale_products: {
        Row: {
          commission_status: string
          commission_type: string
          commission_value: number
          cost_price: number
          created_at: string
          description: string | null
          expected_date: string | null
          id: string
          internal_notes: string | null
          invoice_issued_date: string | null
          invoice_number: string | null
          invoice_sent_date: string | null
          invoice_status: string | null
          non_commissionable_taxes: number | null
          payment_days: number | null
          payment_rule: string | null
          product_type: string
          received_date: string | null
          requires_invoice: boolean | null
          sale_id: string
          sale_price: number
          supplier_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          commission_status?: string
          commission_type?: string
          commission_value?: number
          cost_price?: number
          created_at?: string
          description?: string | null
          expected_date?: string | null
          id?: string
          internal_notes?: string | null
          invoice_issued_date?: string | null
          invoice_number?: string | null
          invoice_sent_date?: string | null
          invoice_status?: string | null
          non_commissionable_taxes?: number | null
          payment_days?: number | null
          payment_rule?: string | null
          product_type: string
          received_date?: string | null
          requires_invoice?: boolean | null
          sale_id: string
          sale_price?: number
          supplier_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          commission_status?: string
          commission_type?: string
          commission_value?: number
          cost_price?: number
          created_at?: string
          description?: string | null
          expected_date?: string | null
          id?: string
          internal_notes?: string | null
          invoice_issued_date?: string | null
          invoice_number?: string | null
          invoice_sent_date?: string | null
          invoice_status?: string | null
          non_commissionable_taxes?: number | null
          payment_days?: number | null
          payment_rule?: string | null
          product_type?: string
          received_date?: string | null
          requires_invoice?: boolean | null
          sale_id?: string
          sale_price?: number
          supplier_name?: string | null
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
          commission: number | null
          created_at: string
          destination: string
          end_date: string | null
          id: string
          include_in_billing: boolean | null
          notes: string | null
          opportunity_id: string | null
          origin: string | null
          payment_method: string | null
          sale_amount: number
          sale_date: string
          seller_commission_percent: number | null
          seller_id: string | null
          start_date: string | null
          trip_status: string | null
          trip_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          client_name: string
          commission?: number | null
          created_at?: string
          destination: string
          end_date?: string | null
          id?: string
          include_in_billing?: boolean | null
          notes?: string | null
          opportunity_id?: string | null
          origin?: string | null
          payment_method?: string | null
          sale_amount?: number
          sale_date?: string
          seller_commission_percent?: number | null
          seller_id?: string | null
          start_date?: string | null
          trip_status?: string | null
          trip_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          client_name?: string
          commission?: number | null
          created_at?: string
          destination?: string
          end_date?: string | null
          id?: string
          include_in_billing?: boolean | null
          notes?: string | null
          opportunity_id?: string | null
          origin?: string | null
          payment_method?: string | null
          sale_amount?: number
          sale_date?: string
          seller_commission_percent?: number | null
          seller_id?: string | null
          start_date?: string | null
          trip_status?: string | null
          trip_type?: string | null
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
          {
            foreignKeyName: "sales_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
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
      sales_landing_leads: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          landing_id: string
          lead_name: string
          lead_phone: string
          opportunity_id: string | null
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          landing_id: string
          lead_name: string
          lead_phone: string
          opportunity_id?: string | null
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          landing_id?: string
          lead_name?: string
          lead_phone?: string
          opportunity_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_landing_leads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_landing_leads_landing_id_fkey"
            columns: ["landing_id"]
            isOneToOne: false
            referencedRelation: "sales_landings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_landing_leads_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_landing_views: {
        Row: {
          created_at: string
          id: string
          landing_id: string
          session_hash: string
          viewed_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          landing_id: string
          session_hash: string
          viewed_date?: string
        }
        Update: {
          created_at?: string
          id?: string
          landing_id?: string
          session_hash?: string
          viewed_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_landing_views_landing_id_fkey"
            columns: ["landing_id"]
            isOneToOne: false
            referencedRelation: "sales_landings"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_landings: {
        Row: {
          agent_name: string | null
          agent_whatsapp: string
          created_at: string
          cta_text: string
          description: string | null
          headline: string
          id: string
          image_url: string | null
          is_active: boolean
          leads_count: number
          primary_color: string
          slug: string
          subheadline: string | null
          updated_at: string
          user_id: string
          views_count: number
        }
        Insert: {
          agent_name?: string | null
          agent_whatsapp: string
          created_at?: string
          cta_text?: string
          description?: string | null
          headline: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          leads_count?: number
          primary_color?: string
          slug: string
          subheadline?: string | null
          updated_at?: string
          user_id: string
          views_count?: number
        }
        Update: {
          agent_name?: string | null
          agent_whatsapp?: string
          created_at?: string
          cta_text?: string
          description?: string | null
          headline?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          leads_count?: number
          primary_color?: string
          slug?: string
          subheadline?: string | null
          updated_at?: string
          user_id?: string
          views_count?: number
        }
        Relationships: []
      }
      sellers: {
        Row: {
          created_at: string
          default_commission_percent: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_commission_percent?: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_commission_percent?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shopping_places: {
        Row: {
          address: string | null
          city: string
          country: string
          created_at: string
          destination: string
          expert_tip: string | null
          full_description: string | null
          gallery_urls: string[] | null
          google_maps_link: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_outlet: boolean
          must_visit: boolean
          name: string
          neighborhood: string | null
          price_range: string | null
          review_score: number | null
          shopping_type: string | null
          short_description: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city: string
          country?: string
          created_at?: string
          destination: string
          expert_tip?: string | null
          full_description?: string | null
          gallery_urls?: string[] | null
          google_maps_link?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_outlet?: boolean
          must_visit?: boolean
          name: string
          neighborhood?: string | null
          price_range?: string | null
          review_score?: number | null
          shopping_type?: string | null
          short_description?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string
          country?: string
          created_at?: string
          destination?: string
          expert_tip?: string | null
          full_description?: string | null
          gallery_urls?: string[] | null
          google_maps_link?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_outlet?: boolean
          must_visit?: boolean
          name?: string
          neighborhood?: string | null
          price_range?: string | null
          review_score?: number | null
          shopping_type?: string | null
          short_description?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      showcase_auto_overrides: {
        Row: {
          created_at: string
          custom_order: number | null
          id: string
          is_hidden: boolean
          material_key: string
          showcase_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_order?: number | null
          id?: string
          is_hidden?: boolean
          material_key: string
          showcase_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_order?: number | null
          id?: string
          is_hidden?: boolean
          material_key?: string
          showcase_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "showcase_auto_overrides_showcase_id_fkey"
            columns: ["showcase_id"]
            isOneToOne: false
            referencedRelation: "agency_showcases"
            referencedColumns: ["id"]
          },
        ]
      }
      showcase_items: {
        Row: {
          action_type: string
          action_url: string | null
          category: string
          created_at: string
          expires_at: string | null
          featured_label: string | null
          featured_order: number
          gallery_urls: string[] | null
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          material_id: string | null
          order_index: number
          showcase_id: string
          subcategory: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          action_type?: string
          action_url?: string | null
          category?: string
          created_at?: string
          expires_at?: string | null
          featured_label?: string | null
          featured_order?: number
          gallery_urls?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          material_id?: string | null
          order_index?: number
          showcase_id: string
          subcategory?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          action_type?: string
          action_url?: string | null
          category?: string
          created_at?: string
          expires_at?: string | null
          featured_label?: string | null
          featured_order?: number
          gallery_urls?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          material_id?: string | null
          order_index?: number
          showcase_id?: string
          subcategory?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "showcase_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "showcase_items_showcase_id_fkey"
            columns: ["showcase_id"]
            isOneToOne: false
            referencedRelation: "agency_showcases"
            referencedColumns: ["id"]
          },
        ]
      }
      showcase_stats: {
        Row: {
          created_at: string
          event_type: string
          id: string
          item_id: string | null
          showcase_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          item_id?: string | null
          showcase_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          item_id?: string | null
          showcase_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "showcase_stats_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "showcase_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "showcase_stats_showcase_id_fkey"
            columns: ["showcase_id"]
            isOneToOne: false
            referencedRelation: "agency_showcases"
            referencedColumns: ["id"]
          },
        ]
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
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
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
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
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
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
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
      supplier_likes: {
        Row: {
          created_at: string
          id: string
          supplier_id: string
          supplier_source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          supplier_id: string
          supplier_source?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          supplier_id?: string
          supplier_source?: string
          user_id?: string
        }
        Relationships: []
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
      supplier_review_moderation_log: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          moderated_by: string
          rating: number
          reaction: string | null
          reason: string | null
          review_id: string
          reviewer_user_id: string
          supplier_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          moderated_by: string
          rating: number
          reaction?: string | null
          reason?: string | null
          review_id: string
          reviewer_user_id: string
          supplier_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          moderated_by?: string
          rating?: number
          reaction?: string | null
          reason?: string | null
          review_id?: string
          reviewer_user_id?: string
          supplier_id?: string
        }
        Relationships: []
      }
      supplier_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number
          reaction: string | null
          supplier_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          reaction?: string | null
          supplier_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          reaction?: string | null
          supplier_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_reviews_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "trade_suppliers"
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
      support_tickets: {
        Row: {
          category: string
          created_at: string
          id: string
          last_message_at: string
          status: string
          subject: string
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          last_message_at?: string
          status?: string
          subject: string
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          last_message_at?: string
          status?: string
          subject?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      survey_questions: {
        Row: {
          audio_url: string | null
          created_at: string
          id: string
          options: Json
          order_index: number
          question_text: string | null
          question_type: string
          survey_id: string
          updated_at: string
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          id?: string
          options?: Json
          order_index?: number
          question_text?: string | null
          question_type?: string
          survey_id: string
          updated_at?: string
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          id?: string
          options?: Json
          order_index?: number
          question_text?: string | null
          question_type?: string
          survey_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          answers: Json
          completed_at: string | null
          contact_info: string | null
          contact_name: string | null
          created_at: string
          id: string
          session_id: string
          survey_id: string
        }
        Insert: {
          answers?: Json
          completed_at?: string | null
          contact_info?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          session_id: string
          survey_id: string
        }
        Update: {
          answers?: Json
          completed_at?: string | null
          contact_info?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          session_id?: string
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          avatar_url: string | null
          created_at: string
          description: string | null
          empathy_after_question: number | null
          empathy_message: string | null
          final_message: string | null
          gift_file_name: string | null
          gift_message: string | null
          gift_type: string | null
          gift_url: string | null
          id: string
          is_active: boolean
          sender_name: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          empathy_after_question?: number | null
          empathy_message?: string | null
          final_message?: string | null
          gift_file_name?: string | null
          gift_message?: string | null
          gift_type?: string | null
          gift_url?: string | null
          id?: string
          is_active?: boolean
          sender_name?: string
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          empathy_after_question?: number | null
          empathy_message?: string | null
          final_message?: string | null
          gift_file_name?: string | null
          gift_message?: string | null
          gift_type?: string | null
          gift_url?: string | null
          id?: string
          is_active?: boolean
          sender_name?: string
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          attachment_urls: string[] | null
          content: string
          created_at: string
          id: string
          is_admin: boolean
          read_at: string | null
          sender_id: string
          ticket_id: string
        }
        Insert: {
          attachment_urls?: string[] | null
          content: string
          created_at?: string
          id?: string
          is_admin?: boolean
          read_at?: string | null
          sender_id: string
          ticket_id: string
        }
        Update: {
          attachment_urls?: string[] | null
          content?: string
          created_at?: string
          id?: string
          is_admin?: boolean
          read_at?: string | null
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_guides: {
        Row: {
          bio: string | null
          certifications: string[] | null
          city: string | null
          country: string | null
          created_at: string
          differentials: string | null
          email: string | null
          full_name: string
          gallery_urls: string[] | null
          id: string
          instagram: string | null
          is_featured: boolean | null
          is_verified: boolean
          languages: Json | null
          max_gallery_photos: number | null
          photo_url: string | null
          plan_type: string
          professional_name: string | null
          regions: string[] | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          search_priority: number | null
          services: string[] | null
          specialties: string[] | null
          status: string
          updated_at: string
          user_id: string | null
          video_url: string | null
          website: string | null
          whatsapp: string
        }
        Insert: {
          bio?: string | null
          certifications?: string[] | null
          city?: string | null
          country?: string | null
          created_at?: string
          differentials?: string | null
          email?: string | null
          full_name: string
          gallery_urls?: string[] | null
          id?: string
          instagram?: string | null
          is_featured?: boolean | null
          is_verified?: boolean
          languages?: Json | null
          max_gallery_photos?: number | null
          photo_url?: string | null
          plan_type?: string
          professional_name?: string | null
          regions?: string[] | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          search_priority?: number | null
          services?: string[] | null
          specialties?: string[] | null
          status?: string
          updated_at?: string
          user_id?: string | null
          video_url?: string | null
          website?: string | null
          whatsapp: string
        }
        Update: {
          bio?: string | null
          certifications?: string[] | null
          city?: string | null
          country?: string | null
          created_at?: string
          differentials?: string | null
          email?: string | null
          full_name?: string
          gallery_urls?: string[] | null
          id?: string
          instagram?: string | null
          is_featured?: boolean | null
          is_verified?: boolean
          languages?: Json | null
          max_gallery_photos?: number | null
          photo_url?: string | null
          plan_type?: string
          professional_name?: string | null
          regions?: string[] | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          search_priority?: number | null
          services?: string[] | null
          specialties?: string[] | null
          status?: string
          updated_at?: string
          user_id?: string | null
          video_url?: string | null
          website?: string | null
          whatsapp?: string
        }
        Relationships: []
      }
      tour_operators: {
        Row: {
          annual_revenue: string | null
          approval_status: string
          business_hours: Json | null
          category: string | null
          certifications: string | null
          commercial_contacts: string | null
          competitive_advantages: string | null
          created_at: string | null
          employees: number | null
          executive_team: string | null
          founded_year: number | null
          how_to_sell: string | null
          id: string
          instagram: string | null
          is_active: boolean | null
          is_published: boolean
          logo_url: string | null
          materials: Json | null
          name: string
          public_slug: string | null
          rejection_reason: string | null
          sales_channels: string | null
          short_description: string | null
          social_links: Json | null
          specialties: string | null
          updated_at: string | null
          user_id: string | null
          website: string | null
        }
        Insert: {
          annual_revenue?: string | null
          approval_status?: string
          business_hours?: Json | null
          category?: string | null
          certifications?: string | null
          commercial_contacts?: string | null
          competitive_advantages?: string | null
          created_at?: string | null
          employees?: number | null
          executive_team?: string | null
          founded_year?: number | null
          how_to_sell?: string | null
          id?: string
          instagram?: string | null
          is_active?: boolean | null
          is_published?: boolean
          logo_url?: string | null
          materials?: Json | null
          name: string
          public_slug?: string | null
          rejection_reason?: string | null
          sales_channels?: string | null
          short_description?: string | null
          social_links?: Json | null
          specialties?: string | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
        }
        Update: {
          annual_revenue?: string | null
          approval_status?: string
          business_hours?: Json | null
          category?: string | null
          certifications?: string | null
          commercial_contacts?: string | null
          competitive_advantages?: string | null
          created_at?: string | null
          employees?: number | null
          executive_team?: string | null
          founded_year?: number | null
          how_to_sell?: string | null
          id?: string
          instagram?: string | null
          is_active?: boolean | null
          is_published?: boolean
          logo_url?: string | null
          materials?: Json | null
          name?: string
          public_slug?: string | null
          rejection_reason?: string | null
          sales_channels?: string | null
          short_description?: string | null
          social_links?: Json | null
          specialties?: string | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
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
      traveler_documents: {
        Row: {
          arquivo_url: string
          created_at: string
          id: string
          nome_arquivo: string
          tipo_documento: string
          traveler_id: string
          user_id: string
        }
        Insert: {
          arquivo_url: string
          created_at?: string
          id?: string
          nome_arquivo: string
          tipo_documento?: string
          traveler_id: string
          user_id: string
        }
        Update: {
          arquivo_url?: string
          created_at?: string
          id?: string
          nome_arquivo?: string
          tipo_documento?: string
          traveler_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "traveler_documents_traveler_id_fkey"
            columns: ["traveler_id"]
            isOneToOne: false
            referencedRelation: "travelers"
            referencedColumns: ["id"]
          },
        ]
      }
      travelers: {
        Row: {
          client_id: string
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          id: string
          is_responsavel: boolean
          nacionalidade: string | null
          nome_completo: string
          observacoes: string | null
          passaporte: string | null
          updated_at: string
          user_id: string
          validade_passaporte: string | null
        }
        Insert: {
          client_id: string
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          id?: string
          is_responsavel?: boolean
          nacionalidade?: string | null
          nome_completo: string
          observacoes?: string | null
          passaporte?: string | null
          updated_at?: string
          user_id: string
          validade_passaporte?: string | null
        }
        Update: {
          client_id?: string
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          id?: string
          is_responsavel?: boolean
          nacionalidade?: string | null
          nome_completo?: string
          observacoes?: string | null
          passaporte?: string | null
          updated_at?: string
          user_id?: string
          validade_passaporte?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "travelers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
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
      trip_itinerary_activities: {
        Row: {
          created_at: string
          day_date: string
          description: string | null
          document_urls: string[] | null
          id: string
          linked_service_id: string | null
          location: string | null
          maps_url: string | null
          notes: string | null
          order_index: number
          origin: string
          period: string
          photo_urls: string[] | null
          start_time: string | null
          title: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_date: string
          description?: string | null
          document_urls?: string[] | null
          id?: string
          linked_service_id?: string | null
          location?: string | null
          maps_url?: string | null
          notes?: string | null
          order_index?: number
          origin?: string
          period: string
          photo_urls?: string[] | null
          start_time?: string | null
          title: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_date?: string
          description?: string | null
          document_urls?: string[] | null
          id?: string
          linked_service_id?: string | null
          location?: string | null
          maps_url?: string | null
          notes?: string | null
          order_index?: number
          origin?: string
          period?: string
          photo_urls?: string[] | null
          start_time?: string | null
          title?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_itinerary_activities_linked_service_id_fkey"
            columns: ["linked_service_id"]
            isOneToOne: false
            referencedRelation: "trip_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_itinerary_activities_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_itinerary_period_images: {
        Row: {
          created_at: string
          day_date: string
          id: string
          image_url: string
          period: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_date: string
          id?: string
          image_url: string
          period: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_date?: string
          id?: string
          image_url?: string
          period?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_itinerary_period_images_trip_id_fkey"
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
          image_url: string | null
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
          image_url?: string | null
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
          image_url?: string | null
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
          client_id: string | null
          client_name: string
          created_at: string
          destination: string
          end_date: string
          failed_password_attempts: number
          id: string
          is_locked: boolean
          public_access_code: string | null
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
          client_id?: string | null
          client_name: string
          created_at?: string
          destination: string
          end_date: string
          failed_password_attempts?: number
          id?: string
          is_locked?: boolean
          public_access_code?: string | null
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
          client_id?: string | null
          client_name?: string
          created_at?: string
          destination?: string
          end_date?: string
          failed_password_attempts?: number
          id?: string
          is_locked?: boolean
          public_access_code?: string | null
          share_expires_at?: string | null
          share_token?: string | null
          short_code?: string | null
          slug?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
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
          certificate_pdf_url: string | null
          created_at: string
          id: string
          issued_at: string
          trail_id: string
          user_id: string
        }
        Insert: {
          agent_name: string
          certificate_number: string
          certificate_pdf_url?: string | null
          created_at?: string
          id?: string
          issued_at?: string
          trail_id: string
          user_id: string
        }
        Update: {
          agent_name?: string
          certificate_number?: string
          certificate_pdf_url?: string | null
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
      user_feature_access: {
        Row: {
          created_at: string
          feature_key: string
          granted_by: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feature_key: string
          granted_by?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feature_key?: string
          granted_by?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_feedback: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          user_id?: string
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          created_at: string | null
          id: string
          is_online: boolean
          last_active_at: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_online?: boolean
          last_active_at?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_online?: boolean
          last_active_at?: string
          user_id?: string
        }
        Relationships: []
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
      user_sessions: {
        Row: {
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          last_heartbeat_at: string
          started_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          last_heartbeat_at?: string
          started_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          last_heartbeat_at?: string
          started_at?: string
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
      vitrine_categories: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          order_index: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          order_index?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          order_index?: number
          updated_at?: string
        }
        Relationships: []
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
      admin_export_users: {
        Args: never
        Returns: {
          address_number: string
          agency_name: string
          city: string
          cnpj: string
          cpf: string
          created_at: string
          email: string
          is_active: boolean
          name: string
          neighborhood: string
          phone: string
          plan: string
          roles: string
          state: string
          street: string
          stripe_customer_id: string
          stripe_subscription_id: string
          zip_code: string
        }[]
      }
      admin_update_user_role: {
        Args: {
          _new_role: Database["public"]["Enums"]["app_role"]
          _target_user_id: string
        }
        Returns: boolean
      }
      can_use_feature: {
        Args: { _feature: string; _user_id: string }
        Returns: boolean
      }
      check_ai_usage: { Args: { _user_id: string }; Returns: boolean }
      check_trip_shared: { Args: { p_trip_id: string }; Returns: boolean }
      generate_certificate_number: { Args: never; Returns: string }
      generate_itinerary_access_code: { Args: never; Returns: string }
      generate_public_access_code: { Args: never; Returns: string }
      generate_quote_access_code: { Args: never; Returns: string }
      generate_secure_share_token: { Args: never; Returns: string }
      generate_supplier_slug: {
        Args: { p_existing_id?: string; p_name: string }
        Returns: string
      }
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
      get_agency_slug_for_user: { Args: { p_user_id: string }; Returns: string }
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
      get_gamification_ranking_by_category: {
        Args: { category_name: string; limit_count?: number }
        Returns: {
          agency_name: string
          avatar_url: string
          total_points: number
          user_id: string
          user_name: string
        }[]
      }
      get_gamification_ranking_weekly: {
        Args: { limit_count?: number }
        Returns: {
          agency_name: string
          avatar_url: string
          total_points: number
          user_id: string
          user_name: string
        }[]
      }
      get_itinerary_by_public_code: {
        Args: { p_agency_slug: string; p_code: string }
        Returns: Json
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
      get_news_curation_stats: { Args: never; Returns: Json }
      get_online_premium_users: {
        Args: { _exclude_user_id?: string }
        Returns: {
          agency_name: string
          avatar_url: string
          city: string
          name: string
          user_id: string
        }[]
      }
      get_public_profile: {
        Args: { _user_id: string }
        Returns: {
          agency_logo_url: string
          agency_name: string
          avatar_url: string
          city: string
          name: string
          phone: string
          state: string
          user_id: string
        }[]
      }
      get_public_profiles: {
        Args: { _user_ids: string[] }
        Returns: {
          agency_logo_url: string
          agency_name: string
          avatar_url: string
          city: string
          name: string
          phone: string
          state: string
          user_id: string
        }[]
      }
      get_public_sales_landing: { Args: { p_slug: string }; Returns: Json }
      get_public_tour_guide: { Args: { _id: string }; Returns: Json }
      get_published_supplier_by_slug: {
        Args: { p_slug: string }
        Returns: Json
      }
      get_quote_by_public_code: {
        Args: { p_agency_slug: string; p_code: string }
        Returns: Json
      }
      get_registration_link: {
        Args: { _token: string }
        Returns: {
          expires_at: string
          max_uses: number
          plan: string
          role: string
          uses_count: number
        }[]
      }
      get_trip_by_public_code: {
        Args: { p_agency_slug: string; p_code: string }
        Returns: Json
      }
      get_user_analytics: {
        Args: { _end_date?: string; _start_date?: string }
        Returns: {
          agency_name: string
          avatar_url: string
          avg_session_minutes: number
          first_access: string
          last_access: string
          total_duration_minutes: number
          total_sessions: number
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
      is_community_member: { Args: { _user_id: string }; Returns: boolean }
      is_user_active: { Args: { _user_id: string }; Returns: boolean }
      resolve_trip_short_code: { Args: { p_code: string }; Returns: Json }
      save_card_capture_via_token: {
        Args: { _data: Json; _token: string }
        Returns: string
      }
      submit_sales_landing_lead: {
        Args: { p_lead_name: string; p_lead_phone: string; p_slug: string }
        Returns: Json
      }
      track_sales_landing_view: {
        Args: { p_session_hash: string; p_slug: string }
        Returns: undefined
      }
      unaccent: { Args: { "": string }; Returns: string }
      validate_quick_access_token: { Args: { _token: string }; Returns: string }
      verify_trip_access: {
        Args: { p_password: string; p_token: string }
        Returns: Json
      }
      verify_trip_access_by_slug: {
        Args: { p_password: string; p_slug: string }
        Returns: Json
      }
      verify_trip_by_public_code: {
        Args: { p_agency_slug: string; p_code: string; p_password: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "agente" | "promotor" | "fornecedor"
      subscription_plan:
        | "essencial"
        | "profissional"
        | "premium"
        | "educa_pass"
        | "cartao_digital"
        | "fundador"
        | "start"
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
      app_role: ["admin", "agente", "promotor", "fornecedor"],
      subscription_plan: [
        "essencial",
        "profissional",
        "premium",
        "educa_pass",
        "cartao_digital",
        "fundador",
        "start",
      ],
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
