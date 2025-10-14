npm warn exec The following package was not found and will be installed: supabase@2.51.0
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
      advertisement_nft_translations: {
        Row: {
          advertisement_nft_id: string
          click_url: string | null
          created_at: string | null
          description: string | null
          id: string
          language_code: string
          title: string
          updated_at: string | null
        }
        Insert: {
          advertisement_nft_id: string
          click_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          language_code: string
          title: string
          updated_at?: string | null
        }
        Update: {
          advertisement_nft_id?: string
          click_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          language_code?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advertisement_nft_translations_advertisement_nft_id_fkey"
            columns: ["advertisement_nft_id"]
            isOneToOne: false
            referencedRelation: "advertisement_nfts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advertisement_nft_translations_advertisement_nft_id_fkey"
            columns: ["advertisement_nft_id"]
            isOneToOne: false
            referencedRelation: "advertisement_nfts_multilingual"
            referencedColumns: ["id"]
          },
        ]
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
          unlock_sequence: number | null
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
          unlock_sequence?: number | null
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
          unlock_sequence?: number | null
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
      blog_post_translations: {
        Row: {
          author: string
          blog_post_id: string
          content: string
          created_at: string | null
          excerpt: string
          id: string
          language_code: string
          slug: string
          tags: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author: string
          blog_post_id: string
          content: string
          created_at?: string | null
          excerpt: string
          id?: string
          language_code: string
          slug: string
          tags?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author?: string
          blog_post_id?: string
          content?: string
          created_at?: string | null
          excerpt?: string
          id?: string
          language_code?: string
          slug?: string
          tags?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_translations_blog_post_id_fkey"
            columns: ["blog_post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_post_translations_blog_post_id_fkey"
            columns: ["blog_post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts_multilingual"
            referencedColumns: ["id"]
          },
        ]
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
      claim_sync_queue: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          failed_at: string | null
          id: string
          last_error_at: string | null
          level: number
          max_retries: number | null
          metadata: Json | null
          retry_count: number | null
          source: string | null
          status: string
          tx_hash: string
          updated_at: string | null
          wallet_address: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          last_error_at?: string | null
          level: number
          max_retries?: number | null
          metadata?: Json | null
          retry_count?: number | null
          source?: string | null
          status?: string
          tx_hash: string
          updated_at?: string | null
          wallet_address: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          last_error_at?: string | null
          level?: number
          max_retries?: number | null
          metadata?: Json | null
          retry_count?: number | null
          source?: string | null
          status?: string
          tx_hash?: string
          updated_at?: string | null
          wallet_address?: string
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
          {
            foreignKeyName: "dapp_reviews_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "v_user_balances"
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
      direct_referral_rewards: {
        Row: {
          claimed_at: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          referred_member_wallet: string
          referrer_wallet: string
          reward_amount: number | null
          status: string | null
          transaction_hash: string | null
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          referred_member_wallet: string
          referrer_wallet: string
          reward_amount?: number | null
          status?: string | null
          transaction_hash?: string | null
        }
        Update: {
          claimed_at?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          referred_member_wallet?: string
          referrer_wallet?: string
          reward_amount?: number | null
          status?: string | null
          transaction_hash?: string | null
        }
        Relationships: []
      }
      direct_rewards: {
        Row: {
          claimed_at: string | null
          created_at: string | null
          id: string
          is_third_generation: boolean | null
          recipient_current_level: number
          recipient_required_level: number | null
          requires_third_upgrade: boolean | null
          reward_amount: number
          reward_recipient_wallet: string
          status: string | null
          triggering_member_wallet: string
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string | null
          id?: string
          is_third_generation?: boolean | null
          recipient_current_level: number
          recipient_required_level?: number | null
          requires_third_upgrade?: boolean | null
          reward_amount?: number
          reward_recipient_wallet: string
          status?: string | null
          triggering_member_wallet: string
        }
        Update: {
          claimed_at?: string | null
          created_at?: string | null
          id?: string
          is_third_generation?: boolean | null
          recipient_current_level?: number
          recipient_required_level?: number | null
          requires_third_upgrade?: boolean | null
          reward_amount?: number
          reward_recipient_wallet?: string
          status?: string | null
          triggering_member_wallet?: string
        }
        Relationships: []
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
          is_rollup: boolean | null
          layer_position: string | null
          matrix_layer: number
          matrix_root_wallet: string
          original_reward_id: string | null
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
          is_rollup?: boolean | null
          layer_position?: string | null
          matrix_layer: number
          matrix_root_wallet: string
          original_reward_id?: string | null
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
          is_rollup?: boolean | null
          layer_position?: string | null
          matrix_layer?: number
          matrix_root_wallet?: string
          original_reward_id?: string | null
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
            foreignKeyName: "layer_rewards_original_reward_id_fkey"
            columns: ["original_reward_id"]
            isOneToOne: false
            referencedRelation: "layer_reward_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "layer_rewards_original_reward_id_fkey"
            columns: ["original_reward_id"]
            isOneToOne: false
            referencedRelation: "layer_rewards"
            referencedColumns: ["id"]
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
      manual_review_queue: {
        Row: {
          assigned_at: string | null
          assigned_to: string | null
          created_at: string | null
          details: Json | null
          id: string
          issue_type: string
          priority: string | null
          resolution_notes: string | null
          resolved_at: string | null
          status: string | null
          wallet_address: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_to?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          issue_type: string
          priority?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string | null
          wallet_address: string
        }
        Update: {
          assigned_at?: string | null
          assigned_to?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          issue_type?: string
          priority?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
      matrix_referrals: {
        Row: {
          created_at: string | null
          id: number
          layer: number
          matrix_root_wallet: string
          member_wallet: string
          parent_depth: number | null
          parent_wallet: string | null
          position: string | null
          referral_type: string | null
          source: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          layer: number
          matrix_root_wallet: string
          member_wallet: string
          parent_depth?: number | null
          parent_wallet?: string | null
          position?: string | null
          referral_type?: string | null
          source?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          layer?: number
          matrix_root_wallet?: string
          member_wallet?: string
          parent_depth?: number | null
          parent_wallet?: string | null
          position?: string | null
          referral_type?: string | null
          source?: string | null
        }
        Relationships: []
      }
      matrix_referrals_backup_20251012: {
        Row: {
          created_at: string | null
          id: string | null
          layer: number | null
          matrix_root_wallet: string | null
          member_wallet: string | null
          parent_depth: number | null
          parent_wallet: string | null
          position: string | null
          referral_type: string | null
          source: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          layer?: number | null
          matrix_root_wallet?: string | null
          member_wallet?: string | null
          parent_depth?: number | null
          parent_wallet?: string | null
          position?: string | null
          referral_type?: string | null
          source?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          layer?: number | null
          matrix_root_wallet?: string | null
          member_wallet?: string | null
          parent_depth?: number | null
          parent_wallet?: string | null
          position?: string | null
          referral_type?: string | null
          source?: string | null
        }
        Relationships: []
      }
      member_activation_tiers: {
        Row: {
          bcc_multiplier: number
          created_at: string | null
          is_active: boolean | null
          max_activation_rank: number | null
          min_activation_rank: number
          tier: number
          tier_name: string
        }
        Insert: {
          bcc_multiplier?: number
          created_at?: string | null
          is_active?: boolean | null
          max_activation_rank?: number | null
          min_activation_rank: number
          tier: number
          tier_name: string
        }
        Update: {
          bcc_multiplier?: number
          created_at?: string | null
          is_active?: boolean | null
          max_activation_rank?: number | null
          min_activation_rank?: number
          tier?: number
          tier_name?: string
        }
        Relationships: []
      }
      member_balance: {
        Row: {
          available_balance: number | null
          balance_updated: string | null
          claimable_amount_usdt: number | null
          claimable_rewards: number | null
          claimed_amount_usdt: number | null
          claimed_rewards: number | null
          current_level: number | null
          pending_rewards: number | null
          reward_balance: number | null
          total_earned: number | null
          total_withdrawn: number | null
          username: string | null
          wallet_address: string
        }
        Insert: {
          available_balance?: number | null
          balance_updated?: string | null
          claimable_amount_usdt?: number | null
          claimable_rewards?: number | null
          claimed_amount_usdt?: number | null
          claimed_rewards?: number | null
          current_level?: number | null
          pending_rewards?: number | null
          reward_balance?: number | null
          total_earned?: number | null
          total_withdrawn?: number | null
          username?: string | null
          wallet_address: string
        }
        Update: {
          available_balance?: number | null
          balance_updated?: string | null
          claimable_amount_usdt?: number | null
          claimable_rewards?: number | null
          claimed_amount_usdt?: number | null
          claimed_rewards?: number | null
          current_level?: number | null
          pending_rewards?: number | null
          reward_balance?: number | null
          total_earned?: number | null
          total_withdrawn?: number | null
          username?: string | null
          wallet_address?: string
        }
        Relationships: []
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
            foreignKeyName: "members_v2_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "members_v2_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "v_user_balances"
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
          is_upgrade: boolean | null
          nft_level: number
          platform_activation_fee: number | null
          previous_level: number | null
          total_cost: number | null
          unlock_membership_level: number | null
          wallet_address: string
        }
        Insert: {
          claim_price: number
          claimed_at?: string | null
          id?: string
          is_member?: boolean | null
          is_upgrade?: boolean | null
          nft_level: number
          platform_activation_fee?: number | null
          previous_level?: number | null
          total_cost?: number | null
          unlock_membership_level?: number | null
          wallet_address: string
        }
        Update: {
          claim_price?: number
          claimed_at?: string | null
          id?: string
          is_member?: boolean | null
          is_upgrade?: boolean | null
          nft_level?: number
          platform_activation_fee?: number | null
          previous_level?: number | null
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
          {
            foreignKeyName: "fk_membership_wallet_to_users"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "v_user_balances"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      merchant_nft_translations: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          language_code: string
          merchant_nft_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          language_code: string
          merchant_nft_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          language_code?: string
          merchant_nft_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_nft_translations_merchant_nft_id_fkey"
            columns: ["merchant_nft_id"]
            isOneToOne: false
            referencedRelation: "merchant_nfts"
            referencedColumns: ["id"]
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
      nft_airdrops: {
        Row: {
          airdrop_date: string
          amount: number
          block_number: number | null
          chain_id: number
          contract_address: string
          created_at: string
          id: string
          notes: string | null
          status: string
          token_id: number
          transaction_hash: string
          updated_at: string
          wallet_address: string
        }
        Insert: {
          airdrop_date?: string
          amount?: number
          block_number?: number | null
          chain_id?: number
          contract_address?: string
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          token_id: number
          transaction_hash: string
          updated_at?: string
          wallet_address: string
        }
        Update: {
          airdrop_date?: string
          amount?: number
          block_number?: number | null
          chain_id?: number
          contract_address?: string
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          token_id?: number
          transaction_hash?: string
          updated_at?: string
          wallet_address?: string
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
      platform_activation_fees: {
        Row: {
          created_at: string
          fee_amount: number
          id: string
          member_wallet: string
          metadata: Json | null
          nft_level: number
          paid_at: string
          payment_status: string
          transaction_hash: string | null
        }
        Insert: {
          created_at?: string
          fee_amount?: number
          id?: string
          member_wallet: string
          metadata?: Json | null
          nft_level?: number
          paid_at?: string
          payment_status?: string
          transaction_hash?: string | null
        }
        Update: {
          created_at?: string
          fee_amount?: number
          id?: string
          member_wallet?: string
          metadata?: Json | null
          nft_level?: number
          paid_at?: string
          payment_status?: string
          transaction_hash?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referral_depth: number
          referred_activation_sequence: number
          referred_activation_time: string
          referred_wallet: string
          referrer_activation_sequence: number | null
          referrer_wallet: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          referral_depth?: number
          referred_activation_sequence: number
          referred_activation_time: string
          referred_wallet: string
          referrer_activation_sequence?: number | null
          referrer_wallet?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          referral_depth?: number
          referred_activation_sequence?: number
          referred_activation_time?: string
          referred_wallet?: string
          referrer_activation_sequence?: number | null
          referrer_wallet?: string | null
        }
        Relationships: []
      }
      reward_claims: {
        Row: {
          claim_transaction_hash: string | null
          claimed_at: string | null
          created_at: string | null
          expires_at: string | null
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
          expires_at?: string | null
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
          expires_at?: string | null
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
      reward_fix_log: {
        Row: {
          fix_type: string | null
          fixed_at: string | null
          id: number
          new_value: number | null
          old_value: number | null
          reason: string | null
          wallet_address: string | null
        }
        Insert: {
          fix_type?: string | null
          fixed_at?: string | null
          id?: number
          new_value?: number | null
          old_value?: number | null
          reason?: string | null
          wallet_address?: string | null
        }
        Update: {
          fix_type?: string | null
          fixed_at?: string | null
          id?: number
          new_value?: number | null
          old_value?: number | null
          reason?: string | null
          wallet_address?: string | null
        }
        Relationships: []
      }
      reward_notifications: {
        Row: {
          countdown_hours: number | null
          created_at: string | null
          id: string
          is_read: boolean | null
          is_sent: boolean | null
          message: string
          metadata: Json | null
          notification_type: string
          read_at: string | null
          reward_claim_id: string
          sent_at: string | null
          title: string
          wallet_address: string
        }
        Insert: {
          countdown_hours?: number | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          is_sent?: boolean | null
          message: string
          metadata?: Json | null
          notification_type: string
          read_at?: string | null
          reward_claim_id: string
          sent_at?: string | null
          title: string
          wallet_address: string
        }
        Update: {
          countdown_hours?: number | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          is_sent?: boolean | null
          message?: string
          metadata?: Json | null
          notification_type?: string
          read_at?: string | null
          reward_claim_id?: string
          sent_at?: string | null
          title?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_notifications_reward_claim_id_fkey"
            columns: ["reward_claim_id"]
            isOneToOne: false
            referencedRelation: "reward_claims"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_retry_queue: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          last_error_at: string | null
          last_retry_at: string | null
          level: number
          max_retries: number | null
          retry_count: number | null
          status: string | null
          tx_hash: string | null
          wallet_address: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_error_at?: string | null
          last_retry_at?: string | null
          level: number
          max_retries?: number | null
          retry_count?: number | null
          status?: string | null
          tx_hash?: string | null
          wallet_address: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_error_at?: string | null
          last_retry_at?: string | null
          level?: number
          max_retries?: number | null
          retry_count?: number | null
          status?: string | null
          tx_hash?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
      reward_rollup_history: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          new_reward_id: string | null
          original_amount: number
          original_expires_at: string | null
          original_recipient_wallet: string
          original_reward_id: string
          original_reward_type: string
          rolled_up_to_wallet: string
          rollup_processed_at: string | null
          rollup_reason: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_reward_id?: string | null
          original_amount: number
          original_expires_at?: string | null
          original_recipient_wallet: string
          original_reward_id: string
          original_reward_type: string
          rolled_up_to_wallet: string
          rollup_processed_at?: string | null
          rollup_reason: string
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_reward_id?: string | null
          original_amount?: number
          original_expires_at?: string | null
          original_recipient_wallet?: string
          original_reward_id?: string
          original_reward_type?: string
          rolled_up_to_wallet?: string
          rollup_processed_at?: string | null
          rollup_reason?: string
        }
        Relationships: []
      }
      reward_timers: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          is_active: boolean | null
          is_expired: boolean | null
          notification_sent: boolean | null
          recipient_wallet: string
          reward_id: string
          started_at: string | null
          time_remaining_seconds: number | null
          timer_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          is_active?: boolean | null
          is_expired?: boolean | null
          notification_sent?: boolean | null
          recipient_wallet: string
          reward_id: string
          started_at?: string | null
          time_remaining_seconds?: number | null
          timer_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean | null
          is_expired?: boolean | null
          notification_sent?: boolean | null
          recipient_wallet?: string
          reward_id?: string
          started_at?: string | null
          time_remaining_seconds?: number | null
          timer_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reward_timers_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "layer_reward_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_timers_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "layer_rewards"
            referencedColumns: ["id"]
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
      supported_languages: {
        Row: {
          code: string
          created_at: string | null
          flag_emoji: string | null
          is_active: boolean | null
          is_default: boolean | null
          name: string
          native_name: string
          rtl: boolean | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          flag_emoji?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          native_name: string
          rtl?: boolean | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          flag_emoji?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          native_name?: string
          rtl?: boolean | null
          updated_at?: string | null
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
      translation_cache: {
        Row: {
          cache_key: string
          created_at: string | null
          expires_at: string | null
          id: string
          original_text: string
          provider_name: string | null
          source_language: string
          target_language: string
          translated_text: string
          updated_at: string | null
        }
        Insert: {
          cache_key: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          original_text: string
          provider_name?: string | null
          source_language: string
          target_language: string
          translated_text: string
          updated_at?: string | null
        }
        Update: {
          cache_key?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          original_text?: string
          provider_name?: string | null
          source_language?: string
          target_language?: string
          translated_text?: string
          updated_at?: string | null
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
      user_activity_log: {
        Row: {
          activity_data: Json | null
          activity_type: string
          created_at: string | null
          description: string | null
          id: number
          ip_address: unknown | null
          user_agent: string | null
          wallet_address: string
        }
        Insert: {
          activity_data?: Json | null
          activity_type: string
          created_at?: string | null
          description?: string | null
          id?: number
          ip_address?: unknown | null
          user_agent?: string | null
          wallet_address: string
        }
        Update: {
          activity_data?: Json | null
          activity_type?: string
          created_at?: string | null
          description?: string | null
          id?: number
          ip_address?: unknown | null
          user_agent?: string | null
          wallet_address?: string
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
        Relationships: []
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
          {
            foreignKeyName: "user_dapp_interactions_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "v_user_balances"
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
      view_catalog: {
        Row: {
          base_tables: string[]
          category: string
          created_at: string | null
          description: string
          is_canonical: boolean | null
          updated_at: string | null
          usage_notes: string | null
          view_name: string
        }
        Insert: {
          base_tables: string[]
          category: string
          created_at?: string | null
          description: string
          is_canonical?: boolean | null
          updated_at?: string | null
          usage_notes?: string | null
          view_name: string
        }
        Update: {
          base_tables?: string[]
          category?: string
          created_at?: string | null
          description?: string
          is_canonical?: boolean | null
          updated_at?: string | null
          usage_notes?: string | null
          view_name?: string
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
      advertisement_nfts_multilingual: {
        Row: {
          advertiser_wallet: string | null
          category: string | null
          created_at: string | null
          ends_at: string | null
          id: string | null
          image_url: string | null
          impressions_current: number | null
          impressions_target: number | null
          is_active: boolean | null
          metadata: Json | null
          price_bcc: number | null
          price_usdt: number | null
          starts_at: string | null
          translations: Json | null
          updated_at: string | null
        }
        Relationships: []
      }
      blog_posts_multilingual: {
        Row: {
          author_wallet: string | null
          created_at: string | null
          id: string | null
          image_url: string | null
          metadata: Json | null
          published: boolean | null
          published_at: string | null
          translations: Json | null
          updated_at: string | null
          views: number | null
        }
        Relationships: []
      }
      dashboard_activity: {
        Row: {
          activity_data: Json | null
          activity_type: string | null
          created_at: string | null
          description: string | null
          display_title: string | null
          wallet_address: string | null
        }
        Insert: {
          activity_data?: Json | null
          activity_type?: string | null
          created_at?: string | null
          description?: string | null
          display_title?: never
          wallet_address?: string | null
        }
        Update: {
          activity_data?: Json | null
          activity_type?: string | null
          created_at?: string | null
          description?: string | null
          display_title?: never
          wallet_address?: string | null
        }
        Relationships: []
      }
      layer_reward_claims: {
        Row: {
          claimed_at: string | null
          created_at: string | null
          direct_referrals_current: number | null
          direct_referrals_required: number | null
          expires_at: string | null
          id: string | null
          layer_position: string | null
          matrix_layer: number | null
          matrix_root_wallet: string | null
          recipient_current_level: number | null
          recipient_required_level: number | null
          requires_direct_referrals: boolean | null
          reward_amount: number | null
          reward_recipient_wallet: string | null
          roll_up_reason: string | null
          rolled_up_to: string | null
          status: string | null
          triggering_member_wallet: string | null
          triggering_nft_level: number | null
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string | null
          direct_referrals_current?: number | null
          direct_referrals_required?: number | null
          expires_at?: string | null
          id?: string | null
          layer_position?: string | null
          matrix_layer?: number | null
          matrix_root_wallet?: string | null
          recipient_current_level?: number | null
          recipient_required_level?: number | null
          requires_direct_referrals?: boolean | null
          reward_amount?: number | null
          reward_recipient_wallet?: string | null
          roll_up_reason?: string | null
          rolled_up_to?: string | null
          status?: string | null
          triggering_member_wallet?: string | null
          triggering_nft_level?: number | null
        }
        Update: {
          claimed_at?: string | null
          created_at?: string | null
          direct_referrals_current?: number | null
          direct_referrals_required?: number | null
          expires_at?: string | null
          id?: string | null
          layer_position?: string | null
          matrix_layer?: number | null
          matrix_root_wallet?: string | null
          recipient_current_level?: number | null
          recipient_required_level?: number | null
          requires_direct_referrals?: boolean | null
          reward_amount?: number | null
          reward_recipient_wallet?: string | null
          roll_up_reason?: string | null
          rolled_up_to?: string | null
          status?: string | null
          triggering_member_wallet?: string | null
          triggering_nft_level?: number | null
        }
        Relationships: []
      }
      matrix_referrals_tree_view: {
        Row: {
          activation_sequence: number | null
          has_children: boolean | null
          is_direct: boolean | null
          matrix_layer: number | null
          matrix_position: string | null
          matrix_root_wallet: string | null
          member_activated_at: string | null
          member_email: string | null
          member_level: number | null
          member_username: string | null
          member_wallet: string | null
          parent_wallet: string | null
          placed_at: string | null
          referral_type: string | null
          total_nft_claimed: number | null
          tree_depth: number | null
        }
        Relationships: []
      }
      member_trigger_sequence: {
        Row: {
          created_at: string | null
          matrix_layer: number | null
          required_level: number | null
          reward_recipient_wallet: string | null
          trigger_sequence: number | null
          triggering_member_wallet: string | null
        }
        Relationships: []
      }
      referrals_stats_view: {
        Row: {
          direct_referrals: number | null
          first_referral_date: string | null
          last_referral_date: string | null
          referrer_wallet: string | null
          spillover_referrals: number | null
          total_referrals: number | null
          unique_members: number | null
        }
        Relationships: []
      }
      rewards_stats_view: {
        Row: {
          current_reward_balance: number | null
          has_claimable_rewards: boolean | null
          has_pending_rewards: boolean | null
          last_updated: string | null
          net_earnings: number | null
          total_claimable: number | null
          total_claimed: number | null
          total_earned: number | null
          total_pending: number | null
          total_rewards_count: number | null
          total_withdrawn: number | null
          wallet_address: string | null
          withdrawal_rate_percent: number | null
        }
        Relationships: []
      }
      rewards_with_rollup_info: {
        Row: {
          claimed_at: string | null
          created_at: string | null
          expires_at: string | null
          id: string | null
          matrix_layer: number | null
          matrix_root_wallet: string | null
          metadata: Json | null
          recipient_wallet: string | null
          reward_amount: number | null
          reward_type: string | null
          rolled_up_to: string | null
          rollup_inherited_from: string | null
          rollup_reason: string | null
          source_member: string | null
          status: string | null
        }
        Relationships: []
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
      translation_cache_stats: {
        Row: {
          active_cache: number | null
          avg_text_length: number | null
          cached_translations: number | null
          expired_cache: number | null
          last_cached_at: string | null
          provider_name: string | null
          target_language: string | null
        }
        Relationships: []
      }
      unified_rewards_view: {
        Row: {
          created_at: string | null
          layer: number | null
          nft_level: number | null
          reward_amount: number | null
          source_id: string | null
          source_table: string | null
          status: string | null
          triggering_member_wallet: string | null
          triggering_username: string | null
          username: string | null
          wallet_address: string | null
        }
        Relationships: []
      }
      user_balance_summary: {
        Row: {
          bcc_locked: number | null
          bcc_transferable: number | null
          claimable_reward_balance_usdc: number | null
          pending_reward_balance_usdc: number | null
          total_available_usdc: number | null
          total_rewards_withdrawn_usdc: number | null
          total_usdc_earned: number | null
          updated_at: string | null
          wallet_address: string | null
        }
        Insert: {
          bcc_locked?: never
          bcc_transferable?: never
          claimable_reward_balance_usdc?: never
          pending_reward_balance_usdc?: never
          total_available_usdc?: never
          total_rewards_withdrawn_usdc?: never
          total_usdc_earned?: never
          updated_at?: string | null
          wallet_address?: string | null
        }
        Update: {
          bcc_locked?: never
          bcc_transferable?: never
          claimable_reward_balance_usdc?: never
          pending_reward_balance_usdc?: never
          total_available_usdc?: never
          total_rewards_withdrawn_usdc?: never
          total_usdc_earned?: never
          updated_at?: string | null
          wallet_address?: string | null
        }
        Relationships: []
      }
      user_reward_balances: {
        Row: {
          updated_at: string | null
          usdc_claimable: number | null
          usdc_claimed: number | null
          usdc_pending: number | null
          wallet_address: string | null
        }
        Insert: {
          updated_at?: string | null
          usdc_claimable?: never
          usdc_claimed?: never
          usdc_pending?: never
          wallet_address?: string | null
        }
        Update: {
          updated_at?: string | null
          usdc_claimable?: never
          usdc_claimed?: never
          usdc_pending?: never
          wallet_address?: string | null
        }
        Relationships: []
      }
      v_claim_sync_health: {
        Row: {
          avg_completion_time_seconds: number | null
          completed_count: number | null
          failed_count: number | null
          last_claim_at: string | null
          oldest_pending_at: string | null
          pending_count: number | null
          retrying_count: number | null
          stuck_pending_count: number | null
        }
        Relationships: []
      }
      v_direct_referrals: {
        Row: {
          referral_date: string | null
          referral_depth: number | null
          referred_activation_time: string | null
          referred_level: number | null
          referred_wallet: string | null
          referrer_activation_time: string | null
          referrer_level: number | null
          referrer_wallet: string | null
        }
        Relationships: []
      }
      v_level_upgrade_health: {
        Row: {
          critical_reviews: number | null
          failed_level_upgrades: number | null
          failed_reward_retries: number | null
          overdue_reviews: number | null
          pending_level_upgrades: number | null
          pending_reviews: number | null
          pending_reward_retries: number | null
          rewards_retried_24h: number | null
        }
        Relationships: []
      }
      v_matrix_direct_children: {
        Row: {
          child_level: number | null
          child_nft_count: number | null
          child_wallet: string | null
          layer_index: number | null
          matrix_root_wallet: string | null
          member_wallet: string | null
          parent_wallet: string | null
          placed_at: string | null
          referral_type: string | null
          slot_index: string | null
          slot_num_seq: number | null
        }
        Relationships: []
      }
      v_matrix_layers_v2: {
        Row: {
          capacity: number | null
          directs: number | null
          fill_percentage: number | null
          filled: number | null
          layer: number | null
          left_count: number | null
          middle_count: number | null
          right_count: number | null
          root: string | null
          spillovers: number | null
        }
        Relationships: []
      }
      v_matrix_overview: {
        Row: {
          active_members: number | null
          avg_layer_depth: number | null
          deepest_layer: number | null
          layer1_count: number | null
          layer11_15_count: number | null
          layer16_19_count: number | null
          layer2_5_count: number | null
          layer6_10_count: number | null
          left_total: number | null
          middle_total: number | null
          right_total: number | null
          total_members: number | null
          total_placements: number | null
          wallet_address: string | null
        }
        Relationships: []
      }
      v_matrix_root_summary: {
        Row: {
          direct_referrals: number | null
          layer1_count: number | null
          layer2_5_count: number | null
          layer6_10_count: number | null
          left_total: number | null
          max_layer: number | null
          middle_total: number | null
          right_total: number | null
          root: string | null
          total_matrix_members: number | null
        }
        Relationships: []
      }
      v_member_overview: {
        Row: {
          activation_sequence: number | null
          activation_time: string | null
          active_members: number | null
          current_level: number | null
          deepest_layer: number | null
          direct_referrals_count: number | null
          email: string | null
          is_active: boolean | null
          placed_in_matrices_count: number | null
          referrer_wallet: string | null
          total_members: number | null
          total_placements: number | null
          username: string | null
          wallet_address: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_v2_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "members_v2_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "v_user_balances"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      v_members_missing_matrix_placement: {
        Row: {
          activation_sequence: number | null
          activation_time: string | null
          current_level: number | null
          hours_since_activation: number | null
          membership_claimed_at: string | null
          nft_level: number | null
          referrer_wallet: string | null
          user_created_at: string | null
          wallet_address: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_v2_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "members_v2_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "v_user_balances"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      v_reward_overview: {
        Row: {
          claimable_amount_usd: number | null
          claimable_cnt: number | null
          member_id: string | null
          paid_amount_usd: number | null
          paid_cnt: number | null
          pending_amount_usd: number | null
          pending_cnt: number | null
          updated_at: string | null
          usdc_claimable: number | null
          usdc_claimed: number | null
          usdc_pending: number | null
          wallet_address: string | null
        }
        Relationships: []
      }
      v_user_balances: {
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
          wallet_address: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      activate_membership_fallback_deprecated: {
        Args: {
          p_level?: number
          p_referrer_wallet?: string
          p_transaction_hash?: string
          p_wallet_address: string
        }
        Returns: Json
      }
      activate_nft_level1_membership: {
        Args: {
          p_referrer_wallet?: string
          p_transaction_hash?: string
          p_wallet_address: string
        }
        Returns: Json
      }
      alert_claim_sync_issues: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      analyze_path_integrity: {
        Args: Record<PropertyKey, never>
        Returns: {
          broken_member: string
          current_layer: number
          current_position: string
          fix_strategy: string
          matrix_root: string
          missing_layers: string[]
        }[]
      }
      auto_fix_duplicate_positions: {
        Args: Record<PropertyKey, never>
        Returns: {
          action: string
          affected_count: number
          details: string
        }[]
      }
      auto_process_rewards: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      backfill_missing_matrix_placements: {
        Args: { p_dry_run?: boolean }
        Returns: {
          created_reward: boolean
          placement_message: string
          placement_success: boolean
          referrer_wallet: string
          wallet_address: string
        }[]
      }
      batch_place_member_in_matrices: {
        Args: {
          p_batch_size?: number
          p_member_wallet: string
          p_referrer_wallet: string
        }
        Returns: {
          details: Json
          failed: number
          processed: number
          status: string
          succeeded: number
          total_uplines: number
        }[]
      }
      calculate_layer_rewards: {
        Args: { p_matrix_root: string; p_trigger_layer: number }
        Returns: undefined
      }
      calculate_level_bcc_unlock: {
        Args: { p_activation_sequence: number; p_level: number }
        Returns: number
      }
      calculate_matrix_layer: {
        Args: { position_str: string }
        Returns: number
      }
      calculate_total_bcc_locked: {
        Args: { p_activation_sequence: number }
        Returns: number
      }
      check_and_activate_pending_rewards: {
        Args: { wallet_address: string }
        Returns: {
          activated_amount: number
          activated_count: number
        }[]
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
      check_duplicate_positions: {
        Args: Record<PropertyKey, never>
        Returns: {
          duplicate_count: number
          matrix_layer: number
          matrix_position: string
          matrix_root_wallet: string
          member_wallets: string
        }[]
      }
      check_matrix_layer1_overflow: {
        Args: Record<PropertyKey, never>
        Returns: {
          matrix_root_wallet: string
          member_count: number
          overflow_amount: number
          positions: string
        }[]
      }
      check_matrix_layer2_overflow: {
        Args: Record<PropertyKey, never>
        Returns: {
          matrix_root_wallet: string
          member_count: number
          overflow_amount: number
          positions: string
        }[]
      }
      check_pending_rewards_after_upgrade: {
        Args:
          | { p_new_level: number; p_upgraded_wallet: string }
          | { p_new_level: number; p_upgraded_wallet: string }
        Returns: Json
      }
      check_reward_qualification: {
        Args:
          | {
              p_recipient_wallet: string
              p_reward_amount?: number
              p_reward_layer: number
            }
          | { target_level: number; wallet_address: string }
        Returns: Json
      }
      check_reward_qualification_v2: {
        Args: {
          p_matrix_position: string
          p_recipient_wallet: string
          p_reward_amount?: number
          p_reward_layer: number
        }
        Returns: Json
      }
      check_reward_qualification_with_rules: {
        Args: {
          p_matrix_position?: string
          p_recipient_wallet: string
          p_reward_amount?: number
          p_reward_layer: number
        }
        Returns: Json
      }
      claim_layer_reward: {
        Args: { p_member_wallet: string; p_reward_id: string }
        Returns: Json
      }
      cleanup_duplicate_matrix_placements: {
        Args: Record<PropertyKey, never>
        Returns: {
          action_taken: string
          kept_root: string
          member_wallet: string
          removed_roots: string
        }[]
      }
      cleanup_expired_translation_cache: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_test_data: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      cleanup_test_data_safe: {
        Args: Record<PropertyKey, never>
        Returns: string
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
      create_reward_timer: {
        Args: {
          p_duration_hours?: number
          p_recipient_wallet: string
          p_reward_id: string
          p_timer_type: string
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
      determine_reward_status: {
        Args: {
          p_matrix_position: string
          p_recipient_wallet: string
          p_reward_layer: number
        }
        Returns: string
      }
      find_available_matrix_positions: {
        Args: { p_matrix_root: string }
        Returns: {
          available_positions: string[]
          layer: number
          parent_wallet: string
          slots_total: number
          slots_used: number
        }[]
      }
      find_incomplete_matrix_for_spillover: {
        Args: { referring_wallet: string }
        Returns: {
          available_position: string
          target_sequence: number
          target_wallet: string
        }[]
      }
      find_next_available_position: {
        Args: {
          p_matrix_root: string
          p_member_wallet: string
          p_target_layer: number
        }
        Returns: {
          parent: string
          pos: string
        }[]
      }
      find_next_available_position_in_matrix: {
        Args: { p_matrix_root: string }
        Returns: {
          next_layer: number
          next_position: string
          root_wallet: string
        }[]
      }
      find_next_bfs_position: {
        Args: { p_matrix_root: string; p_member_wallet: string }
        Returns: {
          layer: number
          parent: string
          pos: string
        }[]
      }
      find_next_bfs_position_with_depth: {
        Args: {
          p_matrix_root: string
          p_member_wallet: string
          p_min_layer?: number
        }
        Returns: {
          layer: number
          parent: string
          pos: string
        }[]
      }
      find_next_position_in_referrer_tree: {
        Args: {
          p_matrix_root: string
          p_member_wallet: string
          p_min_layer?: number
          p_referrer_wallet: string
        }
        Returns: {
          layer: number
          parent: string
          pos: string
        }[]
      }
      find_next_qualified_upline: {
        Args: { current_wallet: string; required_level: number }
        Returns: string
      }
      find_optimal_matrix_position: {
        Args: { p_member_sequence: number; p_referrer_wallet: string }
        Returns: {
          optimal_layer: number
          optimal_position: string
          optimal_root_wallet: string
        }[]
      }
      find_position_at_specific_layer: {
        Args: { p_matrix_root: string; p_target_layer: number }
        Returns: {
          parent: string
          pos: string
        }[]
      }
      find_recursive_position: {
        Args: { p_matrix_root: string; p_target_layer: number }
        Returns: {
          available_position: string
          matrix_root: string
          target_layer: number
        }[]
      }
      fix_all_bcc_balances: {
        Args: Record<PropertyKey, never>
        Returns: {
          member_level: number
          new_balance: number
          new_locked: number
          old_balance: number
          old_locked: number
          wallet_address: string
        }[]
      }
      fix_broken_paths: {
        Args: Record<PropertyKey, never>
        Returns: {
          action_type: string
          matrix_root: string
          new_position: string
          old_position: string
          status: string
          target_member: string
        }[]
      }
      fix_matrix_position_duplicates: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      fix_missing_rewards: {
        Args: Record<PropertyKey, never>
        Returns: {
          missing_rewards_count: number
          total_missing_amount: number
          wallet_address: string
        }[]
      }
      fn_check_missing_matrix_referrals: {
        Args: Record<PropertyKey, never>
        Returns: {
          missing_count: number
          sample_wallets: string[]
        }[]
      }
      fn_find_next_available_bfs_position: {
        Args: {
          p_matrix_root: string
          p_max_layer?: number
          p_start_layer?: number
        }
        Returns: {
          layer: number
          parent_wallet: string
          position: string
        }[]
      }
      fn_find_next_slot: {
        Args: { p_root_wallet: string }
        Returns: {
          out_layer: number
          out_position: string
        }[]
      }
      fn_find_next_slot_v2: {
        Args: { p_root_wallet: string }
        Returns: {
          out_layer: number
          out_parent: string
          out_position: string
        }[]
      }
      fn_process_rebuild_batch_v2: {
        Args: { p_batch_size?: number }
        Returns: {
          failed: number
          message: string
          processed: number
          remaining: number
          succeeded: number
        }[]
      }
      fn_rebuild_matrix_v2: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      fn_rebuild_v2_layer_distribution: {
        Args: Record<PropertyKey, never>
        Returns: {
          avg_per_member: number
          layer: number
          placement_count: number
          unique_members: number
        }[]
      }
      fn_rebuild_v2_overflow_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          layer_17_parents: number
          layer_18_parents: number
          layer_19_parents: number
          overflow_pct: number
          total_placements: number
        }[]
      }
      fn_rebuild_v2_status: {
        Args: Record<PropertyKey, never>
        Returns: {
          avg_placements: number
          completion_pct: number
          failed: number
          pending: number
          processing: number
          success: number
          total_members: number
          total_placements: number
        }[]
      }
      fn_relocate_member_to_available_position: {
        Args: {
          p_current_matrix_root: string
          p_member_wallet: string
          p_referrer_wallet: string
        }
        Returns: {
          error_msg: string
          new_layer: number
          new_matrix_root: string
          new_parent: string
          new_position: string
          success: boolean
        }[]
      }
      fn_scheduled_matrix_check: {
        Args: Record<PropertyKey, never>
        Returns: {
          action_taken: string
          check_time: string
          missing_count: number
        }[]
      }
      fn_simple_spillover_place: {
        Args: { p_member_wallet: string; p_referrer_wallet: string }
        Returns: Json
      }
      fn_supplement_all_missing_matrix_referrals: {
        Args: { p_batch_size?: number }
        Returns: {
          batches_executed: number
          status: string
          total_placements: number
          total_processed: number
        }[]
      }
      fn_supplement_missing_matrix_referrals: {
        Args: { p_batch_size?: number; p_log_id?: string }
        Returns: {
          error_message: string
          placements_created: number
          processed: number
          status: string
        }[]
      }
      generate_level_based_rewards: {
        Args:
          | {
              activation_type?: string
              level_activated: number
              member_wallet: string
              nft_price: number
            }
          | { p_member_level: number; p_member_wallet: string }
        Returns: Json
      }
      generate_level_based_rewards_with_pending: {
        Args: { p_member_level: number; p_member_wallet: string }
        Returns: Json
      }
      generate_qualified_rewards: {
        Args:
          | {
              activation_type?: string
              level_activated: number
              member_wallet: string
              nft_price: number
            }
          | { p_member_level: number; p_member_wallet: string }
        Returns: Json
      }
      generate_qualified_rewards_fixed: {
        Args: { p_member_level: number; p_member_wallet: string }
        Returns: Json
      }
      get_advertisement_nft_content: {
        Args: { p_language_code?: string; p_nft_id: string }
        Returns: {
          advertiser_wallet: string
          category: string
          click_url: string
          created_at: string
          description: string
          id: string
          image_url: string
          is_active: boolean
          language_code: string
          price_bcc: number
          price_usdt: number
          title: string
        }[]
      }
      get_blog_post_content: {
        Args: { p_language_code?: string; p_post_id?: string; p_slug?: string }
        Returns: {
          author: string
          author_wallet: string
          content: string
          created_at: string
          excerpt: string
          id: string
          image_url: string
          language_code: string
          published: boolean
          published_at: string
          slug: string
          tags: Json
          title: string
          views: number
        }[]
      }
      get_course_with_translations: {
        Args: { p_course_id: string; p_language_code?: string }
        Returns: {
          category: string
          course_type: string
          description: string
          difficulty_level: string
          duration_hours: number
          id: string
          image_url: string
          instructor_name: string
          instructor_wallet: string
          is_active: boolean
          language_code: string
          lessons: Json
          price_bcc: number
          price_usdt: number
          required_level: number
          title: string
        }[]
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
      get_member_activation_status: {
        Args: { p_wallet_address: string }
        Returns: {
          can_activate: boolean
          can_upgrade: boolean
          claimable_rewards: number
          current_level: number
          highest_nft_level: number
          is_activated: boolean
          next_level: number
          pending_rewards: number
          total_nfts_owned: number
        }[]
      }
      get_member_rewards_summary: {
        Args: { p_wallet_address: string }
        Returns: {
          claimable_direct: number
          claimable_layer: number
          pending_layer: number
          reward_details: Json
          rolled_up_direct: number
          rolled_up_layer: number
          rollup_inherited_direct: number
          rollup_inherited_layer: number
          total_direct_rewards: number
          total_layer_rewards: number
        }[]
      }
      get_member_status: {
        Args: { p_wallet_address: string }
        Returns: Json
      }
      get_next_activation_sequence: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_nft_level_price: {
        Args: { p_level: number }
        Returns: number
      }
      get_parent_child_count: {
        Args: { p_matrix_root: string; p_parent_wallet: string }
        Returns: number
      }
      get_rebuild_progress: {
        Args: Record<PropertyKey, never>
        Returns: {
          completion_pct: number
          estimated_time_remaining: string
          failed: number
          pending: number
          processing: number
          succeeded: number
          total_members: number
          total_placements: number
        }[]
      }
      get_translation_cache_info: {
        Args: Record<PropertyKey, never>
        Returns: {
          active_entries: number
          cache_size_mb: number
          expired_entries: number
          newest_cache: string
          oldest_cache: string
          total_entries: number
        }[]
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
      get_user_rewards_stats: {
        Args: { p_wallet_address: string }
        Returns: {
          current_reward_balance: number
          has_claimable_rewards: boolean
          has_pending_rewards: boolean
          last_updated: string
          net_earnings: number
          total_claimable: number
          total_claimed: number
          total_earned: number
          total_pending: number
          total_rewards_count: number
          total_withdrawn: number
          wallet_address: string
          withdrawal_rate_percent: number
        }[]
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_matrix_position_available: {
        Args: {
          p_matrix_root: string
          p_parent_wallet: string
          p_position: string
        }
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
      log_operation: {
        Args: {
          p_category: string
          p_correlation_id: string
          p_duration_ms: number
          p_error_code: string
          p_error_details: string
          p_error_message: string
          p_function_name: string
          p_input_parameters: string
          p_log_level: string
          p_operation_data: string
          p_operation_name: string
          p_output_result: string
          p_referrer_wallet: string
          p_status: string
          p_wallet_address: string
        }
        Returns: boolean
      }
      matrix_health_check: {
        Args: Record<PropertyKey, never>
        Returns: {
          check_name: string
          details: string
          issue_count: number
          status: string
        }[]
      }
      place_member_in_matrix_recursive: {
        Args: {
          p_max_layers?: number
          p_member_wallet: string
          p_referrer_wallet: string
        }
        Returns: Json
      }
      place_member_in_matrix_recursive_v2: {
        Args: {
          p_max_layers?: number
          p_member_wallet: string
          p_referrer_wallet: string
        }
        Returns: Json
      }
      place_member_in_recursive_matrix: {
        Args: { p_member_wallet: string; p_referrer_wallet: string }
        Returns: Json
      }
      place_member_in_single_matrix: {
        Args: {
          p_matrix_root: string
          p_member_wallet: string
          p_parent_depth: number
        }
        Returns: {
          error_msg: string
          layer: number
          parent_wallet: string
          position: string
          success: boolean
        }[]
      }
      place_member_in_single_matrix_bfs: {
        Args: {
          p_matrix_root: string
          p_member_wallet: string
          p_parent_depth: number
        }
        Returns: {
          error_msg: string
          layer: number
          parent_wallet: string
          position: string
          success: boolean
        }[]
      }
      place_member_in_single_matrix_fixed_layer: {
        Args: {
          p_matrix_root: string
          p_member_wallet: string
          p_target_layer: number
        }
        Returns: {
          error_msg: string
          result_layer: number
          result_parent_wallet: string
          result_pos: string
          success: boolean
        }[]
      }
      place_member_in_single_matrix_gen_v3: {
        Args: {
          p_matrix_root: string
          p_member_wallet: string
          p_parent_depth: number
        }
        Returns: {
          error_msg: string
          layer: number
          parent_wallet: string
          position: string
          success: boolean
        }[]
      }
      place_member_in_single_matrix_generation: {
        Args: {
          p_matrix_root: string
          p_member_wallet: string
          p_parent_depth: number
        }
        Returns: {
          error_msg: string
          layer: number
          parent_wallet: string
          position: string
          success: boolean
        }[]
      }
      place_member_matrix_complete: {
        Args: { p_member_wallet: string; p_referrer_wallet: string }
        Returns: Json
      }
      place_member_recursive_generation_based: {
        Args: { p_member_wallet: string; p_referrer_wallet: string }
        Returns: Json
      }
      place_member_referrer_depth_logic: {
        Args: { p_member_wallet: string; p_referrer_wallet: string }
        Returns: Json
      }
      place_member_spillover: {
        Args: { p_member_wallet: string; p_original_referrer: string }
        Returns: {
          placed_layer: number
          placed_parent: string
          placed_position: string
          placed_root: string
          placement_type: string
        }[]
      }
      place_member_spillover_safe: {
        Args: { p_member_wallet: string; p_original_referrer: string }
        Returns: {
          placed_layer: number
          placed_parent: string
          placed_position: string
          placed_root: string
          placement_type: string
        }[]
      }
      place_member_with_spillover: {
        Args: { p_matrix_root_wallet: string; p_member_wallet: string }
        Returns: Json
      }
      place_new_member_in_matrix_correct: {
        Args: { p_member_wallet: string; p_referrer_wallet: string }
        Returns: Json
      }
      process_all_eligible_pending_rewards: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      process_all_expired_rewards: {
        Args: Record<PropertyKey, never>
        Returns: {
          processed_count: number
          rollup_summary: string
        }[]
      }
      process_expired_layer_rewards: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      process_expired_reward_timers: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      process_expired_rewards_batch: {
        Args: Record<PropertyKey, never>
        Returns: {
          processed_count: number
          processing_summary: Json
          rolled_up_count: number
          total_amount_rolled: number
        }[]
      }
      process_expired_timers: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      process_level_upgrade_rewards: {
        Args: { p_new_level: number; p_wallet_address: string }
        Returns: Json
      }
      process_pending_spillovers: {
        Args: Record<PropertyKey, never>
        Returns: {
          original_referrer: string
          placed_layer: number
          placed_parent: string
          placed_position: string
          placed_root: string
          processed_member: string
          processing_status: string
        }[]
      }
      process_rebuild_batch_v2: {
        Args: { p_batch_size?: number }
        Returns: {
          failed: number
          message: string
          processed: number
          remaining: number
          succeeded: number
        }[]
      }
      process_rebuild_batch_with_overflow: {
        Args: { p_batch_size?: number }
        Returns: {
          failed: number
          message: string
          processed: number
          remaining: number
          succeeded: number
        }[]
      }
      process_rebuild_batch_with_spillover: {
        Args: { p_batch_size?: number }
        Returns: {
          failed: number
          processed: number
          remaining: number
          succeeded: number
        }[]
      }
      process_referrer_tree_rebuild_batch_with_overflow: {
        Args: { p_batch_size?: number }
        Returns: {
          failed: number
          message: string
          processed: number
          remaining: number
          succeeded: number
        }[]
      }
      process_reward_rollup: {
        Args: { expired_reward_id: string; reward_type: string }
        Returns: {
          rollup_amount: number
          rollup_reason: string
          rollup_success: boolean
          rollup_target: string
        }[]
      }
      process_reward_rollup_with_history: {
        Args: { expired_reward_id: string; reward_type: string }
        Returns: {
          message: string
          rollup_amount: number
          rollup_history_id: string
          rollup_recipient: string
          success: boolean
        }[]
      }
      process_rollup_reward_to_balance: {
        Args: {
          p_original_reward_id: string
          p_rollup_amount: number
          p_rollup_recipient: string
        }
        Returns: boolean
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
      recalculate_team_sizes: {
        Args: Record<PropertyKey, never>
        Returns: {
          direct_referrals: number
          max_layer: number
          total_team_size: number
          wallet_address: string
        }[]
      }
      recover_rewards_on_upgrade: {
        Args: { member_wallet: string }
        Returns: string
      }
      recursive_matrix_placement: {
        Args: { p_member_wallet: string; p_referrer_wallet: string }
        Returns: {
          deepest_layer: number
          placement_details: Json
          placements_created: number
        }[]
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
      repair_all_bcc_balances: {
        Args: Record<PropertyKey, never>
        Returns: {
          activation_sequence: number
          current_level: number
          new_bcc_balance: number
          new_bcc_locked: number
          old_bcc_balance: number
          old_bcc_locked: number
          wallet_address: string
        }[]
      }
      repair_existing_matrix_data: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      replace_orphaned_members: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      resume_placement_for_member: {
        Args: { p_batch_size?: number; p_member_wallet: string }
        Returns: {
          details: Json
          failed: number
          processed: number
          status: string
          succeeded: number
          total_uplines: number
        }[]
      }
      retry_failed_rewards: {
        Args: Record<PropertyKey, never>
        Returns: {
          failed: number
          processed: number
          successful: number
        }[]
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
      rpc_matrix_layer_members: {
        Args: { _layer?: number; _root_wallet: string }
        Returns: {
          created_at: string
          layer: number
          matrix_position: string
          matrix_root_wallet: string
          member_wallet: string
          parent_wallet: string
          source: string
        }[]
      }
      rpc_matrix_layer_summary: {
        Args: { _root_wallet: string } | { p_matrix_root_wallet: string }
        Returns: {
          completion_rate: number
          cumulative_team_size: number
          direct_referrals_of_root: number
          filled_slots: number
          layer: number
          layer_capacity: number
          matrix_root_wallet: string
        }[]
      }
      rpc_matrix_node_slots: {
        Args: { _parent_wallet: string; _root_wallet: string }
        Returns: {
          created_at: string
          member_wallet: string
          parent_wallet: string
          slot: string
          source: string
        }[]
      }
      run_complete_system_test: {
        Args: Record<PropertyKey, never>
        Returns: {
          details: string
          status: string
          step_name: string
          success: boolean
          test_phase: string
        }[]
      }
      run_fixed_system_test: {
        Args: Record<PropertyKey, never>
        Returns: {
          details: string
          status: string
          step_name: string
          success: boolean
          test_phase: string
        }[]
      }
      set_activation_timeout: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      set_matrix_operation_timeout: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      simple_matrix_placement: {
        Args: { p_member_wallet: string; p_referrer_wallet: string }
        Returns: {
          placed_layer: number
          placed_parent: string
          placed_position: string
          placed_root: string
          placement_type: string
        }[]
      }
      simple_place_orphaned_members: {
        Args: Record<PropertyKey, never>
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
      sync_member_balance: {
        Args: { wallet_address?: string }
        Returns: {
          total_claimable: number
          updated_wallets: number
        }[]
      }
      sync_members_to_membership: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      sync_missing_matrix_referrals: {
        Args: Record<PropertyKey, never>
        Returns: {
          action_taken: string
          assigned_position: string
          layer_position: number
          matrix_root: string
          member_wallet: string
          result_status: string
        }[]
      }
      sync_rewards_to_user_balances: {
        Args: Record<PropertyKey, never>
        Returns: {
          message: string
          total_usdc_added: number
          updated_wallets: number
        }[]
      }
      system_sync_check: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      test_activate_membership_complete: {
        Args: Record<PropertyKey, never>
        Returns: {
          details: string
          status: string
          step_name: string
          success: boolean
        }[]
      }
      test_auth_user_creation: {
        Args: Record<PropertyKey, never>
        Returns: {
          details: string
          status: string
          step_name: string
          success: boolean
        }[]
      }
      test_layer1_rewards: {
        Args: Record<PropertyKey, never>
        Returns: {
          details: string
          status: string
          step_name: string
          success: boolean
        }[]
      }
      test_level_upgrade_functionality: {
        Args: Record<PropertyKey, never>
        Returns: {
          details: string
          status: string
          step_name: string
          success: boolean
        }[]
      }
      test_membership_activation: {
        Args: Record<PropertyKey, never>
        Returns: {
          details: string
          status: string
          step_name: string
          success: boolean
        }[]
      }
      test_membership_activation_records: {
        Args: { p_member_wallet: string }
        Returns: {
          check_category: string
          key_details: string
          record_count: number
          record_exists: boolean
          result_status: string
          table_name: string
        }[]
      }
      test_pending_mechanism: {
        Args: Record<PropertyKey, never>
        Returns: {
          details: string
          status: string
          step_name: string
          success: boolean
        }[]
      }
      test_upgrade_mechanism: {
        Args: Record<PropertyKey, never>
        Returns: {
          details: string
          status: string
          step_name: string
          success: boolean
        }[]
      }
      test_user_creation: {
        Args: Record<PropertyKey, never>
        Returns: {
          details: string
          status: string
          step_name: string
          success: boolean
        }[]
      }
      toggle_activation_pending_global: {
        Args: { p_admin_wallet: string; p_enabled: boolean; p_reason?: string }
        Returns: Json
      }
      trigger_3x3_spillover: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      trigger_direct_referral_reward: {
        Args: {
          p_new_member_wallet: string
          p_nft_level: number
          p_nft_price: number
          p_referrer_wallet: string
          p_reward_type: string
        }
        Returns: Json
      }
      trigger_direct_referral_rewards: {
        Args: {
          p_new_level: number
          p_nft_price: number
          p_upgrading_member_wallet: string
        }
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
      trigger_layer_rewards_on_upgrade_backup: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      trigger_matrix_layer_rewards: {
        Args: {
          p_new_level: number
          p_nft_price: number
          p_upgrading_member_wallet: string
        }
        Returns: Json
      }
      unified_matrix_placement: {
        Args: { p_member_wallet: string; p_referrer_wallet: string }
        Returns: Json
      }
      validate_and_rollup_rewards: {
        Args: Record<PropertyKey, never>
        Returns: {
          new_recipient: string
          original_recipient: string
          reward_amount: number
          reward_id: string
          rollup_reason: string
        }[]
      }
      validate_matrix_structure: {
        Args: { p_matrix_root?: string }
        Returns: {
          fill_percentage: number
          filled_positions: number
          layer: number
          matrix_root: string
          max_capacity: number
          structure_valid: boolean
          total_positions: number
        }[]
      }
      validate_r_zone_qualification: {
        Args: { p_matrix_position: string; p_member_wallet: string }
        Returns: Json
      }
      validate_recursive_paths: {
        Args: Record<PropertyKey, never>
        Returns: {
          check_name: string
          count_value: number
          details: string
          status: string
        }[]
      }
      verify_matrix_integrity: {
        Args: { p_wallet: string }
        Returns: {
          check_name: string
          details: string
          status: string
        }[]
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
