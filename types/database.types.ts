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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      activation_issues: {
        Row: {
          attempt_method: string | null
          created_at: string | null
          error_details: Json | null
          error_message: string | null
          id: number
          transaction_hash: string | null
          wallet_address: string
        }
        Insert: {
          attempt_method?: string | null
          created_at?: string | null
          error_details?: Json | null
          error_message?: string | null
          id?: number
          transaction_hash?: string | null
          wallet_address: string
        }
        Update: {
          attempt_method?: string | null
          created_at?: string | null
          error_details?: Json | null
          error_message?: string | null
          id?: number
          transaction_hash?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
      admin_actions: {
        Row: {
          action_type: string
          activated_at: string | null
          activation_rank: number
          activation_tier: number | null
          admin_wallet: string
          bcc_locked_amount: number | null
          claim_status: string
          claim_transaction_hash: string | null
          claimed_at: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          member_created: boolean | null
          member_created_at: string | null
          metadata: Json | null
          nft_level: number
          nft_verified: boolean | null
          payment_verified: boolean | null
          platform_activation_fee: number | null
          profile_completed: boolean | null
          referrer_wallet: string | null
          target_wallet: string | null
          tier_multiplier: number | null
          updated_at: string | null
        }
        Insert: {
          action_type: string
          activated_at?: string | null
          activation_rank: number
          activation_tier?: number | null
          admin_wallet: string
          bcc_locked_amount?: number | null
          claim_status?: string
          claim_transaction_hash?: string | null
          claimed_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          member_created?: boolean | null
          member_created_at?: string | null
          metadata?: Json | null
          nft_level?: number
          nft_verified?: boolean | null
          payment_verified?: boolean | null
          platform_activation_fee?: number | null
          profile_completed?: boolean | null
          referrer_wallet?: string | null
          target_wallet?: string | null
          tier_multiplier?: number | null
          updated_at?: string | null
        }
        Update: {
          action_type?: string
          activated_at?: string | null
          activation_rank?: number
          activation_tier?: number | null
          admin_wallet?: string
          bcc_locked_amount?: number | null
          claim_status?: string
          claim_transaction_hash?: string | null
          claimed_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          member_created?: boolean | null
          member_created_at?: string | null
          metadata?: Json | null
          nft_level?: number
          nft_verified?: boolean | null
          payment_verified?: boolean | null
          platform_activation_fee?: number | null
          profile_completed?: boolean | null
          referrer_wallet?: string | null
          target_wallet?: string | null
          tier_multiplier?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      admin_permissions: {
        Row: {
          created_at: string | null
          description: string | null
          permission_name: string
          required_level: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          permission_name: string
          required_level?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          permission_name?: string
          required_level?: number | null
        }
        Relationships: []
      }
      admins: {
        Row: {
          admin_level: number | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          permissions: Json | null
          updated_at: string | null
          wallet_address: string
        }
        Insert: {
          admin_level?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          permissions?: Json | null
          updated_at?: string | null
          wallet_address: string
        }
        Update: {
          admin_level?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          permissions?: Json | null
          updated_at?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
      advertisement_nfts: {
        Row: {
          advertiser_wallet: string | null
          category: string
          click_url: string | null
          created_at: string
          description: string
          ends_at: string | null
          id: string
          image_url: string | null
          impressions_current: number | null
          impressions_target: number | null
          is_active: boolean
          metadata: Json | null
          price_bcc: number
          price_usdt: number
          starts_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          advertiser_wallet?: string | null
          category: string
          click_url?: string | null
          created_at?: string
          description: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          impressions_current?: number | null
          impressions_target?: number | null
          is_active?: boolean
          metadata?: Json | null
          price_bcc: number
          price_usdt: number
          starts_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          advertiser_wallet?: string | null
          category?: string
          click_url?: string | null
          created_at?: string
          description?: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          impressions_current?: number | null
          impressions_target?: number | null
          is_active?: boolean
          metadata?: Json | null
          price_bcc?: number
          price_usdt?: number
          starts_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_translations: {
        Row: {
          category: string | null
          context: string | null
          created_at: string | null
          id: string
          language_code: string
          translated_text: string
          translation_key: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          context?: string | null
          created_at?: string | null
          id?: string
          language_code: string
          translated_text: string
          translation_key: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          context?: string | null
          created_at?: string | null
          id?: string
          language_code?: string
          translated_text?: string
          translation_key?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string | null
          user_agent: string | null
          user_wallet: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_wallet?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_wallet?: string | null
        }
        Relationships: []
      }
      bcc_purchase_orders: {
        Row: {
          actual_amount_received: number | null
          amount_bcc: number
          amount_usdc: number
          bridge_used: boolean
          buyer_wallet: string
          company_wallet: string
          completed_at: string | null
          created_at: string
          exchange_rate: number
          expires_at: string
          failure_reason: string | null
          metadata: Json
          network: string
          order_id: string
          payment_method: string
          status: string
          transaction_hash: string | null
          updated_at: string
        }
        Insert: {
          actual_amount_received?: number | null
          amount_bcc: number
          amount_usdc: number
          bridge_used?: boolean
          buyer_wallet: string
          company_wallet: string
          completed_at?: string | null
          created_at?: string
          exchange_rate: number
          expires_at: string
          failure_reason?: string | null
          metadata?: Json
          network: string
          order_id: string
          payment_method: string
          status?: string
          transaction_hash?: string | null
          updated_at?: string
        }
        Update: {
          actual_amount_received?: number | null
          amount_bcc?: number
          amount_usdc?: number
          bridge_used?: boolean
          buyer_wallet?: string
          company_wallet?: string
          completed_at?: string | null
          created_at?: string
          exchange_rate?: number
          expires_at?: string
          failure_reason?: string | null
          metadata?: Json
          network?: string
          order_id?: string
          payment_method?: string
          status?: string
          transaction_hash?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      bcc_release_logs: {
        Row: {
          bcc_released: number
          bcc_remaining_locked: number
          created_at: string | null
          from_level: number
          id: string
          release_reason: string | null
          to_level: number
          wallet_address: string
        }
        Insert: {
          bcc_released: number
          bcc_remaining_locked: number
          created_at?: string | null
          from_level: number
          id?: string
          release_reason?: string | null
          to_level: number
          wallet_address: string
        }
        Update: {
          bcc_released?: number
          bcc_remaining_locked?: number
          created_at?: string | null
          from_level?: number
          id?: string
          release_reason?: string | null
          to_level?: number
          wallet_address?: string
        }
        Relationships: []
      }
      bcc_tier_config: {
        Row: {
          created_at: string | null
          is_active: boolean | null
          max_members: number
          multiplier: number
          phase_id: number
          phase_name: string
        }
        Insert: {
          created_at?: string | null
          is_active?: boolean | null
          max_members: number
          multiplier: number
          phase_id: number
          phase_name: string
        }
        Update: {
          created_at?: string | null
          is_active?: boolean | null
          max_members?: number
          multiplier?: number
          phase_id?: number
          phase_name?: string
        }
        Relationships: []
      }
      bcc_transactions: {
        Row: {
          amount: number
          balance_type: string
          created_at: string | null
          from_wallet: string | null
          metadata: Json | null
          processed_at: string | null
          purpose: string | null
          status: string | null
          to_wallet: string | null
          transaction_id: string
          transaction_type: string
          wallet_address: string
        }
        Insert: {
          amount: number
          balance_type: string
          created_at?: string | null
          from_wallet?: string | null
          metadata?: Json | null
          processed_at?: string | null
          purpose?: string | null
          status?: string | null
          to_wallet?: string | null
          transaction_id?: string
          transaction_type: string
          wallet_address: string
        }
        Update: {
          amount?: number
          balance_type?: string
          created_at?: string | null
          from_wallet?: string | null
          metadata?: Json | null
          processed_at?: string | null
          purpose?: string | null
          status?: string | null
          to_wallet?: string | null
          transaction_id?: string
          transaction_type?: string
          wallet_address?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author: string
          author_wallet: string | null
          content: string
          created_at: string
          excerpt: string
          id: string
          image_url: string | null
          language: string
          metadata: Json | null
          published: boolean
          published_at: string
          slug: string
          tags: Json
          title: string
          updated_at: string
          views: number
        }
        Insert: {
          author: string
          author_wallet?: string | null
          content: string
          created_at?: string
          excerpt: string
          id?: string
          image_url?: string | null
          language?: string
          metadata?: Json | null
          published?: boolean
          published_at?: string
          slug: string
          tags?: Json
          title: string
          updated_at?: string
          views?: number
        }
        Update: {
          author?: string
          author_wallet?: string | null
          content?: string
          created_at?: string
          excerpt?: string
          id?: string
          image_url?: string | null
          language?: string
          metadata?: Json | null
          published?: boolean
          published_at?: string
          slug?: string
          tags?: Json
          title?: string
          updated_at?: string
          views?: number
        }
        Relationships: []
      }
      countdown_timers: {
        Row: {
          admin_wallet: string | null
          auto_action: string | null
          auto_action_data: Json | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          end_time: string
          id: string
          is_active: boolean | null
          metadata: Json | null
          related_reward_id: string | null
          start_time: string
          timer_type: string
          title: string
          updated_at: string | null
          wallet_address: string
        }
        Insert: {
          admin_wallet?: string | null
          auto_action?: string | null
          auto_action_data?: Json | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          end_time: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          related_reward_id?: string | null
          start_time?: string
          timer_type: string
          title: string
          updated_at?: string | null
          wallet_address: string
        }
        Update: {
          admin_wallet?: string | null
          auto_action?: string | null
          auto_action_data?: Json | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          end_time?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          related_reward_id?: string | null
          start_time?: string
          timer_type?: string
          title?: string
          updated_at?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
      course_activations: {
        Row: {
          activated_at: string
          activation_type: string
          completed_at: string | null
          course_id: string
          expires_at: string | null
          id: string
          metadata: Json | null
          progress_percentage: number | null
          wallet_address: string
        }
        Insert: {
          activated_at?: string
          activation_type: string
          completed_at?: string | null
          course_id: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          progress_percentage?: number | null
          wallet_address: string
        }
        Update: {
          activated_at?: string
          activation_type?: string
          completed_at?: string | null
          course_id?: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          progress_percentage?: number | null
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_activations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_bookings: {
        Row: {
          course_id: string
          created_at: string | null
          id: string
          meeting_id: string | null
          meeting_password: string | null
          meeting_type: string | null
          meeting_url: string | null
          scheduled_at: string
          status: string | null
          updated_at: string | null
          verification_code: string
          wallet_address: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          id?: string
          meeting_id?: string | null
          meeting_password?: string | null
          meeting_type?: string | null
          meeting_url?: string | null
          scheduled_at: string
          status?: string | null
          updated_at?: string | null
          verification_code: string
          wallet_address: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          id?: string
          meeting_id?: string | null
          meeting_password?: string | null
          meeting_type?: string | null
          meeting_url?: string | null
          scheduled_at?: string
          status?: string | null
          updated_at?: string | null
          verification_code?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_bookings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_lessons: {
        Row: {
          content_type: string | null
          content_url: string | null
          course_id: string
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          is_free: boolean | null
          lesson_order: number
          metadata: Json | null
          title: string
        }
        Insert: {
          content_type?: string | null
          content_url?: string | null
          course_id: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_free?: boolean | null
          lesson_order: number
          metadata?: Json | null
          title: string
        }
        Update: {
          content_type?: string | null
          content_url?: string | null
          course_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_free?: boolean | null
          lesson_order?: number
          metadata?: Json | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          course_id: string
          current_lesson_id: string | null
          id: string
          last_accessed_at: string
          lesson_id: string
          overall_progress_percentage: number | null
          time_spent_minutes: number | null
          wallet_address: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          course_id: string
          current_lesson_id?: string | null
          id?: string
          last_accessed_at?: string
          lesson_id: string
          overall_progress_percentage?: number | null
          time_spent_minutes?: number | null
          wallet_address: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          course_id?: string
          current_lesson_id?: string | null
          id?: string
          last_accessed_at?: string
          lesson_id?: string
          overall_progress_percentage?: number | null
          time_spent_minutes?: number | null
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_progress_current_lesson_id_fkey"
            columns: ["current_lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      course_translations: {
        Row: {
          course_id: string
          created_at: string | null
          description: string | null
          id: string
          language_code: string
          title: string
          updated_at: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          language_code: string
          title: string
          updated_at?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          language_code?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_translations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: string
          course_type: string | null
          created_at: string
          description: string
          difficulty_level: string | null
          duration_hours: number | null
          id: string
          image_url: string | null
          instructor_name: string | null
          instructor_wallet: string | null
          is_active: boolean
          metadata: Json | null
          price_bcc: number
          price_usdt: number
          required_level: number | null
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          course_type?: string | null
          created_at?: string
          description: string
          difficulty_level?: string | null
          duration_hours?: number | null
          id?: string
          image_url?: string | null
          instructor_name?: string | null
          instructor_wallet?: string | null
          is_active?: boolean
          metadata?: Json | null
          price_bcc: number
          price_usdt: number
          required_level?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          course_type?: string | null
          created_at?: string
          description?: string
          difficulty_level?: string | null
          duration_hours?: number | null
          id?: string
          image_url?: string | null
          instructor_name?: string | null
          instructor_wallet?: string | null
          is_active?: boolean
          metadata?: Json | null
          price_bcc?: number
          price_usdt?: number
          required_level?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      cross_chain_transactions: {
        Row: {
          amount: number
          block_number: number | null
          confirmations: number | null
          confirmed_at: string | null
          created_at: string | null
          from_address: string
          gas_price: number | null
          gas_used: number | null
          id: string
          metadata: Json | null
          required_confirmations: number | null
          source_chain_id: number
          status: string | null
          target_chain_id: number | null
          to_address: string
          token_address: string
          transaction_hash: string
          transaction_type: string
          withdrawal_request_id: string | null
        }
        Insert: {
          amount: number
          block_number?: number | null
          confirmations?: number | null
          confirmed_at?: string | null
          created_at?: string | null
          from_address: string
          gas_price?: number | null
          gas_used?: number | null
          id?: string
          metadata?: Json | null
          required_confirmations?: number | null
          source_chain_id: number
          status?: string | null
          target_chain_id?: number | null
          to_address: string
          token_address: string
          transaction_hash: string
          transaction_type: string
          withdrawal_request_id?: string | null
        }
        Update: {
          amount?: number
          block_number?: number | null
          confirmations?: number | null
          confirmed_at?: string | null
          created_at?: string | null
          from_address?: string
          gas_price?: number | null
          gas_used?: number | null
          id?: string
          metadata?: Json | null
          required_confirmations?: number | null
          source_chain_id?: number
          status?: string | null
          target_chain_id?: number | null
          to_address?: string
          token_address?: string
          transaction_hash?: string
          transaction_type?: string
          withdrawal_request_id?: string | null
        }
        Relationships: []
      }
      dapp_analytics: {
        Row: {
          click_through_rate: number | null
          clicks: number | null
          created_at: string | null
          dapp_id: string
          date: string
          engagement_score: number | null
          favorites: number | null
          id: string
          unique_users: number | null
          updated_at: string | null
          views: number | null
        }
        Insert: {
          click_through_rate?: number | null
          clicks?: number | null
          created_at?: string | null
          dapp_id: string
          date: string
          engagement_score?: number | null
          favorites?: number | null
          id?: string
          unique_users?: number | null
          updated_at?: string | null
          views?: number | null
        }
        Update: {
          click_through_rate?: number | null
          clicks?: number | null
          created_at?: string | null
          dapp_id?: string
          date?: string
          engagement_score?: number | null
          favorites?: number | null
          id?: string
          unique_users?: number | null
          updated_at?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dapp_analytics_dapp_id_fkey"
            columns: ["dapp_id"]
            isOneToOne: false
            referencedRelation: "dapps"
            referencedColumns: ["id"]
          },
        ]
      }
      dapp_categories: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      dapp_reviews: {
        Row: {
          content: string | null
          created_at: string | null
          dapp_id: string
          id: string
          is_featured: boolean | null
          is_verified: boolean | null
          rating: number
          title: string | null
          updated_at: string | null
          wallet_address: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          dapp_id: string
          id?: string
          is_featured?: boolean | null
          is_verified?: boolean | null
          rating: number
          title?: string | null
          updated_at?: string | null
          wallet_address: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          dapp_id?: string
          id?: string
          is_featured?: boolean | null
          is_verified?: boolean | null
          rating?: number
          title?: string | null
          updated_at?: string | null
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "dapp_reviews_dapp_id_fkey"
            columns: ["dapp_id"]
            isOneToOne: false
            referencedRelation: "dapps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dapp_reviews_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      dapps: {
        Row: {
          app_url: string | null
          average_rating: number | null
          blockchain_networks: string[] | null
          category_id: string | null
          created_at: string | null
          daily_active_users: number | null
          description: string
          features: string[] | null
          id: string
          is_featured: boolean | null
          is_premium: boolean | null
          is_verified: boolean | null
          logo_url: string | null
          metadata: Json | null
          name: string
          required_level: number
          status: string | null
          supported_tokens: string[] | null
          tags: string[] | null
          total_reviews: number | null
          total_value_locked: number | null
          updated_at: string | null
          website_url: string
        }
        Insert: {
          app_url?: string | null
          average_rating?: number | null
          blockchain_networks?: string[] | null
          category_id?: string | null
          created_at?: string | null
          daily_active_users?: number | null
          description: string
          features?: string[] | null
          id?: string
          is_featured?: boolean | null
          is_premium?: boolean | null
          is_verified?: boolean | null
          logo_url?: string | null
          metadata?: Json | null
          name: string
          required_level?: number
          status?: string | null
          supported_tokens?: string[] | null
          tags?: string[] | null
          total_reviews?: number | null
          total_value_locked?: number | null
          updated_at?: string | null
          website_url: string
        }
        Update: {
          app_url?: string | null
          average_rating?: number | null
          blockchain_networks?: string[] | null
          category_id?: string | null
          created_at?: string | null
          daily_active_users?: number | null
          description?: string
          features?: string[] | null
          id?: string
          is_featured?: boolean | null
          is_premium?: boolean | null
          is_verified?: boolean | null
          logo_url?: string | null
          metadata?: Json | null
          name?: string
          required_level?: number
          status?: string | null
          supported_tokens?: string[] | null
          tags?: string[] | null
          total_reviews?: number | null
          total_value_locked?: number | null
          updated_at?: string | null
          website_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "dapps_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "dapp_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      layer_reward_rules: {
        Row: {
          created_at: string | null
          direct_referral_minimum: number | null
          id: string
          is_active: boolean | null
          is_special_rule: boolean | null
          layer_number: number
          matrix_position: string | null
          required_nft_level: number
          rule_description: string | null
        }
        Insert: {
          created_at?: string | null
          direct_referral_minimum?: number | null
          id?: string
          is_active?: boolean | null
          is_special_rule?: boolean | null
          layer_number: number
          matrix_position?: string | null
          required_nft_level: number
          rule_description?: string | null
        }
        Update: {
          created_at?: string | null
          direct_referral_minimum?: number | null
          id?: string
          is_active?: boolean | null
          is_special_rule?: boolean | null
          layer_number?: number
          matrix_position?: string | null
          required_nft_level?: number
          rule_description?: string | null
        }
        Relationships: []
      }
      layer_rewards: {
        Row: {
          claimed_at: string | null
          created_at: string | null
          direct_referrals_current: number | null
          direct_referrals_required: number | null
          expires_at: string | null
          id: string
          layer_position: string | null
          matrix_layer: number
          matrix_root_wallet: string
          recipient_current_level: number
          recipient_required_level: number
          requires_direct_referrals: boolean | null
          reward_amount: number
          reward_recipient_wallet: string
          roll_up_reason: string | null
          rolled_up_to: string | null
          status: string | null
          triggering_member_wallet: string
          triggering_nft_level: number
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string | null
          direct_referrals_current?: number | null
          direct_referrals_required?: number | null
          expires_at?: string | null
          id?: string
          layer_position?: string | null
          matrix_layer: number
          matrix_root_wallet: string
          recipient_current_level: number
          recipient_required_level: number
          requires_direct_referrals?: boolean | null
          reward_amount: number
          reward_recipient_wallet: string
          roll_up_reason?: string | null
          rolled_up_to?: string | null
          status?: string | null
          triggering_member_wallet: string
          triggering_nft_level: number
        }
        Update: {
          claimed_at?: string | null
          created_at?: string | null
          direct_referrals_current?: number | null
          direct_referrals_required?: number | null
          expires_at?: string | null
          id?: string
          layer_position?: string | null
          matrix_layer?: number
          matrix_root_wallet?: string
          recipient_current_level?: number
          recipient_required_level?: number
          requires_direct_referrals?: boolean | null
          reward_amount?: number
          reward_recipient_wallet?: string
          roll_up_reason?: string | null
          rolled_up_to?: string | null
          status?: string | null
          triggering_member_wallet?: string
          triggering_nft_level?: number
        }
        Relationships: [
          {
            foreignKeyName: "layer_rewards_matrix_root_wallet_fkey"
            columns: ["matrix_root_wallet"]
            isOneToOne: false
            referencedRelation: "member_balance_complete"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "layer_rewards_matrix_root_wallet_fkey"
            columns: ["matrix_root_wallet"]
            isOneToOne: false
            referencedRelation: "member_complete_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "layer_rewards_matrix_root_wallet_fkey"
            columns: ["matrix_root_wallet"]
            isOneToOne: false
            referencedRelation: "member_rewards_overview_v2"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "layer_rewards_matrix_root_wallet_fkey"
            columns: ["matrix_root_wallet"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "layer_rewards_matrix_root_wallet_fkey"
            columns: ["matrix_root_wallet"]
            isOneToOne: false
            referencedRelation: "referrer_stats"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "layer_rewards_reward_recipient_wallet_fkey"
            columns: ["reward_recipient_wallet"]
            isOneToOne: false
            referencedRelation: "member_balance_complete"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "layer_rewards_reward_recipient_wallet_fkey"
            columns: ["reward_recipient_wallet"]
            isOneToOne: false
            referencedRelation: "member_complete_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "layer_rewards_reward_recipient_wallet_fkey"
            columns: ["reward_recipient_wallet"]
            isOneToOne: false
            referencedRelation: "member_rewards_overview_v2"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "layer_rewards_reward_recipient_wallet_fkey"
            columns: ["reward_recipient_wallet"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "layer_rewards_reward_recipient_wallet_fkey"
            columns: ["reward_recipient_wallet"]
            isOneToOne: false
            referencedRelation: "referrer_stats"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "layer_rewards_triggering_member_wallet_fkey"
            columns: ["triggering_member_wallet"]
            isOneToOne: false
            referencedRelation: "member_balance_complete"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "layer_rewards_triggering_member_wallet_fkey"
            columns: ["triggering_member_wallet"]
            isOneToOne: false
            referencedRelation: "member_complete_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "layer_rewards_triggering_member_wallet_fkey"
            columns: ["triggering_member_wallet"]
            isOneToOne: false
            referencedRelation: "member_rewards_overview_v2"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "layer_rewards_triggering_member_wallet_fkey"
            columns: ["triggering_member_wallet"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "layer_rewards_triggering_member_wallet_fkey"
            columns: ["triggering_member_wallet"]
            isOneToOne: false
            referencedRelation: "referrer_stats"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      layer_rules: {
        Row: {
          activation_delay_hours: number | null
          created_at: string | null
          description: string | null
          direct_referrals_needed: number | null
          has_special_upgrade_rule: boolean | null
          layer: number
          layer_name: string
          matrix_width: number | null
          placement_priority: string[] | null
          positions_per_layer: number
          requires_direct_referrals: boolean | null
          requires_previous_layer: boolean | null
          special_rule_description: string | null
          spillover_enabled: boolean | null
          total_positions: number
          updated_at: string | null
        }
        Insert: {
          activation_delay_hours?: number | null
          created_at?: string | null
          description?: string | null
          direct_referrals_needed?: number | null
          has_special_upgrade_rule?: boolean | null
          layer: number
          layer_name: string
          matrix_width?: number | null
          placement_priority?: string[] | null
          positions_per_layer: number
          requires_direct_referrals?: boolean | null
          requires_previous_layer?: boolean | null
          special_rule_description?: string | null
          spillover_enabled?: boolean | null
          total_positions: number
          updated_at?: string | null
        }
        Update: {
          activation_delay_hours?: number | null
          created_at?: string | null
          description?: string | null
          direct_referrals_needed?: number | null
          has_special_upgrade_rule?: boolean | null
          layer?: number
          layer_name?: string
          matrix_width?: number | null
          placement_priority?: string[] | null
          positions_per_layer?: number
          requires_direct_referrals?: boolean | null
          requires_previous_layer?: boolean | null
          special_rule_description?: string | null
          spillover_enabled?: boolean | null
          total_positions?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      lesson_translations: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          language_code: string
          lesson_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          language_code: string
          lesson_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          language_code?: string
          lesson_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_translations_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      matrix_referrals: {
        Row: {
          created_at: string | null
          id: string
          matrix_root_wallet: string
          member_wallet: string
          parent_depth: number
          parent_wallet: string
          position: string
          referral_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          matrix_root_wallet: string
          member_wallet: string
          parent_depth: number
          parent_wallet: string
          position: string
          referral_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          matrix_root_wallet?: string
          member_wallet?: string
          parent_depth?: number
          parent_wallet?: string
          position?: string
          referral_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "matrix_referrals_matrix_root_wallet_fkey"
            columns: ["matrix_root_wallet"]
            isOneToOne: false
            referencedRelation: "member_balance_complete"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "matrix_referrals_matrix_root_wallet_fkey"
            columns: ["matrix_root_wallet"]
            isOneToOne: false
            referencedRelation: "member_complete_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "matrix_referrals_matrix_root_wallet_fkey"
            columns: ["matrix_root_wallet"]
            isOneToOne: false
            referencedRelation: "member_rewards_overview_v2"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "matrix_referrals_matrix_root_wallet_fkey"
            columns: ["matrix_root_wallet"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "matrix_referrals_matrix_root_wallet_fkey"
            columns: ["matrix_root_wallet"]
            isOneToOne: false
            referencedRelation: "referrer_stats"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "matrix_referrals_member_wallet_fkey"
            columns: ["member_wallet"]
            isOneToOne: false
            referencedRelation: "member_balance_complete"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "matrix_referrals_member_wallet_fkey"
            columns: ["member_wallet"]
            isOneToOne: false
            referencedRelation: "member_complete_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "matrix_referrals_member_wallet_fkey"
            columns: ["member_wallet"]
            isOneToOne: false
            referencedRelation: "member_rewards_overview_v2"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "matrix_referrals_member_wallet_fkey"
            columns: ["member_wallet"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "matrix_referrals_member_wallet_fkey"
            columns: ["member_wallet"]
            isOneToOne: false
            referencedRelation: "referrer_stats"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "matrix_referrals_parent_wallet_fkey"
            columns: ["parent_wallet"]
            isOneToOne: false
            referencedRelation: "member_balance_complete"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "matrix_referrals_parent_wallet_fkey"
            columns: ["parent_wallet"]
            isOneToOne: false
            referencedRelation: "member_complete_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "matrix_referrals_parent_wallet_fkey"
            columns: ["parent_wallet"]
            isOneToOne: false
            referencedRelation: "member_rewards_overview_v2"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "matrix_referrals_parent_wallet_fkey"
            columns: ["parent_wallet"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "matrix_referrals_parent_wallet_fkey"
            columns: ["parent_wallet"]
            isOneToOne: false
            referencedRelation: "referrer_stats"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      members: {
        Row: {
          activation_sequence: number
          activation_time: string
          current_level: number
          referrer_wallet: string | null
          total_nft_claimed: number | null
          wallet_address: string
        }
        Insert: {
          activation_sequence: number
          activation_time?: string
          current_level?: number
          referrer_wallet?: string | null
          total_nft_claimed?: number | null
          wallet_address: string
        }
        Update: {
          activation_sequence?: number
          activation_time?: string
          current_level?: number
          referrer_wallet?: string | null
          total_nft_claimed?: number | null
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_members_referrer_to_members"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "member_balance_complete"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "fk_members_referrer_to_members"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "member_complete_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "fk_members_referrer_to_members"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "member_rewards_overview_v2"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "fk_members_referrer_to_members"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "fk_members_referrer_to_members"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "referrer_stats"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "fk_members_wallet_to_users"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      membership: {
        Row: {
          claim_price: number
          claimed_at: string | null
          id: string
          is_member: boolean | null
          nft_level: number
          platform_activation_fee: number | null
          total_cost: number | null
          unlock_membership_level: number | null
          wallet_address: string
        }
        Insert: {
          claim_price: number
          claimed_at?: string | null
          id?: string
          is_member?: boolean | null
          nft_level: number
          platform_activation_fee?: number | null
          total_cost?: number | null
          unlock_membership_level?: number | null
          wallet_address: string
        }
        Update: {
          claim_price?: number
          claimed_at?: string | null
          id?: string
          is_member?: boolean | null
          nft_level?: number
          platform_activation_fee?: number | null
          total_cost?: number | null
          unlock_membership_level?: number | null
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_membership_wallet_to_users"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      merchant_nfts: {
        Row: {
          category: string
          created_at: string
          creator_wallet: string | null
          description: string
          id: string
          image_url: string | null
          is_active: boolean
          metadata: Json | null
          price_bcc: number
          price_usdt: number
          supply_available: number | null
          supply_total: number | null
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          creator_wallet?: string | null
          description: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          metadata?: Json | null
          price_bcc: number
          price_usdt: number
          supply_available?: number | null
          supply_total?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          creator_wallet?: string | null
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          metadata?: Json | null
          price_bcc?: number
          price_usdt?: number
          supply_available?: number | null
          supply_total?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      nft_membership_levels: {
        Row: {
          created_at: string | null
          description: string | null
          image_url: string | null
          is_active: boolean | null
          level: number
          level_name: string
          max_layer_members: number
          nft_contract_address: string | null
          nft_price_usdt: number
          platform_fee_usdt: number | null
          reward_usdt: number
          token_id: number | null
          total_cost_usdt: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          image_url?: string | null
          is_active?: boolean | null
          level: number
          level_name: string
          max_layer_members: number
          nft_contract_address?: string | null
          nft_price_usdt: number
          platform_fee_usdt?: number | null
          reward_usdt: number
          token_id?: number | null
          total_cost_usdt: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          image_url?: string | null
          is_active?: boolean | null
          level?: number
          level_name?: string
          max_layer_members?: number
          nft_contract_address?: string | null
          nft_price_usdt?: number
          platform_fee_usdt?: number | null
          reward_usdt?: number
          token_id?: number | null
          total_cost_usdt?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      nft_purchases: {
        Row: {
          buyer_wallet: string
          id: string
          metadata: Json | null
          nft_id: string
          nft_type: string
          payment_method: string
          price_bcc: number | null
          price_usdt: number
          purchased_at: string
          status: string
          transaction_hash: string | null
        }
        Insert: {
          buyer_wallet: string
          id?: string
          metadata?: Json | null
          nft_id: string
          nft_type: string
          payment_method: string
          price_bcc?: number | null
          price_usdt: number
          purchased_at?: string
          status?: string
          transaction_hash?: string | null
        }
        Update: {
          buyer_wallet?: string
          id?: string
          metadata?: Json | null
          nft_id?: string
          nft_type?: string
          payment_method?: string
          price_bcc?: number | null
          price_usdt?: number
          purchased_at?: string
          status?: string
          transaction_hash?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: number
          is_read: boolean | null
          message: string
          notification_type: string
          title: string
          updated_at: string | null
          user_wallet: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: number
          is_read?: boolean | null
          message: string
          notification_type: string
          title: string
          updated_at?: string | null
          user_wallet: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: number
          is_read?: boolean | null
          message?: string
          notification_type?: string
          title?: string
          updated_at?: string | null
          user_wallet?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          id: string
          is_direct_referral: boolean | null
          is_spillover_placement: boolean | null
          matrix_layer: number
          matrix_position: string | null
          matrix_root_sequence: number
          matrix_root_wallet: string
          member_activation_sequence: number
          member_wallet: string
          placed_at: string | null
          referrer_wallet: string | null
        }
        Insert: {
          id?: string
          is_direct_referral?: boolean | null
          is_spillover_placement?: boolean | null
          matrix_layer?: number
          matrix_position?: string | null
          matrix_root_sequence: number
          matrix_root_wallet: string
          member_activation_sequence: number
          member_wallet: string
          placed_at?: string | null
          referrer_wallet?: string | null
        }
        Update: {
          id?: string
          is_direct_referral?: boolean | null
          is_spillover_placement?: boolean | null
          matrix_layer?: number
          matrix_position?: string | null
          matrix_root_sequence?: number
          matrix_root_wallet?: string
          member_activation_sequence?: number
          member_wallet?: string
          placed_at?: string | null
          referrer_wallet?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_referrals_matrix_root_to_members"
            columns: ["matrix_root_wallet"]
            isOneToOne: false
            referencedRelation: "member_balance_complete"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "fk_referrals_matrix_root_to_members"
            columns: ["matrix_root_wallet"]
            isOneToOne: false
            referencedRelation: "member_complete_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "fk_referrals_matrix_root_to_members"
            columns: ["matrix_root_wallet"]
            isOneToOne: false
            referencedRelation: "member_rewards_overview_v2"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "fk_referrals_matrix_root_to_members"
            columns: ["matrix_root_wallet"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "fk_referrals_matrix_root_to_members"
            columns: ["matrix_root_wallet"]
            isOneToOne: false
            referencedRelation: "referrer_stats"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "fk_referrals_member_to_members"
            columns: ["member_wallet"]
            isOneToOne: false
            referencedRelation: "member_balance_complete"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "fk_referrals_member_to_members"
            columns: ["member_wallet"]
            isOneToOne: false
            referencedRelation: "member_complete_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "fk_referrals_member_to_members"
            columns: ["member_wallet"]
            isOneToOne: false
            referencedRelation: "member_rewards_overview_v2"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "fk_referrals_member_to_members"
            columns: ["member_wallet"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "fk_referrals_member_to_members"
            columns: ["member_wallet"]
            isOneToOne: false
            referencedRelation: "referrer_stats"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "fk_referrals_referrer_to_members"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "member_balance_complete"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "fk_referrals_referrer_to_members"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "member_complete_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "fk_referrals_referrer_to_members"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "member_rewards_overview_v2"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "fk_referrals_referrer_to_members"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "fk_referrals_referrer_to_members"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "referrer_stats"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      referrals_new: {
        Row: {
          created_at: string | null
          id: string
          referred_wallet: string
          referrer_wallet: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          referred_wallet: string
          referrer_wallet: string
        }
        Update: {
          created_at?: string | null
          id?: string
          referred_wallet?: string
          referrer_wallet?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_new_referred_wallet_fkey"
            columns: ["referred_wallet"]
            isOneToOne: true
            referencedRelation: "member_balance_complete"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_new_referred_wallet_fkey"
            columns: ["referred_wallet"]
            isOneToOne: true
            referencedRelation: "member_complete_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_new_referred_wallet_fkey"
            columns: ["referred_wallet"]
            isOneToOne: true
            referencedRelation: "member_rewards_overview_v2"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_new_referred_wallet_fkey"
            columns: ["referred_wallet"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_new_referred_wallet_fkey"
            columns: ["referred_wallet"]
            isOneToOne: true
            referencedRelation: "referrer_stats"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_new_referrer_wallet_fkey"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "member_balance_complete"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_new_referrer_wallet_fkey"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "member_complete_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_new_referrer_wallet_fkey"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "member_rewards_overview_v2"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_new_referrer_wallet_fkey"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_new_referrer_wallet_fkey"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "referrer_stats"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      reward_claims: {
        Row: {
          claim_transaction_hash: string | null
          claimed_at: string | null
          created_at: string | null
          expires_at: string
          id: string
          layer: number
          metadata: Json | null
          nft_level: number
          reward_amount_usdc: number
          rolled_up_at: string | null
          rolled_up_to_wallet: string | null
          root_wallet: string
          status: string
          triggering_member_wallet: string
          triggering_transaction_hash: string | null
        }
        Insert: {
          claim_transaction_hash?: string | null
          claimed_at?: string | null
          created_at?: string | null
          expires_at: string
          id?: string
          layer: number
          metadata?: Json | null
          nft_level: number
          reward_amount_usdc: number
          rolled_up_at?: string | null
          rolled_up_to_wallet?: string | null
          root_wallet: string
          status: string
          triggering_member_wallet: string
          triggering_transaction_hash?: string | null
        }
        Update: {
          claim_transaction_hash?: string | null
          claimed_at?: string | null
          created_at?: string | null
          expires_at?: string
          id?: string
          layer?: number
          metadata?: Json | null
          nft_level?: number
          reward_amount_usdc?: number
          rolled_up_at?: string | null
          rolled_up_to_wallet?: string | null
          root_wallet?: string
          status?: string
          triggering_member_wallet?: string
          triggering_transaction_hash?: string | null
        }
        Relationships: []
      }
      reward_records: {
        Row: {
          bcc_released: number | null
          claimed_at: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          layer_number: number
          nft_level: number | null
          recipient_wallet: string
          reward_amount: number
          reward_status: string
          reward_type: string
          rolled_up_at: string | null
          triggered_by_placement: string
          triggered_by_wallet: string
          upgrade_from_level: number | null
          upgrade_to_level: number | null
        }
        Insert: {
          bcc_released?: number | null
          claimed_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          layer_number?: number
          nft_level?: number | null
          recipient_wallet: string
          reward_amount: number
          reward_status?: string
          reward_type: string
          rolled_up_at?: string | null
          triggered_by_placement: string
          triggered_by_wallet: string
          upgrade_from_level?: number | null
          upgrade_to_level?: number | null
        }
        Update: {
          bcc_released?: number | null
          claimed_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          layer_number?: number
          nft_level?: number | null
          recipient_wallet?: string
          reward_amount?: number
          reward_status?: string
          reward_type?: string
          rolled_up_at?: string | null
          triggered_by_placement?: string
          triggered_by_wallet?: string
          upgrade_from_level?: number | null
          upgrade_to_level?: number | null
        }
        Relationships: []
      }
      reward_timers: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          is_active: boolean | null
          notification_sent: boolean | null
          recipient_wallet: string
          reward_id: string
          started_at: string | null
          timer_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          is_active?: boolean | null
          notification_sent?: boolean | null
          recipient_wallet: string
          reward_id: string
          started_at?: string | null
          timer_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean | null
          notification_sent?: boolean | null
          recipient_wallet?: string
          reward_id?: string
          started_at?: string | null
          timer_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reward_timers_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "layer_rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_timers_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "v_r_zone_status"
            referencedColumns: ["reward_id"]
          },
        ]
      }
      roll_up_rewards: {
        Row: {
          created_at: string | null
          final_recipient: string
          id: string
          original_recipient: string
          original_reward_id: string
          reward_amount: number
          roll_up_reason: string
        }
        Insert: {
          created_at?: string | null
          final_recipient: string
          id?: string
          original_recipient: string
          original_reward_id: string
          reward_amount: number
          roll_up_reason: string
        }
        Update: {
          created_at?: string | null
          final_recipient?: string
          id?: string
          original_recipient?: string
          original_reward_id?: string
          reward_amount?: number
          roll_up_reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "roll_up_rewards_final_recipient_fkey"
            columns: ["final_recipient"]
            isOneToOne: false
            referencedRelation: "member_balance_complete"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "roll_up_rewards_final_recipient_fkey"
            columns: ["final_recipient"]
            isOneToOne: false
            referencedRelation: "member_complete_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "roll_up_rewards_final_recipient_fkey"
            columns: ["final_recipient"]
            isOneToOne: false
            referencedRelation: "member_rewards_overview_v2"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "roll_up_rewards_final_recipient_fkey"
            columns: ["final_recipient"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "roll_up_rewards_final_recipient_fkey"
            columns: ["final_recipient"]
            isOneToOne: false
            referencedRelation: "referrer_stats"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "roll_up_rewards_original_recipient_fkey"
            columns: ["original_recipient"]
            isOneToOne: false
            referencedRelation: "member_balance_complete"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "roll_up_rewards_original_recipient_fkey"
            columns: ["original_recipient"]
            isOneToOne: false
            referencedRelation: "member_complete_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "roll_up_rewards_original_recipient_fkey"
            columns: ["original_recipient"]
            isOneToOne: false
            referencedRelation: "member_rewards_overview_v2"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "roll_up_rewards_original_recipient_fkey"
            columns: ["original_recipient"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "roll_up_rewards_original_recipient_fkey"
            columns: ["original_recipient"]
            isOneToOne: false
            referencedRelation: "referrer_stats"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "roll_up_rewards_original_reward_id_fkey"
            columns: ["original_reward_id"]
            isOneToOne: false
            referencedRelation: "layer_rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roll_up_rewards_original_reward_id_fkey"
            columns: ["original_reward_id"]
            isOneToOne: false
            referencedRelation: "v_r_zone_status"
            referencedColumns: ["reward_id"]
          },
        ]
      }
      server_wallet_balances: {
        Row: {
          balance: number
          chain_id: number
          chain_name: string
          decimals: number
          id: string
          is_operational: boolean | null
          last_updated: string | null
          price_usd: number | null
          token_address: string
          token_symbol: string
        }
        Insert: {
          balance?: number
          chain_id: number
          chain_name: string
          decimals?: number
          id?: string
          is_operational?: boolean | null
          last_updated?: string | null
          price_usd?: number | null
          token_address: string
          token_symbol: string
        }
        Update: {
          balance?: number
          chain_id?: number
          chain_name?: string
          decimals?: number
          id?: string
          is_operational?: boolean | null
          last_updated?: string | null
          price_usd?: number | null
          token_address?: string
          token_symbol?: string
        }
        Relationships: []
      }
      server_wallet_operations: {
        Row: {
          amount: number | null
          chain_id: number
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          gas_fee_usd: number | null
          gas_used: number | null
          id: string
          metadata: Json | null
          operation_type: string
          status: string | null
          token_address: string | null
          transaction_hash: string | null
          wallet_address: string
        }
        Insert: {
          amount?: number | null
          chain_id: number
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          gas_fee_usd?: number | null
          gas_used?: number | null
          id?: string
          metadata?: Json | null
          operation_type: string
          status?: string | null
          token_address?: string | null
          transaction_hash?: string | null
          wallet_address: string
        }
        Update: {
          amount?: number | null
          chain_id?: number
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          gas_fee_usd?: number | null
          gas_used?: number | null
          id?: string
          metadata?: Json | null
          operation_type?: string
          status?: string | null
          token_address?: string | null
          transaction_hash?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      usdt_withdrawals: {
        Row: {
          amount: number
          failure_reason: string | null
          fee_amount: number | null
          id: string
          network: string
          processed_at: string | null
          requested_at: string
          status: string
          transaction_hash: string | null
          wallet_address: string
          withdrawal_address: string
        }
        Insert: {
          amount: number
          failure_reason?: string | null
          fee_amount?: number | null
          id?: string
          network: string
          processed_at?: string | null
          requested_at?: string
          status?: string
          transaction_hash?: string | null
          wallet_address: string
          withdrawal_address: string
        }
        Update: {
          amount?: number
          failure_reason?: string | null
          fee_amount?: number | null
          id?: string
          network?: string
          processed_at?: string | null
          requested_at?: string
          status?: string
          transaction_hash?: string | null
          wallet_address?: string
          withdrawal_address?: string
        }
        Relationships: []
      }
      user_balances: {
        Row: {
          activation_tier: number | null
          available_balance: number | null
          bcc_balance: number | null
          bcc_locked: number | null
          bcc_total_unlocked: number | null
          bcc_used: number | null
          last_updated: string | null
          reward_balance: number | null
          reward_claimed: number | null
          tier_multiplier: number | null
          total_earned: number | null
          total_withdrawn: number | null
          wallet_address: string
        }
        Insert: {
          activation_tier?: number | null
          available_balance?: number | null
          bcc_balance?: number | null
          bcc_locked?: number | null
          bcc_total_unlocked?: number | null
          bcc_used?: number | null
          last_updated?: string | null
          reward_balance?: number | null
          reward_claimed?: number | null
          tier_multiplier?: number | null
          total_earned?: number | null
          total_withdrawn?: number | null
          wallet_address: string
        }
        Update: {
          activation_tier?: number | null
          available_balance?: number | null
          bcc_balance?: number | null
          bcc_locked?: number | null
          bcc_total_unlocked?: number | null
          bcc_used?: number | null
          last_updated?: string | null
          reward_balance?: number | null
          reward_claimed?: number | null
          tier_multiplier?: number | null
          total_earned?: number | null
          total_withdrawn?: number | null
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_balances_wallet_to_members"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "member_balance_complete"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "fk_user_balances_wallet_to_members"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "member_complete_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "fk_user_balances_wallet_to_members"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "member_rewards_overview_v2"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "fk_user_balances_wallet_to_members"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "fk_user_balances_wallet_to_members"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "referrer_stats"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      user_dapp_interactions: {
        Row: {
          created_at: string | null
          dapp_id: string
          favorited_at: string | null
          id: string
          interaction_count: number | null
          interaction_type: string
          is_favorite: boolean | null
          last_interaction_at: string | null
          updated_at: string | null
          wallet_address: string
        }
        Insert: {
          created_at?: string | null
          dapp_id: string
          favorited_at?: string | null
          id?: string
          interaction_count?: number | null
          interaction_type: string
          is_favorite?: boolean | null
          last_interaction_at?: string | null
          updated_at?: string | null
          wallet_address: string
        }
        Update: {
          created_at?: string | null
          dapp_id?: string
          favorited_at?: string | null
          id?: string
          interaction_count?: number | null
          interaction_type?: string
          is_favorite?: boolean | null
          last_interaction_at?: string | null
          updated_at?: string | null
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_dapp_interactions_dapp_id_fkey"
            columns: ["dapp_id"]
            isOneToOne: false
            referencedRelation: "dapps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_dapp_interactions_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      user_notifications: {
        Row: {
          action_url: string | null
          category: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          priority: number | null
          read_at: string | null
          title: string
          type: string
          wallet_address: string
        }
        Insert: {
          action_url?: string | null
          category?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          priority?: number | null
          read_at?: string | null
          title: string
          type: string
          wallet_address: string
        }
        Update: {
          action_url?: string | null
          category?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          priority?: number | null
          read_at?: string | null
          title?: string
          type?: string
          wallet_address?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          email: string | null
          referrer_wallet: string | null
          role: string
          updated_at: string | null
          username: string | null
          wallet_address: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          referrer_wallet?: string | null
          role?: string
          updated_at?: string | null
          username?: string | null
          wallet_address: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          referrer_wallet?: string | null
          role?: string
          updated_at?: string | null
          username?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string | null
          estimated_completion: string | null
          gas_fee_usd: number | null
          id: string
          metadata: Json | null
          status: string | null
          target_chain_id: number
          token_address: string
          transaction_hash: string | null
          updated_at: string | null
          user_signature: string
          user_wallet: string
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string | null
          estimated_completion?: string | null
          gas_fee_usd?: number | null
          id: string
          metadata?: Json | null
          status?: string | null
          target_chain_id: number
          token_address: string
          transaction_hash?: string | null
          updated_at?: string | null
          user_signature: string
          user_wallet: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string | null
          estimated_completion?: string | null
          gas_fee_usd?: number | null
          id?: string
          metadata?: Json | null
          status?: string | null
          target_chain_id?: number
          token_address?: string
          transaction_hash?: string | null
          updated_at?: string | null
          user_signature?: string
          user_wallet?: string
        }
        Relationships: []
      }
    }
    Views: {
      admin_global_settings: {
        Row: {
          created_at: string | null
          data_type: string | null
          description: string | null
          formatted_value: string | null
          is_active: boolean | null
          setting_name: string | null
          setting_value: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_type?: never
          description?: string | null
          formatted_value?: never
          is_active?: never
          setting_name?: string | null
          setting_value?: never
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_type?: never
          description?: string | null
          formatted_value?: never
          is_active?: never
          setting_name?: string | null
          setting_value?: never
          updated_at?: string | null
        }
        Relationships: []
      }
      empty_slot_flags_view: {
        Row: {
          layer: number | null
          matrix_root_wallet: string | null
          parent_wallet: string | null
          slot_l_empty: boolean | null
          slot_m_empty: boolean | null
          slot_r_empty: boolean | null
          total_empty_slots: number | null
        }
        Relationships: []
      }
      matrix_layers_view: {
        Row: {
          completion_rate: number | null
          empty_slots: number | null
          filled_slots: number | null
          layer: number | null
          matrix_root_wallet: string | null
          max_slots: number | null
        }
        Relationships: []
      }
      matrix_referrals_tree_view: {
        Row: {
          child_activation_time: string | null
          layer: number | null
          matrix_root_activation_sequence: number | null
          matrix_root_wallet: string | null
          member_wallet: string | null
          parent_wallet: string | null
          position: string | null
          referral_type: string | null
        }
        Relationships: []
      }
      matrix_referrals_view: {
        Row: {
          activation_sequence: number | null
          created_at: string | null
          current_level: number | null
          depth: number | null
          is_active: boolean | null
          layer: number | null
          layer_label: string | null
          matrix_root_wallet: string | null
          parent_wallet: string | null
          position: string | null
          referral_type: string | null
          username: string | null
          wallet_address: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matrix_referrals_matrix_root_wallet_fkey"
            columns: ["matrix_root_wallet"]
            isOneToOne: false
            referencedRelation: "member_balance_complete"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "matrix_referrals_matrix_root_wallet_fkey"
            columns: ["matrix_root_wallet"]
            isOneToOne: false
            referencedRelation: "member_complete_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "matrix_referrals_matrix_root_wallet_fkey"
            columns: ["matrix_root_wallet"]
            isOneToOne: false
            referencedRelation: "member_rewards_overview_v2"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "matrix_referrals_matrix_root_wallet_fkey"
            columns: ["matrix_root_wallet"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "matrix_referrals_matrix_root_wallet_fkey"
            columns: ["matrix_root_wallet"]
            isOneToOne: false
            referencedRelation: "referrer_stats"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "matrix_referrals_member_wallet_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "member_balance_complete"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "matrix_referrals_member_wallet_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "member_complete_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "matrix_referrals_member_wallet_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "member_rewards_overview_v2"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "matrix_referrals_member_wallet_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "matrix_referrals_member_wallet_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "referrer_stats"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "matrix_referrals_parent_wallet_fkey"
            columns: ["parent_wallet"]
            isOneToOne: false
            referencedRelation: "member_balance_complete"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "matrix_referrals_parent_wallet_fkey"
            columns: ["parent_wallet"]
            isOneToOne: false
            referencedRelation: "member_complete_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "matrix_referrals_parent_wallet_fkey"
            columns: ["parent_wallet"]
            isOneToOne: false
            referencedRelation: "member_rewards_overview_v2"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "matrix_referrals_parent_wallet_fkey"
            columns: ["parent_wallet"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "matrix_referrals_parent_wallet_fkey"
            columns: ["parent_wallet"]
            isOneToOne: false
            referencedRelation: "referrer_stats"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      member_balance_complete: {
        Row: {
          activation_sequence: number | null
          activation_tier: number | null
          available_balance: number | null
          balance_updated: string | null
          bcc_balance: number | null
          bcc_locked: number | null
          bcc_total_available: number | null
          bcc_total_unlocked: number | null
          bcc_used: number | null
          claimable_amount_usdt: number | null
          claimable_rewards: number | null
          claimed_amount_usdt: number | null
          claimed_rewards: number | null
          current_level: number | null
          direct_referrals: number | null
          email: string | null
          max_layer: number | null
          pending_rewards: number | null
          reward_balance: number | null
          tier_multiplier: number | null
          total_earned: number | null
          total_nft_claimed: number | null
          total_rewards: number | null
          total_team_size: number | null
          total_withdrawn: number | null
          username: string | null
          wallet_address: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_members_wallet_to_users"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      member_complete_info: {
        Row: {
          activation_sequence: number | null
          activation_time: string | null
          current_level: number | null
          direct_referrals: number | null
          email: string | null
          max_layer: number | null
          referrer_activation_sequence: number | null
          referrer_username: string | null
          referrer_wallet: string | null
          spillover_count: number | null
          total_nft_claimed: number | null
          total_team_size: number | null
          username: string | null
          wallet_address: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_members_referrer_to_members"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "member_balance_complete"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "fk_members_referrer_to_members"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "member_complete_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "fk_members_referrer_to_members"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "member_rewards_overview_v2"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "fk_members_referrer_to_members"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "fk_members_referrer_to_members"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "referrer_stats"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "fk_members_wallet_to_users"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      member_rewards_overview_v2: {
        Row: {
          activation_sequence: number | null
          claimable_amount_usdt: number | null
          claimable_rewards_count: number | null
          claimed_amount_usdt: number | null
          claimed_rewards_count: number | null
          current_level: number | null
          expired_rewards_count: number | null
          latest_claim_time: string | null
          latest_reward_time: string | null
          level_name: string | null
          pending_amount_usdt: number | null
          pending_rewards_count: number | null
          total_amount_usdt: number | null
          total_rewards_count: number | null
          username: string | null
          wallet_address: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_members_wallet_to_users"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      referrals_stats_view: {
        Row: {
          activated_referrals_count: number | null
          activation_sequence: number | null
          current_level: number | null
          direct_referrals_count: number | null
          first_referral_time: string | null
          last_referral_time: string | null
          level2_upgrade_eligible: boolean | null
          username: string | null
          wallet_address: string | null
        }
        Relationships: []
      }
      referrals_tree_view: {
        Row: {
          child_activation_time: string | null
          depth: number | null
          referral_created_at: string | null
          referred_wallet: string | null
          referrer_wallet: string | null
          root_wallet: string | null
        }
        Relationships: []
      }
      referrer_stats: {
        Row: {
          activation_sequence: number | null
          activation_time: string | null
          current_level: number | null
          direct_referrals: number | null
          email: string | null
          l_position_filled: boolean | null
          layer1_filled_count: number | null
          m_position_filled: boolean | null
          max_layer: number | null
          next_vacant_position: string | null
          r_position_filled: boolean | null
          referrer_category: string | null
          spillover_count: number | null
          total_team_size: number | null
          username: string | null
          wallet_address: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_members_wallet_to_users"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      system_views_info: {
        Row: {
          description: string | null
          frontend_usage: string | null
          key_columns: string | null
          view_name: string | null
        }
        Relationships: []
      }
      v_r_zone_status: {
        Row: {
          created_at: string | null
          matrix_root_level: number | null
          matrix_root_wallet: string | null
          qualification_status: string | null
          reward_amount: number | null
          reward_id: string | null
          reward_recipient_wallet: string | null
          roll_up_reason: string | null
          status: string | null
          triggering_member_wallet: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_referrals_matrix_root_to_members"
            columns: ["matrix_root_wallet"]
            isOneToOne: false
            referencedRelation: "member_balance_complete"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "fk_referrals_matrix_root_to_members"
            columns: ["matrix_root_wallet"]
            isOneToOne: false
            referencedRelation: "member_complete_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "fk_referrals_matrix_root_to_members"
            columns: ["matrix_root_wallet"]
            isOneToOne: false
            referencedRelation: "member_rewards_overview_v2"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "fk_referrals_matrix_root_to_members"
            columns: ["matrix_root_wallet"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "fk_referrals_matrix_root_to_members"
            columns: ["matrix_root_wallet"]
            isOneToOne: false
            referencedRelation: "referrer_stats"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "layer_rewards_reward_recipient_wallet_fkey"
            columns: ["reward_recipient_wallet"]
            isOneToOne: false
            referencedRelation: "member_balance_complete"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "layer_rewards_reward_recipient_wallet_fkey"
            columns: ["reward_recipient_wallet"]
            isOneToOne: false
            referencedRelation: "member_complete_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "layer_rewards_reward_recipient_wallet_fkey"
            columns: ["reward_recipient_wallet"]
            isOneToOne: false
            referencedRelation: "member_rewards_overview_v2"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "layer_rewards_reward_recipient_wallet_fkey"
            columns: ["reward_recipient_wallet"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "layer_rewards_reward_recipient_wallet_fkey"
            columns: ["reward_recipient_wallet"]
            isOneToOne: false
            referencedRelation: "referrer_stats"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "layer_rewards_triggering_member_wallet_fkey"
            columns: ["triggering_member_wallet"]
            isOneToOne: false
            referencedRelation: "member_balance_complete"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "layer_rewards_triggering_member_wallet_fkey"
            columns: ["triggering_member_wallet"]
            isOneToOne: false
            referencedRelation: "member_complete_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "layer_rewards_triggering_member_wallet_fkey"
            columns: ["triggering_member_wallet"]
            isOneToOne: false
            referencedRelation: "member_rewards_overview_v2"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "layer_rewards_triggering_member_wallet_fkey"
            columns: ["triggering_member_wallet"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "layer_rewards_triggering_member_wallet_fkey"
            columns: ["triggering_member_wallet"]
            isOneToOne: false
            referencedRelation: "referrer_stats"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
    }
    Functions: {
      activate_membership_fallback: {
        Args: {
          p_level?: number
          p_referrer_wallet?: string
          p_transaction_hash?: string
          p_wallet_address: string
        }
        Returns: Json
      }
      activate_nft_level1_membership: {
        Args:
          | {
              p_referrer_wallet?: string
              p_transaction_hash?: string
              p_wallet_address: string
            }
          | { p_referrer_wallet?: string; p_wallet_address: string }
        Returns: Json
      }
      calculate_level_bcc_unlock: {
        Args: { p_activation_sequence: number; p_level: number }
        Returns: number
      }
      calculate_total_bcc_locked: {
        Args: { p_activation_sequence: number }
        Returns: number
      }
      check_and_update_r_zone_rewards: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      check_data_integrity: {
        Args: Record<PropertyKey, never>
        Returns: {
          check_name: string
          description: string
          issue_count: number
          status: string
        }[]
      }
      check_reward_qualification: {
        Args: {
          p_recipient_wallet: string
          p_reward_amount: number
          p_reward_layer: number
        }
        Returns: Json
      }
      claim_layer_reward: {
        Args: { p_member_wallet: string; p_reward_id: string }
        Returns: Json
      }
      create_notification: {
        Args:
          | {
              p_action_url?: string
              p_category?: string
              p_message: string
              p_metadata?: Json
              p_priority?: number
              p_title: string
              p_type: string
              p_user_wallet: string
            }
          | {
              p_data?: Json
              p_message: string
              p_title: string
              p_type: string
              p_user_wallet: string
            }
        Returns: Json
      }
      create_reward_earned_notification: {
        Args: {
          p_matrix_layer: number
          p_matrix_position: string
          p_recipient_wallet: string
          p_reward_amount: number
          p_triggering_member: string
        }
        Returns: Json
      }
      create_welcome_notifications: {
        Args: {
          p_activation_sequence: number
          p_bcc_result?: Json
          p_placement_result?: Json
          p_rewards_result?: Json
          p_wallet_address: string
        }
        Returns: Json
      }
      find_next_qualified_upline: {
        Args: { current_wallet: string; required_level: number }
        Returns: string
      }
      generate_level_based_rewards: {
        Args: { p_member_level: number; p_member_wallet: string }
        Returns: Json
      }
      generate_qualified_rewards: {
        Args: { p_member_level: number; p_member_wallet: string }
        Returns: Json
      }
      get_current_activation_tier: {
        Args: Record<PropertyKey, never>
        Returns: {
          bcc_multiplier: number
          current_activations: number
          next_milestone: number
          tier: number
          tier_name: string
        }[]
      }
      get_current_wallet_address: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_member_status: {
        Args: { p_wallet_address: string }
        Returns: Json
      }
      get_nft_level_price: {
        Args: { p_level: number }
        Returns: number
      }
      get_user_pending_rewards: {
        Args: { p_wallet_address: string }
        Returns: {
          can_claim: boolean
          expires_at: string
          reward_amount: number
          reward_id: string
          status_description: string
          time_remaining_seconds: number
          timer_type: string
          triggering_member_username: string
        }[]
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      log_activation_issue: {
        Args: {
          p_error_details?: Json
          p_error_message: string
          p_method?: string
          p_transaction_hash: string
          p_wallet_address: string
        }
        Returns: undefined
      }
      place_new_member_in_matrix_correct: {
        Args: { p_member_wallet: string; p_referrer_wallet: string }
        Returns: Json
      }
      process_expired_layer_rewards: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      process_expired_timers: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      process_user_registration: {
        Args: {
          p_referrer_wallet?: string
          p_username?: string
          p_wallet_address: string
        }
        Returns: Json
      }
      purchase_course_with_bcc: {
        Args: {
          p_course_id: string
          p_price_bcc: number
          p_wallet_address: string
        }
        Returns: Json
      }
      purchase_nft_with_bcc: {
        Args: {
          p_buyer_wallet: string
          p_nft_id: string
          p_nft_type: string
          p_price_bcc: number
        }
        Returns: Json
      }
      register_user_simple: {
        Args: {
          p_email: string
          p_referrer_wallet: string
          p_username: string
          p_wallet_address: string
        }
        Returns: Json
      }
      release_bcc_on_level_upgrade: {
        Args: {
          p_from_level: number
          p_to_level: number
          p_wallet_address: string
        }
        Returns: Json
      }
      rollup_unqualified_reward: {
        Args: {
          p_original_recipient: string
          p_reward_amount: number
          p_reward_layer: number
          p_triggering_member: string
        }
        Returns: Json
      }
      spend_bcc_tokens: {
        Args: {
          p_amount: number
          p_item_reference?: string
          p_purpose: string
          p_wallet_address: string
        }
        Returns: Json
      }
      sync_members_to_membership: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      sync_rewards_to_user_balances: {
        Args: Record<PropertyKey, never>
        Returns: {
          message: string
          total_usdc_added: number
          updated_wallets: number
        }[]
      }
      toggle_activation_pending_global: {
        Args: { p_admin_wallet: string; p_enabled: boolean; p_reason?: string }
        Returns: Json
      }
      trigger_layer_rewards_on_upgrade: {
        Args: {
          p_new_level: number
          p_nft_price: number
          p_upgrading_member_wallet: string
        }
        Returns: Json
      }
      unlock_bcc_for_level: {
        Args: { p_level: number; p_wallet_address: string }
        Returns: Json
      }
      validate_r_zone_qualification: {
        Args: { p_matrix_position: string; p_member_wallet: string }
        Returns: Json
      }
      withdraw_member_rewards: {
        Args: { p_wallet_address: string; p_withdraw_amount: number }
        Returns: {
          message: string
          remaining_balance: number
          success: boolean
          withdrawn_amount: number
        }[]
      }
      withdraw_reward_balance: {
        Args: {
          p_amount_usdc: number
          p_wallet_address: string
          p_withdrawal_address?: string
        }
        Returns: Json
      }
    }
    Enums: {
      enum_wallet_ref_type:
        | "USER"
        | "MEMBER"
        | "REFERRER"
        | "MATRIX_ROOT"
        | "BALANCE_HOLDER"
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
      enum_wallet_ref_type: [
        "USER",
        "MEMBER",
        "REFERRER",
        "MATRIX_ROOT",
        "BALANCE_HOLDER",
      ],
    },
  },
} as const
