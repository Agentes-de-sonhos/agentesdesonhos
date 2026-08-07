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
      activity_photo_cache: {
        Row: {
          attributions: string[] | null
          created_at: string
          photo_url: string | null
          place_id: string | null
          query_key: string
          source: string
          thumb_url: string | null
          updated_at: string
        }
        Insert: {
          attributions?: string[] | null
          created_at?: string
          photo_url?: string | null
          place_id?: string | null
          query_key: string
          source?: string
          thumb_url?: string | null
          updated_at?: string
        }
        Update: {
          attributions?: string[] | null
          created_at?: string
          photo_url?: string | null
          place_id?: string | null
          query_key?: string
          source?: string
          thumb_url?: string | null
          updated_at?: string
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
      agency_access_profiles: {
        Row: {
          agency_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_native: boolean
          key: string
          name: string
          permission_keys: string[]
          scopes: Json
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_native?: boolean
          key: string
          name: string
          permission_keys?: string[]
          scopes?: Json
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_native?: boolean
          key?: string
          name?: string
          permission_keys?: string[]
          scopes?: Json
          updated_at?: string
        }
        Relationships: []
      }
      agency_community_settings: {
        Row: {
          agency_id: string
          created_at: string
          external_chat_enabled: boolean
          internal_chat_enabled: boolean
          internal_community_enabled: boolean
          online_users_enabled: boolean
          preset: string
          public_community_enabled: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agency_id: string
          created_at?: string
          external_chat_enabled?: boolean
          internal_chat_enabled?: boolean
          internal_community_enabled?: boolean
          online_users_enabled?: boolean
          preset?: string
          public_community_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agency_id?: string
          created_at?: string
          external_chat_enabled?: boolean
          internal_chat_enabled?: boolean
          internal_community_enabled?: boolean
          online_users_enabled?: boolean
          preset?: string
          public_community_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      agency_contract_template_sections: {
        Row: {
          body_html: string
          conditional_rule: Json | null
          created_at: string
          display_order: number
          id: string
          is_fixed: boolean
          section_key: string
          template_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          body_html?: string
          conditional_rule?: Json | null
          created_at?: string
          display_order?: number
          id?: string
          is_fixed?: boolean
          section_key: string
          template_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          body_html?: string
          conditional_rule?: Json | null
          created_at?: string
          display_order?: number
          id?: string
          is_fixed?: boolean
          section_key?: string
          template_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_contract_template_sections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "agency_contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_contract_templates: {
        Row: {
          agency_data_snapshot: Json
          agency_id: string
          contract_title: string
          created_at: string
          created_by_admin: string | null
          description: string | null
          effective_from: string | null
          effective_until: string | null
          footer_config: Json
          header_config: Json
          id: string
          legal_body_html: string
          logo_url: string | null
          name: string
          signature_config: Json
          status: string
          updated_at: string
          updated_by_admin: string | null
          version: number
        }
        Insert: {
          agency_data_snapshot?: Json
          agency_id: string
          contract_title?: string
          created_at?: string
          created_by_admin?: string | null
          description?: string | null
          effective_from?: string | null
          effective_until?: string | null
          footer_config?: Json
          header_config?: Json
          id?: string
          legal_body_html?: string
          logo_url?: string | null
          name: string
          signature_config?: Json
          status?: string
          updated_at?: string
          updated_by_admin?: string | null
          version?: number
        }
        Update: {
          agency_data_snapshot?: Json
          agency_id?: string
          contract_title?: string
          created_at?: string
          created_by_admin?: string | null
          description?: string | null
          effective_from?: string | null
          effective_until?: string | null
          footer_config?: Json
          header_config?: Json
          id?: string
          legal_body_html?: string
          logo_url?: string | null
          name?: string
          signature_config?: Json
          status?: string
          updated_at?: string
          updated_by_admin?: string | null
          version?: number
        }
        Relationships: []
      }
      agency_events: {
        Row: {
          client_id: string | null
          color: string | null
          created_at: string
          deleted_at: string | null
          deleted_by_sync: boolean
          description: string | null
          event_date: string
          event_time: string | null
          event_type: string
          event_url: string | null
          followup_id: string | null
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
          deleted_at?: string | null
          deleted_by_sync?: boolean
          description?: string | null
          event_date: string
          event_time?: string | null
          event_type?: string
          event_url?: string | null
          followup_id?: string | null
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
          deleted_at?: string | null
          deleted_by_sync?: boolean
          description?: string | null
          event_date?: string
          event_time?: string | null
          event_type?: string
          event_url?: string | null
          followup_id?: string | null
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
            foreignKeyName: "agency_events_followup_id_fkey"
            columns: ["followup_id"]
            isOneToOne: true
            referencedRelation: "opportunity_followups"
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
      agency_membership: {
        Row: {
          agency_id: string
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          role: string
          user_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      agency_product_landings: {
        Row: {
          created_at: string
          id: string
          leads_count: number
          office_hours: Json
          override_address: string | null
          override_agency_name: string | null
          override_city: string | null
          override_cnpj: string | null
          override_consultant_name: string | null
          override_consultant_photo_url: string | null
          override_consultant_role: string | null
          override_email: string | null
          override_legal_name: string | null
          override_logo_url: string | null
          override_phone: string | null
          override_privacy_email: string | null
          override_privacy_officer: string | null
          override_website: string | null
          override_whatsapp: string | null
          product_key: string
          slug: string
          status: string
          test_mode_until: string | null
          timezone: string
          updated_at: string
          user_id: string
          views_count: number
          whatsapp_message_template: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          leads_count?: number
          office_hours?: Json
          override_address?: string | null
          override_agency_name?: string | null
          override_city?: string | null
          override_cnpj?: string | null
          override_consultant_name?: string | null
          override_consultant_photo_url?: string | null
          override_consultant_role?: string | null
          override_email?: string | null
          override_legal_name?: string | null
          override_logo_url?: string | null
          override_phone?: string | null
          override_privacy_email?: string | null
          override_privacy_officer?: string | null
          override_website?: string | null
          override_whatsapp?: string | null
          product_key: string
          slug: string
          status?: string
          test_mode_until?: string | null
          timezone?: string
          updated_at?: string
          user_id: string
          views_count?: number
          whatsapp_message_template?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          leads_count?: number
          office_hours?: Json
          override_address?: string | null
          override_agency_name?: string | null
          override_city?: string | null
          override_cnpj?: string | null
          override_consultant_name?: string | null
          override_consultant_photo_url?: string | null
          override_consultant_role?: string | null
          override_email?: string | null
          override_legal_name?: string | null
          override_logo_url?: string | null
          override_phone?: string | null
          override_privacy_email?: string | null
          override_privacy_officer?: string | null
          override_website?: string | null
          override_whatsapp?: string | null
          product_key?: string
          slug?: string
          status?: string
          test_mode_until?: string | null
          timezone?: string
          updated_at?: string
          user_id?: string
          views_count?: number
          whatsapp_message_template?: string | null
        }
        Relationships: []
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
      agency_supplier_terms: {
        Row: {
          agency_id: string
          created_at: string
          default_commission_fixed: number | null
          default_commission_percent: number | null
          default_commission_type: string | null
          default_non_commissionable_fees: number | null
          id: string
          notes: string | null
          operator_id: string
          payment_days: number | null
          payment_rule: string | null
          preferred_contact_id: string | null
          requires_invoice: boolean | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          default_commission_fixed?: number | null
          default_commission_percent?: number | null
          default_commission_type?: string | null
          default_non_commissionable_fees?: number | null
          id?: string
          notes?: string | null
          operator_id: string
          payment_days?: number | null
          payment_rule?: string | null
          preferred_contact_id?: string | null
          requires_invoice?: boolean | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          default_commission_fixed?: number | null
          default_commission_percent?: number | null
          default_commission_type?: string | null
          default_non_commissionable_fees?: number | null
          id?: string
          notes?: string | null
          operator_id?: string
          payment_days?: number | null
          payment_rule?: string | null
          preferred_contact_id?: string | null
          requires_invoice?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_supplier_terms_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "tour_operators"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_team_audit_log: {
        Row: {
          action: string
          actor_is_platform_admin: boolean
          actor_user_id: string | null
          agency_id: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          module_key: string | null
          team_member_id: string | null
        }
        Insert: {
          action: string
          actor_is_platform_admin?: boolean
          actor_user_id?: string | null
          agency_id: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          module_key?: string | null
          team_member_id?: string | null
        }
        Update: {
          action?: string
          actor_is_platform_admin?: boolean
          actor_user_id?: string | null
          agency_id?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          module_key?: string | null
          team_member_id?: string | null
        }
        Relationships: []
      }
      agency_team_invites: {
        Row: {
          accepted_at: string | null
          access_profile_id: string | null
          agency_id: string
          created_at: string
          department: string | null
          email: string
          expires_at: string
          full_name: string | null
          id: string
          invited_by: string
          last_sent_at: string
          member_id: string | null
          permission_keys: string[]
          revoked_at: string | null
          role_title: string | null
          scopes: Json
          sent_count: number
          team_name: string | null
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          access_profile_id?: string | null
          agency_id: string
          created_at?: string
          department?: string | null
          email: string
          expires_at: string
          full_name?: string | null
          id?: string
          invited_by: string
          last_sent_at?: string
          member_id?: string | null
          permission_keys?: string[]
          revoked_at?: string | null
          role_title?: string | null
          scopes?: Json
          sent_count?: number
          team_name?: string | null
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          access_profile_id?: string | null
          agency_id?: string
          created_at?: string
          department?: string | null
          email?: string
          expires_at?: string
          full_name?: string | null
          id?: string
          invited_by?: string
          last_sent_at?: string
          member_id?: string | null
          permission_keys?: string[]
          revoked_at?: string | null
          role_title?: string | null
          scopes?: Json
          sent_count?: number
          team_name?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_team_invites_access_profile_id_fkey"
            columns: ["access_profile_id"]
            isOneToOne: false
            referencedRelation: "agency_access_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_team_limit_overrides: {
        Row: {
          agency_id: string
          created_at: string
          created_by: string | null
          max_members: number
          reason: string | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          created_by?: string | null
          max_members: number
          reason?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          created_by?: string | null
          max_members?: number
          reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      agency_team_member_secrets: {
        Row: {
          member_id: string
          password_hash: string
          updated_at: string
        }
        Insert: {
          member_id: string
          password_hash: string
          updated_at?: string
        }
        Update: {
          member_id?: string
          password_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_team_member_secrets_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "agency_team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_team_members: {
        Row: {
          access_profile_id: string | null
          activated_at: string | null
          agency_id: string
          auth_user_id: string | null
          avatar_url: string | null
          created_at: string
          created_by: string | null
          deactivated_at: string | null
          department: string | null
          email: string | null
          full_name: string
          id: string
          invited_at: string | null
          last_login_at: string | null
          login: string
          login_normalized: string | null
          notification_email: string | null
          password_hash: string | null
          phone: string | null
          role_title: string | null
          status: Database["public"]["Enums"]["team_member_status"]
          synthetic_email: string | null
          team_name: string | null
          updated_at: string
        }
        Insert: {
          access_profile_id?: string | null
          activated_at?: string | null
          agency_id: string
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          deactivated_at?: string | null
          department?: string | null
          email?: string | null
          full_name: string
          id?: string
          invited_at?: string | null
          last_login_at?: string | null
          login: string
          login_normalized?: string | null
          notification_email?: string | null
          password_hash?: string | null
          phone?: string | null
          role_title?: string | null
          status?: Database["public"]["Enums"]["team_member_status"]
          synthetic_email?: string | null
          team_name?: string | null
          updated_at?: string
        }
        Update: {
          access_profile_id?: string | null
          activated_at?: string | null
          agency_id?: string
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          deactivated_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string
          id?: string
          invited_at?: string | null
          last_login_at?: string | null
          login?: string
          login_normalized?: string | null
          notification_email?: string | null
          password_hash?: string | null
          phone?: string | null
          role_title?: string | null
          status?: Database["public"]["Enums"]["team_member_status"]
          synthetic_email?: string | null
          team_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_team_members_access_profile_fkey"
            columns: ["access_profile_id"]
            isOneToOne: false
            referencedRelation: "agency_access_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_team_permissions: {
        Row: {
          agency_id: string
          created_at: string
          enabled: boolean
          id: string
          module_key: string
          permission_key: string
          team_member_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          enabled?: boolean
          id?: string
          module_key: string
          permission_key: string
          team_member_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          enabled?: boolean
          id?: string
          module_key?: string
          permission_key?: string
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_team_permissions_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "agency_team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_team_scopes: {
        Row: {
          agency_id: string
          created_at: string
          id: string
          module_key: string
          scope: Database["public"]["Enums"]["team_data_scope"]
          team_member_id: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          id?: string
          module_key: string
          scope?: Database["public"]["Enums"]["team_data_scope"]
          team_member_id: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          id?: string
          module_key?: string
          scope?: Database["public"]["Enums"]["team_data_scope"]
          team_member_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_team_scopes_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "agency_team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_team_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip_address: string | null
          last_seen_at: string
          team_member_id: string
          token_hash: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: string | null
          last_seen_at?: string
          team_member_id: string
          token_hash: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          last_seen_at?: string
          team_member_id?: string
          token_hash?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_team_sessions_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "agency_team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_team_stage_permissions: {
        Row: {
          agency_id: string
          can_edit: boolean
          can_move: boolean
          can_view: boolean
          created_at: string
          id: string
          pipeline_type: Database["public"]["Enums"]["team_pipeline_type"]
          stage_id: string
          team_member_id: string
        }
        Insert: {
          agency_id: string
          can_edit?: boolean
          can_move?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          pipeline_type: Database["public"]["Enums"]["team_pipeline_type"]
          stage_id: string
          team_member_id: string
        }
        Update: {
          agency_id?: string
          can_edit?: boolean
          can_move?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          pipeline_type?: Database["public"]["Enums"]["team_pipeline_type"]
          stage_id?: string
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_team_stage_permissions_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "agency_team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_wallet_settings: {
        Row: {
          created_at: string
          show_calendar: boolean
          show_next_activity: boolean
          show_next_service: boolean
          show_signature: boolean
          show_support_tools: boolean
          show_whatsapp: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          show_calendar?: boolean
          show_next_activity?: boolean
          show_next_service?: boolean
          show_signature?: boolean
          show_support_tools?: boolean
          show_whatsapp?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          show_calendar?: boolean
          show_next_activity?: boolean
          show_next_service?: boolean
          show_signature?: boolean
          show_support_tools?: boolean
          show_whatsapp?: boolean
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
      airfare_import_logs: {
        Row: {
          confidence_score: number | null
          created_at: string
          error_message: string | null
          file_mime: string | null
          file_name: string | null
          file_url: string | null
          id: string
          parsed_data: Json | null
          quote_id: string | null
          raw_ai_response: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          error_message?: string | null
          file_mime?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          parsed_data?: Json | null
          quote_id?: string | null
          raw_ai_response?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          error_message?: string | null
          file_mime?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          parsed_data?: Json | null
          quote_id?: string | null
          raw_ai_response?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      app_error_logs: {
        Row: {
          agency_id: string | null
          component_stack: string | null
          created_at: string
          error_message: string
          error_name: string | null
          id: string
          metadata: Json
          phase: string
          route: string
          stack: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          agency_id?: string | null
          component_stack?: string | null
          created_at?: string
          error_message: string
          error_name?: string | null
          id?: string
          metadata?: Json
          phase?: string
          route: string
          stack?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          agency_id?: string | null
          component_stack?: string | null
          created_at?: string
          error_message?: string
          error_name?: string | null
          id?: string
          metadata?: Json
          phase?: string
          route?: string
          stack?: string | null
          user_agent?: string | null
          user_id?: string | null
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
          user_id: string
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
          user_id: string
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
          user_id?: string
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
      cities: {
        Row: {
          admin_name: string | null
          capital: string | null
          country: string
          created_at: string
          id: number
          iso2: string | null
          iso3: string | null
          lat: number | null
          lng: number | null
          name: string
          name_ascii: string
          population: number | null
        }
        Insert: {
          admin_name?: string | null
          capital?: string | null
          country: string
          created_at?: string
          id: number
          iso2?: string | null
          iso3?: string | null
          lat?: number | null
          lng?: number | null
          name: string
          name_ascii: string
          population?: number | null
        }
        Update: {
          admin_name?: string | null
          capital?: string | null
          country?: string
          created_at?: string
          id?: number
          iso2?: string | null
          iso3?: string | null
          lat?: number | null
          lng?: number | null
          name?: string
          name_ascii?: string
          population?: number | null
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
          assigned_team_member_id: string | null
          birthday_day: number | null
          birthday_month: number | null
          birthday_year: number | null
          category_id: string | null
          city: string | null
          created_at: string
          created_by_team_member_id: string | null
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
          assigned_team_member_id?: string | null
          birthday_day?: number | null
          birthday_month?: number | null
          birthday_year?: number | null
          category_id?: string | null
          city?: string | null
          created_at?: string
          created_by_team_member_id?: string | null
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
          assigned_team_member_id?: string | null
          birthday_day?: number | null
          birthday_month?: number | null
          birthday_year?: number | null
          category_id?: string | null
          city?: string | null
          created_at?: string
          created_by_team_member_id?: string | null
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
      commercial_signatures: {
        Row: {
          created_at: string
          custom_message: string | null
          display_order: number
          email: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          phone: string | null
          photo_url: string | null
          title: string | null
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          custom_message?: string | null
          display_order?: number
          email?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          phone?: string | null
          photo_url?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          custom_message?: string | null
          display_order?: number
          email?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          phone?: string | null
          photo_url?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      community_award_winners: {
        Row: {
          active_days_count: number | null
          award_id: string
          confirmed_by: string | null
          contributions_count: number | null
          created_at: string
          id: string
          published_at: string | null
          reference_month: number
          reference_year: number
          third_party_replies_count: number | null
          tie_break_reason: string | null
          user_id: string
          votes_count: number
        }
        Insert: {
          active_days_count?: number | null
          award_id: string
          confirmed_by?: string | null
          contributions_count?: number | null
          created_at?: string
          id?: string
          published_at?: string | null
          reference_month: number
          reference_year: number
          third_party_replies_count?: number | null
          tie_break_reason?: string | null
          user_id: string
          votes_count?: number
        }
        Update: {
          active_days_count?: number | null
          award_id?: string
          confirmed_by?: string | null
          contributions_count?: number | null
          created_at?: string
          id?: string
          published_at?: string | null
          reference_month?: number
          reference_year?: number
          third_party_replies_count?: number | null
          tie_break_reason?: string | null
          user_id?: string
          votes_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "community_award_winners_award_id_fkey"
            columns: ["award_id"]
            isOneToOne: true
            referencedRelation: "community_monthly_awards"
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
      community_meeting_attendees: {
        Row: {
          created_at: string
          id: string
          meeting_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          meeting_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          meeting_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_meeting_attendees_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "community_meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      community_meetings: {
        Row: {
          address: string | null
          agenda: Json | null
          capacity: number | null
          category: string | null
          city: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_at: string | null
          id: string
          is_recording_available: boolean
          location_name: string | null
          maps_url: string | null
          materials: Json | null
          meeting_platform: string | null
          meeting_type: string
          meeting_url: string | null
          organizer_name: string | null
          photos: Json | null
          published: boolean
          published_at: string | null
          recording_url: string | null
          registration_url: string | null
          related_links: Json | null
          short_description: string | null
          slug: string | null
          speakers: Json | null
          start_at: string
          state: string | null
          status: string
          timezone: string | null
          title: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          agenda?: Json | null
          capacity?: number | null
          category?: string | null
          city?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_at?: string | null
          id?: string
          is_recording_available?: boolean
          location_name?: string | null
          maps_url?: string | null
          materials?: Json | null
          meeting_platform?: string | null
          meeting_type?: string
          meeting_url?: string | null
          organizer_name?: string | null
          photos?: Json | null
          published?: boolean
          published_at?: string | null
          recording_url?: string | null
          registration_url?: string | null
          related_links?: Json | null
          short_description?: string | null
          slug?: string | null
          speakers?: Json | null
          start_at: string
          state?: string | null
          status?: string
          timezone?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          agenda?: Json | null
          capacity?: number | null
          category?: string | null
          city?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_at?: string | null
          id?: string
          is_recording_available?: boolean
          location_name?: string | null
          maps_url?: string | null
          materials?: Json | null
          meeting_platform?: string | null
          meeting_type?: string
          meeting_url?: string | null
          organizer_name?: string | null
          photos?: Json | null
          published?: boolean
          published_at?: string | null
          recording_url?: string | null
          registration_url?: string | null
          related_links?: Json | null
          short_description?: string | null
          slug?: string | null
          speakers?: Json | null
          start_at?: string
          state?: string | null
          status?: string
          timezone?: string | null
          title?: string
          updated_at?: string
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
      community_monthly_awards: {
        Row: {
          allow_consecutive_wins: boolean
          created_at: string
          description: string | null
          extra_link: string | null
          extra_notes: string | null
          id: string
          max_wins_per_year: number
          prize_description: string | null
          prize_image_url: string | null
          prize_title: string | null
          publish_date: string | null
          published_at: string | null
          reference_month: number
          reference_year: number
          rules: string | null
          sponsor_name: string | null
          status: string
          title: string | null
          updated_at: string
          voting_end_at: string | null
          voting_start_at: string | null
          winner_user_id: string | null
          winner_votes: number | null
        }
        Insert: {
          allow_consecutive_wins?: boolean
          created_at?: string
          description?: string | null
          extra_link?: string | null
          extra_notes?: string | null
          id?: string
          max_wins_per_year?: number
          prize_description?: string | null
          prize_image_url?: string | null
          prize_title?: string | null
          publish_date?: string | null
          published_at?: string | null
          reference_month: number
          reference_year: number
          rules?: string | null
          sponsor_name?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          voting_end_at?: string | null
          voting_start_at?: string | null
          winner_user_id?: string | null
          winner_votes?: number | null
        }
        Update: {
          allow_consecutive_wins?: boolean
          created_at?: string
          description?: string | null
          extra_link?: string | null
          extra_notes?: string | null
          id?: string
          max_wins_per_year?: number
          prize_description?: string | null
          prize_image_url?: string | null
          prize_title?: string | null
          publish_date?: string | null
          published_at?: string | null
          reference_month?: number
          reference_year?: number
          rules?: string | null
          sponsor_name?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          voting_end_at?: string | null
          voting_start_at?: string | null
          winner_user_id?: string | null
          winner_votes?: number | null
        }
        Relationships: []
      }
      community_monthly_nominees: {
        Row: {
          active_days_count: number
          answers_count: number
          award_id: string
          comments_count: number
          contributions_count: number
          created_at: string
          eligible: boolean
          exclusion_reason: string | null
          first_contribution_at: string | null
          id: string
          last_contribution_at: string | null
          posts_count: number
          questions_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          active_days_count?: number
          answers_count?: number
          award_id: string
          comments_count?: number
          contributions_count?: number
          created_at?: string
          eligible?: boolean
          exclusion_reason?: string | null
          first_contribution_at?: string | null
          id?: string
          last_contribution_at?: string | null
          posts_count?: number
          questions_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          active_days_count?: number
          answers_count?: number
          award_id?: string
          comments_count?: number
          contributions_count?: number
          created_at?: string
          eligible?: boolean
          exclusion_reason?: string | null
          first_contribution_at?: string | null
          id?: string
          last_contribution_at?: string | null
          posts_count?: number
          questions_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_monthly_nominees_award_id_fkey"
            columns: ["award_id"]
            isOneToOne: false
            referencedRelation: "community_monthly_awards"
            referencedColumns: ["id"]
          },
        ]
      }
      community_monthly_votes: {
        Row: {
          award_id: string
          created_at: string
          id: string
          nominee_user_id: string
          updated_at: string
          voter_user_id: string
        }
        Insert: {
          award_id: string
          created_at?: string
          id?: string
          nominee_user_id: string
          updated_at?: string
          voter_user_id: string
        }
        Update: {
          award_id?: string
          created_at?: string
          id?: string
          nominee_user_id?: string
          updated_at?: string
          voter_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_monthly_votes_award_id_fkey"
            columns: ["award_id"]
            isOneToOne: false
            referencedRelation: "community_monthly_awards"
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
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          post_id?: string
          updated_at?: string
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
      community_post_poll_votes: {
        Row: {
          created_at: string
          id: string
          option_id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_poll_votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          agency_id: string | null
          comments_count: number | null
          content: string | null
          created_at: string | null
          documents: Json
          edited_at: string | null
          id: string
          image_url: string | null
          image_urls: string[]
          is_pinned: boolean | null
          likes_count: number | null
          poll: Json | null
          tags: string[] | null
          updated_at: string | null
          user_id: string
          video_url: string | null
          visibility: string
        }
        Insert: {
          agency_id?: string | null
          comments_count?: number | null
          content?: string | null
          created_at?: string | null
          documents?: Json
          edited_at?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[]
          is_pinned?: boolean | null
          likes_count?: number | null
          poll?: Json | null
          tags?: string[] | null
          updated_at?: string | null
          user_id: string
          video_url?: string | null
          visibility?: string
        }
        Update: {
          agency_id?: string | null
          comments_count?: number | null
          content?: string | null
          created_at?: string | null
          documents?: Json
          edited_at?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[]
          is_pinned?: boolean | null
          likes_count?: number | null
          poll?: Json | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
          video_url?: string | null
          visibility?: string
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
          sale_id: string | null
          source: string
          source_id: string | null
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
          source?: string
          source_id?: string | null
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
          source?: string
          source_id?: string | null
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
          recurrence_end_date: string | null
          recurrence_end_type: string
          recurrence_occurrences: number | null
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
          recurrence_end_date?: string | null
          recurrence_end_type?: string
          recurrence_occurrences?: number | null
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
          recurrence_end_date?: string | null
          recurrence_end_type?: string
          recurrence_occurrences?: number | null
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
      full_package_imports: {
        Row: {
          ai_blocks: Json
          created_at: string
          expected_types: string[]
          id: string
          quote_id: string | null
          review_status: Json
          source_kind: string
          source_text: string | null
          source_url: string | null
          trip_meta: Json
          updated_at: string
          user_id: string
          warnings: Json
        }
        Insert: {
          ai_blocks?: Json
          created_at?: string
          expected_types?: string[]
          id?: string
          quote_id?: string | null
          review_status?: Json
          source_kind: string
          source_text?: string | null
          source_url?: string | null
          trip_meta?: Json
          updated_at?: string
          user_id: string
          warnings?: Json
        }
        Update: {
          ai_blocks?: Json
          created_at?: string
          expected_types?: string[]
          id?: string
          quote_id?: string | null
          review_status?: Json
          source_kind?: string
          source_text?: string | null
          source_url?: string | null
          trip_meta?: Json
          updated_at?: string
          user_id?: string
          warnings?: Json
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
          deleted_at: string | null
          google_event_id: string
          id: string
          last_synced_at: string | null
          sync_direction: string | null
          user_id: string
        }
        Insert: {
          agency_event_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          google_event_id: string
          id?: string
          last_synced_at?: string | null
          sync_direction?: string | null
          user_id: string
        }
        Update: {
          agency_event_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
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
          auto_sync_enabled: boolean
          calendar_id: string | null
          created_at: string | null
          id: string
          last_sync_at: string | null
          last_sync_duration_ms: number | null
          last_sync_error: string | null
          last_sync_status: string | null
          refresh_token: string
          sync_enabled: boolean | null
          sync_in_progress: boolean
          sync_lock_at: string | null
          sync_token: string | null
          token_expires_at: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          auto_sync_enabled?: boolean
          calendar_id?: string | null
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          last_sync_duration_ms?: number | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          refresh_token: string
          sync_enabled?: boolean | null
          sync_in_progress?: boolean
          sync_lock_at?: string | null
          sync_token?: string | null
          token_expires_at: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          auto_sync_enabled?: boolean
          calendar_id?: string | null
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          last_sync_duration_ms?: number | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          refresh_token?: string
          sync_enabled?: boolean | null
          sync_in_progress?: boolean
          sync_lock_at?: string | null
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
      help_assistant_conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      help_assistant_feedback: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          message_id: string
          rating: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          message_id: string
          rating: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          message_id?: string
          rating?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_assistant_feedback_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "help_assistant_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      help_assistant_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          fallback_used: boolean
          id: string
          role: string
          sources: Json | null
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          fallback_used?: boolean
          id?: string
          role: string
          sources?: Json | null
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          fallback_used?: boolean
          id?: string
          role?: string
          sources?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_assistant_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "help_assistant_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      help_assistant_unanswered: {
        Row: {
          created_at: string
          id: string
          module_hint: string | null
          question: string
          reason: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          module_hint?: string | null
          question: string
          reason?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          module_hint?: string | null
          question?: string
          reason?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      help_center_chunks: {
        Row: {
          audience: string[] | null
          confidence: string | null
          content: string
          created_at: string
          id: string
          intents: string[] | null
          keywords: string[] | null
          last_reviewed: string | null
          module: string | null
          permissions: string | null
          plan: string | null
          related_ids: string[] | null
          search_text: string | null
          source_reference: string | null
          status: string | null
          submodule: string | null
          title: string
          type: string | null
          updated_at: string
        }
        Insert: {
          audience?: string[] | null
          confidence?: string | null
          content: string
          created_at?: string
          id: string
          intents?: string[] | null
          keywords?: string[] | null
          last_reviewed?: string | null
          module?: string | null
          permissions?: string | null
          plan?: string | null
          related_ids?: string[] | null
          search_text?: string | null
          source_reference?: string | null
          status?: string | null
          submodule?: string | null
          title: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          audience?: string[] | null
          confidence?: string | null
          content?: string
          created_at?: string
          id?: string
          intents?: string[] | null
          keywords?: string[] | null
          last_reviewed?: string | null
          module?: string | null
          permissions?: string | null
          plan?: string | null
          related_ids?: string[] | null
          search_text?: string | null
          source_reference?: string | null
          status?: string | null
          submodule?: string | null
          title?: string
          type?: string | null
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
      invoice_installments: {
        Row: {
          amount: number
          created_at: string
          due_date: string | null
          id: string
          installment_number: number
          invoice_id: string
          label: string | null
          paid_at: string | null
          status: Database["public"]["Enums"]["invoice_installment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          due_date?: string | null
          id?: string
          installment_number: number
          invoice_id: string
          label?: string | null
          paid_at?: string | null
          status?: Database["public"]["Enums"]["invoice_installment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string | null
          id?: string
          installment_number?: number
          invoice_id?: string
          label?: string | null
          paid_at?: string | null
          status?: Database["public"]["Enums"]["invoice_installment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_installments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          installment_id: string | null
          invoice_id: string
          method: string
          notes: string | null
          payment_date: string
          receipt_number: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          installment_id?: string | null
          invoice_id: string
          method?: string
          notes?: string | null
          payment_date?: string
          receipt_number: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          installment_id?: string | null
          invoice_id?: string
          method?: string
          notes?: string | null
          payment_date?: string
          receipt_number?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_payments_installment_id_fkey"
            columns: ["installment_id"]
            isOneToOne: false
            referencedRelation: "invoice_installments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_services: {
        Row: {
          category: Database["public"]["Enums"]["invoice_service_category"]
          commission: number
          created_at: string
          description: string | null
          discount: number
          fare: number
          final_amount: number
          id: string
          invoice_id: string
          net_amount: number
          order_index: number
          rav: number
          taxes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["invoice_service_category"]
          commission?: number
          created_at?: string
          description?: string | null
          discount?: number
          fare?: number
          final_amount?: number
          id?: string
          invoice_id: string
          net_amount?: number
          order_index?: number
          rav?: number
          taxes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["invoice_service_category"]
          commission?: number
          created_at?: string
          description?: string | null
          discount?: number
          fare?: number
          final_amount?: number
          id?: string
          invoice_id?: string
          net_amount?: number
          order_index?: number
          rav?: number
          taxes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_services_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          agency_slug: string | null
          balance: number
          client_company: string | null
          client_document: string | null
          client_email: string | null
          client_id: string | null
          client_name: string
          client_phone: string | null
          commission_total: number
          created_at: string
          currency: string
          destination: string | null
          discount_total: number
          due_date: string | null
          estimated_profit: number
          id: string
          invoice_number: string
          issue_date: string
          notes: string | null
          paid_amount: number
          passengers: Json | null
          pix_key: string | null
          pix_qr_payload: string | null
          public_access_code: string | null
          rav_total: number
          source_id: string | null
          source_type: Database["public"]["Enums"]["invoice_source_type"]
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          taxes_total: number
          terms: string | null
          total_amount: number
          travel_end: string | null
          travel_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agency_slug?: string | null
          balance?: number
          client_company?: string | null
          client_document?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name: string
          client_phone?: string | null
          commission_total?: number
          created_at?: string
          currency?: string
          destination?: string | null
          discount_total?: number
          due_date?: string | null
          estimated_profit?: number
          id?: string
          invoice_number: string
          issue_date?: string
          notes?: string | null
          paid_amount?: number
          passengers?: Json | null
          pix_key?: string | null
          pix_qr_payload?: string | null
          public_access_code?: string | null
          rav_total?: number
          source_id?: string | null
          source_type?: Database["public"]["Enums"]["invoice_source_type"]
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          taxes_total?: number
          terms?: string | null
          total_amount?: number
          travel_end?: string | null
          travel_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agency_slug?: string | null
          balance?: number
          client_company?: string | null
          client_document?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string
          client_phone?: string | null
          commission_total?: number
          created_at?: string
          currency?: string
          destination?: string | null
          discount_total?: number
          due_date?: string | null
          estimated_profit?: number
          id?: string
          invoice_number?: string
          issue_date?: string
          notes?: string | null
          paid_amount?: number
          passengers?: Json | null
          pix_key?: string | null
          pix_qr_payload?: string | null
          public_access_code?: string | null
          rav_total?: number
          source_id?: string | null
          source_type?: Database["public"]["Enums"]["invoice_source_type"]
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          taxes_total?: number
          terms?: string | null
          total_amount?: number
          travel_end?: string | null
          travel_start?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      itineraries: {
        Row: {
          budget_level: string
          client_id: string | null
          cover_image_url: string | null
          created_at: string
          destination: string
          destination_intro_images: string[]
          destination_intro_text: string | null
          end_date: string
          headline: string | null
          id: string
          passengers: Json
          pricing_content: string | null
          public_access_code: string | null
          share_expires_at: string | null
          share_token: string | null
          show_destination_intro: boolean
          show_pricing_section: boolean
          signature_snapshot: Json | null
          source_itinerary_id: string | null
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
          cover_image_url?: string | null
          created_at?: string
          destination: string
          destination_intro_images?: string[]
          destination_intro_text?: string | null
          end_date: string
          headline?: string | null
          id?: string
          passengers?: Json
          pricing_content?: string | null
          public_access_code?: string | null
          share_expires_at?: string | null
          share_token?: string | null
          show_destination_intro?: boolean
          show_pricing_section?: boolean
          signature_snapshot?: Json | null
          source_itinerary_id?: string | null
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
          cover_image_url?: string | null
          created_at?: string
          destination?: string
          destination_intro_images?: string[]
          destination_intro_text?: string | null
          end_date?: string
          headline?: string | null
          id?: string
          passengers?: Json
          pricing_content?: string | null
          public_access_code?: string | null
          share_expires_at?: string | null
          share_token?: string | null
          show_destination_intro?: boolean
          show_pricing_section?: boolean
          signature_snapshot?: Json | null
          source_itinerary_id?: string | null
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
          {
            foreignKeyName: "itineraries_source_itinerary_id_fkey"
            columns: ["source_itinerary_id"]
            isOneToOne: false
            referencedRelation: "itineraries"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_activities: {
        Row: {
          created_at: string
          day_id: string
          description: string | null
          document_urls: string[]
          estimated_cost: string | null
          estimated_duration: string | null
          id: string
          is_approved: boolean
          linked_trip_service_id: string | null
          location: string | null
          maps_url: string | null
          order_index: number
          period: string
          photo_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_id: string
          description?: string | null
          document_urls?: string[]
          estimated_cost?: string | null
          estimated_duration?: string | null
          id?: string
          is_approved?: boolean
          linked_trip_service_id?: string | null
          location?: string | null
          maps_url?: string | null
          order_index?: number
          period: string
          photo_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_id?: string
          description?: string | null
          document_urls?: string[]
          estimated_cost?: string | null
          estimated_duration?: string | null
          id?: string
          is_approved?: boolean
          linked_trip_service_id?: string | null
          location?: string | null
          maps_url?: string | null
          order_index?: number
          period?: string
          photo_url?: string | null
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
          {
            foreignKeyName: "itinerary_activities_linked_trip_service_id_fkey"
            columns: ["linked_trip_service_id"]
            isOneToOne: false
            referencedRelation: "trip_services"
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
      itinerary_template_activities: {
        Row: {
          category: string | null
          created_at: string
          day_number: number
          description: string | null
          estimated_cost: string | null
          estimated_duration: string | null
          id: string
          location: string | null
          order_index: number
          period: string
          photo_url: string | null
          priority: string
          template_id: string
          title: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          day_number: number
          description?: string | null
          estimated_cost?: string | null
          estimated_duration?: string | null
          id?: string
          location?: string | null
          order_index?: number
          period: string
          photo_url?: string | null
          priority?: string
          template_id: string
          title: string
        }
        Update: {
          category?: string | null
          created_at?: string
          day_number?: number
          description?: string | null
          estimated_cost?: string | null
          estimated_duration?: string | null
          id?: string
          location?: string | null
          order_index?: number
          period?: string
          photo_url?: string | null
          priority?: string
          template_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_template_activities_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "itinerary_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_templates: {
        Row: {
          additional_preferences: Json
          cover_image_url: string | null
          created_at: string
          destination: string | null
          destination_intro_images: Json
          destination_intro_text: string | null
          id: string
          interests: string[]
          name: string
          nights_count: number
          pace: string
          profile: string
          source_itinerary_id: string | null
          style: string
          tags: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          additional_preferences?: Json
          cover_image_url?: string | null
          created_at?: string
          destination?: string | null
          destination_intro_images?: Json
          destination_intro_text?: string | null
          id?: string
          interests?: string[]
          name: string
          nights_count?: number
          pace?: string
          profile?: string
          source_itinerary_id?: string | null
          style?: string
          tags?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          additional_preferences?: Json
          cover_image_url?: string | null
          created_at?: string
          destination?: string | null
          destination_intro_images?: Json
          destination_intro_text?: string | null
          id?: string
          interests?: string[]
          name?: string
          nights_count?: number
          pace?: string
          profile?: string
          source_itinerary_id?: string | null
          style?: string
          tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lead_capture_forms: {
        Row: {
          agency_name_override: string | null
          ai_enabled: boolean
          ask_budget: boolean
          ask_dates: boolean
          ask_email: boolean
          ask_travelers: boolean
          brand_color: string | null
          closing_message: string | null
          consultant_name_override: string | null
          consultant_photo_url_override: string | null
          consultant_role_override: string | null
          created_at: string | null
          headline: string | null
          hours_confirmed: boolean
          id: string
          is_active: boolean | null
          leads_count: number
          logo_url_override: string | null
          office_hours: Json
          privacy_url: string | null
          require_email: boolean
          terms_url: string | null
          test_mode_until: string | null
          timezone: string
          token: string
          updated_at: string | null
          user_id: string
          views_count: number
          welcome_message: string | null
          whatsapp_override: string | null
        }
        Insert: {
          agency_name_override?: string | null
          ai_enabled?: boolean
          ask_budget?: boolean
          ask_dates?: boolean
          ask_email?: boolean
          ask_travelers?: boolean
          brand_color?: string | null
          closing_message?: string | null
          consultant_name_override?: string | null
          consultant_photo_url_override?: string | null
          consultant_role_override?: string | null
          created_at?: string | null
          headline?: string | null
          hours_confirmed?: boolean
          id?: string
          is_active?: boolean | null
          leads_count?: number
          logo_url_override?: string | null
          office_hours?: Json
          privacy_url?: string | null
          require_email?: boolean
          terms_url?: string | null
          test_mode_until?: string | null
          timezone?: string
          token?: string
          updated_at?: string | null
          user_id: string
          views_count?: number
          welcome_message?: string | null
          whatsapp_override?: string | null
        }
        Update: {
          agency_name_override?: string | null
          ai_enabled?: boolean
          ask_budget?: boolean
          ask_dates?: boolean
          ask_email?: boolean
          ask_travelers?: boolean
          brand_color?: string | null
          closing_message?: string | null
          consultant_name_override?: string | null
          consultant_photo_url_override?: string | null
          consultant_role_override?: string | null
          created_at?: string | null
          headline?: string | null
          hours_confirmed?: boolean
          id?: string
          is_active?: boolean | null
          leads_count?: number
          logo_url_override?: string | null
          office_hours?: Json
          privacy_url?: string | null
          require_email?: boolean
          terms_url?: string | null
          test_mode_until?: string | null
          timezone?: string
          token?: string
          updated_at?: string | null
          user_id?: string
          views_count?: number
          welcome_message?: string | null
          whatsapp_override?: string | null
        }
        Relationships: []
      }
      lead_captures: {
        Row: {
          additional_info: string | null
          agent_user_id: string
          ai_suggestion: string | null
          attended_at: string | null
          budget: string | null
          client_id: string | null
          consent_at: string | null
          consent_version: string | null
          created_at: string | null
          destination: string | null
          form_id: string
          id: string
          idempotency_key: string | null
          is_read: boolean | null
          is_test: boolean
          lead_email: string | null
          lead_name: string
          lead_phone: string
          lead_summary: string | null
          opportunity_id: string | null
          session_id: string | null
          source_url: string | null
          status: string | null
          travel_dates: string | null
          travelers_count: string | null
          utm: Json | null
          whatsapp_message: string | null
          within_office_hours: boolean | null
        }
        Insert: {
          additional_info?: string | null
          agent_user_id: string
          ai_suggestion?: string | null
          attended_at?: string | null
          budget?: string | null
          client_id?: string | null
          consent_at?: string | null
          consent_version?: string | null
          created_at?: string | null
          destination?: string | null
          form_id: string
          id?: string
          idempotency_key?: string | null
          is_read?: boolean | null
          is_test?: boolean
          lead_email?: string | null
          lead_name: string
          lead_phone: string
          lead_summary?: string | null
          opportunity_id?: string | null
          session_id?: string | null
          source_url?: string | null
          status?: string | null
          travel_dates?: string | null
          travelers_count?: string | null
          utm?: Json | null
          whatsapp_message?: string | null
          within_office_hours?: boolean | null
        }
        Update: {
          additional_info?: string | null
          agent_user_id?: string
          ai_suggestion?: string | null
          attended_at?: string | null
          budget?: string | null
          client_id?: string | null
          consent_at?: string | null
          consent_version?: string | null
          created_at?: string | null
          destination?: string | null
          form_id?: string
          id?: string
          idempotency_key?: string | null
          is_read?: boolean | null
          is_test?: boolean
          lead_email?: string | null
          lead_name?: string
          lead_phone?: string
          lead_summary?: string | null
          opportunity_id?: string | null
          session_id?: string | null
          source_url?: string | null
          status?: string | null
          travel_dates?: string | null
          travelers_count?: string | null
          utm?: Json | null
          whatsapp_message?: string | null
          within_office_hours?: boolean | null
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
      lead_form_lead_deliveries: {
        Row: {
          attempts: number
          channel: string
          claimed_at: string | null
          created_at: string
          error_message: string | null
          form_id: string
          id: string
          lead_id: string
          provider_message_id: string | null
          recipient_email: string
          recipient_kind: string
          recipient_member_id: string | null
          scheduled_for: string
          sent_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          channel?: string
          claimed_at?: string | null
          created_at?: string
          error_message?: string | null
          form_id: string
          id?: string
          lead_id: string
          provider_message_id?: string | null
          recipient_email: string
          recipient_kind?: string
          recipient_member_id?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          channel?: string
          claimed_at?: string | null
          created_at?: string
          error_message?: string | null
          form_id?: string
          id?: string
          lead_id?: string
          provider_message_id?: string | null
          recipient_email?: string
          recipient_kind?: string
          recipient_member_id?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_form_lead_deliveries_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "lead_capture_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_form_lead_deliveries_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_captures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_form_lead_deliveries_recipient_member_id_fkey"
            columns: ["recipient_member_id"]
            isOneToOne: false
            referencedRelation: "agency_team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_form_notification_recipients: {
        Row: {
          active: boolean
          created_at: string
          email: string
          form_id: string
          id: string
          kind: string
          team_member_id: string | null
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          form_id: string
          id?: string
          kind?: string
          team_member_id?: string | null
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          form_id?: string
          id?: string
          kind?: string
          team_member_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_form_notification_recipients_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "lead_capture_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_form_notification_recipients_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "agency_team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_form_notification_settings: {
        Row: {
          allow_test_sends: boolean
          created_at: string
          email_enabled: boolean
          form_id: string
          id: string
          include_owner: boolean
          notify_days: string[]
          notify_end: string
          notify_start: string
          outside_behavior: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allow_test_sends?: boolean
          created_at?: string
          email_enabled?: boolean
          form_id: string
          id?: string
          include_owner?: boolean
          notify_days?: string[]
          notify_end?: string
          notify_start?: string
          outside_behavior?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allow_test_sends?: boolean
          created_at?: string
          email_enabled?: boolean
          form_id?: string
          id?: string
          include_owner?: boolean
          notify_days?: string[]
          notify_end?: string
          notify_start?: string
          outside_behavior?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_form_notification_settings_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: true
            referencedRelation: "lead_capture_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_form_views: {
        Row: {
          created_at: string
          form_id: string
          id: string
          is_test: boolean
          session_hash: string
          user_id: string
          viewed_date: string
        }
        Insert: {
          created_at?: string
          form_id: string
          id?: string
          is_test?: boolean
          session_hash: string
          user_id: string
          viewed_date?: string
        }
        Update: {
          created_at?: string
          form_id?: string
          id?: string
          is_test?: boolean
          session_hash?: string
          user_id?: string
          viewed_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_form_views_form_id_fkey"
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
      material_import_sources: {
        Row: {
          created_at: string
          created_by: string | null
          folder_id: string
          folder_url: string
          id: string
          is_active: boolean
          label: string | null
          last_sync_at: string | null
          last_sync_result: Json | null
          provider: string
          supplier_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          folder_id: string
          folder_url: string
          id?: string
          is_active?: boolean
          label?: string | null
          last_sync_at?: string | null
          last_sync_result?: Json | null
          provider?: string
          supplier_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          folder_id?: string
          folder_url?: string
          id?: string
          is_active?: boolean
          label?: string | null
          last_sync_at?: string | null
          last_sync_result?: Json | null
          provider?: string
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_import_sources_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "tour_operators"
            referencedColumns: ["id"]
          },
        ]
      }
      material_imported_files: {
        Row: {
          created_at: string
          file_name: string
          id: string
          imported_at: string
          imported_by: string | null
          material_id: string | null
          mime_type: string | null
          provider: string
          provider_file_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          size_bytes: number | null
          source_id: string | null
          source_url: string | null
          status: string
          storage_bucket: string
          storage_path: string
          supplier_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          imported_at?: string
          imported_by?: string | null
          material_id?: string | null
          mime_type?: string | null
          provider?: string
          provider_file_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          size_bytes?: number | null
          source_id?: string | null
          source_url?: string | null
          status?: string
          storage_bucket?: string
          storage_path: string
          supplier_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          imported_at?: string
          imported_by?: string | null
          material_id?: string | null
          mime_type?: string | null
          provider?: string
          provider_file_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          size_bytes?: number | null
          source_id?: string | null
          source_url?: string | null
          status?: string
          storage_bucket?: string
          storage_path?: string
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_imported_files_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_imported_files_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "material_import_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_imported_files_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "tour_operators"
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
      news_collector_runs: {
        Row: {
          broken_links_count: number
          created_at: string
          duration_ms: number | null
          errors: Json
          finished_at: string | null
          found_count: number
          id: string
          inserted_count: number
          invalid_count: number
          others_count: number
          portal: string
          skipped_duplicates_count: number
          started_at: string
          status: string
          trigger_source: string
          updated_count: number
        }
        Insert: {
          broken_links_count?: number
          created_at?: string
          duration_ms?: number | null
          errors?: Json
          finished_at?: string | null
          found_count?: number
          id?: string
          inserted_count?: number
          invalid_count?: number
          others_count?: number
          portal: string
          skipped_duplicates_count?: number
          started_at?: string
          status?: string
          trigger_source?: string
          updated_count?: number
        }
        Update: {
          broken_links_count?: number
          created_at?: string
          duration_ms?: number | null
          errors?: Json
          finished_at?: string | null
          found_count?: number
          id?: string
          inserted_count?: number
          invalid_count?: number
          others_count?: number
          portal?: string
          skipped_duplicates_count?: number
          started_at?: string
          status?: string
          trigger_source?: string
          updated_count?: number
        }
        Relationships: []
      }
      news_curation: {
        Row: {
          created_at: string
          created_by: string | null
          curation_type: string
          id: string
          noticia_id: string
          period_start: string
          position: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          curation_type: string
          id?: string
          noticia_id: string
          period_start: string
          position?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          curation_type?: string
          id?: string
          noticia_id?: string
          period_start?: string
          position?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_curation_noticia_id_fkey"
            columns: ["noticia_id"]
            isOneToOne: false
            referencedRelation: "noticias_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      news_curation_audit: {
        Row: {
          action: string
          admin_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          curation_type: string | null
          id: string
          period_start: string | null
          position: number | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          curation_type?: string | null
          id?: string
          period_start?: string | null
          position?: number | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          curation_type?: string | null
          id?: string
          period_start?: string | null
          position?: number | null
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
      news_reads: {
        Row: {
          id: string
          noticia_id: string
          read_at: string
          read_date: string
          user_id: string
        }
        Insert: {
          id?: string
          noticia_id: string
          read_at?: string
          read_date?: string
          user_id: string
        }
        Update: {
          id?: string
          noticia_id?: string
          read_at?: string
          read_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_reads_noticia_id_fkey"
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
          content_hash: string | null
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
          content_hash?: string | null
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
          content_hash?: string | null
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
          classification_confidence: number | null
          created_at: string
          data_publicacao: string
          fonte: string
          hidden: boolean
          id: string
          is_noticia_do_dia: boolean
          likes_count: number
          nivel_alerta: string
          noticia_bruta_id: string | null
          reads_count: number
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
          classification_confidence?: number | null
          created_at?: string
          data_publicacao?: string
          fonte: string
          hidden?: boolean
          id?: string
          is_noticia_do_dia?: boolean
          likes_count?: number
          nivel_alerta?: string
          noticia_bruta_id?: string | null
          reads_count?: number
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
          classification_confidence?: number | null
          created_at?: string
          data_publicacao?: string
          fonte?: string
          hidden?: boolean
          id?: string
          is_noticia_do_dia?: boolean
          likes_count?: number
          nivel_alerta?: string
          noticia_bruta_id?: string | null
          reads_count?: number
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
      operation_attachments: {
        Row: {
          category: string
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          operation_id: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          operation_id: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          operation_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operation_attachments_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_checklist_templates: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          items: Json
          name: string
          stage: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          items?: Json
          name?: string
          stage: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          items?: Json
          name?: string
          stage?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      operation_label_assignments: {
        Row: {
          created_at: string
          id: string
          label_id: string
          operation_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label_id: string
          operation_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label_id?: string
          operation_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operation_label_assignments_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "operation_labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_label_assignments_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_labels: {
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
      operation_pipeline_stages: {
        Row: {
          color: string
          created_at: string
          id: string
          is_protected: boolean
          key: string
          legacy_key: string | null
          name: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_protected?: boolean
          key: string
          legacy_key?: string | null
          name: string
          position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_protected?: boolean
          key?: string
          legacy_key?: string | null
          name?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      operation_services: {
        Row: {
          amount: number
          created_at: string
          created_by_team_member_id: string | null
          destination: string | null
          end_date: string | null
          id: string
          is_confirmed: boolean
          is_delivered: boolean
          is_issued: boolean
          is_paid: boolean
          name: string
          notes: string | null
          operation_id: string
          position: number
          service_data: Json
          service_type: string
          source_quote_service_id: string | null
          start_date: string | null
          supplier: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by_team_member_id?: string | null
          destination?: string | null
          end_date?: string | null
          id?: string
          is_confirmed?: boolean
          is_delivered?: boolean
          is_issued?: boolean
          is_paid?: boolean
          name?: string
          notes?: string | null
          operation_id: string
          position?: number
          service_data?: Json
          service_type?: string
          source_quote_service_id?: string | null
          start_date?: string | null
          supplier?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by_team_member_id?: string | null
          destination?: string | null
          end_date?: string | null
          id?: string
          is_confirmed?: boolean
          is_delivered?: boolean
          is_issued?: boolean
          is_paid?: boolean
          name?: string
          notes?: string | null
          operation_id?: string
          position?: number
          service_data?: Json
          service_type?: string
          source_quote_service_id?: string | null
          start_date?: string | null
          supplier?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operation_services_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_stage_checklist_templates: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          items: Json
          name: string
          stage: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          items?: Json
          name?: string
          stage: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          items?: Json
          name?: string
          stage?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      operation_tasks: {
        Row: {
          created_at: string
          done_at: string | null
          done_by: string | null
          id: string
          is_done: boolean
          label: string
          operation_id: string
          position: number
          stage: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          done_at?: string | null
          done_by?: string | null
          id?: string
          is_done?: boolean
          label: string
          operation_id: string
          position?: number
          stage: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          done_at?: string | null
          done_by?: string | null
          id?: string
          is_done?: boolean
          label?: string
          operation_id?: string
          position?: number
          stage?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operation_tasks_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_timeline: {
        Row: {
          created_at: string
          description: string | null
          event_type: string
          id: string
          metadata: Json
          operation_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          metadata?: Json
          operation_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          metadata?: Json
          operation_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operation_timeline_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      operations: {
        Row: {
          assigned_team_member_id: string | null
          assigned_user_id: string | null
          client_id: string
          created_at: string
          created_by_team_member_id: string | null
          destination: string | null
          id: string
          itinerary_id: string | null
          notes: string | null
          notification_preferences: Json
          opportunity_id: string | null
          passengers_count: number
          payment_status: string
          position: number
          priority: string
          quote_id: string | null
          sale_amount: number
          stage: string
          stage_entered_at: string
          title: string
          travel_end_date: string | null
          travel_start_date: string | null
          trip_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_team_member_id?: string | null
          assigned_user_id?: string | null
          client_id: string
          created_at?: string
          created_by_team_member_id?: string | null
          destination?: string | null
          id?: string
          itinerary_id?: string | null
          notes?: string | null
          notification_preferences?: Json
          opportunity_id?: string | null
          passengers_count?: number
          payment_status?: string
          position?: number
          priority?: string
          quote_id?: string | null
          sale_amount?: number
          stage?: string
          stage_entered_at?: string
          title?: string
          travel_end_date?: string | null
          travel_start_date?: string | null
          trip_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_team_member_id?: string | null
          assigned_user_id?: string | null
          client_id?: string
          created_at?: string
          created_by_team_member_id?: string | null
          destination?: string | null
          id?: string
          itinerary_id?: string | null
          notes?: string | null
          notification_preferences?: Json
          opportunity_id?: string | null
          passengers_count?: number
          payment_status?: string
          position?: number
          priority?: string
          quote_id?: string | null
          sale_amount?: number
          stage?: string
          stage_entered_at?: string
          title?: string
          travel_end_date?: string | null
          travel_start_date?: string | null
          trip_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
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
          assigned_team_member_id: string | null
          children_count: number
          client_id: string
          created_at: string
          created_by_team_member_id: string | null
          destination: string
          end_date: string | null
          estimated_value: number
          follow_up_date: string | null
          id: string
          notes: string | null
          passengers_count: number
          position: number
          stage: string
          stage_entered_at: string | null
          stage_id: string | null
          start_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          adults_count?: number
          assigned_team_member_id?: string | null
          children_count?: number
          client_id: string
          created_at?: string
          created_by_team_member_id?: string | null
          destination: string
          end_date?: string | null
          estimated_value?: number
          follow_up_date?: string | null
          id?: string
          notes?: string | null
          passengers_count?: number
          position?: number
          stage?: string
          stage_entered_at?: string | null
          stage_id?: string | null
          start_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          adults_count?: number
          assigned_team_member_id?: string | null
          children_count?: number
          client_id?: string
          created_at?: string
          created_by_team_member_id?: string | null
          destination?: string
          end_date?: string | null
          estimated_value?: number
          follow_up_date?: string | null
          id?: string
          notes?: string | null
          passengers_count?: number
          position?: number
          stage?: string
          stage_entered_at?: string | null
          stage_id?: string | null
          start_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_assigned_team_member_id_fkey"
            columns: ["assigned_team_member_id"]
            isOneToOne: false
            referencedRelation: "agency_team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_followups: {
        Row: {
          created_at: string
          created_by: string | null
          follow_up_date: string
          id: string
          note: string | null
          opportunity_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          follow_up_date: string
          id?: string
          note?: string | null
          opportunity_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          follow_up_date?: string
          id?: string
          note?: string | null
          opportunity_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_followups_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
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
      pipeline_stages: {
        Row: {
          color: string
          created_at: string
          id: string
          is_default: boolean
          legacy_key: string | null
          name: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_default?: boolean
          legacy_key?: string | null
          name: string
          position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_default?: boolean
          legacy_key?: string | null
          name?: string
          position?: number
          updated_at?: string
          user_id?: string
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
      plan_team_limits: {
        Row: {
          max_members: number
          owner_counts: boolean
          plan: Database["public"]["Enums"]["subscription_plan"]
          updated_at: string
        }
        Insert: {
          max_members?: number
          owner_counts?: boolean
          plan: Database["public"]["Enums"]["subscription_plan"]
          updated_at?: string
        }
        Update: {
          max_members?: number
          owner_counts?: boolean
          plan?: Database["public"]["Enums"]["subscription_plan"]
          updated_at?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value?: Json
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
      product_landing_lead_deliveries: {
        Row: {
          attempts: number
          channel: string
          claimed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          landing_id: string
          lead_id: string
          provider_message_id: string | null
          recipient_email: string
          recipient_kind: string
          recipient_member_id: string | null
          scheduled_for: string
          sent_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          channel?: string
          claimed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          landing_id: string
          lead_id: string
          provider_message_id?: string | null
          recipient_email: string
          recipient_kind?: string
          recipient_member_id?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          channel?: string
          claimed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          landing_id?: string
          lead_id?: string
          provider_message_id?: string | null
          recipient_email?: string
          recipient_kind?: string
          recipient_member_id?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_landing_lead_deliveries_landing_id_fkey"
            columns: ["landing_id"]
            isOneToOne: false
            referencedRelation: "agency_product_landings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_landing_lead_deliveries_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "product_landing_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_landing_lead_deliveries_recipient_member_id_fkey"
            columns: ["recipient_member_id"]
            isOneToOne: false
            referencedRelation: "agency_team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      product_landing_leads: {
        Row: {
          adults: number | null
          assigned_team_member_id: string | null
          assignment_reason: string | null
          attended_at: string | null
          children: number | null
          children_ages: string | null
          client_id: string | null
          consent_accepted: boolean
          consent_at: string | null
          consent_policy_version: string | null
          consent_terms_version: string | null
          created_at: string
          id: string
          idempotency_key: string | null
          interest_category: string | null
          is_read: boolean
          is_test: boolean
          landing_id: string
          lead_email: string | null
          lead_name: string
          lead_phone: string
          message: string | null
          opportunity_id: string | null
          origin_city: string | null
          page_url: string | null
          product_key: string
          referrer: string | null
          travel_period: string | null
          user_agent: string | null
          user_id: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          adults?: number | null
          assigned_team_member_id?: string | null
          assignment_reason?: string | null
          attended_at?: string | null
          children?: number | null
          children_ages?: string | null
          client_id?: string | null
          consent_accepted?: boolean
          consent_at?: string | null
          consent_policy_version?: string | null
          consent_terms_version?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          interest_category?: string | null
          is_read?: boolean
          is_test?: boolean
          landing_id: string
          lead_email?: string | null
          lead_name: string
          lead_phone: string
          message?: string | null
          opportunity_id?: string | null
          origin_city?: string | null
          page_url?: string | null
          product_key: string
          referrer?: string | null
          travel_period?: string | null
          user_agent?: string | null
          user_id: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          adults?: number | null
          assigned_team_member_id?: string | null
          assignment_reason?: string | null
          attended_at?: string | null
          children?: number | null
          children_ages?: string | null
          client_id?: string | null
          consent_accepted?: boolean
          consent_at?: string | null
          consent_policy_version?: string | null
          consent_terms_version?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          interest_category?: string | null
          is_read?: boolean
          is_test?: boolean
          landing_id?: string
          lead_email?: string | null
          lead_name?: string
          lead_phone?: string
          message?: string | null
          opportunity_id?: string | null
          origin_city?: string | null
          page_url?: string | null
          product_key?: string
          referrer?: string | null
          travel_period?: string | null
          user_agent?: string | null
          user_id?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_landing_leads_assigned_team_member_id_fkey"
            columns: ["assigned_team_member_id"]
            isOneToOne: false
            referencedRelation: "agency_team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_landing_leads_landing_id_fkey"
            columns: ["landing_id"]
            isOneToOne: false
            referencedRelation: "agency_product_landings"
            referencedColumns: ["id"]
          },
        ]
      }
      product_landing_notification_recipients: {
        Row: {
          active: boolean
          created_at: string
          email: string
          id: string
          kind: string
          landing_id: string
          team_member_id: string | null
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          id?: string
          kind?: string
          landing_id: string
          team_member_id?: string | null
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          id?: string
          kind?: string
          landing_id?: string
          team_member_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_landing_notification_recipients_landing_id_fkey"
            columns: ["landing_id"]
            isOneToOne: false
            referencedRelation: "agency_product_landings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_landing_notification_recipients_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "agency_team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      product_landing_notification_settings: {
        Row: {
          allow_test_sends: boolean
          created_at: string
          default_assignee_member_id: string | null
          email_enabled: boolean
          id: string
          include_owner: boolean
          landing_id: string
          notify_days: string[]
          notify_end: string
          notify_start: string
          outside_behavior: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allow_test_sends?: boolean
          created_at?: string
          default_assignee_member_id?: string | null
          email_enabled?: boolean
          id?: string
          include_owner?: boolean
          landing_id: string
          notify_days?: string[]
          notify_end?: string
          notify_start?: string
          outside_behavior?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allow_test_sends?: boolean
          created_at?: string
          default_assignee_member_id?: string | null
          email_enabled?: boolean
          id?: string
          include_owner?: boolean
          landing_id?: string
          notify_days?: string[]
          notify_end?: string
          notify_start?: string
          outside_behavior?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_landing_notification_se_default_assignee_member_id_fkey"
            columns: ["default_assignee_member_id"]
            isOneToOne: false
            referencedRelation: "agency_team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_landing_notification_settings_landing_id_fkey"
            columns: ["landing_id"]
            isOneToOne: true
            referencedRelation: "agency_product_landings"
            referencedColumns: ["id"]
          },
        ]
      }
      product_landing_views: {
        Row: {
          created_at: string
          id: string
          is_test: boolean
          landing_id: string
          session_hash: string
          viewed_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_test?: boolean
          landing_id: string
          session_hash: string
          viewed_date?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_test?: boolean
          landing_id?: string
          session_hash?: string
          viewed_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_landing_views_landing_id_fkey"
            columns: ["landing_id"]
            isOneToOne: false
            referencedRelation: "agency_product_landings"
            referencedColumns: ["id"]
          },
        ]
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
          agency_primary_color: string | null
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
          public_slug: string | null
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
          agency_primary_color?: string | null
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
          public_slug?: string | null
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
          agency_primary_color?: string | null
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
          public_slug?: string | null
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
      quote_entry_extras: {
        Row: {
          calculation_mode: string
          created_at: string
          description: string | null
          id: string
          quote_id: string
          sort_order: number
          type: string
          updated_at: string
          value: number
          visible_to_client: boolean
        }
        Insert: {
          calculation_mode?: string
          created_at?: string
          description?: string | null
          id?: string
          quote_id: string
          sort_order?: number
          type: string
          updated_at?: string
          value?: number
          visible_to_client?: boolean
        }
        Update: {
          calculation_mode?: string
          created_at?: string
          description?: string | null
          id?: string
          quote_id?: string
          sort_order?: number
          type?: string
          updated_at?: string
          value?: number
          visible_to_client?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "quote_entry_extras_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_sections: {
        Row: {
          created_at: string
          id: string
          order_index: number
          quote_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_index?: number
          quote_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_index?: number
          quote_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_sections_quote_id_fkey"
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
          section_id: string | null
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
          section_id?: string | null
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
          section_id?: string | null
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
          {
            foreignKeyName: "quote_services_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "quote_sections"
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
          hide_investment_total: boolean | null
          id: string
          installments_count: number | null
          investment_summary_layout: string | null
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
          signature_snapshot: Json | null
          start_date: string
          status: string
          total_amount: number
          trip_title: string | null
          updated_at: string
          use_service_payment: boolean
          user_id: string
          valid_until: string | null
          validity_disclaimer: string
          whats_included: Json | null
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
          hide_investment_total?: boolean | null
          id?: string
          installments_count?: number | null
          investment_summary_layout?: string | null
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
          signature_snapshot?: Json | null
          start_date: string
          status?: string
          total_amount?: number
          trip_title?: string | null
          updated_at?: string
          use_service_payment?: boolean
          user_id: string
          valid_until?: string | null
          validity_disclaimer?: string
          whats_included?: Json | null
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
          hide_investment_total?: boolean | null
          id?: string
          installments_count?: number | null
          investment_summary_layout?: string | null
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
          signature_snapshot?: Json | null
          start_date?: string
          status?: string
          total_amount?: number
          trip_title?: string | null
          updated_at?: string
          use_service_payment?: boolean
          user_id?: string
          valid_until?: string | null
          validity_disclaimer?: string
          whats_included?: Json | null
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
      raffle_winners: {
        Row: {
          drawn_at: string
          id: string
          position: number | null
          prize: string | null
          raffle_id: string
          user_id: string
          winner_data: Json | null
          winner_name: string
        }
        Insert: {
          drawn_at?: string
          id?: string
          position?: number | null
          prize?: string | null
          raffle_id: string
          user_id: string
          winner_data?: Json | null
          winner_name: string
        }
        Update: {
          drawn_at?: string
          id?: string
          position?: number | null
          prize?: string | null
          raffle_id?: string
          user_id?: string
          winner_data?: Json | null
          winner_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "raffle_winners_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
        ]
      }
      raffles: {
        Row: {
          academy_trail_id: string | null
          academy_training_id: string | null
          created_at: string
          draw_params: Json
          eligible_count: number
          event_label: string | null
          filters: Json
          id: string
          participants: Json
          participants_count: number
          source: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          academy_trail_id?: string | null
          academy_training_id?: string | null
          created_at?: string
          draw_params?: Json
          eligible_count?: number
          event_label?: string | null
          filters?: Json
          id?: string
          participants?: Json
          participants_count?: number
          source?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          academy_trail_id?: string | null
          academy_training_id?: string | null
          created_at?: string
          draw_params?: Json
          eligible_count?: number
          event_label?: string | null
          filters?: Json
          id?: string
          participants?: Json
          participants_count?: number
          source?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      sale_contract_acceptances: {
        Row: {
          acceptance_type: string
          accepted_at: string
          authentication_code: string | null
          contract_id: string
          created_at: string
          id: string
          ip_address: string | null
          signer_document: string | null
          signer_email: string | null
          signer_name: string
          user_agent: string | null
        }
        Insert: {
          acceptance_type?: string
          accepted_at?: string
          authentication_code?: string | null
          contract_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          signer_document?: string | null
          signer_email?: string | null
          signer_name: string
          user_agent?: string | null
        }
        Update: {
          acceptance_type?: string
          accepted_at?: string
          authentication_code?: string | null
          contract_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          signer_document?: string | null
          signer_email?: string | null
          signer_name?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_contract_acceptances_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "sale_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_contract_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          agency_id: string
          contract_id: string | null
          created_at: string
          details: Json
          id: string
          sale_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          agency_id: string
          contract_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          sale_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          agency_id?: string
          contract_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          sale_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_contract_audit_logs_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "sale_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_contracts: {
        Row: {
          agency_id: string
          agency_snapshot_json: Json
          attachments_json: Json
          client_snapshot_json: Json
          contract_number: string
          created_at: string
          document_hash: string | null
          financial_snapshot_json: Json
          generated_at: string
          generated_by: string | null
          generated_html: string | null
          generated_payload_json: Json
          id: string
          passengers_snapshot_json: Json
          pdf_file_name: string | null
          pdf_generated_at: string | null
          pdf_generator_version: string | null
          pdf_mime_type: string | null
          pdf_sha256: string | null
          pdf_size_bytes: number | null
          pdf_storage_path: string | null
          pdf_url: string | null
          revision: number
          sale_id: string
          services_snapshot_json: Json
          source_hash: string | null
          status: string
          supersedes_contract_id: string | null
          template_id: string | null
          template_version: number | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          agency_snapshot_json?: Json
          attachments_json?: Json
          client_snapshot_json?: Json
          contract_number: string
          created_at?: string
          document_hash?: string | null
          financial_snapshot_json?: Json
          generated_at?: string
          generated_by?: string | null
          generated_html?: string | null
          generated_payload_json?: Json
          id?: string
          passengers_snapshot_json?: Json
          pdf_file_name?: string | null
          pdf_generated_at?: string | null
          pdf_generator_version?: string | null
          pdf_mime_type?: string | null
          pdf_sha256?: string | null
          pdf_size_bytes?: number | null
          pdf_storage_path?: string | null
          pdf_url?: string | null
          revision?: number
          sale_id: string
          services_snapshot_json?: Json
          source_hash?: string | null
          status?: string
          supersedes_contract_id?: string | null
          template_id?: string | null
          template_version?: number | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          agency_snapshot_json?: Json
          attachments_json?: Json
          client_snapshot_json?: Json
          contract_number?: string
          created_at?: string
          document_hash?: string | null
          financial_snapshot_json?: Json
          generated_at?: string
          generated_by?: string | null
          generated_html?: string | null
          generated_payload_json?: Json
          id?: string
          passengers_snapshot_json?: Json
          pdf_file_name?: string | null
          pdf_generated_at?: string | null
          pdf_generator_version?: string | null
          pdf_mime_type?: string | null
          pdf_sha256?: string | null
          pdf_size_bytes?: number | null
          pdf_storage_path?: string | null
          pdf_url?: string | null
          revision?: number
          sale_id?: string
          services_snapshot_json?: Json
          source_hash?: string | null
          status?: string
          supersedes_contract_id?: string | null
          template_id?: string | null
          template_version?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_contracts_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_contracts_supersedes_contract_id_fkey"
            columns: ["supersedes_contract_id"]
            isOneToOne: false
            referencedRelation: "sale_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_contracts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "agency_contract_templates"
            referencedColumns: ["id"]
          },
        ]
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
          operator_id: string | null
          payment_days: number | null
          payment_rule: string | null
          product_type: string
          received_amount: number
          received_date: string | null
          requires_invoice: boolean | null
          sale_id: string
          sale_price: number
          source_kind: string | null
          source_provenance: Json
          source_service_id: string | null
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
          operator_id?: string | null
          payment_days?: number | null
          payment_rule?: string | null
          product_type: string
          received_amount?: number
          received_date?: string | null
          requires_invoice?: boolean | null
          sale_id: string
          sale_price?: number
          source_kind?: string | null
          source_provenance?: Json
          source_service_id?: string | null
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
          operator_id?: string | null
          payment_days?: number | null
          payment_rule?: string | null
          product_type?: string
          received_amount?: number
          received_date?: string | null
          requires_invoice?: boolean | null
          sale_id?: string
          sale_price?: number
          source_kind?: string | null
          source_provenance?: Json
          source_service_id?: string | null
          supplier_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_products_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "tour_operators"
            referencedColumns: ["id"]
          },
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
          import_fingerprint: string | null
          import_provenance: Json
          include_in_billing: boolean | null
          notes: string | null
          opportunity_id: string | null
          origin: string | null
          payment_method: string | null
          sale_amount: number
          sale_date: string
          seller_commission_percent: number | null
          seller_id: string | null
          source_operation_id: string | null
          source_quote_id: string | null
          source_trip_id: string | null
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
          import_fingerprint?: string | null
          import_provenance?: Json
          include_in_billing?: boolean | null
          notes?: string | null
          opportunity_id?: string | null
          origin?: string | null
          payment_method?: string | null
          sale_amount?: number
          sale_date?: string
          seller_commission_percent?: number | null
          seller_id?: string | null
          source_operation_id?: string | null
          source_quote_id?: string | null
          source_trip_id?: string | null
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
          import_fingerprint?: string | null
          import_provenance?: Json
          include_in_billing?: boolean | null
          notes?: string | null
          opportunity_id?: string | null
          origin?: string | null
          payment_method?: string | null
          sale_amount?: number
          sale_date?: string
          seller_commission_percent?: number | null
          seller_id?: string | null
          source_operation_id?: string | null
          source_quote_id?: string | null
          source_trip_id?: string | null
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
          attended_at: string | null
          client_id: string | null
          created_at: string
          id: string
          is_read: boolean
          landing_id: string
          lead_name: string
          lead_phone: string
          opportunity_id: string | null
          user_id: string
        }
        Insert: {
          attended_at?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          landing_id: string
          lead_name: string
          lead_phone: string
          opportunity_id?: string | null
          user_id: string
        }
        Update: {
          attended_at?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
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
      supplier_community_reviews: {
        Row: {
          comment: string | null
          comment_status: string
          created_at: string
          id: string
          legacy_review_id: string | null
          legacy_table: string | null
          moderated_at: string | null
          moderated_by: string | null
          moderation_reason: string | null
          rating: number
          supplier_id: string
          supplier_source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          comment_status?: string
          created_at?: string
          id?: string
          legacy_review_id?: string | null
          legacy_table?: string | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reason?: string | null
          rating: number
          supplier_id: string
          supplier_source: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          comment_status?: string
          created_at?: string
          id?: string
          legacy_review_id?: string | null
          legacy_table?: string | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reason?: string | null
          rating?: number
          supplier_id?: string
          supplier_source?: string
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
          operator_id: string | null
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
          operator_id?: string | null
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
          operator_id?: string | null
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
            foreignKeyName: "supplier_payments_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "tour_operators"
            referencedColumns: ["id"]
          },
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
      supplier_review_moderation_events: {
        Row: {
          action: string
          comment_snapshot: string | null
          created_at: string
          id: string
          moderated_by: string
          rating: number | null
          reason: string | null
          review_id: string
          reviewer_user_id: string
          supplier_id: string
          supplier_source: string
        }
        Insert: {
          action: string
          comment_snapshot?: string | null
          created_at?: string
          id?: string
          moderated_by: string
          rating?: number | null
          reason?: string | null
          review_id: string
          reviewer_user_id: string
          supplier_id: string
          supplier_source: string
        }
        Update: {
          action?: string
          comment_snapshot?: string | null
          created_at?: string
          id?: string
          moderated_by?: string
          rating?: number | null
          reason?: string | null
          review_id?: string
          reviewer_user_id?: string
          supplier_id?: string
          supplier_source?: string
        }
        Relationships: []
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
      supplier_review_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_user_id: string
          resolved_at: string | null
          resolved_by: string | null
          review_id: string
          status: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_user_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          review_id: string
          status?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_user_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          review_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_review_reports_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "supplier_community_reviews"
            referencedColumns: ["id"]
          },
        ]
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
      team_permission_catalog: {
        Row: {
          created_at: string
          is_sensitive: boolean
          label: string
          module_key: string
          permission_key: string
        }
        Insert: {
          created_at?: string
          is_sensitive?: boolean
          label: string
          module_key: string
          permission_key: string
        }
        Update: {
          created_at?: string
          is_sensitive?: boolean
          label?: string
          module_key?: string
          permission_key?: string
        }
        Relationships: []
      }
      telegram_pending_chats: {
        Row: {
          chat_id: number
          chat_title: string | null
          chat_type: string | null
          first_seen_at: string
          last_seen_at: string
          message_count: number
        }
        Insert: {
          chat_id: number
          chat_title?: string | null
          chat_type?: string | null
          first_seen_at?: string
          last_seen_at?: string
          message_count?: number
        }
        Update: {
          chat_id?: number
          chat_title?: string | null
          chat_type?: string | null
          first_seen_at?: string
          last_seen_at?: string
          message_count?: number
        }
        Relationships: []
      }
      telegram_processed_updates: {
        Row: {
          processed_at: string
          update_id: number
        }
        Insert: {
          processed_at?: string
          update_id: number
        }
        Update: {
          processed_at?: string
          update_id?: number
        }
        Relationships: []
      }
      telegram_supplier_channels: {
        Row: {
          category_default: string
          chat_id: number
          chat_title: string | null
          created_at: string
          id: string
          is_active: boolean
          supplier_id: string
          updated_at: string
        }
        Insert: {
          category_default?: string
          chat_id: number
          chat_title?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          supplier_id: string
          updated_at?: string
        }
        Update: {
          category_default?: string
          chat_id?: number
          chat_title?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "telegram_supplier_channels_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "tour_operators"
            referencedColumns: ["id"]
          },
        ]
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
          external_id: string | null
          founded_year: number | null
          how_to_sell: string | null
          id: string
          instagram: string | null
          is_active: boolean | null
          is_public_visible: boolean
          is_published: boolean
          logo_url: string | null
          materials: Json | null
          name: string
          owner_agency_id: string | null
          public_slug: string | null
          rejection_reason: string | null
          sales_channels: string | null
          short_description: string | null
          social_links: Json | null
          source: string | null
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
          external_id?: string | null
          founded_year?: number | null
          how_to_sell?: string | null
          id?: string
          instagram?: string | null
          is_active?: boolean | null
          is_public_visible?: boolean
          is_published?: boolean
          logo_url?: string | null
          materials?: Json | null
          name: string
          owner_agency_id?: string | null
          public_slug?: string | null
          rejection_reason?: string | null
          sales_channels?: string | null
          short_description?: string | null
          social_links?: Json | null
          source?: string | null
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
          external_id?: string | null
          founded_year?: number | null
          how_to_sell?: string | null
          id?: string
          instagram?: string | null
          is_active?: boolean | null
          is_public_visible?: boolean
          is_published?: boolean
          logo_url?: string | null
          materials?: Json | null
          name?: string
          owner_agency_id?: string | null
          public_slug?: string | null
          rejection_reason?: string | null
          sales_channels?: string | null
          short_description?: string | null
          social_links?: Json | null
          source?: string | null
          specialties?: string | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
        }
        Relationships: []
      }
      trade_events: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          end_at: string | null
          event_type: Database["public"]["Enums"]["trade_event_type"]
          id: string
          link: string | null
          location: string | null
          operator_id: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_at: string
          status: Database["public"]["Enums"]["trade_event_status"]
          supplier_user_id: string
          title: string
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          end_at?: string | null
          event_type?: Database["public"]["Enums"]["trade_event_type"]
          id?: string
          link?: string | null
          location?: string | null
          operator_id?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_at: string
          status?: Database["public"]["Enums"]["trade_event_status"]
          supplier_user_id: string
          title: string
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          end_at?: string | null
          event_type?: Database["public"]["Enums"]["trade_event_type"]
          id?: string
          link?: string | null
          location?: string | null
          operator_id?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_at?: string
          status?: Database["public"]["Enums"]["trade_event_status"]
          supplier_user_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_events_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "tour_operators"
            referencedColumns: ["id"]
          },
        ]
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
      travel_requirements_consultations: {
        Row: {
          client_id: string | null
          confidence_score: number | null
          consulted_at: string
          created_at: string
          id: string
          model_used: string | null
          passenger_data: Json
          result: Json | null
          trip_data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          confidence_score?: number | null
          consulted_at?: string
          created_at?: string
          id?: string
          model_used?: string | null
          passenger_data?: Json
          result?: Json | null
          trip_data?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          confidence_score?: number | null
          consulted_at?: string
          created_at?: string
          id?: string
          model_used?: string | null
          passenger_data?: Json
          result?: Json | null
          trip_data?: Json
          updated_at?: string
          user_id?: string
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
          image_urls: string[]
          order_index: number
          place_id: string | null
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
          image_urls?: string[]
          order_index?: number
          place_id?: string | null
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
          image_urls?: string[]
          order_index?: number
          place_id?: string | null
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
          itinerary_id: string | null
          itinerary_mode: string
          opportunity_id: string | null
          public_access_code: string | null
          share_expires_at: string | null
          share_token: string | null
          short_code: string | null
          signature_snapshot: Json | null
          slug: string | null
          start_date: string
          status: string
          trip_title: string | null
          updated_at: string
          user_id: string
          wallet_cover_url: string | null
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
          itinerary_id?: string | null
          itinerary_mode?: string
          opportunity_id?: string | null
          public_access_code?: string | null
          share_expires_at?: string | null
          share_token?: string | null
          short_code?: string | null
          signature_snapshot?: Json | null
          slug?: string | null
          start_date: string
          status?: string
          trip_title?: string | null
          updated_at?: string
          user_id: string
          wallet_cover_url?: string | null
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
          itinerary_id?: string | null
          itinerary_mode?: string
          opportunity_id?: string | null
          public_access_code?: string | null
          share_expires_at?: string | null
          share_token?: string | null
          short_code?: string | null
          signature_snapshot?: Json | null
          slug?: string | null
          start_date?: string
          status?: string
          trip_title?: string | null
          updated_at?: string
          user_id?: string
          wallet_cover_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trips_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_itinerary_id_fkey"
            columns: ["itinerary_id"]
            isOneToOne: false
            referencedRelation: "itineraries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
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
      community_members_public: {
        Row: {
          bio: string | null
          created_at: string | null
          entry_method: string | null
          id: string | null
          segments: string[] | null
          specialties: string[] | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          years_experience: number | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          entry_method?: string | null
          id?: string | null
          segments?: string[] | null
          specialties?: string[] | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          years_experience?: number | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          entry_method?: string | null
          id?: string | null
          segments?: string[] | null
          specialties?: string[] | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      profiles_public: {
        Row: {
          agency_logo_url: string | null
          agency_name: string | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          cover_image_url: string | null
          help_offer: string | null
          name: string | null
          niche: string | null
          niches: string[] | null
          partnership_interests: string[] | null
          phone: string | null
          services: string[] | null
          specialties: string[] | null
          state: string | null
          user_id: string | null
          years_in_business: number | null
        }
        Insert: {
          agency_logo_url?: string | null
          agency_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          cover_image_url?: string | null
          help_offer?: string | null
          name?: string | null
          niche?: string | null
          niches?: string[] | null
          partnership_interests?: string[] | null
          phone?: string | null
          services?: string[] | null
          specialties?: string[] | null
          state?: string | null
          user_id?: string | null
          years_in_business?: number | null
        }
        Update: {
          agency_logo_url?: string | null
          agency_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          cover_image_url?: string | null
          help_offer?: string | null
          name?: string | null
          niche?: string | null
          niches?: string[] | null
          partnership_interests?: string[] | null
          phone?: string | null
          services?: string[] | null
          specialties?: string[] | null
          state?: string | null
          user_id?: string | null
          years_in_business?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      _normalize_phone: { Args: { p: string }; Returns: string }
      academy_event_participants: {
        Args: { p_training_id: string }
        Returns: {
          agency_name: string
          city: string
          email: string
          enrolled_at: string
          events_participated: number
          is_completed: boolean
          name: string
          participant_user_id: string
          phone: string
          state: string
          survey_answered: boolean
          survey_score: number
          watched_minutes: number
        }[]
      }
      academy_raffle_events: {
        Args: never
        Returns: {
          attended_count: number
          completed_count: number
          destination: string
          is_active: boolean
          last_activity_at: string
          registrations_count: number
          scheduled_at: string
          title: string
          trail_id: string
          trail_name: string
          training_id: string
          training_type: string
        }[]
      }
      admin_agency_activity_ranking: {
        Args: { _end: string; _start: string }
        Returns: Json
      }
      admin_agency_owners_total: { Args: never; Returns: number }
      admin_agency_teams_list: {
        Args: {
          _at_limit?: boolean
          _limit?: number
          _offset?: number
          _pending?: boolean
          _plan?: string
          _search?: string
          _team?: string
        }
        Returns: {
          active_members: number
          agency_id: string
          agency_name: string
          inactive_members: number
          last_activity: string
          limit_override: number
          owner_email: string
          owner_name: string
          pending_invites: number
          plan: string
          seats_limit: number
          seats_used: number
          total_count: number
        }[]
      }
      admin_clear_news_curation: {
        Args: { p_period_start?: string }
        Returns: Json
      }
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
      admin_list_supplier_reviews: {
        Args: {
          _limit?: number
          _offset?: number
          _rating?: number
          _source?: string
          _status?: string
        }
        Returns: {
          author_agency_name: string
          author_avatar_url: string
          author_name: string
          comment: string
          comment_status: string
          created_at: string
          id: string
          moderation_reason: string
          open_reports: number
          rating: number
          report_reasons: string[]
          supplier_id: string
          supplier_source: string
          updated_at: string
          user_id: string
        }[]
      }
      admin_list_user_projects: { Args: never; Returns: Json }
      admin_news_curation_list: { Args: never; Returns: Json }
      admin_remove_news_curation: {
        Args: {
          p_curation_type: string
          p_period_start?: string
          p_position?: number
        }
        Returns: Json
      }
      admin_set_news_curation: {
        Args: {
          p_curation_type: string
          p_noticia_id: string
          p_period_start?: string
          p_position?: number
        }
        Returns: Json
      }
      admin_supplier_review_counts: { Args: never; Returns: Json }
      admin_update_user_role: {
        Args: {
          _new_role: Database["public"]["Enums"]["app_role"]
          _target_user_id: string
        }
        Returns: boolean
      }
      admin_user_usage_report: {
        Args: { _end: string; _start: string }
        Returns: {
          agency_name: string
          business_cards_count: number
          clients_count: number
          created_at: string
          customer_payments_count: number
          email: string
          expense_entries_count: number
          income_entries_count: number
          invoices_count: number
          is_active: boolean
          itineraries_count: number
          last_active_at: string
          lead_forms_count: number
          name: string
          operations_count: number
          opportunities_count: number
          phone: string
          plan: string
          quotes_count: number
          role: string
          sales_count: number
          sales_landings_count: number
          sellers_count: number
          showcases_count: number
          team_members_count: number
          total_actions: number
          user_id: string
          wallets_count: number
        }[]
      }
      agency_community_flags: {
        Args: { _agency: string }
        Returns: {
          external_chat_enabled: boolean
          internal_chat_enabled: boolean
          internal_community_enabled: boolean
          online_users_enabled: boolean
          public_community_enabled: boolean
        }[]
      }
      agency_community_settings_get: { Args: never; Returns: Json }
      agency_community_settings_save: {
        Args: {
          _external_chat: boolean
          _internal: boolean
          _internal_chat: boolean
          _online: boolean
          _preset: string
          _public: boolean
        }
        Returns: Json
      }
      agency_team_directory: {
        Args: never
        Returns: {
          auth_user_id: string
          avatar_url: string
          department: string
          full_name: string
          member_id: string
          role_title: string
          status: Database["public"]["Enums"]["team_member_status"]
          team_name: string
        }[]
      }
      can_chat_externally: { Args: { _uid: string }; Returns: boolean }
      can_chat_internally: { Args: { _uid: string }; Returns: boolean }
      can_see_agency_user: { Args: { _target: string }; Returns: boolean }
      can_team: { Args: { _key: string }; Returns: boolean }
      can_use_feature: {
        Args: { _feature: string; _user_id: string }
        Returns: boolean
      }
      can_use_internal_community: { Args: never; Returns: boolean }
      can_use_public_community: { Args: never; Returns: boolean }
      cast_monthly_vote: {
        Args: { _nominee_user_id: string }
        Returns: {
          award_id: string
          created_at: string
          id: string
          nominee_user_id: string
          updated_at: string
          voter_user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "community_monthly_votes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      check_ai_usage: { Args: { _user_id: string }; Returns: boolean }
      check_public_slug_available: { Args: { p_slug: string }; Returns: Json }
      check_trip_shared: { Args: { p_trip_id: string }; Returns: boolean }
      claim_lead_form_deliveries: {
        Args: { p_limit?: number }
        Returns: {
          additional_info: string
          agency_name: string
          attempts: number
          budget: string
          created_at: string
          delivery_id: string
          destination: string
          is_test: boolean
          lead_email: string
          lead_id: string
          lead_name: string
          lead_phone: string
          lead_summary: string
          recipient_email: string
          recipient_kind: string
          timezone: string
          travel_dates: string
          travelers_count: string
        }[]
      }
      claim_product_landing_lead_deliveries: {
        Args: { p_limit?: number }
        Returns: {
          adults: number
          agency_name: string
          assignee_name: string
          attempts: number
          children: number
          children_ages: string
          created_at: string
          delivery_id: string
          interest_category: string
          is_test: boolean
          lead_email: string
          lead_id: string
          lead_name: string
          lead_phone: string
          message: string
          origin_city: string
          product_key: string
          recipient_email: string
          recipient_kind: string
          timezone: string
          travel_period: string
          utm_campaign: string
          utm_medium: string
          utm_source: string
        }[]
      }
      clone_itinerary_for_trip: {
        Args: { p_source_itinerary_id: string; p_trip_id: string }
        Returns: string
      }
      complete_lead_form_delivery: {
        Args: {
          p_delivery_id: string
          p_error?: string
          p_provider_message_id?: string
          p_status: string
        }
        Returns: undefined
      }
      complete_product_landing_lead_delivery: {
        Args: {
          p_delivery_id: string
          p_error?: string
          p_provider_message_id?: string
          p_status: string
        }
        Returns: undefined
      }
      confirm_award_winner: {
        Args: {
          _award_id: string
          _tie_break_reason?: string
          _winner_user_id: string
        }
        Returns: {
          active_days_count: number | null
          award_id: string
          confirmed_by: string | null
          contributions_count: number | null
          created_at: string
          id: string
          published_at: string | null
          reference_month: number
          reference_year: number
          third_party_replies_count: number | null
          tie_break_reason: string | null
          user_id: string
          votes_count: number
        }
        SetofOptions: {
          from: "*"
          to: "community_award_winners"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_agency_id: { Args: never; Returns: string }
      delete_my_supplier_review: {
        Args: { _review_id: string }
        Returns: boolean
      }
      email_account_exists: { Args: { _email: string }; Returns: boolean }
      enqueue_lead_form_notifications: {
        Args: { p_lead_id: string }
        Returns: number
      }
      enqueue_product_landing_lead_notifications: {
        Args: { p_lead_id: string }
        Returns: number
      }
      ensure_client_and_opportunity_for_lead: {
        Args: {
          _destination: string
          _email: string
          _name: string
          _phone: string
          _user_id: string
        }
        Returns: {
          client_id: string
          opportunity_id: string
        }[]
      }
      ensure_default_operation_stages: {
        Args: { _user_id: string }
        Returns: undefined
      }
      fn_calc_commission_amount: {
        Args: {
          p_sale_price: number
          p_taxes: number
          p_type: string
          p_value: number
        }
        Returns: number
      }
      fn_compute_commission_status: {
        Args: {
          p_commission_amount: number
          p_current_status: string
          p_invoice_status: string
          p_received_amount: number
          p_requires_invoice: boolean
        }
        Returns: string
      }
      generate_certificate_number: { Args: never; Returns: string }
      generate_invoice_access_code: { Args: never; Returns: string }
      generate_invoice_number: { Args: { _user_id: string }; Returns: string }
      generate_itinerary_access_code: { Args: never; Returns: string }
      generate_public_access_code: { Args: never; Returns: string }
      generate_quote_access_code: { Args: never; Returns: string }
      generate_receipt_number: { Args: { _user_id: string }; Returns: string }
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
      get_agency_wallet_settings: {
        Args: { _user_id: string }
        Returns: {
          show_calendar: boolean
          show_next_activity: boolean
          show_next_service: boolean
          show_signature: boolean
          show_support_tools: boolean
          show_whatsapp: boolean
        }[]
      }
      get_award_tally: {
        Args: { _award_id: string }
        Returns: {
          active_days_count: number
          agency_name: string
          avatar_url: string
          award_id: string
          contributions_count: number
          disqualified_by_history: boolean
          eligible: boolean
          exclusion_reason: string
          history_reason: string
          name: string
          third_party_replies_count: number
          user_id: string
          votes_count: number
          wins_this_year: number
          won_previous_month: boolean
        }[]
      }
      get_current_month_award: {
        Args: never
        Returns: {
          allow_consecutive_wins: boolean
          created_at: string
          description: string | null
          extra_link: string | null
          extra_notes: string | null
          id: string
          max_wins_per_year: number
          prize_description: string | null
          prize_image_url: string | null
          prize_title: string | null
          publish_date: string | null
          published_at: string | null
          reference_month: number
          reference_year: number
          rules: string | null
          sponsor_name: string | null
          status: string
          title: string | null
          updated_at: string
          voting_end_at: string | null
          voting_start_at: string | null
          winner_user_id: string | null
          winner_votes: number | null
        }
        SetofOptions: {
          from: "*"
          to: "community_monthly_awards"
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
      get_invoice_by_public_code: {
        Args: { p_agency_slug: string; p_code: string }
        Returns: Json
      }
      get_itinerary_by_public_code: {
        Args: { p_agency_slug: string; p_code: string }
        Returns: Json
      }
      get_lead_form_notifications: {
        Args: { p_form_id: string }
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
      get_my_monthly_vote: {
        Args: never
        Returns: {
          award_id: string
          created_at: string
          nominee_user_id: string
          updated_at: string
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
      get_product_landing_notifications: {
        Args: { p_landing_id: string }
        Returns: Json
      }
      get_public_lead_form: { Args: { p_token: string }; Returns: Json }
      get_public_product_landing: {
        Args: { p_product_key: string; p_slug: string }
        Returns: Json
      }
      get_public_profile: {
        Args: { _user_id: string }
        Returns: {
          agency_logo_url: string
          agency_name: string
          agency_primary_color: string
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
      get_public_trip_itinerary_v2: {
        Args: { p_access_code: string; p_trip_id: string }
        Returns: Json
      }
      get_published_supplier_by_slug: {
        Args: { p_slug: string }
        Returns: Json
      }
      get_quote_by_public_code: {
        Args: { p_agency_slug: string; p_code: string }
        Returns: Json
      }
      get_quote_sections_by_share_token: {
        Args: { p_share_token: string }
        Returns: {
          id: string
          order_index: number
          quote_id: string
          title: string
        }[]
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
      get_supplier_review_stats: {
        Args: never
        Returns: {
          average_rating: number
          review_count: number
          supplier_id: string
          supplier_source: string
        }[]
      }
      get_supplier_reviews: {
        Args: {
          _limit?: number
          _offset?: number
          _source: string
          _supplier_id: string
        }
        Returns: {
          author_agency_name: string
          author_avatar_url: string
          author_name: string
          comment: string
          comment_status: string
          created_at: string
          id: string
          is_mine: boolean
          moderation_reason: string
          rating: number
          supplier_id: string
          supplier_source: string
          updated_at: string
          user_id: string
        }[]
      }
      get_trip_by_public_code: {
        Args: { p_agency_slug: string; p_code: string }
        Returns: Json
      }
      get_trip_public_branding: { Args: { p_token: string }; Returns: Json }
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
      immutable_unaccent: { Args: { "": string }; Returns: string }
      inherit_stage_permissions: {
        Args: {
          _new_stage_id: string
          _pipeline: Database["public"]["Enums"]["team_pipeline_type"]
          _source_stage_id: string
        }
        Returns: undefined
      }
      is_agency_member: { Args: { _owner: string }; Returns: boolean }
      is_community_member: { Args: { _user_id: string }; Returns: boolean }
      is_reserved_slug: { Args: { _slug: string }; Returns: boolean }
      is_team_subuser: { Args: { _uid: string }; Returns: boolean }
      is_user_active: { Args: { _user_id: string }; Returns: boolean }
      is_within_office_hours_json: {
        Args: { p_at?: string; p_hours: Json; p_tz: string }
        Returns: boolean
      }
      list_award_history: {
        Args: { _limit?: number }
        Returns: {
          active_days_count: number
          agency_name: string
          avatar_url: string
          award_id: string
          contributions_count: number
          name: string
          published_at: string
          reference_month: number
          reference_year: number
          third_party_replies_count: number
          tie_break_reason: string
          user_id: string
          votes_count: number
        }[]
      }
      list_community_agents: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_specialty?: string
        }
        Returns: {
          agency_name: string
          avatar_url: string
          city: string
          is_verified: boolean
          name: string
          specialties: string[]
          state: string
          status: string
          total_count: number
          user_id: string
        }[]
      }
      mark_product_landing_test_events: {
        Args: { p_from: string; p_landing_id: string; p_to: string }
        Returns: Json
      }
      moderate_supplier_review: {
        Args: { _action: string; _reason?: string; _review_id: string }
        Returns: Json
      }
      news_highlights: { Args: never; Returns: Json }
      news_ranking: {
        Args: { p_limit?: number; p_window?: string }
        Returns: {
          categoria: string
          data_publicacao: string
          fonte: string
          id: string
          likes_count: number
          rank_position: number
          reads_count: number
          resumo: string
          score: number
          titulo_curto: string
          url_original: string
          window_likes: number
          window_reads: number
        }[]
      }
      news_today_sp: { Args: never; Returns: string }
      news_week_start_sp: { Args: { p_ref?: string }; Returns: string }
      normalize_public_slug: { Args: { _input: string }; Returns: string }
      product_landing_next_notify_at: {
        Args: {
          p_days: string[]
          p_end: string
          p_from?: string
          p_start: string
          p_tz: string
        }
        Returns: string
      }
      recalc_product_landing_counters: {
        Args: { p_landing_id: string }
        Returns: Json
      }
      recompute_monthly_nominee: {
        Args: { _user_id: string }
        Returns: undefined
      }
      register_news_read: { Args: { p_noticia_id: string }; Returns: boolean }
      report_supplier_review: {
        Args: { _details?: string; _reason: string; _review_id: string }
        Returns: Json
      }
      resolve_trip_short_code: { Args: { p_code: string }; Returns: Json }
      revert_award_confirmation: {
        Args: { _award_id: string }
        Returns: {
          allow_consecutive_wins: boolean
          created_at: string
          description: string | null
          extra_link: string | null
          extra_notes: string | null
          id: string
          max_wins_per_year: number
          prize_description: string | null
          prize_image_url: string | null
          prize_title: string | null
          publish_date: string | null
          published_at: string | null
          reference_month: number
          reference_year: number
          rules: string | null
          sponsor_name: string | null
          status: string
          title: string | null
          updated_at: string
          voting_end_at: string | null
          voting_start_at: string | null
          winner_user_id: string | null
          winner_votes: number | null
        }
        SetofOptions: {
          from: "*"
          to: "community_monthly_awards"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rsvp_match_subscribers: {
        Args: { _emails: string[] }
        Returns: {
          normalized_email: string
          plan: string
          status: string
        }[]
      }
      save_card_capture_via_token: {
        Args: { _data: Json; _token: string }
        Returns: string
      }
      save_product_landing_notifications: {
        Args: { p_config: Json; p_landing_id: string }
        Returns: Json
      }
      search_cities: {
        Args: { max_results?: number; q: string }
        Returns: {
          admin_name: string
          country: string
          id: number
          iso2: string
          lat: number
          lng: number
          name: string
          population: number
        }[]
      }
      seed_default_pipeline_stages: {
        Args: { _user_id: string }
        Returns: undefined
      }
      set_product_landing_test_mode: {
        Args: { p_landing_id: string; p_minutes?: number }
        Returns: Json
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      submit_conversational_lead: {
        Args: { p_payload: Json; p_token: string }
        Returns: Json
      }
      submit_product_landing_lead: {
        Args: {
          p_idempotency_key?: string
          p_payload: Json
          p_product_key: string
          p_slug: string
        }
        Returns: Json
      }
      submit_sales_landing_lead: {
        Args: { p_lead_name: string; p_lead_phone: string; p_slug: string }
        Returns: Json
      }
      submit_supplier_review: {
        Args: {
          _comment?: string
          _rating: number
          _source: string
          _supplier_id: string
        }
        Returns: Json
      }
      supplier_review_eligibility: { Args: never; Returns: Json }
      supplier_review_is_own_company: {
        Args: { _source: string; _supplier_id: string }
        Returns: boolean
      }
      supplier_review_target_exists: {
        Args: { _source: string; _supplier_id: string }
        Returns: boolean
      }
      supplier_slug_exists: { Args: { p_slug: string }; Returns: boolean }
      team_access_profiles: {
        Args: never
        Returns: {
          agency_id: string
          description: string
          id: string
          is_native: boolean
          key: string
          name: string
          permission_keys: string[]
          scopes: Json
        }[]
      }
      team_audit_log: {
        Args: {
          _action?: string
          _from?: string
          _limit?: number
          _member_id?: string
          _module_key?: string
          _to?: string
        }
        Returns: {
          action: string
          actor_is_platform_admin: boolean
          actor_user_id: string
          created_at: string
          details: Json
          entity_id: string
          entity_type: string
          id: string
          member_name: string
          module_key: string
          team_member_id: string
        }[]
      }
      team_can_manage_team: { Args: never; Returns: boolean }
      team_can_read_team: { Args: { _uid: string }; Returns: boolean }
      team_get_member_detail: { Args: { _member_id: string }; Returns: Json }
      team_list_invites: {
        Args: never
        Returns: {
          accepted_at: string
          access_profile_id: string
          access_profile_name: string
          created_at: string
          department: string
          email: string
          expires_at: string
          full_name: string
          id: string
          last_sent_at: string
          revoked_at: string
          role_title: string
          sent_count: number
          team_name: string
        }[]
      }
      team_list_members: {
        Args: never
        Returns: {
          created_at: string
          full_name: string
          id: string
          last_login_at: string
          login: string
          permissions_count: number
          role_title: string
          stage_permissions_count: number
          status: Database["public"]["Enums"]["team_member_status"]
        }[]
      }
      team_max_members: { Args: { _agency_id: string }; Returns: number }
      team_member_quota: {
        Args: never
        Returns: {
          pending: number
          plan: string
          total: number
          used: number
        }[]
      }
      team_member_row: {
        Args: { _uid: string }
        Returns: {
          agency_id: string
          department: string
          id: string
          status: Database["public"]["Enums"]["team_member_status"]
          team_name: string
        }[]
      }
      team_member_scopes: {
        Args: { _member_id: string }
        Returns: {
          module_key: string
          scope: Database["public"]["Enums"]["team_data_scope"]
        }[]
      }
      team_members_overview: {
        Args: never
        Returns: {
          access_profile_id: string
          access_profile_key: string
          access_profile_name: string
          activated_at: string
          avatar_url: string
          created_at: string
          department: string
          email: string
          full_name: string
          id: string
          invited_at: string
          last_login_at: string
          login: string
          permissions_count: number
          phone: string
          role_title: string
          stage_permissions_count: number
          status: Database["public"]["Enums"]["team_member_status"]
          team_name: string
        }[]
      }
      team_record_visible: {
        Args: { _assigned_to: string; _created_by: string; _module: string }
        Returns: boolean
      }
      team_replace_permissions: {
        Args: {
          _member_id: string
          _permissions: Json
          _stage_permissions: Json
        }
        Returns: undefined
      }
      team_scope_for: {
        Args: { _module: string }
        Returns: Database["public"]["Enums"]["team_data_scope"]
      }
      team_seats_taken: { Args: { _agency_id: string }; Returns: number }
      team_self: { Args: never; Returns: Json }
      team_self_member_id: { Args: never; Returns: string }
      team_valid_permission_keys: {
        Args: { _keys: string[] }
        Returns: string[]
      }
      track_lead_form_view: {
        Args: { p_session_hash: string; p_token: string }
        Returns: undefined
      }
      track_product_landing_view: {
        Args: { p_landing_id: string; p_session_hash: string }
        Returns: undefined
      }
      track_sales_landing_view: {
        Args: { p_session_hash: string; p_slug: string }
        Returns: undefined
      }
      unaccent: { Args: { "": string }; Returns: string }
      user_agency_id: { Args: { _uid: string }; Returns: string }
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
      invoice_installment_status: "pending" | "paid" | "overdue"
      invoice_service_category:
        | "aereo"
        | "hotel"
        | "cruzeiro"
        | "seguro"
        | "passeio"
        | "transfer"
        | "ingresso"
        | "pacote"
        | "outros"
      invoice_source_type:
        | "manual"
        | "quote"
        | "trip"
        | "opportunity"
        | "operation"
      invoice_status:
        | "draft"
        | "sent"
        | "partial"
        | "paid"
        | "cancelled"
        | "overdue"
      subscription_plan:
        | "essencial"
        | "profissional"
        | "premium"
        | "educa_pass"
        | "cartao_digital"
        | "fundador"
        | "start"
        | "fornecedor_parceiro"
      team_data_scope:
        | "own"
        | "created"
        | "assigned"
        | "team"
        | "department"
        | "agency"
      team_member_status: "active" | "blocked" | "pending" | "disabled"
      team_pipeline_type: "opportunities" | "operations"
      trade_event_status: "pendente" | "aprovado" | "recusado"
      trade_event_type:
        | "treinamento"
        | "evento"
        | "roadshow"
        | "live"
        | "famtour"
        | "reuniao"
        | "capacitacao"
        | "encontro"
        | "outro"
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
      invoice_installment_status: ["pending", "paid", "overdue"],
      invoice_service_category: [
        "aereo",
        "hotel",
        "cruzeiro",
        "seguro",
        "passeio",
        "transfer",
        "ingresso",
        "pacote",
        "outros",
      ],
      invoice_source_type: [
        "manual",
        "quote",
        "trip",
        "opportunity",
        "operation",
      ],
      invoice_status: [
        "draft",
        "sent",
        "partial",
        "paid",
        "cancelled",
        "overdue",
      ],
      subscription_plan: [
        "essencial",
        "profissional",
        "premium",
        "educa_pass",
        "cartao_digital",
        "fundador",
        "start",
        "fornecedor_parceiro",
      ],
      team_data_scope: [
        "own",
        "created",
        "assigned",
        "team",
        "department",
        "agency",
      ],
      team_member_status: ["active", "blocked", "pending", "disabled"],
      team_pipeline_type: ["opportunities", "operations"],
      trade_event_status: ["pendente", "aprovado", "recusado"],
      trade_event_type: [
        "treinamento",
        "evento",
        "roadshow",
        "live",
        "famtour",
        "reuniao",
        "capacitacao",
        "encontro",
        "outro",
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
