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
      announcements: {
        Row: {
          content: string | null
          created_at: string
          id: string
          is_active: boolean
          title: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          title: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          title?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          artist_id: string
          auto_send_health: boolean
          client_id: string | null
          client_name: string
          client_phone: string | null
          created_at: string
          date: string
          health_form_answers: Json | null
          health_form_status: string
          health_risk_level: string
          id: string
          status: string
          time: string
          treatment_type: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          auto_send_health?: boolean
          client_id?: string | null
          client_name: string
          client_phone?: string | null
          created_at?: string
          date: string
          health_form_answers?: Json | null
          health_form_status?: string
          health_risk_level?: string
          id?: string
          status?: string
          time?: string
          treatment_type?: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          auto_send_health?: boolean
          client_id?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string
          date?: string
          health_form_answers?: Json | null
          health_form_status?: string
          health_risk_level?: string
          id?: string
          status?: string
          time?: string
          treatment_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_artist"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_health_question_overrides: {
        Row: {
          artist_profile_id: string
          created_at: string
          custom_text_en: string | null
          custom_text_he: string | null
          id: string
          is_included: boolean
          question_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          artist_profile_id: string
          created_at?: string
          custom_text_en?: string | null
          custom_text_he?: string | null
          id?: string
          is_included?: boolean
          question_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          artist_profile_id?: string
          created_at?: string
          custom_text_en?: string | null
          custom_text_he?: string | null
          id?: string
          is_included?: boolean
          question_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_health_question_overrides_artist_profile_id_fkey"
            columns: ["artist_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artist_health_question_overrides_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "health_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_message_settings: {
        Row: {
          artist_profile_id: string
          created_at: string
          id: string
          settings: Json
          updated_at: string
        }
        Insert: {
          artist_profile_id: string
          created_at?: string
          id?: string
          settings?: Json
          updated_at?: string
        }
        Update: {
          artist_profile_id?: string
          created_at?: string
          id?: string
          settings?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_message_settings_artist_profile_id_fkey"
            columns: ["artist_profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_gallery_photos: {
        Row: {
          artist_id: string
          client_id: string | null
          created_at: string
          day_number: number | null
          id: string
          label: string | null
          photo_type: string
          public_url: string
          seen_by_client: boolean
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          artist_id: string
          client_id?: string | null
          created_at?: string
          day_number?: number | null
          id?: string
          label?: string | null
          photo_type?: string
          public_url: string
          seen_by_client?: boolean
          storage_path: string
          uploaded_by?: string
        }
        Update: {
          artist_id?: string
          client_id?: string | null
          created_at?: string
          day_number?: number | null
          id?: string
          label?: string | null
          photo_type?: string
          public_url?: string
          seen_by_client?: boolean
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_gallery_photos_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_gallery_photos_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          artist_id: string
          birth_date: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          medical_exception_approved: boolean
          phone: string | null
          push_opted_in: boolean
          referral_code: string | null
          treatment_date: string | null
          treatment_type: string | null
        }
        Insert: {
          artist_id: string
          birth_date?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          medical_exception_approved?: boolean
          phone?: string | null
          push_opted_in?: boolean
          referral_code?: string | null
          treatment_date?: string | null
          treatment_type?: string | null
        }
        Update: {
          artist_id?: string
          birth_date?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          medical_exception_approved?: boolean
          phone?: string | null
          push_opted_in?: boolean
          referral_code?: string | null
          treatment_date?: string | null
          treatment_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      faqs: {
        Row: {
          answer_en: string
          answer_he: string
          category: string
          created_at: string
          id: string
          is_active: boolean
          question_en: string
          question_he: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer_en?: string
          answer_he: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          question_en?: string
          question_he: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer_en?: string
          answer_he?: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          question_en?: string
          question_he?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      form_links: {
        Row: {
          artist_id: string
          artist_phone: string | null
          client_name: string
          client_phone: string | null
          code: string
          created_at: string
          id: string
          instagram_handle: string | null
          logo_url: string | null
        }
        Insert: {
          artist_id: string
          artist_phone?: string | null
          client_name?: string
          client_phone?: string | null
          code?: string
          created_at?: string
          id?: string
          instagram_handle?: string | null
          logo_url?: string | null
        }
        Update: {
          artist_id?: string
          artist_phone?: string | null
          client_name?: string
          client_phone?: string | null
          code?: string
          created_at?: string
          id?: string
          instagram_handle?: string | null
          logo_url?: string | null
        }
        Relationships: []
      }
      healing_phases: {
        Row: {
          day_end: number
          day_start: number
          icon: string
          id: string
          image_url: string | null
          severity: string
          sort_order: number
          steps_en: string[]
          steps_he: string[]
          title_en: string
          title_he: string
          treatment_type: string
          updated_at: string
        }
        Insert: {
          day_end: number
          day_start: number
          icon?: string
          id?: string
          image_url?: string | null
          severity?: string
          sort_order?: number
          steps_en?: string[]
          steps_he?: string[]
          title_en: string
          title_he: string
          treatment_type: string
          updated_at?: string
        }
        Update: {
          day_end?: number
          day_start?: number
          icon?: string
          id?: string
          image_url?: string | null
          severity?: string
          sort_order?: number
          steps_en?: string[]
          steps_he?: string[]
          title_en?: string
          title_he?: string
          treatment_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      health_declarations: {
        Row: {
          client_id: string
          consent_accepted_at: string | null
          created_at: string
          form_data: Json
          id: string
          is_signed: boolean
          medical_consent_at: string | null
          signature_svg: string | null
        }
        Insert: {
          client_id: string
          consent_accepted_at?: string | null
          created_at?: string
          form_data?: Json
          id?: string
          is_signed?: boolean
          medical_consent_at?: string | null
          signature_svg?: string | null
        }
        Update: {
          client_id?: string
          consent_accepted_at?: string | null
          created_at?: string
          form_data?: Json
          id?: string
          is_signed?: boolean
          medical_consent_at?: string | null
          signature_svg?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "health_declarations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      health_questions: {
        Row: {
          created_at: string
          detail_placeholder_en: string | null
          detail_placeholder_he: string | null
          has_detail_field: boolean
          icon: string
          id: string
          is_active: boolean
          question_en: string
          question_he: string
          risk_level: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          detail_placeholder_en?: string | null
          detail_placeholder_he?: string | null
          has_detail_field?: boolean
          icon?: string
          id?: string
          is_active?: boolean
          question_en?: string
          question_he: string
          risk_level?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          detail_placeholder_en?: string | null
          detail_placeholder_he?: string | null
          has_detail_field?: boolean
          icon?: string
          id?: string
          is_active?: boolean
          question_en?: string
          question_he?: string
          risk_level?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      images_metadata: {
        Row: {
          artist_profile_id: string
          category: string
          client_id: string | null
          created_at: string
          id: string
          label: string | null
          storage_path: string
        }
        Insert: {
          artist_profile_id: string
          category?: string
          client_id?: string | null
          created_at?: string
          id?: string
          label?: string | null
          storage_path: string
        }
        Update: {
          artist_profile_id?: string
          category?: string
          client_id?: string | null
          created_at?: string
          id?: string
          label?: string | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "images_metadata_artist_profile_id_fkey"
            columns: ["artist_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          default_text: string
          id: string
          label: string
          placeholders: string[]
          template_key: string
          updated_at: string
        }
        Insert: {
          default_text?: string
          id?: string
          label: string
          placeholders?: string[]
          template_key: string
          updated_at?: string
        }
        Update: {
          default_text?: string
          id?: string
          label?: string
          placeholders?: string[]
          template_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      portfolio_images: {
        Row: {
          artist_profile_id: string
          base64_data: string | null
          category: string
          created_at: string
          id: string
          image_url: string
          is_public: boolean
        }
        Insert: {
          artist_profile_id: string
          base64_data?: string | null
          category?: string
          created_at?: string
          id?: string
          image_url: string
          is_public?: boolean
        }
        Update: {
          artist_profile_id?: string
          base64_data?: string | null
          category?: string
          created_at?: string
          id?: string
          image_url?: string
          is_public?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_images_artist_profile_id_fkey"
            columns: ["artist_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_features: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          key: string
          name_en: string
          name_he: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          key: string
          name_en?: string
          name_he?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string
          name_en?: string
          name_he?: string
          updated_at?: string
        }
        Relationships: []
      }
      pricing_plan_features: {
        Row: {
          created_at: string
          feature_id: string
          id: string
          plan_id: string
        }
        Insert: {
          created_at?: string
          feature_id: string
          id?: string
          plan_id: string
        }
        Update: {
          created_at?: string
          feature_id?: string
          id?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_plan_features_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "pricing_features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_plan_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "pricing_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_plans: {
        Row: {
          badge_en: string | null
          badge_he: string | null
          created_at: string
          cta_en: string
          cta_he: string
          currency: string
          feature_keys: string[]
          features_en: string[]
          features_he: string[]
          id: string
          is_highlighted: boolean
          name_en: string
          name_he: string
          price_monthly: number
          price_usd: number
          slug: string
          sort_order: number
          stripe_price_id: string | null
          total_promo_spots: number
          updated_at: string
        }
        Insert: {
          badge_en?: string | null
          badge_he?: string | null
          created_at?: string
          cta_en?: string
          cta_he?: string
          currency?: string
          feature_keys?: string[]
          features_en?: string[]
          features_he?: string[]
          id?: string
          is_highlighted?: boolean
          name_en: string
          name_he: string
          price_monthly?: number
          price_usd?: number
          slug: string
          sort_order?: number
          stripe_price_id?: string | null
          total_promo_spots?: number
          updated_at?: string
        }
        Update: {
          badge_en?: string | null
          badge_he?: string | null
          created_at?: string
          cta_en?: string
          cta_he?: string
          currency?: string
          feature_keys?: string[]
          features_en?: string[]
          features_he?: string[]
          id?: string
          is_highlighted?: boolean
          name_en?: string
          name_he?: string
          price_monthly?: number
          price_usd?: number
          slug?: string
          sort_order?: number
          stripe_price_id?: string | null
          total_promo_spots?: number
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          artist_profile_id: string | null
          created_at: string
          description: string | null
          emoji: string
          id: string
          is_global: boolean
          name: string
          price: string
          url: string | null
        }
        Insert: {
          artist_profile_id?: string | null
          created_at?: string
          description?: string | null
          emoji?: string
          id?: string
          is_global?: boolean
          name: string
          price: string
          url?: string | null
        }
        Update: {
          artist_profile_id?: string | null
          created_at?: string
          description?: string | null
          emoji?: string
          id?: string
          is_global?: boolean
          name?: string
          price?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_artist_profile_id_fkey"
            columns: ["artist_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          business_phone: string | null
          created_at: string
          email: string | null
          facebook_url: string | null
          full_name: string | null
          has_health_form_addon: boolean
          has_whatsapp_automation: boolean
          id: string
          instagram_url: string | null
          logo_url: string | null
          onboarding_checklist_dismissed: boolean
          onboarding_checklist_state: Json
          promo_code_used: string | null
          promo_tag: string | null
          referral_code: string | null
          referral_credit: number | null
          referred_by_profile_id: string | null
          studio_name: string | null
          subscription_status: string
          subscription_tier: string
          updated_at: string
          user_id: string
          waze_address: string | null
        }
        Insert: {
          business_phone?: string | null
          created_at?: string
          email?: string | null
          facebook_url?: string | null
          full_name?: string | null
          has_health_form_addon?: boolean
          has_whatsapp_automation?: boolean
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          onboarding_checklist_dismissed?: boolean
          onboarding_checklist_state?: Json
          promo_code_used?: string | null
          promo_tag?: string | null
          referral_code?: string | null
          referral_credit?: number | null
          referred_by_profile_id?: string | null
          studio_name?: string | null
          subscription_status?: string
          subscription_tier?: string
          updated_at?: string
          user_id: string
          waze_address?: string | null
        }
        Update: {
          business_phone?: string | null
          created_at?: string
          email?: string | null
          facebook_url?: string | null
          full_name?: string | null
          has_health_form_addon?: boolean
          has_whatsapp_automation?: boolean
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          onboarding_checklist_dismissed?: boolean
          onboarding_checklist_state?: Json
          promo_code_used?: string | null
          promo_tag?: string | null
          referral_code?: string | null
          referral_credit?: number | null
          referred_by_profile_id?: string | null
          studio_name?: string | null
          subscription_status?: string
          subscription_tier?: string
          updated_at?: string
          user_id?: string
          waze_address?: string | null
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          code: string
          code_type: string
          created_at: string
          current_uses: number
          discount_percent: number | null
          discount_type: string
          expiration_date: string | null
          free_months: number | null
          id: string
          is_active: boolean
          label: string
          max_uses: number | null
          new_users_only: boolean
        }
        Insert: {
          code: string
          code_type?: string
          created_at?: string
          current_uses?: number
          discount_percent?: number | null
          discount_type?: string
          expiration_date?: string | null
          free_months?: number | null
          id?: string
          is_active?: boolean
          label?: string
          max_uses?: number | null
          new_users_only?: boolean
        }
        Update: {
          code?: string
          code_type?: string
          created_at?: string
          current_uses?: number
          discount_percent?: number | null
          discount_type?: string
          expiration_date?: string | null
          free_months?: number | null
          id?: string
          is_active?: boolean
          label?: string
          max_uses?: number | null
          new_users_only?: boolean
        }
        Relationships: []
      }
      promo_settings: {
        Row: {
          artist_profile_id: string
          button_text: string
          button_url: string | null
          created_at: string
          description: string
          id: string
          is_enabled: boolean
          tag_text: string
          title: string
          updated_at: string
        }
        Insert: {
          artist_profile_id: string
          button_text?: string
          button_url?: string | null
          created_at?: string
          description?: string
          id?: string
          is_enabled?: boolean
          tag_text?: string
          title?: string
          updated_at?: string
        }
        Update: {
          artist_profile_id?: string
          button_text?: string
          button_url?: string | null
          created_at?: string
          description?: string
          id?: string
          is_enabled?: boolean
          tag_text?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_settings_artist_profile_id_fkey"
            columns: ["artist_profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          artist_profile_id: string | null
          auth_key: string
          client_id: string | null
          client_name: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          treatment_start: string
          treatment_type: string | null
        }
        Insert: {
          artist_profile_id?: string | null
          auth_key: string
          client_id?: string | null
          client_name: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          treatment_start?: string
          treatment_type?: string | null
        }
        Update: {
          artist_profile_id?: string | null
          auth_key?: string
          client_id?: string | null
          client_name?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          treatment_start?: string
          treatment_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_artist_profile_id_fkey"
            columns: ["artist_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          converted_at: string | null
          created_at: string
          id: string
          referral_code: string
          referred_email: string | null
          referred_profile_id: string | null
          referrer_profile_id: string
          reward_credit: number | null
          status: string
        }
        Insert: {
          converted_at?: string | null
          created_at?: string
          id?: string
          referral_code: string
          referred_email?: string | null
          referred_profile_id?: string | null
          referrer_profile_id: string
          reward_credit?: number | null
          status?: string
        }
        Update: {
          converted_at?: string | null
          created_at?: string
          id?: string
          referral_code?: string
          referred_email?: string | null
          referred_profile_id?: string | null
          referrer_profile_id?: string
          reward_credit?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_profile_id_fkey"
            columns: ["referred_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_profile_id_fkey"
            columns: ["referrer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          created_at: string
          id: string
          message: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      timeline_content: {
        Row: {
          artist_profile_id: string
          id: string
          quote_en: string
          quote_he: string
          step_index: number
          tip_en: string
          tip_he: string
          updated_at: string
        }
        Insert: {
          artist_profile_id: string
          id?: string
          quote_en?: string
          quote_he?: string
          step_index: number
          tip_en?: string
          tip_he?: string
          updated_at?: string
        }
        Update: {
          artist_profile_id?: string
          id?: string
          quote_en?: string
          quote_he?: string
          step_index?: number
          tip_en?: string
          tip_he?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_content_artist_profile_id_fkey"
            columns: ["artist_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_feedback: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          topic: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          topic: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          topic?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_promo_usage: {
        Args: { promo_code_value: string }
        Returns: undefined
      }
      mark_client_push_opted_in: {
        Args: { p_client_id: string }
        Returns: undefined
      }
      save_client_referral_code: {
        Args: { p_client_id: string; p_code: string }
        Returns: undefined
      }
      seed_mock_users: { Args: never; Returns: undefined }
      sync_pricing_plan_feature_keys: {
        Args: { p_plan_id: string }
        Returns: undefined
      }
      upgrade_self_to_master: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user"
      subscription_status: "active" | "trial" | "past_due" | "canceled"
      subscription_tier: "lite" | "professional" | "master"
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
      app_role: ["admin", "user"],
      subscription_status: ["active", "trial", "past_due", "canceled"],
      subscription_tier: ["lite", "professional", "master"],
    },
  },
} as const
