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
  cron: {
    Tables: {
      job: {
        Row: {
          active: boolean
          command: string
          database: string
          jobid: number
          jobname: string | null
          nodename: string
          nodeport: number
          schedule: string
          username: string
        }
        Insert: {
          active?: boolean
          command: string
          database?: string
          jobid?: number
          jobname?: string | null
          nodename?: string
          nodeport?: number
          schedule: string
          username?: string
        }
        Update: {
          active?: boolean
          command?: string
          database?: string
          jobid?: number
          jobname?: string | null
          nodename?: string
          nodeport?: number
          schedule?: string
          username?: string
        }
        Relationships: []
      }
      job_run_details: {
        Row: {
          command: string | null
          database: string | null
          end_time: string | null
          job_pid: number | null
          jobid: number | null
          return_message: string | null
          runid: number
          start_time: string | null
          status: string | null
          username: string | null
        }
        Insert: {
          command?: string | null
          database?: string | null
          end_time?: string | null
          job_pid?: number | null
          jobid?: number | null
          return_message?: string | null
          runid?: number
          start_time?: string | null
          status?: string | null
          username?: string | null
        }
        Update: {
          command?: string | null
          database?: string | null
          end_time?: string | null
          job_pid?: number | null
          jobid?: number | null
          return_message?: string | null
          runid?: number
          start_time?: string | null
          status?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      alter_job: {
        Args: {
          active?: boolean
          command?: string
          database?: string
          job_id: number
          schedule?: string
          username?: string
        }
        Returns: undefined
      }
      schedule: {
        Args:
          | { command: string; job_name: string; schedule: string }
          | { command: string; schedule: string }
        Returns: number
      }
      schedule_in_database: {
        Args: {
          active?: boolean
          command: string
          database: string
          job_name: string
          schedule: string
          username?: string
        }
        Returns: number
      }
      unschedule: {
        Args: { job_id: number } | { job_name: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  drizzle: {
    Tables: {
      __drizzle_migrations: {
        Row: {
          created_at: number | null
          hash: string
          id: number
        }
        Insert: {
          created_at?: number | null
          hash: string
          id?: number
        }
        Update: {
          created_at?: number | null
          hash?: string
          id?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  graphql: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _internal_resolve: {
        Args: {
          extensions?: Json
          operationName?: string
          query: string
          variables?: Json
        }
        Returns: Json
      }
      comment_directive: {
        Args: { comment_: string }
        Returns: Json
      }
      exception: {
        Args: { message: string }
        Returns: string
      }
      get_schema_version: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      resolve: {
        Args: {
          extensions?: Json
          operationName?: string
          query: string
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
      admin_sessions: {
        Row: {
          admin_id: string
          created_at: string
          expires_at: string
          id: string
          ip_address: string | null
          session_token: string
          user_agent: string | null
        }
        Insert: {
          admin_id: string
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: string | null
          session_token: string
          user_agent?: string | null
        }
        Update: {
          admin_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          session_token?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_sessions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_settings: {
        Row: {
          description: string | null
          setting_key: string
          setting_value: string
          updated_at: string
        }
        Insert: {
          description?: string | null
          setting_key: string
          setting_value: string
          updated_at?: string
        }
        Update: {
          description?: string | null
          setting_key?: string
          setting_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          email: string
          full_name: string | null
          id: string
          last_login_at: string | null
          notes: string | null
          password_hash: string
          permissions: string[] | null
          role: string
          status: string
          two_factor_enabled: boolean
          two_factor_secret: string | null
          updated_at: string
          username: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          email: string
          full_name?: string | null
          id?: string
          last_login_at?: string | null
          notes?: string | null
          password_hash: string
          permissions?: string[] | null
          role?: string
          status?: string
          two_factor_enabled?: boolean
          two_factor_secret?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          email?: string
          full_name?: string | null
          id?: string
          last_login_at?: string | null
          notes?: string | null
          password_hash?: string
          permissions?: string[] | null
          role?: string
          status?: string
          two_factor_enabled?: boolean
          two_factor_secret?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          description: string
          id: string
          ip_address: string | null
          module: string
          new_values: Json | null
          old_values: Json | null
          severity: string
          target_id: string | null
          target_type: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          description: string
          id?: string
          ip_address?: string | null
          module: string
          new_values?: Json | null
          old_values?: Json | null
          severity?: string
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          description?: string
          id?: string
          ip_address?: string | null
          module?: string
          new_values?: Json | null
          old_values?: Json | null
          severity?: string
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      bcc_global_pool: {
        Row: {
          current_tier: number
          id: number
          last_updated: string
          tier1_activations: number
          tier2_activations: number
          tier3_activations: number
          tier4_activations: number
          total_bcc_locked: number
          total_members_activated: number
        }
        Insert: {
          current_tier?: number
          id?: number
          last_updated?: string
          tier1_activations?: number
          tier2_activations?: number
          tier3_activations?: number
          tier4_activations?: number
          total_bcc_locked?: number
          total_members_activated?: number
        }
        Update: {
          current_tier?: number
          id?: number
          last_updated?: string
          tier1_activations?: number
          tier2_activations?: number
          tier3_activations?: number
          tier4_activations?: number
          total_bcc_locked?: number
          total_members_activated?: number
        }
        Relationships: []
      }
      bcc_staking_tiers: {
        Row: {
          completed_at: string | null
          created_at: string
          current_activations: number
          max_activations: number
          phase: string
          started_at: string | null
          tier_id: number
          tier_name: string
          total_lock_multiplier: number
          total_locked_bcc: number
          unlock_multiplier: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_activations?: number
          max_activations: number
          phase: string
          started_at?: string | null
          tier_id: number
          tier_name: string
          total_lock_multiplier?: number
          total_locked_bcc?: number
          unlock_multiplier?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_activations?: number
          max_activations?: number
          phase?: string
          started_at?: string | null
          tier_id?: number
          tier_name?: string
          total_lock_multiplier?: number
          total_locked_bcc?: number
          unlock_multiplier?: number
        }
        Relationships: []
      }
      bcc_unlock_history: {
        Row: {
          id: string
          unlock_amount: number
          unlock_level: number
          unlock_tier: string
          unlocked_at: string
          wallet_address: string
        }
        Insert: {
          id?: string
          unlock_amount: number
          unlock_level: number
          unlock_tier: string
          unlocked_at?: string
          wallet_address: string
        }
        Update: {
          id?: string
          unlock_amount?: number
          unlock_level?: number
          unlock_tier?: string
          unlocked_at?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "bcc_unlock_history_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "available_placement_positions"
            referencedColumns: ["root_wallet"]
          },
          {
            foreignKeyName: "bcc_unlock_history_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "user_direct_referral_counts"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "bcc_unlock_history_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      course_activations: {
        Row: {
          actual_paid_bcc: number
          bcc_discount_price: number
          bcc_original_price: number
          completed: boolean
          completed_lessons: Json
          course_activated_at: string
          course_category: string
          course_id: string
          created_at: string
          id: string
          last_lesson_unlocked_at: string | null
          last_progress_update: string
          overall_progress: number
          total_lessons: number
          unlocked_lessons: Json
          updated_at: string
          wallet_address: string
          zoom_nickname: string | null
        }
        Insert: {
          actual_paid_bcc: number
          bcc_discount_price?: number
          bcc_original_price: number
          completed?: boolean
          completed_lessons?: Json
          course_activated_at?: string
          course_category: string
          course_id: string
          created_at?: string
          id?: string
          last_lesson_unlocked_at?: string | null
          last_progress_update?: string
          overall_progress?: number
          total_lessons?: number
          unlocked_lessons?: Json
          updated_at?: string
          wallet_address: string
          zoom_nickname?: string | null
        }
        Update: {
          actual_paid_bcc?: number
          bcc_discount_price?: number
          bcc_original_price?: number
          completed?: boolean
          completed_lessons?: Json
          course_activated_at?: string
          course_category?: string
          course_id?: string
          created_at?: string
          id?: string
          last_lesson_unlocked_at?: string | null
          last_progress_update?: string
          overall_progress?: number
          total_lessons?: number
          unlocked_lessons?: Json
          updated_at?: string
          wallet_address?: string
          zoom_nickname?: string | null
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
            foreignKeyName: "course_activations_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "available_placement_positions"
            referencedColumns: ["root_wallet"]
          },
          {
            foreignKeyName: "course_activations_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "user_direct_referral_counts"
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
          course_id: string
          created_at: string
          description: string
          duration: string
          id: string
          is_free: boolean
          lesson_order: number
          price_bcc: number
          title: string
          video_url: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description: string
          duration: string
          id?: string
          is_free?: boolean
          lesson_order: number
          price_bcc?: number
          title: string
          video_url: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string
          duration?: string
          id?: string
          is_free?: boolean
          lesson_order?: number
          price_bcc?: number
          title?: string
          video_url?: string
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
      courses: {
        Row: {
          course_type: string
          created_at: string
          description: string
          download_link: string | null
          duration: string
          id: string
          is_free: boolean
          price_bcc: number
          required_level: number
          title: string
          video_url: string | null
          zoom_link: string | null
          zoom_meeting_id: string | null
          zoom_password: string | null
        }
        Insert: {
          course_type?: string
          created_at?: string
          description: string
          download_link?: string | null
          duration: string
          id?: string
          is_free?: boolean
          price_bcc?: number
          required_level?: number
          title: string
          video_url?: string | null
          zoom_link?: string | null
          zoom_meeting_id?: string | null
          zoom_password?: string | null
        }
        Update: {
          course_type?: string
          created_at?: string
          description?: string
          download_link?: string | null
          duration?: string
          id?: string
          is_free?: boolean
          price_bcc?: number
          required_level?: number
          title?: string
          video_url?: string | null
          zoom_link?: string | null
          zoom_meeting_id?: string | null
          zoom_password?: string | null
        }
        Relationships: []
      }
      level_config: {
        Row: {
          activation_fee_usdt: number
          can_earn_commissions: boolean
          created_at: string
          direct_referrers_required: number
          layer_level: number
          level: number
          level_name: string
          max_active_positions: number
          max_referral_depth: number
          nft_price: number
          platform_fee: number
          price_usdt: number
          reward_requires_level_match: boolean
          reward_usdt: number
          tier_1_release: number
          tier_2_release: number
          tier_3_release: number
          tier_4_release: number
          token_id: number
          total_activated_seats: number
          total_price: number
          total_price_usdt: number
          upgrade_countdown_hours: number
        }
        Insert: {
          activation_fee_usdt: number
          can_earn_commissions?: boolean
          created_at?: string
          direct_referrers_required?: number
          layer_level: number
          level: number
          level_name: string
          max_active_positions?: number
          max_referral_depth?: number
          nft_price: number
          platform_fee: number
          price_usdt: number
          reward_requires_level_match?: boolean
          reward_usdt: number
          tier_1_release: number
          tier_2_release: number
          tier_3_release: number
          tier_4_release: number
          token_id: number
          total_activated_seats: number
          total_price: number
          total_price_usdt: number
          upgrade_countdown_hours?: number
        }
        Update: {
          activation_fee_usdt?: number
          can_earn_commissions?: boolean
          created_at?: string
          direct_referrers_required?: number
          layer_level?: number
          level?: number
          level_name?: string
          max_active_positions?: number
          max_referral_depth?: number
          nft_price?: number
          platform_fee?: number
          price_usdt?: number
          reward_requires_level_match?: boolean
          reward_usdt?: number
          tier_1_release?: number
          tier_2_release?: number
          tier_3_release?: number
          tier_4_release?: number
          token_id?: number
          total_activated_seats?: number
          total_price?: number
          total_price_usdt?: number
          upgrade_countdown_hours?: number
        }
        Relationships: []
      }
      matrix_activity_log: {
        Row: {
          action_type: string
          created_at: string | null
          details: Json | null
          id: string
          layer: number | null
          member_wallet: string
          placement_type: string | null
          position_slot: string | null
          root_wallet: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          details?: Json | null
          id?: string
          layer?: number | null
          member_wallet: string
          placement_type?: string | null
          position_slot?: string | null
          root_wallet: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          layer?: number | null
          member_wallet?: string
          placement_type?: string | null
          position_slot?: string | null
          root_wallet?: string
        }
        Relationships: []
      }
      member_activations: {
        Row: {
          activated_at: string | null
          activation_type: string
          created_at: string
          is_pending: boolean
          level: number
          pending_timeout_hours: number
          pending_until: string | null
          wallet_address: string
        }
        Insert: {
          activated_at?: string | null
          activation_type: string
          created_at?: string
          is_pending?: boolean
          level: number
          pending_timeout_hours?: number
          pending_until?: string | null
          wallet_address: string
        }
        Update: {
          activated_at?: string | null
          activation_type?: string
          created_at?: string
          is_pending?: boolean
          level?: number
          pending_timeout_hours?: number
          pending_until?: string | null
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_activations_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "available_placement_positions"
            referencedColumns: ["root_wallet"]
          },
          {
            foreignKeyName: "member_activations_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "user_direct_referral_counts"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "member_activations_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      member_nft_verification: {
        Row: {
          chain: string
          created_at: string
          last_verified: string | null
          member_level: number
          network_type: string
          nft_contract_address: string
          token_id: number
          verification_status: Database["public"]["Enums"]["nft_status_enum"]
          verified_at: string | null
          wallet_address: string
        }
        Insert: {
          chain: string
          created_at?: string
          last_verified?: string | null
          member_level: number
          network_type: string
          nft_contract_address: string
          token_id: number
          verification_status?: Database["public"]["Enums"]["nft_status_enum"]
          verified_at?: string | null
          wallet_address: string
        }
        Update: {
          chain?: string
          created_at?: string
          last_verified?: string | null
          member_level?: number
          network_type?: string
          nft_contract_address?: string
          token_id?: number
          verification_status?: Database["public"]["Enums"]["nft_status_enum"]
          verified_at?: string | null
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_nft_verification_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "available_placement_positions"
            referencedColumns: ["root_wallet"]
          },
          {
            foreignKeyName: "member_nft_verification_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "user_direct_referral_counts"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "member_nft_verification_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      member_rewards: {
        Row: {
          amount: string
          created_at: string | null
          id: string
          layer: number | null
          level: number
          metadata: Json | null
          paid_at: string | null
          payer_wallet: string
          pending_until: string | null
          position_type: string | null
          recipient_wallet: string
          reward_type: string
          root_wallet: string | null
          status: string | null
          trigger_event: string | null
          updated_at: string | null
        }
        Insert: {
          amount: string
          created_at?: string | null
          id?: string
          layer?: number | null
          level: number
          metadata?: Json | null
          paid_at?: string | null
          payer_wallet: string
          pending_until?: string | null
          position_type?: string | null
          recipient_wallet: string
          reward_type: string
          root_wallet?: string | null
          status?: string | null
          trigger_event?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: string
          created_at?: string | null
          id?: string
          layer?: number | null
          level?: number
          metadata?: Json | null
          paid_at?: string | null
          payer_wallet?: string
          pending_until?: string | null
          position_type?: string | null
          recipient_wallet?: string
          reward_type?: string
          root_wallet?: string | null
          status?: string | null
          trigger_event?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      member_upgrade_pending: {
        Row: {
          countdown_expires_at: string
          created_at: string
          current_level: number
          direct_referrers_count: number
          direct_referrers_required: number
          id: string
          payment_tx_hash: string | null
          status: string
          target_level: number
          updated_at: string
          upgrade_fee_paid: number
          wallet_address: string
        }
        Insert: {
          countdown_expires_at: string
          created_at?: string
          current_level: number
          direct_referrers_count?: number
          direct_referrers_required?: number
          id?: string
          payment_tx_hash?: string | null
          status?: string
          target_level: number
          updated_at?: string
          upgrade_fee_paid: number
          wallet_address: string
        }
        Update: {
          countdown_expires_at?: string
          created_at?: string
          current_level?: number
          direct_referrers_count?: number
          direct_referrers_required?: number
          id?: string
          payment_tx_hash?: string | null
          status?: string
          target_level?: number
          updated_at?: string
          upgrade_fee_paid?: number
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_upgrade_pending_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "available_placement_positions"
            referencedColumns: ["root_wallet"]
          },
          {
            foreignKeyName: "member_upgrade_pending_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "user_direct_referral_counts"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "member_upgrade_pending_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      members: {
        Row: {
          activated_at: string | null
          created_at: string
          current_level: number
          has_pending_rewards: boolean
          is_activated: boolean
          last_reward_claim_at: string | null
          last_upgrade_at: string | null
          levels_owned: Json
          max_layer: number
          total_direct_referrals: number
          total_team_size: number
          updated_at: string
          upgrade_reminder_enabled: boolean
          wallet_address: string
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          current_level?: number
          has_pending_rewards?: boolean
          is_activated?: boolean
          last_reward_claim_at?: string | null
          last_upgrade_at?: string | null
          levels_owned?: Json
          max_layer?: number
          total_direct_referrals?: number
          total_team_size?: number
          updated_at?: string
          upgrade_reminder_enabled?: boolean
          wallet_address: string
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          current_level?: number
          has_pending_rewards?: boolean
          is_activated?: boolean
          last_reward_claim_at?: string | null
          last_upgrade_at?: string | null
          levels_owned?: Json
          max_layer?: number
          total_direct_referrals?: number
          total_team_size?: number
          updated_at?: string
          upgrade_reminder_enabled?: boolean
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "available_placement_positions"
            referencedColumns: ["root_wallet"]
          },
          {
            foreignKeyName: "members_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "user_direct_referral_counts"
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
      merchant_nft_claims: {
        Row: {
          amount_bcc: number
          bucket_used: string
          created_at: string
          id: string
          nft_id: string
          tx_hash: string | null
          wallet_address: string
        }
        Insert: {
          amount_bcc: number
          bucket_used: string
          created_at?: string
          id?: string
          nft_id: string
          tx_hash?: string | null
          wallet_address: string
        }
        Update: {
          amount_bcc?: number
          bucket_used?: string
          created_at?: string
          id?: string
          nft_id?: string
          tx_hash?: string | null
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_nft_claims_nft_id_fkey"
            columns: ["nft_id"]
            isOneToOne: false
            referencedRelation: "merchant_nfts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_nft_claims_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "available_placement_positions"
            referencedColumns: ["root_wallet"]
          },
          {
            foreignKeyName: "merchant_nft_claims_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "user_direct_referral_counts"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "merchant_nft_claims_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      merchant_nfts: {
        Row: {
          active: boolean
          created_at: string
          description: string
          id: string
          image_url: string
          price_bcc: number
          title: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description: string
          id?: string
          image_url: string
          price_bcc: number
          title: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          id?: string
          image_url?: string
          price_bcc?: number
          title?: string
        }
        Relationships: []
      }
      pending_rewards: {
        Row: {
          check_count: number | null
          check_interval: number | null
          condition_type: string
          created_at: string | null
          current_root_level: number | null
          expires_at: string
          id: string
          max_checks: number | null
          required_root_level: number | null
          reward_id: string | null
          updated_at: string | null
        }
        Insert: {
          check_count?: number | null
          check_interval?: number | null
          condition_type: string
          created_at?: string | null
          current_root_level?: number | null
          expires_at: string
          id?: string
          max_checks?: number | null
          required_root_level?: number | null
          reward_id?: string | null
          updated_at?: string | null
        }
        Update: {
          check_count?: number | null
          check_interval?: number | null
          condition_type?: string
          created_at?: string | null
          current_root_level?: number | null
          expires_at?: string
          id?: string
          max_checks?: number | null
          required_root_level?: number | null
          reward_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_rewards_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "member_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_revenue: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string | null
          id: string
          level: number | null
          metadata: Json | null
          reward_distributed: string | null
          reward_distribution_id: string | null
          source_type: string
          source_wallet: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          level?: number | null
          metadata?: Json | null
          reward_distributed?: string | null
          reward_distribution_id?: string | null
          source_type: string
          source_wallet: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          level?: number | null
          metadata?: Json | null
          reward_distributed?: string | null
          reward_distribution_id?: string | null
          source_type?: string
          source_wallet?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_revenue_reward_distribution_id_fkey"
            columns: ["reward_distribution_id"]
            isOneToOne: false
            referencedRelation: "reward_distributions"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          id: string
          is_active: boolean
          layer: number
          member_wallet: string
          parent_wallet: string | null
          placed_at: string
          placement_type: Database["public"]["Enums"]["placement_type_enum"]
          placer_wallet: string
          position: string
          root_wallet: string
        }
        Insert: {
          id?: string
          is_active?: boolean
          layer: number
          member_wallet: string
          parent_wallet?: string | null
          placed_at?: string
          placement_type: Database["public"]["Enums"]["placement_type_enum"]
          placer_wallet: string
          position: string
          root_wallet: string
        }
        Update: {
          id?: string
          is_active?: boolean
          layer?: number
          member_wallet?: string
          parent_wallet?: string | null
          placed_at?: string
          placement_type?: Database["public"]["Enums"]["placement_type_enum"]
          placer_wallet?: string
          position?: string
          root_wallet?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_member_wallet_fkey"
            columns: ["member_wallet"]
            isOneToOne: false
            referencedRelation: "available_placement_positions"
            referencedColumns: ["root_wallet"]
          },
          {
            foreignKeyName: "referrals_member_wallet_fkey"
            columns: ["member_wallet"]
            isOneToOne: false
            referencedRelation: "user_direct_referral_counts"
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
            foreignKeyName: "referrals_placer_wallet_fkey"
            columns: ["placer_wallet"]
            isOneToOne: false
            referencedRelation: "available_placement_positions"
            referencedColumns: ["root_wallet"]
          },
          {
            foreignKeyName: "referrals_placer_wallet_fkey"
            columns: ["placer_wallet"]
            isOneToOne: false
            referencedRelation: "user_direct_referral_counts"
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
            referencedRelation: "available_placement_positions"
            referencedColumns: ["root_wallet"]
          },
          {
            foreignKeyName: "referrals_root_wallet_fkey"
            columns: ["root_wallet"]
            isOneToOne: false
            referencedRelation: "user_direct_referral_counts"
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
      reward_distributions: {
        Row: {
          created_at: string | null
          distribution_details: Json | null
          event_level: number
          event_type: string
          id: string
          member_wallet: string
          root_wallet: string
          total_rewards_distributed: string | null
        }
        Insert: {
          created_at?: string | null
          distribution_details?: Json | null
          event_level: number
          event_type: string
          id?: string
          member_wallet: string
          root_wallet: string
          total_rewards_distributed?: string | null
        }
        Update: {
          created_at?: string | null
          distribution_details?: Json | null
          event_level?: number
          event_type?: string
          id?: string
          member_wallet?: string
          root_wallet?: string
          total_rewards_distributed?: string | null
        }
        Relationships: []
      }
      reward_notifications: {
        Row: {
          claimed_at: string | null
          created_at: string
          expires_at: string
          id: string
          layer_number: number
          recipient_wallet: string
          reward_amount: number
          status: Database["public"]["Enums"]["reward_status_enum"]
          trigger_level: number
          trigger_wallet: string
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          layer_number: number
          recipient_wallet: string
          reward_amount: number
          status?: Database["public"]["Enums"]["reward_status_enum"]
          trigger_level: number
          trigger_wallet: string
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          layer_number?: number
          recipient_wallet?: string
          reward_amount?: number
          status?: Database["public"]["Enums"]["reward_status_enum"]
          trigger_level?: number
          trigger_wallet?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_notifications_recipient_wallet_fkey"
            columns: ["recipient_wallet"]
            isOneToOne: false
            referencedRelation: "available_placement_positions"
            referencedColumns: ["root_wallet"]
          },
          {
            foreignKeyName: "reward_notifications_recipient_wallet_fkey"
            columns: ["recipient_wallet"]
            isOneToOne: false
            referencedRelation: "user_direct_referral_counts"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "reward_notifications_recipient_wallet_fkey"
            columns: ["recipient_wallet"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      reward_rollups: {
        Row: {
          created_at: string
          id: string
          original_notification_id: string
          original_recipient: string
          reward_amount: number
          rolled_up_to: string
          rollup_reason: string
          trigger_level: number
          trigger_wallet: string
        }
        Insert: {
          created_at?: string
          id?: string
          original_notification_id: string
          original_recipient: string
          reward_amount: number
          rolled_up_to: string
          rollup_reason: string
          trigger_level: number
          trigger_wallet: string
        }
        Update: {
          created_at?: string
          id?: string
          original_notification_id?: string
          original_recipient?: string
          reward_amount?: number
          rolled_up_to?: string
          rollup_reason?: string
          trigger_level?: number
          trigger_wallet?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_rollups_original_recipient_fkey"
            columns: ["original_recipient"]
            isOneToOne: false
            referencedRelation: "available_placement_positions"
            referencedColumns: ["root_wallet"]
          },
          {
            foreignKeyName: "reward_rollups_original_recipient_fkey"
            columns: ["original_recipient"]
            isOneToOne: false
            referencedRelation: "user_direct_referral_counts"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "reward_rollups_original_recipient_fkey"
            columns: ["original_recipient"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "reward_rollups_rolled_up_to_fkey"
            columns: ["rolled_up_to"]
            isOneToOne: false
            referencedRelation: "available_placement_positions"
            referencedColumns: ["root_wallet"]
          },
          {
            foreignKeyName: "reward_rollups_rolled_up_to_fkey"
            columns: ["rolled_up_to"]
            isOneToOne: false
            referencedRelation: "user_direct_referral_counts"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "reward_rollups_rolled_up_to_fkey"
            columns: ["rolled_up_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      token_purchases: {
        Row: {
          airdrop_tx_hash: string | null
          completed_at: string | null
          created_at: string
          id: string
          payembed_intent_id: string | null
          source_chain: string
          status: Database["public"]["Enums"]["transaction_status_enum"]
          token_amount: number
          token_type: string
          tx_hash: string | null
          usdt_amount: number
          wallet_address: string
        }
        Insert: {
          airdrop_tx_hash?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          payembed_intent_id?: string | null
          source_chain: string
          status?: Database["public"]["Enums"]["transaction_status_enum"]
          token_amount: number
          token_type: string
          tx_hash?: string | null
          usdt_amount: number
          wallet_address: string
        }
        Update: {
          airdrop_tx_hash?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          payembed_intent_id?: string | null
          source_chain?: string
          status?: Database["public"]["Enums"]["transaction_status_enum"]
          token_amount?: number
          token_type?: string
          tx_hash?: string | null
          usdt_amount?: number
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_purchases_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "available_placement_positions"
            referencedColumns: ["root_wallet"]
          },
          {
            foreignKeyName: "token_purchases_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "user_direct_referral_counts"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "token_purchases_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      usdt_balances: {
        Row: {
          balance: string | null
          created_at: string | null
          id: string
          last_updated: string | null
          pending_balance: string | null
          total_earned: string | null
          wallet_address: string
        }
        Insert: {
          balance?: string | null
          created_at?: string | null
          id?: string
          last_updated?: string | null
          pending_balance?: string | null
          total_earned?: string | null
          wallet_address: string
        }
        Update: {
          balance?: string | null
          created_at?: string | null
          id?: string
          last_updated?: string | null
          pending_balance?: string | null
          total_earned?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
      usdt_withdrawals: {
        Row: {
          amount_usdt: number
          completed_at: string | null
          failure_reason: string | null
          gas_fee_amount: number
          gas_fee_percentage: number
          id: string
          net_amount: number
          processed_at: string | null
          processed_by: string | null
          requested_at: string
          server_wallet_tx_hash: string | null
          status: Database["public"]["Enums"]["transaction_status_enum"]
          target_chain: string
          target_chain_tx_hash: string | null
          target_wallet_address: string
          wallet_address: string
        }
        Insert: {
          amount_usdt: number
          completed_at?: string | null
          failure_reason?: string | null
          gas_fee_amount: number
          gas_fee_percentage: number
          id?: string
          net_amount: number
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string
          server_wallet_tx_hash?: string | null
          status?: Database["public"]["Enums"]["transaction_status_enum"]
          target_chain: string
          target_chain_tx_hash?: string | null
          target_wallet_address: string
          wallet_address: string
        }
        Update: {
          amount_usdt?: number
          completed_at?: string | null
          failure_reason?: string | null
          gas_fee_amount?: number
          gas_fee_percentage?: number
          id?: string
          net_amount?: number
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string
          server_wallet_tx_hash?: string | null
          status?: Database["public"]["Enums"]["transaction_status_enum"]
          target_chain?: string
          target_chain_tx_hash?: string | null
          target_wallet_address?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "usdt_withdrawals_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "available_placement_positions"
            referencedColumns: ["root_wallet"]
          },
          {
            foreignKeyName: "usdt_withdrawals_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "user_direct_referral_counts"
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
          activation_order: number | null
          activation_tier: number | null
          available_usdt_rewards: number
          bcc_locked: number
          bcc_restricted: number
          bcc_transferable: number
          created_at: string
          cth_balance: number
          last_updated: string
          total_usdt_earned: number
          total_usdt_withdrawn: number
          wallet_address: string
        }
        Insert: {
          activation_order?: number | null
          activation_tier?: number | null
          available_usdt_rewards?: number
          bcc_locked?: number
          bcc_restricted?: number
          bcc_transferable?: number
          created_at?: string
          cth_balance?: number
          last_updated?: string
          total_usdt_earned?: number
          total_usdt_withdrawn?: number
          wallet_address: string
        }
        Update: {
          activation_order?: number | null
          activation_tier?: number | null
          available_usdt_rewards?: number
          bcc_locked?: number
          bcc_restricted?: number
          bcc_transferable?: number
          created_at?: string
          cth_balance?: number
          last_updated?: string
          total_usdt_earned?: number
          total_usdt_withdrawn?: number
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_balances_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "available_placement_positions"
            referencedColumns: ["root_wallet"]
          },
          {
            foreignKeyName: "user_balances_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "user_direct_referral_counts"
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
          action_required: boolean
          action_type: string | null
          action_url: string | null
          amount: number | null
          amount_type: Database["public"]["Enums"]["amount_type_enum"] | null
          created_at: string
          email_sent: boolean
          email_sent_at: string | null
          expires_at: string | null
          id: string
          is_archived: boolean
          is_read: boolean
          layer: number | null
          level: number | null
          message: string
          metadata: Json | null
          position: Database["public"]["Enums"]["matrix_position_enum"] | null
          priority: Database["public"]["Enums"]["notification_priority_enum"]
          related_wallet: string | null
          reminder_sent_at: string | null
          title: string
          trigger_wallet: string | null
          type: Database["public"]["Enums"]["notification_type_enum"]
          updated_at: string
          wallet_address: string
        }
        Insert: {
          action_required?: boolean
          action_type?: string | null
          action_url?: string | null
          amount?: number | null
          amount_type?: Database["public"]["Enums"]["amount_type_enum"] | null
          created_at?: string
          email_sent?: boolean
          email_sent_at?: string | null
          expires_at?: string | null
          id?: string
          is_archived?: boolean
          is_read?: boolean
          layer?: number | null
          level?: number | null
          message: string
          metadata?: Json | null
          position?: Database["public"]["Enums"]["matrix_position_enum"] | null
          priority?: Database["public"]["Enums"]["notification_priority_enum"]
          related_wallet?: string | null
          reminder_sent_at?: string | null
          title: string
          trigger_wallet?: string | null
          type: Database["public"]["Enums"]["notification_type_enum"]
          updated_at?: string
          wallet_address: string
        }
        Update: {
          action_required?: boolean
          action_type?: string | null
          action_url?: string | null
          amount?: number | null
          amount_type?: Database["public"]["Enums"]["amount_type_enum"] | null
          created_at?: string
          email_sent?: boolean
          email_sent_at?: string | null
          expires_at?: string | null
          id?: string
          is_archived?: boolean
          is_read?: boolean
          layer?: number | null
          level?: number | null
          message?: string
          metadata?: Json | null
          position?: Database["public"]["Enums"]["matrix_position_enum"] | null
          priority?: Database["public"]["Enums"]["notification_priority_enum"]
          related_wallet?: string | null
          reminder_sent_at?: string | null
          title?: string
          trigger_wallet?: string | null
          type?: Database["public"]["Enums"]["notification_type_enum"]
          updated_at?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "available_placement_positions"
            referencedColumns: ["root_wallet"]
          },
          {
            foreignKeyName: "user_notifications_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "user_direct_referral_counts"
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
      user_rewards: {
        Row: {
          confirmed_at: string | null
          created_at: string
          expired_at: string | null
          expires_at: string | null
          id: string
          matrix_position: string | null
          metadata: Json | null
          notes: string | null
          payout_layer: number
          recipient_wallet: string
          requires_level: number | null
          reward_amount: number
          source_wallet: string
          status: Database["public"]["Enums"]["reward_status_enum"]
          trigger_level: number
          unlock_condition: string | null
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          expired_at?: string | null
          expires_at?: string | null
          id?: string
          matrix_position?: string | null
          metadata?: Json | null
          notes?: string | null
          payout_layer: number
          recipient_wallet: string
          requires_level?: number | null
          reward_amount: number
          source_wallet: string
          status?: Database["public"]["Enums"]["reward_status_enum"]
          trigger_level: number
          unlock_condition?: string | null
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          expired_at?: string | null
          expires_at?: string | null
          id?: string
          matrix_position?: string | null
          metadata?: Json | null
          notes?: string | null
          payout_layer?: number
          recipient_wallet?: string
          requires_level?: number | null
          reward_amount?: number
          source_wallet?: string
          status?: Database["public"]["Enums"]["reward_status_enum"]
          trigger_level?: number
          unlock_condition?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_rewards_recipient_wallet_fkey"
            columns: ["recipient_wallet"]
            isOneToOne: false
            referencedRelation: "available_placement_positions"
            referencedColumns: ["root_wallet"]
          },
          {
            foreignKeyName: "user_rewards_recipient_wallet_fkey"
            columns: ["recipient_wallet"]
            isOneToOne: false
            referencedRelation: "user_direct_referral_counts"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "user_rewards_recipient_wallet_fkey"
            columns: ["recipient_wallet"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          current_level: number
          email: string | null
          is_upgraded: boolean
          referrer_wallet: string | null
          upgrade_timer_enabled: boolean
          username: string | null
          wallet_address: string
        }
        Insert: {
          created_at?: string
          current_level?: number
          email?: string | null
          is_upgraded?: boolean
          referrer_wallet?: string | null
          upgrade_timer_enabled?: boolean
          username?: string | null
          wallet_address: string
        }
        Update: {
          created_at?: string
          current_level?: number
          email?: string | null
          is_upgraded?: boolean
          referrer_wallet?: string | null
          upgrade_timer_enabled?: boolean
          username?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
      wallet_connection_logs: {
        Row: {
          connection_status: string
          connection_type: Database["public"]["Enums"]["wallet_connection_type_enum"]
          created_at: string
          error_message: string | null
          id: string
          ip_address: string | null
          referral_code: string | null
          referrer_url: string | null
          upline_wallet: string | null
          user_agent: string | null
          wallet_address: string
        }
        Insert: {
          connection_status?: string
          connection_type: Database["public"]["Enums"]["wallet_connection_type_enum"]
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          referral_code?: string | null
          referrer_url?: string | null
          upline_wallet?: string | null
          user_agent?: string | null
          wallet_address: string
        }
        Update: {
          connection_status?: string
          connection_type?: Database["public"]["Enums"]["wallet_connection_type_enum"]
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          referral_code?: string | null
          referrer_url?: string | null
          upline_wallet?: string | null
          user_agent?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
    }
    Views: {
      available_placement_positions: {
        Row: {
          layer: number | null
          member_wallet: string | null
          position: string | null
          root_wallet: string | null
        }
        Relationships: []
      }
      deep_matrix_analysis: {
        Row: {
          avg_layer: number | null
          deep_layers: number | null
          development_stage: string | null
          early_layers: number | null
          growth_potential: string | null
          matrix_health_score: number | null
          max_layer: number | null
          mid_layers: number | null
          root_activated: boolean | null
          root_level: number | null
          root_username: string | null
          root_wallet: string | null
          total_members: number | null
          ultra_deep_layers: number | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_root_wallet_fkey"
            columns: ["root_wallet"]
            isOneToOne: false
            referencedRelation: "available_placement_positions"
            referencedColumns: ["root_wallet"]
          },
          {
            foreignKeyName: "referrals_root_wallet_fkey"
            columns: ["root_wallet"]
            isOneToOne: false
            referencedRelation: "user_direct_referral_counts"
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
      matrix_layer_statistics: {
        Row: {
          fill_percentage: number | null
          first_placement_in_layer: string | null
          latest_placement_in_layer: string | null
          layer: number | null
          layer_status: string | null
          left_count: number | null
          member_count: number | null
          middle_count: number | null
          right_count: number | null
          root_wallet: string | null
          theoretical_capacity: number | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_root_wallet_fkey"
            columns: ["root_wallet"]
            isOneToOne: false
            referencedRelation: "available_placement_positions"
            referencedColumns: ["root_wallet"]
          },
          {
            foreignKeyName: "referrals_root_wallet_fkey"
            columns: ["root_wallet"]
            isOneToOne: false
            referencedRelation: "user_direct_referral_counts"
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
      matrix_position_details: {
        Row: {
          downline_count: number | null
          has_downline: boolean | null
          layer: number | null
          member_is_activated: boolean | null
          member_level: number | null
          member_username: string | null
          member_wallet: string | null
          parent_wallet: string | null
          placed_at: string | null
          placement_type:
            | Database["public"]["Enums"]["placement_type_enum"]
            | null
          position: string | null
          position_order_in_layer: number | null
          root_username: string | null
          root_wallet: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_member_wallet_fkey"
            columns: ["member_wallet"]
            isOneToOne: false
            referencedRelation: "available_placement_positions"
            referencedColumns: ["root_wallet"]
          },
          {
            foreignKeyName: "referrals_member_wallet_fkey"
            columns: ["member_wallet"]
            isOneToOne: false
            referencedRelation: "user_direct_referral_counts"
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
            referencedRelation: "available_placement_positions"
            referencedColumns: ["root_wallet"]
          },
          {
            foreignKeyName: "referrals_root_wallet_fkey"
            columns: ["root_wallet"]
            isOneToOne: false
            referencedRelation: "user_direct_referral_counts"
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
      pending_rewards_monitor: {
        Row: {
          amount: string | null
          check_count: number | null
          check_progress_percentage: number | null
          condition_type: string | null
          current_root_level: number | null
          expires_at: string | null
          level: number | null
          max_checks: number | null
          pending_created_at: string | null
          pending_id: string | null
          recipient_wallet: string | null
          required_root_level: number | null
          reward_created_at: string | null
          reward_type: string | null
          seconds_remaining: number | null
          urgency_level: string | null
          username: string | null
        }
        Relationships: []
      }
      reward_summary: {
        Row: {
          expired_count: number | null
          paid_count: number | null
          pending_count: number | null
          recipient_wallet: string | null
          reward_count: number | null
          reward_type: string | null
          total_amount: number | null
        }
        Relationships: []
      }
      reward_trend_analysis: {
        Row: {
          daily_paid_count: number | null
          daily_pending_count: number | null
          daily_reward_count: number | null
          daily_total_amount: number | null
          reward_date: string | null
          reward_type: string | null
          seven_day_avg_amount: number | null
          seven_day_avg_count: number | null
        }
        Relationships: []
      }
      usdt_balance_summary: {
        Row: {
          balance_usdt: number | null
          created_at: string | null
          last_updated: string | null
          pending_balance_usdt: number | null
          total_earned_usdt: number | null
          username: string | null
          wallet_address: string | null
        }
        Relationships: []
      }
      user_direct_referral_counts: {
        Row: {
          direct_referral_count: number | null
          direct_referrals: string[] | null
          wallet_address: string | null
        }
        Relationships: []
      }
      user_matrix_positions: {
        Row: {
          active_layers: number | null
          deepest_layer: number | null
          direct_referrals: number | null
          last_updated: string | null
          layer_details: Json | null
          matrix_status: string | null
          root_current_level: number | null
          root_is_activated: boolean | null
          root_username: string | null
          root_wallet: string | null
          total_members: number | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_root_wallet_fkey"
            columns: ["root_wallet"]
            isOneToOne: false
            referencedRelation: "available_placement_positions"
            referencedColumns: ["root_wallet"]
          },
          {
            foreignKeyName: "referrals_root_wallet_fkey"
            columns: ["root_wallet"]
            isOneToOne: false
            referencedRelation: "user_direct_referral_counts"
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
      user_matrix_summary: {
        Row: {
          activated_members: number | null
          activation_rate: number | null
          deepest_layer: number | null
          direct_referrals: number | null
          first_placement: string | null
          first_ten_layers: number | null
          first_three_layers: number | null
          latest_placement: string | null
          layer_1_count: number | null
          layer_10_count: number | null
          layer_11_count: number | null
          layer_12_count: number | null
          layer_13_count: number | null
          layer_14_count: number | null
          layer_15_count: number | null
          layer_16_count: number | null
          layer_17_count: number | null
          layer_18_count: number | null
          layer_19_count: number | null
          layer_2_count: number | null
          layer_3_count: number | null
          layer_4_count: number | null
          layer_5_count: number | null
          layer_6_count: number | null
          layer_7_count: number | null
          layer_8_count: number | null
          layer_9_count: number | null
          layers_1_to_5: number | null
          layers_11_to_15: number | null
          layers_16_to_19: number | null
          layers_6_to_10: number | null
          matrix_completion_percentage: number | null
          matrix_efficiency_score: number | null
          root_username: string | null
          root_wallet: string | null
          total_team_members: number | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_root_wallet_fkey"
            columns: ["root_wallet"]
            isOneToOne: false
            referencedRelation: "available_placement_positions"
            referencedColumns: ["root_wallet"]
          },
          {
            foreignKeyName: "referrals_root_wallet_fkey"
            columns: ["root_wallet"]
            isOneToOne: false
            referencedRelation: "user_direct_referral_counts"
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
      user_reward_overview: {
        Row: {
          first_reward_date: string | null
          l1_paid_amount: number | null
          l1_rewards: number | null
          l2_nft_paid_amount: number | null
          l2_nft_rewards: number | null
          latest_reward_date: string | null
          paid_amount: number | null
          pending_amount: number | null
          r_position_paid_amount: number | null
          r_position_rewards: number | null
          recipient_wallet: string | null
          rewards_last_30_days: number | null
          total_amount_earned: number | null
          total_rewards: number | null
          username: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_activate_pending_upgrade: {
        Args: { admin_override_reason?: string; target_wallet: string }
        Returns: boolean
      }
      auto_place_user: {
        Args: { member_wallet_param: string; referrer_wallet_param: string }
        Returns: {
          layer_result: number
          message_result: string
          parent_result: string
          placement_type_result: string
          position_result: string
          success: boolean
        }[]
      }
      award_usdt_reward: {
        Args: {
          amount_cents: number
          layer: number
          level: number
          metadata_json: Json
          payer_wallet: string
          recipient_wallet: string
          reward_type: string
        }
        Returns: undefined
      }
      check_direct_referrer_requirement: {
        Args: { target_level: number; user_wallet: string }
        Returns: boolean
      }
      cleanup_old_data: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      find_next_available_layer: {
        Args: { root_wallet_addr: string }
        Returns: number
      }
      find_next_available_position: {
        Args: { root_wallet_addr: string }
        Returns: string
      }
      find_next_matrix_position: {
        Args: { root_wallet_param: string; start_layer?: number }
        Returns: {
          layer_num: number
          parent_wallet_address: string
          position_slot: string
        }[]
      }
      find_qualified_upline: {
        Args: {
          max_depth?: number
          required_level: number
          start_root_wallet: string
        }
        Returns: {
          depth_from_start: number
          qualified_level: number
          qualified_wallet: string
          upline_chain: string[]
        }[]
      }
      get_direct_referrer_count: {
        Args: { user_wallet: string }
        Returns: number
      }
      get_layer_members_detailed: {
        Args: { layer_param: number; root_wallet_param: string }
        Returns: {
          current_level: number
          is_activated: boolean
          member_wallet: string
          parent_wallet: string
          placed_at: string
          placement_type: string
          position_slot: string
          username: string
        }[]
      }
      get_matrix_tree: {
        Args: { max_layers?: number; root_wallet_param: string }
        Returns: {
          is_active: boolean
          layer_num: number
          member_wallet: string
          parent_wallet_address: string
          placed_at: string
          placement_type: string
          position_slot: string
        }[]
      }
      get_system_status: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_team_statistics: {
        Args: { root_wallet_param: string }
        Returns: {
          direct_referrals: number
          layer_counts: Json
          total_team_size: number
        }[]
      }
      get_upgrade_status_report: {
        Args: Record<PropertyKey, never>
        Returns: {
          can_activate_now: boolean
          direct_referrers_current: number
          direct_referrers_required: number
          level_name: string
          status: string
          target_level: number
          time_remaining: unknown
          upgrade_fee_paid: number
          wallet_address: string
        }[]
      }
      get_upline_chain: {
        Args: { member_wallet_param: string; root_wallet_param: string }
        Returns: {
          depth_from_member: number
          upline_layer: number
          upline_position: string
          upline_wallet: string
        }[]
      }
      get_user_matrix_overview: {
        Args: { user_wallet: string }
        Returns: {
          activation_rate: number
          completion_percentage: number
          deepest_layer: number
          direct_referrals: number
          efficiency_score: number
          layer_distribution: Json
          matrix_status: string
          total_members: number
        }[]
      }
      get_user_referral_network: {
        Args: { user_wallet: string }
        Returns: Json
      }
      get_user_upgrade_status: {
        Args: { user_wallet: string }
        Returns: {
          can_activate: boolean
          direct_referrers: number
          required_referrers: number
          status: string
          target_level: number
          time_remaining: unknown
        }[]
      }
      place_in_matrix: {
        Args: {
          member_wallet_param: string
          placer_wallet_param?: string
          root_wallet_param: string
        }
        Returns: {
          layer_num: number
          message: string
          parent_wallet_address: string
          placement_type: string
          position_slot: string
          success: boolean
        }[]
      }
      process_expired_rewards: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      process_expired_upgrades: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      process_l1_upgrade_rewards: {
        Args: { level_param: number; member_wallet_param: string }
        Returns: {
          message: string
          rewards_created: number
          success: boolean
          total_amount: string
        }[]
      }
      process_l2_nft_rewards: {
        Args: { level_param: number; member_wallet_param: string }
        Returns: {
          message: string
          rewards_processed: number
          success: boolean
        }[]
      }
      process_layer_nft_rewards: {
        Args: {
          member_wallet_param: string
          nft_price_usdt: number
          upgraded_level: number
        }
        Returns: {
          message: string
          rewards_processed: number
          success: boolean
          total_amount_distributed: string
        }[]
      }
      process_layer_nft_rewards_direct_rollup: {
        Args: {
          member_wallet_param: string
          nft_price_usdt: number
          upgraded_level: number
        }
        Returns: {
          direct_rewards: number
          message: string
          rewards_processed: number
          rollup_rewards: number
          success: boolean
          total_amount_distributed: string
        }[]
      }
      process_layer_nft_rewards_usdt: {
        Args: {
          member_wallet_param: string
          nft_price_usdt: number
          upgraded_level: number
        }
        Returns: {
          message: string
          rewards_processed: number
          success: boolean
          total_amount_distributed: string
        }[]
      }
      process_membership_rewards: {
        Args: { member_level: number; member_wallet_addr: string }
        Returns: undefined
      }
      process_pending_rewards: {
        Args: Record<PropertyKey, never>
        Returns: {
          expired_count: number
          message: string
          processed_count: number
        }[]
      }
      process_pending_rewards_with_rollup: {
        Args: Record<PropertyKey, never>
        Returns: {
          expired_count: number
          message: string
          processed_count: number
          rollup_count: number
        }[]
      }
      process_pending_upgrades: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      process_r_position_reward: {
        Args: { member_wallet_param: string; root_wallet_param: string }
        Returns: {
          message: string
          reward_created: boolean
          success: boolean
        }[]
      }
      process_reward_rollup: {
        Args: Record<PropertyKey, never>
        Returns: {
          message: string
          rollup_processed: number
          total_amount_rolled_up: string
        }[]
      }
      reevaluate_pending_rewards: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      run_beehive_cron_jobs: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      test_cron_functions: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      update_pending_rewards: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
    }
    Enums: {
      activity_type_enum:
        | "reward"
        | "purchase"
        | "merchant_nft_claim"
        | "token_purchase"
        | "membership"
        | "referral_joined"
        | "matrix_placement"
        | "course_activation"
        | "nft_verification"
      amount_type_enum: "USDT" | "BCC" | "ETH" | "MATIC"
      bcc_unlock_type_enum:
        | "activation"
        | "upgrade"
        | "referral"
        | "bonus"
        | "course_completion"
        | "nft_claim"
        | "admin_grant"
      course_status_enum:
        | "not_started"
        | "in_progress"
        | "completed"
        | "expired"
      language_enum: "en" | "zh" | "th" | "my" | "ko" | "ja"
      matrix_position_enum: "L" | "M" | "R"
      member_level_enum:
        | "0"
        | "1"
        | "2"
        | "3"
        | "4"
        | "5"
        | "6"
        | "7"
        | "8"
        | "9"
        | "10"
        | "11"
        | "12"
        | "13"
        | "14"
        | "15"
        | "16"
        | "17"
        | "18"
        | "19"
      nft_status_enum: "pending" | "verified" | "claimed" | "rejected"
      notification_priority_enum: "low" | "normal" | "high" | "urgent"
      notification_type_enum:
        | "member_activated"
        | "level_upgraded"
        | "upgrade_reminder"
        | "reward_received"
        | "referral_joined"
        | "matrix_placement"
        | "countdown_warning"
        | "system_announcement"
        | "course_unlocked"
        | "nft_available"
        | "withdrawal_processed"
        | "payment_confirmed"
      placement_type_enum: "direct" | "spillover"
      registration_status_enum: "pending" | "verified" | "activated" | "expired"
      reward_status_enum:
        | "pending"
        | "claimable"
        | "claimed"
        | "expired"
        | "rollup"
      service_status_enum: "online" | "offline" | "maintenance" | "degraded"
      transaction_status_enum:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "cancelled"
        | "refunded"
      wallet_connection_type_enum:
        | "connect"
        | "verify"
        | "register"
        | "disconnect"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  realtime: {
    Tables: {
      messages: {
        Row: {
          event: string | null
          extension: string
          id: string
          inserted_at: string
          payload: Json | null
          private: boolean | null
          topic: string
          updated_at: string
        }
        Insert: {
          event?: string | null
          extension: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic: string
          updated_at?: string
        }
        Update: {
          event?: string | null
          extension?: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      schema_migrations: {
        Row: {
          inserted_at: string | null
          version: number
        }
        Insert: {
          inserted_at?: string | null
          version: number
        }
        Update: {
          inserted_at?: string | null
          version?: number
        }
        Relationships: []
      }
      subscription: {
        Row: {
          claims: Json
          claims_role: unknown
          created_at: string
          entity: unknown
          filters: Database["realtime"]["CompositeTypes"]["user_defined_filter"][]
          id: number
          subscription_id: string
        }
        Insert: {
          claims: Json
          claims_role?: unknown
          created_at?: string
          entity: unknown
          filters?: Database["realtime"]["CompositeTypes"]["user_defined_filter"][]
          id?: never
          subscription_id: string
        }
        Update: {
          claims?: Json
          claims_role?: unknown
          created_at?: string
          entity?: unknown
          filters?: Database["realtime"]["CompositeTypes"]["user_defined_filter"][]
          id?: never
          subscription_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_rls: {
        Args: { max_record_bytes?: number; wal: Json }
        Returns: Database["realtime"]["CompositeTypes"]["wal_rls"][]
      }
      broadcast_changes: {
        Args: {
          event_name: string
          level?: string
          new: Record<string, unknown>
          old: Record<string, unknown>
          operation: string
          table_name: string
          table_schema: string
          topic_name: string
        }
        Returns: undefined
      }
      build_prepared_statement_sql: {
        Args: {
          columns: Database["realtime"]["CompositeTypes"]["wal_column"][]
          entity: unknown
          prepared_statement_name: string
        }
        Returns: string
      }
      cast: {
        Args: { type_: unknown; val: string }
        Returns: Json
      }
      check_equality_op: {
        Args: {
          op: Database["realtime"]["Enums"]["equality_op"]
          type_: unknown
          val_1: string
          val_2: string
        }
        Returns: boolean
      }
      is_visible_through_filters: {
        Args: {
          columns: Database["realtime"]["CompositeTypes"]["wal_column"][]
          filters: Database["realtime"]["CompositeTypes"]["user_defined_filter"][]
        }
        Returns: boolean
      }
      list_changes: {
        Args: {
          max_changes: number
          max_record_bytes: number
          publication: unknown
          slot_name: unknown
        }
        Returns: Database["realtime"]["CompositeTypes"]["wal_rls"][]
      }
      quote_wal2json: {
        Args: { entity: unknown }
        Returns: string
      }
      send: {
        Args: { event: string; payload: Json; private?: boolean; topic: string }
        Returns: undefined
      }
      to_regrole: {
        Args: { role_name: string }
        Returns: unknown
      }
      topic: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      action: "INSERT" | "UPDATE" | "DELETE" | "TRUNCATE" | "ERROR"
      equality_op: "eq" | "neq" | "lt" | "lte" | "gt" | "gte" | "in"
    }
    CompositeTypes: {
      user_defined_filter: {
        column_name: string | null
        op: Database["realtime"]["Enums"]["equality_op"] | null
        value: string | null
      }
      wal_column: {
        name: string | null
        type_name: string | null
        type_oid: unknown | null
        value: Json | null
        is_pkey: boolean | null
        is_selectable: boolean | null
      }
      wal_rls: {
        wal: Json | null
        is_rls_enabled: boolean | null
        subscription_ids: string[] | null
        errors: string[] | null
      }
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          format: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          format?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          format?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          level: number | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      prefixes: {
        Row: {
          bucket_id: string
          created_at: string | null
          level: number
          name: string
          updated_at: string | null
        }
        Insert: {
          bucket_id: string
          created_at?: string | null
          level?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          bucket_id?: string
          created_at?: string | null
          level?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prefixes_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_prefixes: {
        Args: { _bucket_id: string; _name: string }
        Returns: undefined
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      delete_prefix: {
        Args: { _bucket_id: string; _name: string }
        Returns: boolean
      }
      extension: {
        Args: { name: string }
        Returns: string
      }
      filename: {
        Args: { name: string }
        Returns: string
      }
      foldername: {
        Args: { name: string }
        Returns: string[]
      }
      get_level: {
        Args: { name: string }
        Returns: number
      }
      get_prefix: {
        Args: { name: string }
        Returns: string
      }
      get_prefixes: {
        Args: { name: string }
        Returns: string[]
      }
      get_size_by_bucket: {
        Args: Record<PropertyKey, never>
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          start_after?: string
        }
        Returns: {
          id: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_legacy_v1: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v1_optimised: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  supabase_migrations: {
    Tables: {
      schema_migrations: {
        Row: {
          name: string | null
          statements: string[] | null
          version: string
        }
        Insert: {
          name?: string | null
          statements?: string[] | null
          version: string
        }
        Update: {
          name?: string | null
          statements?: string[] | null
          version?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  vault: {
    Tables: {
      secrets: {
        Row: {
          created_at: string
          description: string
          id: string
          key_id: string | null
          name: string | null
          nonce: string | null
          secret: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          key_id?: string | null
          name?: string | null
          nonce?: string | null
          secret: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          key_id?: string | null
          name?: string | null
          nonce?: string | null
          secret?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      decrypted_secrets: {
        Row: {
          created_at: string | null
          decrypted_secret: string | null
          description: string | null
          id: string | null
          key_id: string | null
          name: string | null
          nonce: string | null
          secret: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          decrypted_secret?: never
          description?: string | null
          id?: string | null
          key_id?: string | null
          name?: string | null
          nonce?: string | null
          secret?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          decrypted_secret?: never
          description?: string | null
          id?: string | null
          key_id?: string | null
          name?: string | null
          nonce?: string | null
          secret?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _crypto_aead_det_decrypt: {
        Args: {
          additional: string
          context?: string
          key_id: number
          message: string
          nonce?: string
        }
        Returns: string
      }
      _crypto_aead_det_encrypt: {
        Args: {
          additional: string
          context?: string
          key_id: number
          message: string
          nonce?: string
        }
        Returns: string
      }
      _crypto_aead_det_noncegen: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      create_secret: {
        Args: {
          new_description?: string
          new_key_id?: string
          new_name?: string
          new_secret: string
        }
        Returns: string
      }
      update_secret: {
        Args: {
          new_description?: string
          new_key_id?: string
          new_name?: string
          new_secret?: string
          secret_id: string
        }
        Returns: undefined
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
  cron: {
    Enums: {},
  },
  drizzle: {
    Enums: {},
  },
  graphql: {
    Enums: {},
  },
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      activity_type_enum: [
        "reward",
        "purchase",
        "merchant_nft_claim",
        "token_purchase",
        "membership",
        "referral_joined",
        "matrix_placement",
        "course_activation",
        "nft_verification",
      ],
      amount_type_enum: ["USDT", "BCC", "ETH", "MATIC"],
      bcc_unlock_type_enum: [
        "activation",
        "upgrade",
        "referral",
        "bonus",
        "course_completion",
        "nft_claim",
        "admin_grant",
      ],
      course_status_enum: [
        "not_started",
        "in_progress",
        "completed",
        "expired",
      ],
      language_enum: ["en", "zh", "th", "my", "ko", "ja"],
      matrix_position_enum: ["L", "M", "R"],
      member_level_enum: [
        "0",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "11",
        "12",
        "13",
        "14",
        "15",
        "16",
        "17",
        "18",
        "19",
      ],
      nft_status_enum: ["pending", "verified", "claimed", "rejected"],
      notification_priority_enum: ["low", "normal", "high", "urgent"],
      notification_type_enum: [
        "member_activated",
        "level_upgraded",
        "upgrade_reminder",
        "reward_received",
        "referral_joined",
        "matrix_placement",
        "countdown_warning",
        "system_announcement",
        "course_unlocked",
        "nft_available",
        "withdrawal_processed",
        "payment_confirmed",
      ],
      placement_type_enum: ["direct", "spillover"],
      registration_status_enum: ["pending", "verified", "activated", "expired"],
      reward_status_enum: [
        "pending",
        "claimable",
        "claimed",
        "expired",
        "rollup",
      ],
      service_status_enum: ["online", "offline", "maintenance", "degraded"],
      transaction_status_enum: [
        "pending",
        "processing",
        "completed",
        "failed",
        "cancelled",
        "refunded",
      ],
      wallet_connection_type_enum: [
        "connect",
        "verify",
        "register",
        "disconnect",
      ],
    },
  },
  realtime: {
    Enums: {
      action: ["INSERT", "UPDATE", "DELETE", "TRUNCATE", "ERROR"],
      equality_op: ["eq", "neq", "lt", "lte", "gt", "gte", "in"],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS"],
    },
  },
  supabase_migrations: {
    Enums: {},
  },
  vault: {
    Enums: {},
  },
} as const
