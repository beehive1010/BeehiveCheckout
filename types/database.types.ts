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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
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
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "admin_actions_admin_wallet_fkey"
            columns: ["admin_wallet"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
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
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "admin_actions_target_wallet_fkey"
            columns: ["target_wallet"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "admin_actions_target_wallet_fkey"
            columns: ["target_wallet"]
            isOneToOne: false
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
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "advertisement_nfts_advertiser_wallet_fkey"
            columns: ["advertiser_wallet"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
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
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "audit_logs_user_wallet_fkey"
            columns: ["user_wallet"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
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
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "bcc_purchase_orders_buyer_wallet_fkey"
            columns: ["buyer_wallet"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
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
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "blog_posts_author_wallet_fkey"
            columns: ["author_wallet"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
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
            foreignKeyName: "countdown_timers_admin_fkey"
            columns: ["admin_wallet"]
            isOneToOne: false
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "countdown_timers_admin_fkey"
            columns: ["admin_wallet"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "countdown_timers_admin_fkey"
            columns: ["admin_wallet"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "countdown_timers_admin_wallet_fkey"
            columns: ["admin_wallet"]
            isOneToOne: false
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "countdown_timers_admin_wallet_fkey"
            columns: ["admin_wallet"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
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
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "countdown_timers_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "countdown_timers_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "countdown_timers_wallet_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "countdown_timers_wallet_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "countdown_timers_wallet_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "users"
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
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "course_activations_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
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
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "course_progress_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
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
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "courses_instructor_wallet_fkey"
            columns: ["instructor_wallet"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
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
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "layer_rewards_payer_wallet_fkey"
            columns: ["payer_wallet"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "layer_rewards_payer_wallet_fkey"
            columns: ["payer_wallet"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "layer_rewards_recipient_wallet_fkey"
            columns: ["recipient_wallet"]
            isOneToOne: false
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "layer_rewards_recipient_wallet_fkey"
            columns: ["recipient_wallet"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "layer_rewards_recipient_wallet_fkey"
            columns: ["recipient_wallet"]
            isOneToOne: false
            referencedRelation: "users"
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
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "matrix_activity_log_member_wallet_fkey"
            columns: ["member_wallet"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "matrix_activity_log_member_wallet_fkey"
            columns: ["member_wallet"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "matrix_activity_log_root_wallet_fkey"
            columns: ["root_wallet"]
            isOneToOne: false
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "matrix_activity_log_root_wallet_fkey"
            columns: ["root_wallet"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "matrix_activity_log_root_wallet_fkey"
            columns: ["root_wallet"]
            isOneToOne: false
            referencedRelation: "users"
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
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "matrix_layer_summary_root_wallet_fkey"
            columns: ["root_wallet"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "matrix_layer_summary_root_wallet_fkey"
            columns: ["root_wallet"]
            isOneToOne: false
            referencedRelation: "users"
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
            referencedRelation: "admin_pending_members"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "member_requirements_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "member_reward_balances"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "member_requirements_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "member_tier_info"
            referencedColumns: ["wallet_address"]
          },
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
          activated_at: string | null
          activation_expires_at: string | null
          activation_rank: number | null
          admin_set_pending: boolean | null
          admin_wallet: string | null
          bcc_locked_initial: number | null
          bcc_locked_remaining: number | null
          created_at: string
          current_level: number
          has_pending_rewards: boolean
          is_activated: boolean
          last_reward_claim_at: string | null
          last_upgrade_at: string | null
          levels_owned: Json
          max_layer: number
          pending_activation_hours: number | null
          tier_level: number | null
          total_direct_referrals: number
          total_team_size: number
          updated_at: string
          upgrade_reminder_enabled: boolean
          wallet_address: string
        }
        Insert: {
          activated_at?: string | null
          activation_expires_at?: string | null
          activation_rank?: number | null
          admin_set_pending?: boolean | null
          admin_wallet?: string | null
          bcc_locked_initial?: number | null
          bcc_locked_remaining?: number | null
          created_at?: string
          current_level?: number
          has_pending_rewards?: boolean
          is_activated?: boolean
          last_reward_claim_at?: string | null
          last_upgrade_at?: string | null
          levels_owned?: Json
          max_layer?: number
          pending_activation_hours?: number | null
          tier_level?: number | null
          total_direct_referrals?: number
          total_team_size?: number
          updated_at?: string
          upgrade_reminder_enabled?: boolean
          wallet_address: string
        }
        Update: {
          activated_at?: string | null
          activation_expires_at?: string | null
          activation_rank?: number | null
          admin_set_pending?: boolean | null
          admin_wallet?: string | null
          bcc_locked_initial?: number | null
          bcc_locked_remaining?: number | null
          created_at?: string
          current_level?: number
          has_pending_rewards?: boolean
          is_activated?: boolean
          last_reward_claim_at?: string | null
          last_upgrade_at?: string | null
          levels_owned?: Json
          max_layer?: number
          pending_activation_hours?: number | null
          tier_level?: number | null
          total_direct_referrals?: number
          total_team_size?: number
          updated_at?: string
          upgrade_reminder_enabled?: boolean
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_tier_level_fkey"
            columns: ["tier_level"]
            isOneToOne: false
            referencedRelation: "member_activation_tiers"
            referencedColumns: ["tier"]
          },
          {
            foreignKeyName: "members_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "members_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "user_dashboard"
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
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "merchant_nfts_creator_wallet_fkey"
            columns: ["creator_wallet"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
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
          bcc_reward: number
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
          bcc_reward: number
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
          bcc_reward?: number
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
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "nft_purchases_buyer_wallet_fkey"
            columns: ["buyer_wallet"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
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
      orders: {
        Row: {
          amount_bcc: number | null
          amount_usdt: number
          completed_at: string | null
          created_at: string
          id: string
          item_id: string
          metadata: Json | null
          order_type: string
          payment_method: string
          status: string
          transaction_hash: string | null
          wallet_address: string
        }
        Insert: {
          amount_bcc?: number | null
          amount_usdt: number
          completed_at?: string | null
          created_at?: string
          id?: string
          item_id: string
          metadata?: Json | null
          order_type: string
          payment_method: string
          status?: string
          transaction_hash?: string | null
          wallet_address: string
        }
        Update: {
          amount_bcc?: number | null
          amount_usdt?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          item_id?: string
          metadata?: Json | null
          order_type?: string
          payment_method?: string
          status?: string
          transaction_hash?: string | null
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "orders_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "orders_wallet_address_fkey"
            columns: ["wallet_address"]
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
          fee_percentage: number | null
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
          fee_percentage?: number | null
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
          fee_percentage?: number | null
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
            foreignKeyName: "referral_links_referrer_fkey"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referral_links_referrer_fkey"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referral_links_referrer_fkey"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referral_links_referrer_wallet_fkey"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referral_links_referrer_wallet_fkey"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referral_links_referrer_wallet_fkey"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          layer: number
          member_wallet: string
          parent_wallet: string | null
          placement_type: string
          placer_wallet: string
          position: string
          root_wallet: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          layer: number
          member_wallet: string
          parent_wallet?: string | null
          placement_type: string
          placer_wallet: string
          position: string
          root_wallet: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          layer?: number
          member_wallet?: string
          parent_wallet?: string | null
          placement_type?: string
          placer_wallet?: string
          position?: string
          root_wallet?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_member_wallet_fkey"
            columns: ["member_wallet"]
            isOneToOne: false
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_member_wallet_fkey"
            columns: ["member_wallet"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_member_wallet_fkey"
            columns: ["member_wallet"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_parent_wallet_fkey"
            columns: ["parent_wallet"]
            isOneToOne: false
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_parent_wallet_fkey"
            columns: ["parent_wallet"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_parent_wallet_fkey"
            columns: ["parent_wallet"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_placer_wallet_fkey"
            columns: ["placer_wallet"]
            isOneToOne: false
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_placer_wallet_fkey"
            columns: ["placer_wallet"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_placer_wallet_fkey"
            columns: ["placer_wallet"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_root_wallet_fkey"
            columns: ["root_wallet"]
            isOneToOne: false
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_root_wallet_fkey"
            columns: ["root_wallet"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_root_wallet_fkey"
            columns: ["root_wallet"]
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
            referencedRelation: "admin_pending_members"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "reward_claims_rolled_up_to_wallet_fkey"
            columns: ["rolled_up_to_wallet"]
            isOneToOne: false
            referencedRelation: "member_reward_balances"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "reward_claims_rolled_up_to_wallet_fkey"
            columns: ["rolled_up_to_wallet"]
            isOneToOne: false
            referencedRelation: "member_tier_info"
            referencedColumns: ["wallet_address"]
          },
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
            referencedRelation: "admin_pending_members"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "reward_claims_root_wallet_fkey"
            columns: ["root_wallet"]
            isOneToOne: false
            referencedRelation: "member_reward_balances"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "reward_claims_root_wallet_fkey"
            columns: ["root_wallet"]
            isOneToOne: false
            referencedRelation: "member_tier_info"
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
            referencedRelation: "admin_pending_members"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "reward_claims_triggering_member_wallet_fkey"
            columns: ["triggering_member_wallet"]
            isOneToOne: false
            referencedRelation: "member_reward_balances"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "reward_claims_triggering_member_wallet_fkey"
            columns: ["triggering_member_wallet"]
            isOneToOne: false
            referencedRelation: "member_tier_info"
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
            referencedRelation: "admin_pending_members"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "reward_notifications_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "member_reward_balances"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "reward_notifications_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "member_tier_info"
            referencedColumns: ["wallet_address"]
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
      reward_rules: {
        Row: {
          auto_claim: boolean | null
          bcc_multiplier: number | null
          claim_window_hours: number | null
          created_at: string | null
          fixed_amount_usdc: number | null
          id: string
          is_active: boolean | null
          layer: number | null
          max_claims_per_user: number | null
          nft_level: number | null
          requires_activation: boolean | null
          reward_percentage: number | null
          rule_type: string
          updated_at: string | null
        }
        Insert: {
          auto_claim?: boolean | null
          bcc_multiplier?: number | null
          claim_window_hours?: number | null
          created_at?: string | null
          fixed_amount_usdc?: number | null
          id?: string
          is_active?: boolean | null
          layer?: number | null
          max_claims_per_user?: number | null
          nft_level?: number | null
          requires_activation?: boolean | null
          reward_percentage?: number | null
          rule_type: string
          updated_at?: string | null
        }
        Update: {
          auto_claim?: boolean | null
          bcc_multiplier?: number | null
          claim_window_hours?: number | null
          created_at?: string | null
          fixed_amount_usdc?: number | null
          id?: string
          is_active?: boolean | null
          layer?: number | null
          max_claims_per_user?: number | null
          nft_level?: number | null
          requires_activation?: boolean | null
          reward_percentage?: number | null
          rule_type?: string
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
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
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
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "usdt_withdrawals_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "usdt_withdrawals_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      user_balances: {
        Row: {
          bcc_locked: number
          bcc_locked_total: number | null
          bcc_transferable: number
          bcc_unlocked_balance: number | null
          claimable_reward_balance_usdc: number | null
          created_at: string
          pending_reward_balance_usdc: number | null
          pending_upgrade_rewards: number
          rewards_claimed: number
          total_rewards_withdrawn_usdc: number | null
          total_usdc_earned: number
          updated_at: string
          wallet_address: string
        }
        Insert: {
          bcc_locked?: number
          bcc_locked_total?: number | null
          bcc_transferable?: number
          bcc_unlocked_balance?: number | null
          claimable_reward_balance_usdc?: number | null
          created_at?: string
          pending_reward_balance_usdc?: number | null
          pending_upgrade_rewards?: number
          rewards_claimed?: number
          total_rewards_withdrawn_usdc?: number | null
          total_usdc_earned?: number
          updated_at?: string
          wallet_address: string
        }
        Update: {
          bcc_locked?: number
          bcc_locked_total?: number | null
          bcc_transferable?: number
          bcc_unlocked_balance?: number | null
          claimable_reward_balance_usdc?: number | null
          created_at?: string
          pending_reward_balance_usdc?: number | null
          pending_upgrade_rewards?: number
          rewards_claimed?: number
          total_rewards_withdrawn_usdc?: number | null
          total_usdc_earned?: number
          updated_at?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_balances_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "user_balances_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "user_dashboard"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "user_balances_wallet_address_fkey"
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
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "user_notifications_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "user_notifications_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
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
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "user_wallet_connections_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "user_wallet_connections_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      users: {
        Row: {
          auth_user_id: string | null
          created_at: string
          current_level: number
          email: string | null
          email_verified: boolean | null
          is_admin: boolean | null
          is_upgraded: boolean
          phone_verified: boolean | null
          referrer_wallet: string | null
          updated_at: string
          upgrade_timer_enabled: boolean
          username: string | null
          wallet_address: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          current_level?: number
          email?: string | null
          email_verified?: boolean | null
          is_admin?: boolean | null
          is_upgraded?: boolean
          phone_verified?: boolean | null
          referrer_wallet?: string | null
          updated_at?: string
          upgrade_timer_enabled?: boolean
          username?: string | null
          wallet_address: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          current_level?: number
          email?: string | null
          email_verified?: boolean | null
          is_admin?: boolean | null
          is_upgraded?: boolean
          phone_verified?: boolean | null
          referrer_wallet?: string | null
          updated_at?: string
          upgrade_timer_enabled?: boolean
          username?: string | null
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_users_referrer"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "fk_users_referrer"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "fk_users_referrer"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
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
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "admin_actions_admin_wallet_fkey"
            columns: ["admin_wallet"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
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
      admin_pending_members: {
        Row: {
          activation_expires_at: string | null
          admin_set_pending: boolean | null
          admin_username: string | null
          admin_wallet: string | null
          email: string | null
          member_joined: string | null
          member_record_created: string | null
          pending_activation_hours: number | null
          pending_status: string | null
          referrer_wallet: string | null
          time_remaining: unknown | null
          username: string | null
          wallet_address: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_users_referrer"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "fk_users_referrer"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "fk_users_referrer"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "members_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "members_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "user_dashboard"
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
      bcc_transactions: {
        Row: {
          amount: number | null
          created_at: string | null
          description: string | null
          direction: string | null
          reference_id: string | null
          status: string | null
          transaction_type: string | null
          wallet_address: string | null
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
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "courses_instructor_wallet_fkey"
            columns: ["instructor_wallet"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
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
      direct_referrals: {
        Row: {
          activated_at: string | null
          bbc_level: number | null
          current_level: number | null
          is_activated: boolean | null
          member_joined: string | null
          member_wallet: string | null
          placement_type: string | null
          position: string | null
          referral_date: string | null
          root_wallet: string | null
          their_referrals: number | null
          total_bcc_balance: number | null
          total_team_size: number | null
          total_usdt_earned: number | null
          username: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_member_wallet_fkey"
            columns: ["member_wallet"]
            isOneToOne: false
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_member_wallet_fkey"
            columns: ["member_wallet"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_member_wallet_fkey"
            columns: ["member_wallet"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_root_wallet_fkey"
            columns: ["root_wallet"]
            isOneToOne: false
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_root_wallet_fkey"
            columns: ["root_wallet"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_root_wallet_fkey"
            columns: ["root_wallet"]
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
      matrix_overview: {
        Row: {
          activated_count: number | null
          avg_member_level: number | null
          direct_count: number | null
          latest_placement: string | null
          layer: number | null
          member_count: number | null
          root_wallet: string | null
          spillover_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_root_wallet_fkey"
            columns: ["root_wallet"]
            isOneToOne: false
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_root_wallet_fkey"
            columns: ["root_wallet"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_root_wallet_fkey"
            columns: ["root_wallet"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
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
            referencedRelation: "admin_pending_members"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "member_requirements_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "member_reward_balances"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "member_requirements_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "member_tier_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "member_requirements_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      member_reward_balances: {
        Row: {
          claimable_balance_usdc: number | null
          claimable_claims_count: number | null
          claimable_claims_total_usdc: number | null
          pending_balance_usdc: number | null
          pending_claims_count: number | null
          pending_claims_total_usdc: number | null
          total_withdrawn_usdc: number | null
          wallet_address: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "members_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "user_dashboard"
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
      member_tier_info: {
        Row: {
          activated_at: string | null
          activation_rank: number | null
          base_bcc_locked: number | null
          bcc_locked_initial: number | null
          bcc_locked_remaining: number | null
          bcc_unlocked_so_far: number | null
          is_activated: boolean | null
          max_bcc_unlock: number | null
          tier_level: number | null
          tier_name: string | null
          unlock_per_level: number | null
          wallet_address: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_tier_level_fkey"
            columns: ["tier_level"]
            isOneToOne: false
            referencedRelation: "member_activation_tiers"
            referencedColumns: ["tier"]
          },
          {
            foreignKeyName: "members_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "members_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "user_dashboard"
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
      monthly_activity: {
        Row: {
          activity_type: string | null
          count: number | null
          month: string | null
        }
        Relationships: []
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
      platform_fees_summary: {
        Row: {
          applies_to: string | null
          created_at: string | null
          description: string | null
          fee_amount_usdc: number | null
          fee_percentage: number | null
          fee_type: string | null
          is_active: boolean | null
          level_name: string | null
          level_range_end: number | null
          level_range_start: number | null
          nft_level: number | null
          nft_price: number | null
          status: string | null
          total_with_fee: number | null
          updated_at: string | null
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
      platform_stats: {
        Row: {
          activated_members: number | null
          active_matrices: number | null
          total_bcc_purchased: number | null
          total_course_enrollments: number | null
          total_nft_sales: number | null
          total_referrals: number | null
          total_rewards_claimed: number | null
          total_users: number | null
        }
        Relationships: []
      }
      purchase_history: {
        Row: {
          amount_paid: number | null
          amount_received: number | null
          completed_at: string | null
          created_at: string | null
          item_id: string | null
          item_type: string | null
          network: string | null
          payment_method: string | null
          purchase_type: string | null
          status: string | null
          transaction_hash: string | null
          transaction_id: string | null
          wallet_address: string | null
        }
        Relationships: []
      }
      referral_tree_detailed: {
        Row: {
          is_active: boolean | null
          layer: number | null
          member_activated_at: string | null
          member_bbc_level: number | null
          member_bcc_locked: number | null
          member_bcc_transferable: number | null
          member_current_level: number | null
          member_email: string | null
          member_is_activated: boolean | null
          member_joined_date: string | null
          member_levels_owned: Json | null
          member_total_earned: number | null
          member_username: string | null
          member_wallet: string | null
          parent_wallet: string | null
          placement_date: string | null
          placement_type: string | null
          placer_wallet: string | null
          position: string | null
          root_current_level: number | null
          root_username: string | null
          root_wallet: string | null
          total_direct_referrals: number | null
          total_team_size: number | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_member_wallet_fkey"
            columns: ["member_wallet"]
            isOneToOne: false
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_member_wallet_fkey"
            columns: ["member_wallet"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_member_wallet_fkey"
            columns: ["member_wallet"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_parent_wallet_fkey"
            columns: ["parent_wallet"]
            isOneToOne: false
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_parent_wallet_fkey"
            columns: ["parent_wallet"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_parent_wallet_fkey"
            columns: ["parent_wallet"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_placer_wallet_fkey"
            columns: ["placer_wallet"]
            isOneToOne: false
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_placer_wallet_fkey"
            columns: ["placer_wallet"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_placer_wallet_fkey"
            columns: ["placer_wallet"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_root_wallet_fkey"
            columns: ["root_wallet"]
            isOneToOne: false
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_root_wallet_fkey"
            columns: ["root_wallet"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "referrals_root_wallet_fkey"
            columns: ["root_wallet"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
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
            referencedRelation: "admin_pending_members"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "reward_claims_rolled_up_to_wallet_fkey"
            columns: ["rolled_up_to_wallet"]
            isOneToOne: false
            referencedRelation: "member_reward_balances"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "reward_claims_rolled_up_to_wallet_fkey"
            columns: ["rolled_up_to_wallet"]
            isOneToOne: false
            referencedRelation: "member_tier_info"
            referencedColumns: ["wallet_address"]
          },
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
            referencedRelation: "admin_pending_members"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "reward_claims_root_wallet_fkey"
            columns: ["root_wallet"]
            isOneToOne: false
            referencedRelation: "member_reward_balances"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "reward_claims_root_wallet_fkey"
            columns: ["root_wallet"]
            isOneToOne: false
            referencedRelation: "member_tier_info"
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
            referencedRelation: "admin_pending_members"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "reward_claims_triggering_member_wallet_fkey"
            columns: ["triggering_member_wallet"]
            isOneToOne: false
            referencedRelation: "member_reward_balances"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "reward_claims_triggering_member_wallet_fkey"
            columns: ["triggering_member_wallet"]
            isOneToOne: false
            referencedRelation: "member_tier_info"
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
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "layer_rewards_recipient_wallet_fkey"
            columns: ["recipient_wallet"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "layer_rewards_recipient_wallet_fkey"
            columns: ["recipient_wallet"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      user_auth_info: {
        Row: {
          activated_at: string | null
          activation_expires_at: string | null
          auth_created_at: string | null
          auth_email: string | null
          auth_user_id: string | null
          bcc_locked: number | null
          bcc_transferable: number | null
          created_at: string | null
          current_level: number | null
          email: string | null
          email_confirmed_at: string | null
          email_verified: boolean | null
          is_activated: boolean | null
          is_admin: boolean | null
          last_sign_in_at: string | null
          pending_activation_hours: number | null
          phone: string | null
          phone_confirmed_at: string | null
          phone_verified: boolean | null
          raw_app_meta_data: Json | null
          raw_user_meta_data: Json | null
          referrer_wallet: string | null
          total_usdt_earned: number | null
          updated_at: string | null
          username: string | null
          wallet_address: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_users_referrer"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "fk_users_referrer"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "fk_users_referrer"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      user_bcc_balance_overview: {
        Row: {
          remaining_locked_bcc: number | null
          total_locked_bcc: number | null
          transferable_bcc: number | null
          unlock_progress_percent: number | null
          unlocked_bcc: number | null
          updated_at: string | null
          wallet_address: string | null
        }
        Insert: {
          remaining_locked_bcc?: never
          total_locked_bcc?: number | null
          transferable_bcc?: number | null
          unlock_progress_percent?: never
          unlocked_bcc?: number | null
          updated_at?: string | null
          wallet_address?: string | null
        }
        Update: {
          remaining_locked_bcc?: never
          total_locked_bcc?: number | null
          transferable_bcc?: number | null
          unlock_progress_percent?: never
          unlocked_bcc?: number | null
          updated_at?: string | null
          wallet_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_balances_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "user_balances_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "user_dashboard"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "user_balances_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      user_course_progress: {
        Row: {
          activated_at: string | null
          completed_at: string | null
          completed_lessons: number | null
          course_description: string | null
          course_id: string | null
          course_title: string | null
          difficulty_level: string | null
          duration_hours: number | null
          instructor_username: string | null
          instructor_wallet: string | null
          last_activity: string | null
          price_bcc: number | null
          progress_percentage: number | null
          thumbnail_url: string | null
          total_lessons: number | null
          wallet_address: string | null
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
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "course_activations_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "course_activations_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "courses_instructor_wallet_fkey"
            columns: ["instructor_wallet"]
            isOneToOne: false
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "courses_instructor_wallet_fkey"
            columns: ["instructor_wallet"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
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
      user_dashboard: {
        Row: {
          activated_at: string | null
          activation_expires_at: string | null
          activation_status: string | null
          admin_set_pending: boolean | null
          admin_wallet: string | null
          balance_updated_at: string | null
          bcc_locked: number | null
          bcc_transferable: number | null
          current_level: number | null
          email: string | null
          has_pending_rewards: boolean | null
          is_activated: boolean | null
          last_reward_claim_at: string | null
          last_upgrade_at: string | null
          levels_owned: Json | null
          max_layer: number | null
          member_level: number | null
          pending_activation_hours: number | null
          pending_time_remaining: unknown | null
          pending_upgrade_rewards: number | null
          referrer_wallet: string | null
          rewards_claimed: number | null
          total_bcc_balance: number | null
          total_direct_referrals: number | null
          total_team_size: number | null
          total_usdt_earned: number | null
          upgrade_reminder_enabled: boolean | null
          user_created_at: string | null
          user_updated_at: string | null
          username: string | null
          wallet_address: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_users_referrer"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "fk_users_referrer"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "fk_users_referrer"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      user_nft_collection: {
        Row: {
          creator_wallet: string | null
          nft_description: string | null
          nft_id: string | null
          nft_image_url: string | null
          nft_title: string | null
          nft_type: string | null
          price_bcc: number | null
          purchased_at: string | null
          transaction_hash: string | null
          wallet_address: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nft_purchases_buyer_wallet_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "user_auth_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "nft_purchases_buyer_wallet_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "user_dashboard"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "nft_purchases_buyer_wallet_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
    }
    Functions: {
      activate_member_with_tier_rewards: {
        Args: { p_wallet_address: string }
        Returns: Json
      }
      activate_new_user: {
        Args: { p_wallet_address: string }
        Returns: Json
      }
      calculate_bcc_unlock: {
        Args: { p_nft_level: number; p_tier: number }
        Returns: number
      }
      calculate_nft_total_price: {
        Args: { p_level: number }
        Returns: number
      }
      calculate_total_nft_cost: {
        Args: { p_level: number }
        Returns: number
      }
      can_receive_layer_reward: {
        Args: { p_claim_number: number; p_layer: number; p_root_wallet: string }
        Returns: boolean
      }
      can_root_claim_layer_reward: {
        Args: {
          p_layer: number
          p_layer_1_claim_count?: number
          p_root_wallet: string
        }
        Returns: boolean
      }
      claim_pending_rewards: {
        Args: { p_wallet_address: string }
        Returns: Json
      }
      claim_reward_to_balance: {
        Args: { p_claim_id: string; p_wallet_address: string }
        Returns: Json
      }
      clear_member_activation_pending: {
        Args: {
          p_admin_wallet: string
          p_reason?: string
          p_target_wallet: string
        }
        Returns: Json
      }
      count_direct_referrals: {
        Args: { p_wallet_address: string }
        Returns: number
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
      create_layer_reward_claim: {
        Args: {
          p_layer: number
          p_nft_level: number
          p_root_wallet: string
          p_transaction_hash: string
          p_triggering_member_wallet: string
        }
        Returns: Json
      }
      create_layer_reward_claim_with_notifications: {
        Args: {
          p_layer: number
          p_nft_level: number
          p_root_wallet: string
          p_transaction_hash: string
          p_triggering_member_wallet: string
        }
        Returns: Json
      }
      create_member_with_pending: {
        Args: { p_use_pending?: boolean; p_wallet_address: string }
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
      distribute_layer_rewards: {
        Args: {
          p_amount_usdt: number
          p_nft_level: number
          p_payer_wallet: string
          p_source_transaction_id: string
        }
        Returns: Json
      }
      find_next_matrix_position: {
        Args: { p_layer: number; p_root_wallet: string }
        Returns: {
          matrix_position: string
          parent_wallet: string
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
      get_current_wallet_address: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_default_pending_hours: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_member_tier: {
        Args: { p_activation_rank: number }
        Returns: number
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
      get_pending_activations: {
        Args: { p_admin_wallet?: string }
        Returns: {
          admin_set_pending: boolean
          admin_wallet: string
          created_at: string
          expires_at: string
          pending_hours: number
          time_remaining: unknown
          username: string
          wallet_address: string
        }[]
      }
      is_activation_pending_enabled: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_valid_wallet_address: {
        Args: { address: string }
        Returns: boolean
      }
      place_member_in_matrix: {
        Args: {
          p_member_wallet: string
          p_placement_type?: string
          p_placer_wallet: string
          p_root_wallet: string
        }
        Returns: Json
      }
      process_bcc_purchase: {
        Args: { p_amount_received: number; p_order_id: string }
        Returns: Json
      }
      process_expired_rewards: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      process_nft_purchase_with_requirements: {
        Args: {
          p_nft_level: number
          p_payment_amount_usdc: number
          p_transaction_hash: string
          p_wallet_address: string
        }
        Returns: Json
      }
      process_nft_purchase_with_unlock: {
        Args: {
          p_nft_level: number
          p_payment_amount_usdc: number
          p_transaction_hash: string
          p_wallet_address: string
        }
        Returns: Json
      }
      process_referral_link: {
        Args: { p_claimer_wallet?: string; p_referral_token: string }
        Returns: Json
      }
      process_reward_system_maintenance: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      set_member_activation_pending: {
        Args: {
          p_admin_wallet: string
          p_pending_hours: number
          p_reason?: string
          p_target_wallet: string
        }
        Returns: Json
      }
      spend_bcc_tokens: {
        Args: {
          p_amount_bcc: number
          p_item_id: string
          p_item_type: string
          p_transaction_id: string
          p_wallet_address: string
        }
        Returns: Json
      }
      toggle_activation_pending_global: {
        Args: { p_admin_wallet: string; p_enabled: boolean; p_reason?: string }
        Returns: Json
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
      upsert_user: {
        Args: {
          p_email?: string
          p_referrer_wallet?: string
          p_username?: string
          p_wallet_address: string
        }
        Returns: Json
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
