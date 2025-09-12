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
            foreignKeyName: "course_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
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
            referencedRelation: "matrix_structure_view"
            referencedColumns: ["l_wallet"]
          },
          {
            foreignKeyName: "layer_rewards_matrix_root_wallet_fkey"
            columns: ["matrix_root_wallet"]
            isOneToOne: false
            referencedRelation: "matrix_structure_view"
            referencedColumns: ["m_wallet"]
          },
          {
            foreignKeyName: "layer_rewards_matrix_root_wallet_fkey"
            columns: ["matrix_root_wallet"]
            isOneToOne: false
            referencedRelation: "matrix_structure_view"
            referencedColumns: ["r_wallet"]
          },
          {
            foreignKeyName: "layer_rewards_matrix_root_wallet_fkey"
            columns: ["matrix_root_wallet"]
            isOneToOne: false
            referencedRelation: "matrix_structure_view"
            referencedColumns: ["root_wallet"]
          },
          {
            foreignKeyName: "layer_rewards_matrix_root_wallet_fkey"
            columns: ["matrix_root_wallet"]
            isOneToOne: false
            referencedRelation: "matrix_vacancy_quick"
            referencedColumns: ["root_wallet"]
          },
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
            referencedRelation: "matrix_structure_view"
            referencedColumns: ["l_wallet"]
          },
          {
            foreignKeyName: "layer_rewards_reward_recipient_wallet_fkey"
            columns: ["reward_recipient_wallet"]
            isOneToOne: false
            referencedRelation: "matrix_structure_view"
            referencedColumns: ["m_wallet"]
          },
          {
            foreignKeyName: "layer_rewards_reward_recipient_wallet_fkey"
            columns: ["reward_recipient_wallet"]
            isOneToOne: false
            referencedRelation: "matrix_structure_view"
            referencedColumns: ["r_wallet"]
          },
          {
            foreignKeyName: "layer_rewards_reward_recipient_wallet_fkey"
            columns: ["reward_recipient_wallet"]
            isOneToOne: false
            referencedRelation: "matrix_structure_view"
            referencedColumns: ["root_wallet"]
          },
          {
            foreignKeyName: "layer_rewards_reward_recipient_wallet_fkey"
            columns: ["reward_recipient_wallet"]
            isOneToOne: false
            referencedRelation: "matrix_vacancy_quick"
            referencedColumns: ["root_wallet"]
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
            referencedRelation: "matrix_structure_view"
            referencedColumns: ["l_wallet"]
          },
          {
            foreignKeyName: "layer_rewards_triggering_member_wallet_fkey"
            columns: ["triggering_member_wallet"]
            isOneToOne: false
            referencedRelation: "matrix_structure_view"
            referencedColumns: ["m_wallet"]
          },
          {
            foreignKeyName: "layer_rewards_triggering_member_wallet_fkey"
            columns: ["triggering_member_wallet"]
            isOneToOne: false
            referencedRelation: "matrix_structure_view"
            referencedColumns: ["r_wallet"]
          },
          {
            foreignKeyName: "layer_rewards_triggering_member_wallet_fkey"
            columns: ["triggering_member_wallet"]
            isOneToOne: false
            referencedRelation: "matrix_structure_view"
            referencedColumns: ["root_wallet"]
          },
          {
            foreignKeyName: "layer_rewards_triggering_member_wallet_fkey"
            columns: ["triggering_member_wallet"]
            isOneToOne: false
            referencedRelation: "matrix_vacancy_quick"
            referencedColumns: ["root_wallet"]
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
            referencedRelation: "matrix_structure_view"
            referencedColumns: ["l_wallet"]
          },
          {
            foreignKeyName: "fk_members_referrer_to_members"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "matrix_structure_view"
            referencedColumns: ["m_wallet"]
          },
          {
            foreignKeyName: "fk_members_referrer_to_members"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "matrix_structure_view"
            referencedColumns: ["r_wallet"]
          },
          {
            foreignKeyName: "fk_members_referrer_to_members"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "matrix_structure_view"
            referencedColumns: ["root_wallet"]
          },
          {
            foreignKeyName: "fk_members_referrer_to_members"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "matrix_vacancy_quick"
            referencedColumns: ["root_wallet"]
          },
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
          is_upgrade: boolean | null
          nft_level: number
          platform_activation_fee: number | null
          previous_level: number | null
          total_cost: number | null
          wallet_address: string
        }
        Insert: {
          claim_price: number
          claimed_at?: string | null
          id?: string
          is_upgrade?: boolean | null
          nft_level: number
          platform_activation_fee?: number | null
          previous_level?: number | null
          total_cost?: number | null
          wallet_address: string
        }
        Update: {
          claim_price?: number
          claimed_at?: string | null
          id?: string
          is_upgrade?: boolean | null
          nft_level?: number
          platform_activation_fee?: number | null
          previous_level?: number | null
          total_cost?: number | null
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
            referencedRelation: "matrix_structure_view"
            referencedColumns: ["l_wallet"]
          },
          {
            foreignKeyName: "fk_referrals_matrix_root_to_members"
            columns: ["matrix_root_wallet"]
            isOneToOne: false
            referencedRelation: "matrix_structure_view"
            referencedColumns: ["m_wallet"]
          },
          {
            foreignKeyName: "fk_referrals_matrix_root_to_members"
            columns: ["matrix_root_wallet"]
            isOneToOne: false
            referencedRelation: "matrix_structure_view"
            referencedColumns: ["r_wallet"]
          },
          {
            foreignKeyName: "fk_referrals_matrix_root_to_members"
            columns: ["matrix_root_wallet"]
            isOneToOne: false
            referencedRelation: "matrix_structure_view"
            referencedColumns: ["root_wallet"]
          },
          {
            foreignKeyName: "fk_referrals_matrix_root_to_members"
            columns: ["matrix_root_wallet"]
            isOneToOne: false
            referencedRelation: "matrix_vacancy_quick"
            referencedColumns: ["root_wallet"]
          },
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
            referencedRelation: "matrix_structure_view"
            referencedColumns: ["l_wallet"]
          },
          {
            foreignKeyName: "fk_referrals_member_to_members"
            columns: ["member_wallet"]
            isOneToOne: false
            referencedRelation: "matrix_structure_view"
            referencedColumns: ["m_wallet"]
          },
          {
            foreignKeyName: "fk_referrals_member_to_members"
            columns: ["member_wallet"]
            isOneToOne: false
            referencedRelation: "matrix_structure_view"
            referencedColumns: ["r_wallet"]
          },
          {
            foreignKeyName: "fk_referrals_member_to_members"
            columns: ["member_wallet"]
            isOneToOne: false
            referencedRelation: "matrix_structure_view"
            referencedColumns: ["root_wallet"]
          },
          {
            foreignKeyName: "fk_referrals_member_to_members"
            columns: ["member_wallet"]
            isOneToOne: false
            referencedRelation: "matrix_vacancy_quick"
            referencedColumns: ["root_wallet"]
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
            referencedRelation: "matrix_structure_view"
            referencedColumns: ["l_wallet"]
          },
          {
            foreignKeyName: "fk_referrals_referrer_to_members"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "matrix_structure_view"
            referencedColumns: ["m_wallet"]
          },
          {
            foreignKeyName: "fk_referrals_referrer_to_members"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "matrix_structure_view"
            referencedColumns: ["r_wallet"]
          },
          {
            foreignKeyName: "fk_referrals_referrer_to_members"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "matrix_structure_view"
            referencedColumns: ["root_wallet"]
          },
          {
            foreignKeyName: "fk_referrals_referrer_to_members"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "matrix_vacancy_quick"
            referencedColumns: ["root_wallet"]
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
            referencedRelation: "matrix_structure_view"
            referencedColumns: ["l_wallet"]
          },
          {
            foreignKeyName: "roll_up_rewards_final_recipient_fkey"
            columns: ["final_recipient"]
            isOneToOne: false
            referencedRelation: "matrix_structure_view"
            referencedColumns: ["m_wallet"]
          },
          {
            foreignKeyName: "roll_up_rewards_final_recipient_fkey"
            columns: ["final_recipient"]
            isOneToOne: false
            referencedRelation: "matrix_structure_view"
            referencedColumns: ["r_wallet"]
          },
          {
            foreignKeyName: "roll_up_rewards_final_recipient_fkey"
            columns: ["final_recipient"]
            isOneToOne: false
            referencedRelation: "matrix_structure_view"
            referencedColumns: ["root_wallet"]
          },
          {
            foreignKeyName: "roll_up_rewards_final_recipient_fkey"
            columns: ["final_recipient"]
            isOneToOne: false
            referencedRelation: "matrix_vacancy_quick"
            referencedColumns: ["root_wallet"]
          },
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
            referencedRelation: "matrix_structure_view"
            referencedColumns: ["l_wallet"]
          },
          {
            foreignKeyName: "roll_up_rewards_original_recipient_fkey"
            columns: ["original_recipient"]
            isOneToOne: false
            referencedRelation: "matrix_structure_view"
            referencedColumns: ["m_wallet"]
          },
          {
            foreignKeyName: "roll_up_rewards_original_recipient_fkey"
            columns: ["original_recipient"]
            isOneToOne: false
            referencedRelation: "matrix_structure_view"
            referencedColumns: ["r_wallet"]
          },
          {
            foreignKeyName: "roll_up_rewards_original_recipient_fkey"
            columns: ["original_recipient"]
            isOneToOne: false
            referencedRelation: "matrix_structure_view"
            referencedColumns: ["root_wallet"]
          },
          {
            foreignKeyName: "roll_up_rewards_original_recipient_fkey"
            columns: ["original_recipient"]
            isOneToOne: false
            referencedRelation: "matrix_vacancy_quick"
            referencedColumns: ["root_wallet"]
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
            referencedRelation: "matrix_structure_view"
            referencedColumns: ["l_wallet"]
          },
          {
            foreignKeyName: "fk_user_balances_wallet_to_members"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "matrix_structure_view"
            referencedColumns: ["m_wallet"]
          },
          {
            foreignKeyName: "fk_user_balances_wallet_to_members"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "matrix_structure_view"
            referencedColumns: ["r_wallet"]
          },
          {
            foreignKeyName: "fk_user_balances_wallet_to_members"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "matrix_structure_view"
            referencedColumns: ["root_wallet"]
          },
          {
            foreignKeyName: "fk_user_balances_wallet_to_members"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "matrix_vacancy_quick"
            referencedColumns: ["root_wallet"]
          },
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
          role: string
          updated_at: string | null
          username: string | null
          wallet_address: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          role?: string
          updated_at?: string | null
          username?: string | null
          wallet_address: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
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
      matrix_structure_view: {
        Row: {
          l_activation_sequence: number | null
          l_level: number | null
          l_username: string | null
          l_wallet: string | null
          m_activation_sequence: number | null
          m_level: number | null
          m_username: string | null
          m_wallet: string | null
          next_vacant_position: string | null
          positions_filled: number | null
          r_activation_sequence: number | null
          r_level: number | null
          r_username: string | null
          r_wallet: string | null
          root_activation_sequence: number | null
          root_level: number | null
          root_username: string | null
          root_wallet: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_members_wallet_to_users"
            columns: ["root_wallet"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "fk_members_wallet_to_users"
            columns: ["l_wallet"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "fk_members_wallet_to_users"
            columns: ["m_wallet"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "fk_members_wallet_to_users"
            columns: ["r_wallet"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      matrix_vacancy_quick: {
        Row: {
          css_class: string | null
          is_direct_referral: boolean | null
          is_spillover_placement: boolean | null
          matrix_layer: number | null
          matrix_position: string | null
          occupant_activation_sequence: number | null
          occupant_level: number | null
          occupant_username: string | null
          placement_type: string | null
          position_index: number | null
          root_activation_sequence: number | null
          root_username: string | null
          root_wallet: string | null
          sort_order: number | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_members_wallet_to_users"
            columns: ["root_wallet"]
            isOneToOne: true
            referencedRelation: "users"
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
            referencedRelation: "matrix_structure_view"
            referencedColumns: ["l_wallet"]
          },
          {
            foreignKeyName: "fk_members_referrer_to_members"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "matrix_structure_view"
            referencedColumns: ["m_wallet"]
          },
          {
            foreignKeyName: "fk_members_referrer_to_members"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "matrix_structure_view"
            referencedColumns: ["r_wallet"]
          },
          {
            foreignKeyName: "fk_members_referrer_to_members"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "matrix_structure_view"
            referencedColumns: ["root_wallet"]
          },
          {
            foreignKeyName: "fk_members_referrer_to_members"
            columns: ["referrer_wallet"]
            isOneToOne: false
            referencedRelation: "matrix_vacancy_quick"
            referencedColumns: ["root_wallet"]
          },
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
    }
    Functions: {
      activate_nft_level1_membership: {
        Args: {
          p_referrer_wallet?: string
          p_transaction_hash?: string
          p_wallet_address: string
        }
        Returns: Json
      }
      adjust_matrix_positions: {
        Args: Record<PropertyKey, never>
        Returns: {
          adjustments_made: number
          final_balance: string
          summary: string
        }[]
      }
      apply_layer1_r_position_rule: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      build_recursive_referrals: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      calculate_3x3_spillover_placement: {
        Args: { p_member_sequence: number }
        Returns: Json
      }
      calculate_bcc_release_amount: {
        Args: { p_from_level: number; p_to_level: number }
        Returns: number
      }
      calculate_correct_layer_rewards: {
        Args: { p_new_member_wallet: string; p_nft_level: number }
        Returns: Json
      }
      calculate_layer_based_matrix_rewards: {
        Args: { p_member_new_level: number; p_member_wallet: string }
        Returns: {
          matrix_root: string
          member_layer: number
          member_position: string
          reward_amount: number
          reward_eligible: boolean
          reward_reason: string
          reward_status: string
          root_current_level: number
          root_name: string
        }[]
      }
      calculate_layer_rewards_3x3: {
        Args: { p_new_member_wallet: string; p_nft_level: number }
        Returns: Json
      }
      calculate_layer_rewards_3x3_enhanced: {
        Args: { p_new_member_wallet: string; p_nft_level: number }
        Returns: Json
      }
      calculate_level_bcc_unlock: {
        Args: { p_level: number; p_tier?: number }
        Returns: number
      }
      calculate_matrix_rewards: {
        Args:
          | {
              p_matrix_root: string
              p_new_member_level: number
              p_new_member_wallet: string
            }
          | { p_matrix_root: string; p_new_member_wallet: string }
        Returns: {
          is_pending: boolean
          pending_reason: string
          recipient_name: string
          reward_amount: number
          reward_layer: number
          reward_recipient: string
          reward_type: string
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
      check_all_pending_r_rewards: {
        Args: Record<PropertyKey, never>
        Returns: {
          approved_count: number
          checked_count: number
          still_pending: number
        }[]
      }
      check_and_convert_r_rewards: {
        Args: { p_wallet_address: string }
        Returns: number
      }
      check_layer_reward_qualification: {
        Args: { p_layer_number: number; p_matrix_root_wallet: string }
        Returns: {
          current_level: number
          direct_referrals_count: number
          qualification_details: string
          qualified: boolean
          required_direct_referrals: number
          required_level: number
        }[]
      }
      check_r_position_qualification: {
        Args: { timer_uuid: string }
        Returns: string
      }
      check_withdrawal_limits: {
        Args: { p_amount_usd: number; p_user_wallet: string }
        Returns: Json
      }
      claim_layer_reward: {
        Args: { p_member_wallet: string; p_reward_id: string }
        Returns: Json
      }
      claim_nft_and_trigger_rewards: {
        Args: { nft_level: number; nft_price: number; user_wallet: string }
        Returns: string
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
      create_notification: {
        Args: {
          p_category?: string
          p_message: string
          p_metadata?: Json
          p_priority?: number
          p_title: string
          p_type?: string
          p_wallet_address: string
        }
        Returns: string
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
      find_member_simple: {
        Args: { p_identifier: string }
        Returns: Json
      }
      find_next_lmr_position: {
        Args: { p_matrix_owner: string }
        Returns: {
          layer: number
          position: string
        }[]
      }
      find_next_qualified_upline: {
        Args: { member_wallet: string; required_level: number }
        Returns: string
      }
      fix_lmr_positions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      fix_matrix_parent_structure: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      fix_rewards_matrix_consistency: {
        Args: Record<PropertyKey, never>
        Returns: {
          consistency_check: string
          records_created: number
          summary: string
        }[]
      }
      fix_spillover_recursive_by_placement: {
        Args: Record<PropertyKey, never>
        Returns: {
          max_layer_depth: number
          summary: string
          total_recursive_records: number
        }[]
      }
      generate_19_layer_matrix: {
        Args: Record<PropertyKey, never>
        Returns: {
          layers_completed: number
          summary: string
          total_members: number
          total_records_created: number
        }[]
      }
      generate_complete_19_layer_matrix: {
        Args: Record<PropertyKey, never>
        Returns: {
          max_layer_reached: number
          summary: string
          total_matrix_records: number
          total_members: number
        }[]
      }
      generate_complete_recursive_matrix: {
        Args: Record<PropertyKey, never>
        Returns: {
          processing_summary: string
          total_matrix_records: number
          total_members: number
        }[]
      }
      generate_correct_referrals: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_full_recursive_matrix: {
        Args: Record<PropertyKey, never>
        Returns: {
          max_depth: number
          summary: string
          total_members: number
          total_records_created: number
        }[]
      }
      generate_recursive_matrix_from_layer1: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_recursive_matrix_records: {
        Args: Record<PropertyKey, never>
        Returns: string
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
      get_bcc_release_history: {
        Args: { p_limit?: number; p_wallet_address: string }
        Returns: {
          bcc_released: number
          bcc_remaining_locked: number
          from_level: number
          release_date: string
          release_reason: string
          to_level: number
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
      get_matrix_activities: {
        Args: {
          p_activity_type?: string
          p_limit?: number
          p_wallet_address?: string
        }
        Returns: {
          activity_description: string
          activity_type: string
          bcc_amount: number
          created_at: string
          id: string
          matrix_layer: number
          matrix_position: string
          matrix_root: string
          member_name: string
          metadata: Json
          new_level: number
          old_level: number
          reward_amount: number
          wallet_address: string
        }[]
      }
      get_matrix_layer_stats: {
        Args: { p_matrix_root: string }
        Returns: {
          current_count: number
          fill_percentage: number
          l_count: number
          layer_num: number
          m_count: number
          max_capacity: number
          r_count: number
        }[]
      }
      get_member_layer1_details: {
        Args: { target_wallet: string }
        Returns: {
          layer1_member_level: number
          layer1_member_username: string
          layer1_member_wallet: string
          potential_rewards_usdc: number
          spillover_count: number
          spillover_members: string
        }[]
      }
      get_member_matrix_data: {
        Args: { p_identifier: string }
        Returns: Json
      }
      get_member_matrix_positions: {
        Args: { p_member_wallet: string }
        Returns: {
          matrix_root: string
          member_layer: number
          member_position: string
          potential_reward: number
          reward_eligible_for_layer: boolean
          root_level: number
          root_name: string
        }[]
      }
      get_member_spillover_position: {
        Args: { p_matrix_root: string; p_member_wallet: string }
        Returns: {
          layer_num: number
          original_layer_num: number
          position_char: string
          was_spillover: boolean
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
      get_nft_price: {
        Args: { level_num: number }
        Returns: number
      }
      get_server_wallet_summary: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_user_notifications: {
        Args: { p_limit?: number; p_wallet_address: string }
        Returns: {
          category: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json
          notification_type: string
          priority: number
          title: string
        }[]
      }
      get_wallet_by_activation_id: {
        Args: { target_activation_id: number }
        Returns: {
          当前等级: number
          推荐类型: string
          激活序号: number
          钱包地址: string
        }[]
      }
      implement_spillover_placement: {
        Args: Record<PropertyKey, never>
        Returns: {
          spillover_details: string
          summary: string
          total_placements: number
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
      is_member_activated: {
        Args: { p_wallet_address: string }
        Returns: boolean
      }
      is_valid_wallet_address: {
        Args: { address: string }
        Returns: boolean
      }
      log_matrix_activity: {
        Args: {
          p_activity_type: string
          p_bcc_amount?: number
          p_description: string
          p_matrix_layer?: number
          p_matrix_position?: string
          p_matrix_root?: string
          p_metadata?: Json
          p_new_level?: number
          p_old_level?: number
          p_reward_amount?: number
          p_wallet_address: string
        }
        Returns: string
      }
      migrate_to_v2_schema: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      notify_bcc_release: {
        Args: {
          p_bcc_released: number
          p_from_level: number
          p_to_level: number
          p_wallet_address: string
        }
        Returns: string
      }
      notify_matrix_reward: {
        Args: {
          p_is_pending?: boolean
          p_layer: number
          p_recipient_wallet: string
          p_reward_amount: number
          p_triggered_by: string
        }
        Returns: string
      }
      place_by_activation_sequence: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      place_member_in_matrices: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      place_member_in_matrix: {
        Args: { member_wallet: string }
        Returns: string
      }
      place_members_by_activation_sequence: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      place_members_with_correct_lmr_order: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      place_members_with_correct_priority: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      place_members_with_correct_spillover: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      place_members_with_spillover: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      process_bcc_purchase: {
        Args: { p_amount_received: number; p_order_id: string }
        Returns: Json
      }
      process_expired_reward_countdowns: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
      process_matrix_placement: {
        Args: { p_wallet_address: string }
        Returns: Json
      }
      process_member_level_upgrade: {
        Args: { p_new_level: number; p_wallet_address: string }
        Returns: {
          bcc_released: number
          bcc_remaining_locked: number
          matrix_rewards_triggered: boolean
          upgrade_message: string
          upgrade_success: boolean
        }[]
      }
      process_member_level_upgrade_with_logs: {
        Args: { p_new_level: number; p_wallet_address: string }
        Returns: {
          activity_logs_created: number
          bcc_released: number
          bcc_remaining_locked: number
          notifications_created: number
          upgrade_message: string
          upgrade_success: boolean
        }[]
      }
      process_member_level_upgrade_with_notifications: {
        Args: { p_new_level: number; p_wallet_address: string }
        Returns: {
          bcc_released: number
          bcc_remaining_locked: number
          notifications_created: number
          upgrade_message: string
          upgrade_success: boolean
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
      process_membership_purchase: {
        Args: {
          p_claim_price: number
          p_nft_level: number
          p_transaction_hash: string
          p_wallet_address: string
        }
        Returns: Json
      }
      process_membership_rewards: {
        Args: { p_membership_id: string }
        Returns: Json
      }
      process_nft_purchase_rewards: {
        Args: { p_member_wallet: string; p_purchased_level: number }
        Returns: {
          available_rewards: number
          matrix_rewards_triggered: number
          member_bcc_released: number
          member_bcc_remaining: number
          message: string
          pending_rewards: number
          success: boolean
          total_reward_amount: number
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
      process_user_registration: {
        Args: {
          p_referrer_wallet?: string
          p_username: string
          p_wallet_address: string
        }
        Returns: Json
      }
      rebuild_matrix_with_correct_referral_logic: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      rebuild_referrals_with_spillover: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      record_direct_referrals: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      record_direct_referrals_fixed: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      release_bcc_on_level_up: {
        Args: { p_new_level: number; p_wallet_address: string }
        Returns: {
          bcc_released: number
          bcc_remaining_locked: number
          message: string
          success: boolean
        }[]
      }
      run_scheduled_cleanup: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      safe_round: {
        Args: { places: number; val: number }
        Returns: number
      }
      show_layer1_position_distribution: {
        Args: Record<PropertyKey, never>
        Returns: {
          balance_status: string
          left_count: number
          matrix_root: string
          middle_count: number
          right_count: number
          total_layer1: number
        }[]
      }
      simulate_layer2_activation: {
        Args: { member_wallet: string }
        Returns: {
          activation_scenario: string
          reward_amount_usdc: number
          reward_recipient: string
        }[]
      }
      sync_spillover_matrix: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      test_table_access: {
        Args: {
          operation: string
          table_name: string
          test_description: string
        }
        Returns: string
      }
      toggle_activation_pending_global: {
        Args: { p_admin_wallet: string; p_enabled: boolean; p_reason?: string }
        Returns: Json
      }
      trigger_activation_rewards: {
        Args: { activated_member: string; activation_level?: number }
        Returns: string
      }
      trigger_layer_rewards_19layer: {
        Args: { p_member_wallet: string; p_nft_level: number }
        Returns: string
      }
      trigger_layer_rewards_for_nft_claim: {
        Args: { claiming_member_wallet: string; new_nft_level: number }
        Returns: undefined
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
      trigger_layer1_right_reward: {
        Args: { p_matrix_root: string; p_new_member_wallet: string }
        Returns: undefined
      }
      trigger_matrix_rewards_on_join: {
        Args: { p_new_member_wallet: string }
        Returns: undefined
      }
      trigger_matrix_rewards_on_level_up: {
        Args: { p_member_wallet: string; p_new_level: number }
        Returns: undefined
      }
      trigger_member_upgrade_rewards: {
        Args: { new_level?: number; upgraded_member: string }
        Returns: {
          immediate_rewards: number
          pending_rewards: number
          summary: string
          timers_created: number
          total_rewards: number
        }[]
      }
      unlock_bcc_for_nft_level: {
        Args: { p_nft_level: number; p_wallet_address: string }
        Returns: Json
      }
      update_matrix_layer_summary: {
        Args: { p_layer: number; p_root_wallet: string }
        Returns: undefined
      }
      update_member_balance: {
        Args: {
          p_amount: number
          p_description: string
          p_transaction_type: string
          p_wallet_address: string
        }
        Returns: Json
      }
      update_member_requirements: {
        Args: { p_wallet_address: string }
        Returns: undefined
      }
      update_reward_status_by_timer: {
        Args: Record<PropertyKey, never>
        Returns: number
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
      upgrade_member_nft_level: {
        Args: { member_wallet: string; new_level: number }
        Returns: {
          reward_amount_usdt: number
          reward_recipient: string
          reward_status: string
        }[]
      }
      upgrade_member_to_next_level: {
        Args: { p_wallet_address: string }
        Returns: {
          bcc_released: number
          new_level: number
          old_level: number
          upgrade_message: string
          upgrade_success: boolean
        }[]
      }
      v2_place_members_in_matrix: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      validate_wallet_signature: {
        Args: {
          p_message: string
          p_signature: string
          p_wallet_address: string
        }
        Returns: boolean
      }
      verify_and_distribute_layer_rewards: {
        Args: { triggered_nft_level: number; triggering_member: string }
        Returns: string
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
