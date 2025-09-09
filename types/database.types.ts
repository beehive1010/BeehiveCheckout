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
      admin_actions: {
        Row: {
          action_data: Json | null
          action_type: string
          admin_wallet: string
          created_at: string | null
          id: string
          reason: string | null
          target_wallet: string | null
        }
        Insert: {
          action_data?: Json | null
          action_type: string
          admin_wallet: string
          created_at?: string | null
          id?: string
          reason?: string | null
          target_wallet?: string | null
        }
        Update: {
          action_data?: Json | null
          action_type?: string
          admin_wallet?: string
          created_at?: string | null
          id?: string
          reason?: string | null
          target_wallet?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_actions_admin_wallet_fkey"
            columns: ["admin_wallet"]
            isOneToOne: false
            referencedRelation: "admin_list"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "admin_actions_admin_wallet_fkey"
            columns: ["admin_wallet"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "admin_actions_target_wallet_fkey"
            columns: ["target_wallet"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "admins_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_list"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "admins_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "admins_wallet_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "admin_list"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "admins_wallet_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
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
        Relationships: [
          {
            foreignKeyName: "advertisement_nfts_advertiser_wallet_fkey"
            columns: ["advertiser_wallet"]
            isOneToOne: false
            referencedRelation: "admin_list"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "advertisement_nfts_advertiser_wallet_fkey"
            columns: ["advertiser_wallet"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_wallet_fkey"
            columns: ["user_wallet"]
            isOneToOne: false
            referencedRelation: "admin_list"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "audit_logs_user_wallet_fkey"
            columns: ["user_wallet"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "bcc_purchase_orders_buyer_wallet_fkey"
            columns: ["buyer_wallet"]
            isOneToOne: false
            referencedRelation: "admin_list"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "bcc_purchase_orders_buyer_wallet_fkey"
            columns: ["buyer_wallet"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "blog_posts_author_wallet_fkey"
            columns: ["author_wallet"]
            isOneToOne: false
            referencedRelation: "admin_list"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "blog_posts_author_wallet_fkey"
            columns: ["author_wallet"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
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
          start_time?: string
          timer_type?: string
          title?: string
          updated_at?: string | null
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "countdown_timers_admin_wallet_fkey"
            columns: ["admin_wallet"]
            isOneToOne: false
            referencedRelation: "admin_list"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "countdown_timers_admin_wallet_fkey"
            columns: ["admin_wallet"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "countdown_timers_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
        ]
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
          {
            foreignKeyName: "course_activations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_activations_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "admin_list"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "course_activations_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
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
          {
            foreignKeyName: "course_lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      course_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          course_id: string
          id: string
          last_accessed_at: string
          lesson_id: string
          time_spent_minutes: number | null
          wallet_address: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          course_id: string
          id?: string
          last_accessed_at?: string
          lesson_id: string
          time_spent_minutes?: number | null
          wallet_address: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          course_id?: string
          id?: string
          last_accessed_at?: string
          lesson_id?: string
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
            foreignKeyName: "course_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_progress_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "admin_list"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "course_progress_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      courses: {
        Row: {
          category: string
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
        Relationships: [
          {
            foreignKeyName: "courses_instructor_wallet_fkey"
            columns: ["instructor_wallet"]
            isOneToOne: false
            referencedRelation: "admin_list"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "courses_instructor_wallet_fkey"
            columns: ["instructor_wallet"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
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
      layer_rewards: {
        Row: {
          amount_bcc: number | null
          amount_usdt: number
          claimed_at: string | null
          created_at: string
          id: string
          is_claimed: boolean
          layer: number
          nft_level: number | null
          payer_wallet: string
          recipient_wallet: string
          reward_type: string
          source_transaction_id: string | null
        }
        Insert: {
          amount_bcc?: number | null
          amount_usdt: number
          claimed_at?: string | null
          created_at?: string
          id?: string
          is_claimed?: boolean
          layer: number
          nft_level?: number | null
          payer_wallet: string
          recipient_wallet: string
          reward_type: string
          source_transaction_id?: string | null
        }
        Update: {
          amount_bcc?: number | null
          amount_usdt?: number
          claimed_at?: string | null
          created_at?: string
          id?: string
          is_claimed?: boolean
          layer?: number
          nft_level?: number | null
          payer_wallet?: string
          recipient_wallet?: string
          reward_type?: string
          source_transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "layer_rewards_payer_wallet_fkey"
            columns: ["payer_wallet"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "layer_rewards_recipient_wallet_fkey"
            columns: ["recipient_wallet"]
            isOneToOne: false
            referencedRelation: "members"
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
      matrix_activity_log: {
        Row: {
          activity_type: string
          created_at: string
          details: Json | null
          id: string
          layer: number
          member_wallet: string
          position: string
          root_wallet: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          details?: Json | null
          id?: string
          layer: number
          member_wallet: string
          position: string
          root_wallet: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          details?: Json | null
          id?: string
          layer?: number
          member_wallet?: string
          position?: string
          root_wallet?: string
        }
        Relationships: [
          {
            foreignKeyName: "matrix_activity_log_member_wallet_fkey"
            columns: ["member_wallet"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "matrix_activity_log_root_wallet_fkey"
            columns: ["root_wallet"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      matrix_layer_summary: {
        Row: {
          active_members: number
          filled_positions: number
          id: string
          last_updated: string
          layer: number
          layer_completion_rate: number | null
          root_wallet: string
          total_positions: number
        }
        Insert: {
          active_members?: number
          filled_positions?: number
          id?: string
          last_updated?: string
          layer: number
          layer_completion_rate?: number | null
          root_wallet: string
          total_positions?: number
        }
        Update: {
          active_members?: number
          filled_positions?: number
          id?: string
          last_updated?: string
          layer?: number
          layer_completion_rate?: number | null
          root_wallet?: string
          total_positions?: number
        }
        Relationships: [
          {
            foreignKeyName: "matrix_layer_summary_root_wallet_fkey"
            columns: ["root_wallet"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      matrix_stats: {
        Row: {
          available_positions: number
          filled_positions: number
          id: number
          last_updated: string | null
          layer_number: number
          root_wallet: string
          total_positions: number
        }
        Insert: {
          available_positions?: number
          filled_positions?: number
          id?: number
          last_updated?: string | null
          layer_number: number
          root_wallet: string
          total_positions?: number
        }
        Update: {
          available_positions?: number
          filled_positions?: number
          id?: number
          last_updated?: string | null
          layer_number?: number
          root_wallet?: string
          total_positions?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_matrix_stats_root"
            columns: ["root_wallet"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      member_activation_tiers: {
        Row: {
          base_bcc_locked: number
          created_at: string | null
          is_active: boolean | null
          max_activation_rank: number
          min_activation_rank: number
          tier: number
          tier_name: string
          unlock_per_level: number
        }
        Insert: {
          base_bcc_locked: number
          created_at?: string | null
          is_active?: boolean | null
          max_activation_rank: number
          min_activation_rank: number
          tier: number
          tier_name: string
          unlock_per_level: number
        }
        Update: {
          base_bcc_locked?: number
          created_at?: string | null
          is_active?: boolean | null
          max_activation_rank?: number
          min_activation_rank?: number
          tier?: number
          tier_name?: string
          unlock_per_level?: number
        }
        Relationships: []
      }
      member_requirements: {
        Row: {
          can_purchase_level_2: boolean | null
          direct_referral_count: number | null
          last_updated: string | null
          wallet_address: string
        }
        Insert: {
          can_purchase_level_2?: boolean | null
          direct_referral_count?: number | null
          last_updated?: string | null
          wallet_address: string
        }
        Update: {
          can_purchase_level_2?: boolean | null
          direct_referral_count?: number | null
          last_updated?: string | null
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_requirements_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      members: {
        Row: {
          activation_rank: number | null
          bcc_locked_initial: number | null
          bcc_locked_remaining: number | null
          created_at: string
          current_level: number
          has_pending_rewards: boolean
          levels_owned: Json
          referrer_wallet: string | null
          tier_level: number | null
          updated_at: string
          wallet_address: string
        }
        Insert: {
          activation_rank?: number | null
          bcc_locked_initial?: number | null
          bcc_locked_remaining?: number | null
          created_at?: string
          current_level?: number
          has_pending_rewards?: boolean
          levels_owned?: Json
          referrer_wallet?: string | null
          tier_level?: number | null
          updated_at?: string
          wallet_address: string
        }
        Update: {
          activation_rank?: number | null
          bcc_locked_initial?: number | null
          bcc_locked_remaining?: number | null
          created_at?: string
          current_level?: number
          has_pending_rewards?: boolean
          levels_owned?: Json
          referrer_wallet?: string | null
          tier_level?: number | null
          updated_at?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_referrer_wallet_fkey"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "admin_list"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "members_referrer_wallet_fkey"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "members_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "admin_list"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "members_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      membership: {
        Row: {
          activated_at: string | null
          activation_rank: number
          activation_tier: number | null
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
          tier_multiplier: number | null
          updated_at: string | null
          wallet_address: string
        }
        Insert: {
          activated_at?: string | null
          activation_rank?: number
          activation_tier?: number | null
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
          tier_multiplier?: number | null
          updated_at?: string | null
          wallet_address: string
        }
        Update: {
          activated_at?: string | null
          activation_rank?: number
          activation_tier?: number | null
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
          tier_multiplier?: number | null
          updated_at?: string | null
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_referrer_wallet_fkey"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "membership_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "members"
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
        Relationships: [
          {
            foreignKeyName: "merchant_nfts_creator_wallet_fkey"
            columns: ["creator_wallet"]
            isOneToOne: false
            referencedRelation: "admin_list"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "merchant_nfts_creator_wallet_fkey"
            columns: ["creator_wallet"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      nft_levels: {
        Row: {
          bcc_release: number
          benefits: Json | null
          created_at: string | null
          current_supply: number | null
          is_active: boolean | null
          level: number
          level_name: string
          max_supply: number | null
          metadata_uri: string | null
          price_usdc: number
          required_previous_level: boolean | null
          token_id: number
          unlock_layer: number
          updated_at: string | null
        }
        Insert: {
          bcc_release: number
          benefits?: Json | null
          created_at?: string | null
          current_supply?: number | null
          is_active?: boolean | null
          level: number
          level_name: string
          max_supply?: number | null
          metadata_uri?: string | null
          price_usdc: number
          required_previous_level?: boolean | null
          token_id: number
          unlock_layer: number
          updated_at?: string | null
        }
        Update: {
          bcc_release?: number
          benefits?: Json | null
          created_at?: string | null
          current_supply?: number | null
          is_active?: boolean | null
          level?: number
          level_name?: string
          max_supply?: number | null
          metadata_uri?: string | null
          price_usdc?: number
          required_previous_level?: boolean | null
          token_id?: number
          unlock_layer?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nft_levels_unlock_layer_fkey"
            columns: ["unlock_layer"]
            isOneToOne: false
            referencedRelation: "layer_rules"
            referencedColumns: ["layer"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "nft_purchases_buyer_wallet_fkey"
            columns: ["buyer_wallet"]
            isOneToOne: false
            referencedRelation: "admin_list"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "nft_purchases_buyer_wallet_fkey"
            columns: ["buyer_wallet"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      platform_fees: {
        Row: {
          applies_to: string | null
          created_at: string | null
          description: string | null
          fee_amount_usdc: number
          fee_type: string
          id: string
          is_active: boolean | null
          level_range_end: number | null
          level_range_start: number | null
          nft_level: number | null
          updated_at: string | null
        }
        Insert: {
          applies_to?: string | null
          created_at?: string | null
          description?: string | null
          fee_amount_usdc: number
          fee_type: string
          id?: string
          is_active?: boolean | null
          level_range_end?: number | null
          level_range_start?: number | null
          nft_level?: number | null
          updated_at?: string | null
        }
        Update: {
          applies_to?: string | null
          created_at?: string | null
          description?: string | null
          fee_amount_usdc?: number
          fee_type?: string
          id?: string
          is_active?: boolean | null
          level_range_end?: number | null
          level_range_start?: number | null
          nft_level?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_fees_nft_level_fkey"
            columns: ["nft_level"]
            isOneToOne: false
            referencedRelation: "nft_complete_pricing"
            referencedColumns: ["level"]
          },
          {
            foreignKeyName: "platform_fees_nft_level_fkey"
            columns: ["nft_level"]
            isOneToOne: false
            referencedRelation: "nft_levels"
            referencedColumns: ["level"]
          },
          {
            foreignKeyName: "platform_fees_nft_level_fkey"
            columns: ["nft_level"]
            isOneToOne: false
            referencedRelation: "nft_pricing_with_fees"
            referencedColumns: ["level"]
          },
        ]
      }
      referral_links: {
        Row: {
          claimed_by_wallets: Json | null
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          metadata: Json | null
          referral_token: string
          referral_url: string
          referrer_wallet: string
          total_activations: number | null
          total_clicks: number | null
          total_registrations: number | null
          updated_at: string | null
        }
        Insert: {
          claimed_by_wallets?: Json | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          metadata?: Json | null
          referral_token: string
          referral_url: string
          referrer_wallet: string
          total_activations?: number | null
          total_clicks?: number | null
          total_registrations?: number | null
          updated_at?: string | null
        }
        Update: {
          claimed_by_wallets?: Json | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          metadata?: Json | null
          referral_token?: string
          referral_url?: string
          referrer_wallet?: string
          total_activations?: number | null
          total_clicks?: number | null
          total_registrations?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_links_referrer_wallet_fkey"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      referrals: {
        Row: {
          activation_rank: number | null
          id: string
          is_active: boolean | null
          matrix_layer: number | null
          matrix_parent: string | null
          matrix_position: string | null
          matrix_root: string | null
          member_wallet: string
          placed_at: string | null
          placement_order: number | null
          referrer_wallet: string
        }
        Insert: {
          activation_rank?: number | null
          id?: string
          is_active?: boolean | null
          matrix_layer?: number | null
          matrix_parent?: string | null
          matrix_position?: string | null
          matrix_root?: string | null
          member_wallet: string
          placed_at?: string | null
          placement_order?: number | null
          referrer_wallet: string
        }
        Update: {
          activation_rank?: number | null
          id?: string
          is_active?: boolean | null
          matrix_layer?: number | null
          matrix_parent?: string | null
          matrix_position?: string | null
          matrix_root?: string | null
          member_wallet?: string
          placed_at?: string | null
          placement_order?: number | null
          referrer_wallet?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_matrix_parent_fkey"
            columns: ["matrix_parent"]
            isOneToOne: false
            referencedRelation: "admin_list"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_matrix_parent_fkey"
            columns: ["matrix_parent"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_matrix_root_fkey"
            columns: ["matrix_root"]
            isOneToOne: false
            referencedRelation: "admin_list"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_matrix_root_fkey"
            columns: ["matrix_root"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_member_wallet_fkey"
            columns: ["member_wallet"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_referrer_fkey"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "admin_list"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_referrer_fkey"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "users"
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
        Relationships: [
          {
            foreignKeyName: "reward_claims_rolled_up_to_wallet_fkey"
            columns: ["rolled_up_to_wallet"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "reward_claims_root_wallet_fkey"
            columns: ["root_wallet"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "reward_claims_triggering_member_wallet_fkey"
            columns: ["triggering_member_wallet"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
        ]
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
          {
            foreignKeyName: "reward_notifications_reward_claim_id_fkey"
            columns: ["reward_claim_id"]
            isOneToOne: false
            referencedRelation: "reward_claims_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_notifications_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      reward_records: {
        Row: {
          claimed_at: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          layer_number: number
          recipient_wallet: string
          reward_amount: number
          reward_status: string
          reward_type: string
          rolled_up_at: string | null
          triggered_by_placement: string
          triggered_by_wallet: string
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          layer_number?: number
          recipient_wallet: string
          reward_amount: number
          reward_status?: string
          reward_type: string
          rolled_up_at?: string | null
          triggered_by_placement: string
          triggered_by_wallet: string
        }
        Update: {
          claimed_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          layer_number?: number
          recipient_wallet?: string
          reward_amount?: number
          reward_status?: string
          reward_type?: string
          rolled_up_at?: string | null
          triggered_by_placement?: string
          triggered_by_wallet?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_records_recipient_fkey"
            columns: ["recipient_wallet"]
            isOneToOne: false
            referencedRelation: "admin_list"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "reward_records_recipient_fkey"
            columns: ["recipient_wallet"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "reward_records_triggered_by_fkey"
            columns: ["triggered_by_wallet"]
            isOneToOne: false
            referencedRelation: "admin_list"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "reward_records_triggered_by_fkey"
            columns: ["triggered_by_wallet"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      reward_rollups: {
        Row: {
          created_at: string | null
          id: string
          original_recipient: string
          original_reward_id: string
          rolled_up_to: string
          rollup_amount: number
          rollup_reason: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          original_recipient: string
          original_reward_id: string
          rolled_up_to: string
          rollup_amount: number
          rollup_reason: string
        }
        Update: {
          created_at?: string | null
          id?: string
          original_recipient?: string
          original_reward_id?: string
          rolled_up_to?: string
          rollup_amount?: number
          rollup_reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "rollups_original_recipient_fkey"
            columns: ["original_recipient"]
            isOneToOne: false
            referencedRelation: "admin_list"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "rollups_original_recipient_fkey"
            columns: ["original_recipient"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "rollups_original_reward_fkey"
            columns: ["original_reward_id"]
            isOneToOne: false
            referencedRelation: "reward_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rollups_rolled_up_to_fkey"
            columns: ["rolled_up_to"]
            isOneToOne: false
            referencedRelation: "admin_list"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "rollups_rolled_up_to_fkey"
            columns: ["rolled_up_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      reward_rules: {
        Row: {
          auto_claim: boolean | null
          bcc_release: number | null
          claim_window_hours: number | null
          created_at: string | null
          fixed_amount_usdc: number | null
          id: string
          is_active: boolean | null
          layer: number | null
          max_claims_per_user: number | null
          nft_level: number | null
          platform_fee: number | null
          requires_activation: boolean | null
          rule_type: string
          updated_at: string | null
        }
        Insert: {
          auto_claim?: boolean | null
          bcc_release?: number | null
          claim_window_hours?: number | null
          created_at?: string | null
          fixed_amount_usdc?: number | null
          id?: string
          is_active?: boolean | null
          layer?: number | null
          max_claims_per_user?: number | null
          nft_level?: number | null
          platform_fee?: number | null
          requires_activation?: boolean | null
          rule_type: string
          updated_at?: string | null
        }
        Update: {
          auto_claim?: boolean | null
          bcc_release?: number | null
          claim_window_hours?: number | null
          created_at?: string | null
          fixed_amount_usdc?: number | null
          id?: string
          is_active?: boolean | null
          layer?: number | null
          max_claims_per_user?: number | null
          nft_level?: number | null
          platform_fee?: number | null
          requires_activation?: boolean | null
          rule_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reward_rules_nft_level_fkey"
            columns: ["nft_level"]
            isOneToOne: false
            referencedRelation: "nft_complete_pricing"
            referencedColumns: ["level"]
          },
          {
            foreignKeyName: "reward_rules_nft_level_fkey"
            columns: ["nft_level"]
            isOneToOne: false
            referencedRelation: "nft_levels"
            referencedColumns: ["level"]
          },
          {
            foreignKeyName: "reward_rules_nft_level_fkey"
            columns: ["nft_level"]
            isOneToOne: false
            referencedRelation: "nft_pricing_with_fees"
            referencedColumns: ["level"]
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
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_list"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "usdt_withdrawals_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      user_balances: {
        Row: {
          bcc_locked: number
          bcc_total_initial: number
          bcc_transferable: number
          created_at: string
          current_tier: number | null
          tier_multiplier: number | null
          updated_at: string
          usdc_claimable: number
          usdc_claimed_total: number
          usdc_pending: number
          wallet_address: string
        }
        Insert: {
          bcc_locked?: number
          bcc_total_initial?: number
          bcc_transferable?: number
          created_at?: string
          current_tier?: number | null
          tier_multiplier?: number | null
          updated_at?: string
          usdc_claimable?: number
          usdc_claimed_total?: number
          usdc_pending?: number
          wallet_address: string
        }
        Update: {
          bcc_locked?: number
          bcc_total_initial?: number
          bcc_transferable?: number
          created_at?: string
          current_tier?: number | null
          tier_multiplier?: number | null
          updated_at?: string
          usdc_claimable?: number
          usdc_claimed_total?: number
          usdc_pending?: number
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_balances_wallet_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "admin_list"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "user_balances_wallet_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      user_notifications: {
        Row: {
          action_url: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          read_at: string | null
          title: string
          type: string
          wallet_address: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          read_at?: string | null
          title: string
          type: string
          wallet_address: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      user_reward_balances: {
        Row: {
          created_at: string | null
          updated_at: string | null
          usdc_claimable: number | null
          usdc_claimed: number | null
          usdc_pending: number | null
          wallet_address: string
        }
        Insert: {
          created_at?: string | null
          updated_at?: string | null
          usdc_claimable?: number | null
          usdc_claimed?: number | null
          usdc_pending?: number | null
          wallet_address: string
        }
        Update: {
          created_at?: string | null
          updated_at?: string | null
          usdc_claimable?: number | null
          usdc_claimed?: number | null
          usdc_pending?: number | null
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_reward_balances_wallet_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "admin_list"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "user_reward_balances_wallet_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      user_wallet_connections: {
        Row: {
          connected_at: string
          connection_type: string
          disconnected_at: string | null
          id: string
          ip_address: unknown | null
          session_duration: number | null
          user_agent: string | null
          wallet_address: string
        }
        Insert: {
          connected_at?: string
          connection_type: string
          disconnected_at?: string | null
          id?: string
          ip_address?: unknown | null
          session_duration?: number | null
          user_agent?: string | null
          wallet_address: string
        }
        Update: {
          connected_at?: string
          connection_type?: string
          disconnected_at?: string | null
          id?: string
          ip_address?: unknown | null
          session_duration?: number | null
          user_agent?: string | null
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_wallet_connections_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      user_withdrawal_limits: {
        Row: {
          created_at: string | null
          daily_limit_usd: number | null
          daily_reset_date: string | null
          daily_withdrawn_usd: number | null
          is_whitelisted: boolean | null
          last_withdrawal: string | null
          monthly_limit_usd: number | null
          monthly_reset_date: string | null
          monthly_withdrawn_usd: number | null
          security_level: number | null
          updated_at: string | null
          user_wallet: string
        }
        Insert: {
          created_at?: string | null
          daily_limit_usd?: number | null
          daily_reset_date?: string | null
          daily_withdrawn_usd?: number | null
          is_whitelisted?: boolean | null
          last_withdrawal?: string | null
          monthly_limit_usd?: number | null
          monthly_reset_date?: string | null
          monthly_withdrawn_usd?: number | null
          security_level?: number | null
          updated_at?: string | null
          user_wallet: string
        }
        Update: {
          created_at?: string | null
          daily_limit_usd?: number | null
          daily_reset_date?: string | null
          daily_withdrawn_usd?: number | null
          is_whitelisted?: boolean | null
          last_withdrawal?: string | null
          monthly_limit_usd?: number | null
          monthly_reset_date?: string | null
          monthly_withdrawn_usd?: number | null
          security_level?: number | null
          updated_at?: string | null
          user_wallet?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_withdrawal_limits_user_wallet_fkey"
            columns: ["user_wallet"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      users: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string | null
          is_upgraded: boolean
          pre_referrer: string | null
          referrer_wallet: string | null
          role: string | null
          updated_at: string
          upgrade_timer_enabled: boolean
          username: string | null
          wallet_address: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          is_upgraded?: boolean
          pre_referrer?: string | null
          referrer_wallet?: string | null
          role?: string | null
          updated_at?: string
          upgrade_timer_enabled?: boolean
          username?: string | null
          wallet_address: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          is_upgraded?: boolean
          pre_referrer?: string | null
          referrer_wallet?: string | null
          role?: string | null
          updated_at?: string
          upgrade_timer_enabled?: boolean
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
      admin_actions_summary: {
        Row: {
          action_type: string | null
          admin_username: string | null
          admin_wallet: string | null
          first_action: string | null
          last_action: string | null
          success_rate: number | null
          successful_actions: number | null
          total_actions: number | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_actions_admin_wallet_fkey"
            columns: ["admin_wallet"]
            isOneToOne: false
            referencedRelation: "admin_list"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "admin_actions_admin_wallet_fkey"
            columns: ["admin_wallet"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
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
      admin_list: {
        Row: {
          admin_level: number | null
          admin_since: string | null
          created_by_username: string | null
          email: string | null
          is_active: boolean | null
          permissions: Json | null
          username: string | null
          wallet_address: string | null
        }
        Relationships: []
      }
      admin_platform_fees: {
        Row: {
          affected_levels: number | null
          applies_to: string | null
          applies_to_description: string | null
          created_at: string | null
          description: string | null
          fee_amount_usdc: number | null
          fee_type: string | null
          is_active: boolean | null
          section: string | null
          updated_at: string | null
        }
        Insert: {
          affected_levels?: never
          applies_to?: string | null
          applies_to_description?: never
          created_at?: string | null
          description?: string | null
          fee_amount_usdc?: number | null
          fee_type?: string | null
          is_active?: boolean | null
          section?: never
          updated_at?: string | null
        }
        Update: {
          affected_levels?: never
          applies_to?: string | null
          applies_to_description?: never
          created_at?: string | null
          description?: string | null
          fee_amount_usdc?: number | null
          fee_type?: string | null
          is_active?: boolean | null
          section?: never
          updated_at?: string | null
        }
        Relationships: []
      }
      courses_overview: {
        Row: {
          active_enrollments: number | null
          avg_progress: number | null
          category: string | null
          created_at: string | null
          description: string | null
          difficulty_level: string | null
          duration_hours: number | null
          id: string | null
          instructor_username: string | null
          instructor_wallet: string | null
          is_active: boolean | null
          lesson_count: number | null
          price_bcc: number | null
          required_level: number | null
          tags: string | null
          thumbnail_url: string | null
          title: string | null
          total_enrollments: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_instructor_wallet_fkey"
            columns: ["instructor_wallet"]
            isOneToOne: false
            referencedRelation: "admin_list"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "courses_instructor_wallet_fkey"
            columns: ["instructor_wallet"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      marketplace_nfts: {
        Row: {
          advertiser_username: string | null
          advertiser_wallet: string | null
          category: string | null
          created_at: string | null
          creator_username: string | null
          creator_wallet: string | null
          description: string | null
          id: string | null
          image_url: string | null
          is_active: boolean | null
          metadata_url: string | null
          nft_type: string | null
          price_bcc: number | null
          tags: string | null
          title: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      matrix_reward_summary: {
        Row: {
          layer: number | null
          layer_name: string | null
          max_claims_per_user: number | null
          max_layer_rewards_usdc: number | null
          positions_per_layer: number | null
          reward_per_member_usdc: number | null
        }
        Relationships: []
      }
      matrix_structure: {
        Row: {
          activation_rank: number | null
          current_level: number | null
          matrix_layer: number | null
          matrix_parent: string | null
          matrix_position: string | null
          matrix_root: string | null
          member_username: string | null
          member_wallet: string | null
          parent_username: string | null
          placed_at: string | null
          referrer_wallet: string | null
          root_username: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_matrix_parent_fkey"
            columns: ["matrix_parent"]
            isOneToOne: false
            referencedRelation: "admin_list"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_matrix_parent_fkey"
            columns: ["matrix_parent"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_matrix_root_fkey"
            columns: ["matrix_root"]
            isOneToOne: false
            referencedRelation: "admin_list"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_matrix_root_fkey"
            columns: ["matrix_root"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_member_wallet_fkey"
            columns: ["member_wallet"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_referrer_fkey"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "admin_list"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_referrer_fkey"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      member_requirements_view: {
        Row: {
          can_purchase_level_2: boolean | null
          current_level: number | null
          direct_referral_count: number | null
          last_updated: string | null
          level_2_status: string | null
          username: string | null
          wallet_address: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_requirements_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      nft_complete_pricing: {
        Row: {
          bcc_unlock_amount: number | null
          benefits: Json | null
          is_active: boolean | null
          level: number | null
          level_name: string | null
          nft_price: number | null
          platform_fee: number | null
          token_id: number | null
          total_cost: number | null
        }
        Relationships: []
      }
      nft_pricing_with_fees: {
        Row: {
          activation_fee_usdc: number | null
          bcc_reward: number | null
          benefits: Json | null
          created_at: string | null
          display_price_usdc: number | null
          is_active: boolean | null
          level: number | null
          level_name: string | null
          metadata_uri: string | null
          nft_cost: number | null
          nft_price_usdc: number | null
          token_id: number | null
          total_fees: number | null
          total_price_usdc: number | null
          transaction_fee_usdc: number | null
          unlock_layer: number | null
          updated_at: string | null
          upgrade_fee_usdc: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nft_levels_unlock_layer_fkey"
            columns: ["unlock_layer"]
            isOneToOne: false
            referencedRelation: "layer_rules"
            referencedColumns: ["layer"]
          },
        ]
      }
      reward_claims_dashboard: {
        Row: {
          claimed_at: string | null
          created_at: string | null
          expires_at: string | null
          id: string | null
          layer: number | null
          metadata: Json | null
          nft_level: number | null
          reward_amount_usdc: number | null
          rolled_up_at: string | null
          rolled_up_to_wallet: string | null
          root_username: string | null
          root_wallet: string | null
          status: string | null
          time_remaining: unknown | null
          triggering_member_username: string | null
          triggering_member_wallet: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reward_claims_rolled_up_to_wallet_fkey"
            columns: ["rolled_up_to_wallet"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "reward_claims_root_wallet_fkey"
            columns: ["root_wallet"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "reward_claims_triggering_member_wallet_fkey"
            columns: ["triggering_member_wallet"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      reward_structure_explanation: {
        Row: {
          description: string | null
          fee_details: string | null
          fee_structure: string | null
          reward_1_description: string | null
          reward_1_rules: string | null
          reward_2a_description: string | null
          reward_2b_description: string | null
          reward_type_1: string | null
          reward_type_2: string | null
          system_name: string | null
        }
        Relationships: []
      }
      reward_summary: {
        Row: {
          claimable_count: number | null
          claimed_count: number | null
          pending_count: number | null
          rolled_up_count: number | null
          total_rewards: number | null
          updated_at: string | null
          usdc_claimable: number | null
          usdc_claimed: number | null
          usdc_pending: number | null
          username: string | null
          wallet_address: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_reward_balances_wallet_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "admin_list"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "user_reward_balances_wallet_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      rewards_summary: {
        Row: {
          claimed_amount: number | null
          claimed_rewards: number | null
          latest_claim_date: string | null
          latest_reward_date: string | null
          layer: number | null
          pending_amount: number | null
          pending_rewards: number | null
          recipient_wallet: string | null
          reward_type: string | null
          total_amount: number | null
          total_bcc_amount: number | null
          total_rewards: number | null
        }
        Relationships: [
          {
            foreignKeyName: "layer_rewards_recipient_wallet_fkey"
            columns: ["recipient_wallet"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      user_balance_summary: {
        Row: {
          bcc_current_total: number | null
          bcc_locked: number | null
          bcc_total_initial: number | null
          bcc_transferable: number | null
          created_at: string | null
          current_tier: number | null
          member_status: string | null
          tier_multiplier: number | null
          tier_name: string | null
          updated_at: string | null
          usdc_claimable: number | null
          usdc_claimed_total: number | null
          usdc_pending: number | null
          usdc_total_available: number | null
          username: string | null
          wallet_address: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_balances_wallet_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "admin_list"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "user_balances_wallet_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
    }
    Functions: {
      analyze_matrix_structure: {
        Args: Record<PropertyKey, never>
        Returns: {
          layer_distribution: Json
          placement_root: string
          position_distribution: Json
          root_username: string
          total_members: number
        }[]
      }
      calculate_level_bcc_unlock: {
        Args: { p_level: number; p_tier?: number }
        Returns: number
      }
      calculate_matrix_parent: {
        Args: { member_addr: string; referrer_addr: string }
        Returns: {
          calculated_matrix_layer: number
          calculated_matrix_parent: string
          calculated_matrix_position: string
        }[]
      }
      calculate_nft_total_price: {
        Args: { p_level: number }
        Returns: number
      }
      calculate_total_bcc_locked: {
        Args: { p_tier?: number }
        Returns: number
      }
      calculate_total_nft_cost: {
        Args: { p_level: number }
        Returns: number
      }
      check_admin_permission: {
        Args: { p_permission: string; p_wallet_address: string }
        Returns: boolean
      }
      check_and_convert_r_rewards: {
        Args: { p_wallet_address: string }
        Returns: number
      }
      check_matrix_health: {
        Args: Record<PropertyKey, never>
        Returns: {
          health_metric: string
          recommendation: string
          status: string
          value: number
        }[]
      }
      check_withdrawal_limits: {
        Args: { p_amount_usd: number; p_user_wallet: string }
        Returns: Json
      }
      claim_pending_rewards: {
        Args: { p_wallet_address: string }
        Returns: Json
      }
      claim_reward_to_balance: {
        Args: { p_claim_id: string; p_wallet_address: string }
        Returns: Json
      }
      cleanup_expired_users: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      create_countdown_timer: {
        Args: {
          p_admin_wallet?: string
          p_auto_action?: string
          p_description?: string
          p_duration_hours: number
          p_timer_type: string
          p_title: string
          p_wallet_address: string
        }
        Returns: Json
      }
      create_referral_link: {
        Args: {
          p_base_url?: string
          p_expires_days?: number
          p_max_uses?: number
          p_referrer_wallet: string
        }
        Returns: Json
      }
      create_reward_countdown_notification: {
        Args: { p_claim_id: string }
        Returns: Json
      }
      create_wallet_session: {
        Args: {
          p_message: string
          p_signature: string
          p_wallet_address: string
        }
        Returns: Json
      }
      find_matrix_placement: {
        Args:
          | { member_wallet: string; root_wallet: string }
          | { p_new_member_wallet: string; p_referrer_wallet: string }
        Returns: {
          placement_layer: number
          placement_parent: string
          placement_position: string
        }[]
      }
      generate_referral_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_active_countdowns: {
        Args: { p_wallet_address: string }
        Returns: {
          auto_action: string
          description: string
          end_time: string
          is_expired: boolean
          metadata: Json
          start_time: string
          time_remaining: unknown
          timer_id: string
          timer_type: string
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
      get_default_pending_hours: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_matrix_system_overview: {
        Args: Record<PropertyKey, never>
        Returns: {
          details: string
          metric_category: string
          metric_name: string
          percentage: number
          value: number
        }[]
      }
      get_nft_fee_breakdown: {
        Args: { p_level: number }
        Returns: {
          activation_fee: number
          nft_price: number
          total_fees: number
          total_price: number
          transaction_fee: number
          upgrade_fee: number
        }[]
      }
      get_server_wallet_summary: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      is_activation_pending_enabled: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_member_activated: {
        Args: { p_wallet_address: string }
        Returns: boolean
      }
      is_valid_wallet_address: {
        Args: { address: string }
        Returns: boolean
      }
      process_bcc_purchase: {
        Args: { p_amount_received: number; p_order_id: string }
        Returns: Json
      }
      process_expired_rewards: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      process_level1_nft_activation: {
        Args: { p_referrer_wallet?: string; p_wallet_address: string }
        Returns: {
          activation_rank: number
          message: string
          placement_info: Json
          success: boolean
          tier_info: Json
        }[]
      }
      process_membership_activation: {
        Args: { p_referrer_wallet?: string; p_wallet_address: string }
        Returns: {
          message: string
          placement_info: Json
          reward_info: Json
          success: boolean
        }[]
      }
      process_referral_link: {
        Args: { p_claimer_wallet?: string; p_referral_token: string }
        Returns: Json
      }
      process_reward_rollup: {
        Args: { p_expired_reward_id: string }
        Returns: undefined
      }
      process_reward_system_maintenance: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      rebuild_complete_matrix: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      run_scheduled_cleanup: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      safe_round: {
        Args: { places: number; val: number }
        Returns: number
      }
      toggle_activation_pending_global: {
        Args: { p_admin_wallet: string; p_enabled: boolean; p_reason?: string }
        Returns: Json
      }
      trigger_layer1_rewards: {
        Args: {
          p_matrix_root: string
          p_new_member_wallet: string
          p_placement_parent: string
          p_placement_position: string
        }
        Returns: undefined
      }
      unlock_bcc_for_nft_level: {
        Args: { p_nft_level: number; p_wallet_address: string }
        Returns: Json
      }
      update_matrix_layer_summary: {
        Args: { p_layer: number; p_root_wallet: string }
        Returns: undefined
      }
      update_member_requirements: {
        Args: { p_wallet_address: string }
        Returns: undefined
      }
      update_user_bcc_balance: {
        Args: {
          p_locked_change?: number
          p_tier?: number
          p_transferable_change?: number
          p_wallet_address: string
        }
        Returns: boolean
      }
      update_user_usdc_balance: {
        Args: {
          p_claimable_change?: number
          p_claimed_change?: number
          p_pending_change?: number
          p_wallet_address: string
        }
        Returns: boolean
      }
      update_withdrawal_limits: {
        Args: { p_amount_usd: number; p_user_wallet: string }
        Returns: boolean
      }
      validate_wallet_signature: {
        Args: {
          p_message: string
          p_signature: string
          p_wallet_address: string
        }
        Returns: boolean
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
