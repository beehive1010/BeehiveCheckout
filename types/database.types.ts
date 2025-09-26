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
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  pgmq: {
    Tables: {
      meta: {
        Row: {
          created_at: string
          is_partitioned: boolean
          is_unlogged: boolean
          queue_name: string
        }
        Insert: {
          created_at?: string
          is_partitioned: boolean
          is_unlogged: boolean
          queue_name: string
        }
        Update: {
          created_at?: string
          is_partitioned?: boolean
          is_unlogged?: boolean
          queue_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _belongs_to_pgmq: {
        Args: { table_name: string }
        Returns: boolean
      }
      _ensure_pg_partman_installed: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      _get_partition_col: {
        Args: { partition_interval: string }
        Returns: string
      }
      _get_pg_partman_major_version: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      _get_pg_partman_schema: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      archive: {
        Args:
            | { msg_id: number; queue_name: string }
            | { msg_ids: number[]; queue_name: string }
        Returns: boolean
      }
      convert_archive_partitioned: {
        Args: {
          leading_partition?: number
          partition_interval?: string
          retention_interval?: string
          table_name: string
        }
        Returns: undefined
      }
      create: {
        Args: { queue_name: string }
        Returns: undefined
      }
      create_non_partitioned: {
        Args: { queue_name: string }
        Returns: undefined
      }
      create_partitioned: {
        Args: {
          partition_interval?: string
          queue_name: string
          retention_interval?: string
        }
        Returns: undefined
      }
      create_unlogged: {
        Args: { queue_name: string }
        Returns: undefined
      }
      delete: {
        Args:
            | { msg_id: number; queue_name: string }
            | { msg_ids: number[]; queue_name: string }
        Returns: boolean
      }
      detach_archive: {
        Args: { queue_name: string }
        Returns: undefined
      }
      drop_queue: {
        Args: { queue_name: string }
        Returns: boolean
      }
      format_table_name: {
        Args: { prefix: string; queue_name: string }
        Returns: string
      }
      list_queues: {
        Args: Record<PropertyKey, never>
        Returns: Database["pgmq"]["CompositeTypes"]["queue_record"][]
      }
      metrics: {
        Args: { queue_name: string }
        Returns: Database["pgmq"]["CompositeTypes"]["metrics_result"]
      }
      metrics_all: {
        Args: Record<PropertyKey, never>
        Returns: Database["pgmq"]["CompositeTypes"]["metrics_result"][]
      }
      pop: {
        Args: { queue_name: string }
        Returns: Database["pgmq"]["CompositeTypes"]["message_record"][]
      }
      purge_queue: {
        Args: { queue_name: string }
        Returns: number
      }
      read: {
        Args: { qty: number; queue_name: string; vt: number }
        Returns: Database["pgmq"]["CompositeTypes"]["message_record"][]
      }
      read_with_poll: {
        Args: {
          max_poll_seconds?: number
          poll_interval_ms?: number
          qty: number
          queue_name: string
          vt: number
        }
        Returns: Database["pgmq"]["CompositeTypes"]["message_record"][]
      }
      send: {
        Args: { delay?: number; msg: Json; queue_name: string }
        Returns: number[]
      }
      send_batch: {
        Args: { delay?: number; msgs: Json[]; queue_name: string }
        Returns: number[]
      }
      set_vt: {
        Args: { msg_id: number; queue_name: string; vt: number }
        Returns: Database["pgmq"]["CompositeTypes"]["message_record"][]
      }
      validate_queue_name: {
        Args: { queue_name: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      message_record: {
        msg_id: number | null
        read_ct: number | null
        enqueued_at: string | null
        vt: string | null
        message: Json | null
      }
      metrics_result: {
        queue_name: string | null
        queue_length: number | null
        newest_msg_age_sec: number | null
        oldest_msg_age_sec: number | null
        total_messages: number | null
        scrape_time: string | null
      }
      queue_record: {
        queue_name: string | null
        is_partitioned: boolean | null
        is_unlogged: boolean | null
        created_at: string | null
      }
    }
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
            foreignKeyName: "reward_notifications_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "member_balance_complete"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "reward_notifications_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "member_complete_info"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "reward_notifications_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "member_rewards_overview_v2"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "reward_notifications_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "reward_notifications_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "referrer_stats"
            referencedColumns: ["wallet_address"]
          },
        ]
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
      matrix_referrals_tree_view: {
        Row: {
          activation_sequence: number | null
          activation_time: string | null
          current_level: number | null
          is_activated: boolean | null
          is_spillover: boolean | null
          layer: number | null
          matrix_root_wallet: string | null
          member_wallet: string | null
          parent_wallet: string | null
          position: string | null
          referral_depth: number | null
          referrer_wallet: string | null
          username: string | null
        }
        Relationships: []
      }
      matrix_referrals_unified_view: {
        Row: {
          activation_sequence: number | null
          activation_time: string | null
          current_level: number | null
          data_source: string | null
          is_activated: boolean | null
          is_spillover: boolean | null
          layer: number | null
          matrix_root_wallet: string | null
          member_wallet: string | null
          parent_wallet: string | null
          position: string | null
          referral_depth: number | null
          referrer_wallet: string | null
          username: string | null
        }
        Relationships: []
      }
      matrix_referrals_view: {
        Row: {
          activation_sequence: number | null
          activation_time: string | null
          current_level: number | null
          is_activated: boolean | null
          is_spillover: boolean | null
          layer: number | null
          matrix_root_wallet: string | null
          member_wallet: string | null
          parent_wallet: string | null
          position: string | null
          referral_depth: number | null
          referrer_wallet: string | null
          username: string | null
        }
        Relationships: []
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
          forfeited_amount_usdt: number | null
          forfeited_rewards_count: number | null
          latest_claim_time: string | null
          latest_reward_time: string | null
          level_name: string | null
          pending_amount_usdt: number | null
          pending_rewards_count: number | null
          rolled_up_amount_usdt: number | null
          rolled_up_rewards_count: number | null
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
      referrals_matrix_positions: {
        Row: {
          activation_sequence: number | null
          activation_time: string | null
          current_level: number | null
          has_matrix_position: boolean | null
          is_activated: boolean | null
          layer: number | null
          member_wallet: string | null
          position: string | null
          position_in_layer: number | null
          referrer_wallet: string | null
          root_wallet: string | null
        }
        Relationships: []
      }
      referrals_tree_hierarchy: {
        Row: {
          activation_sequence: number | null
          activation_time: string | null
          current_level: number | null
          depth: number | null
          member_wallet: string | null
          path: string[] | null
          referrer_wallet: string | null
          root_wallet: string | null
          username: string | null
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
          activation_id: number | null
          claimed_rewards: number | null
          created_at: string | null
          current_level: number | null
          direct_referrals: number | null
          is_activated: boolean | null
          l_filled: number | null
          layer1_filled: number | null
          m_filled: number | null
          next_vacant_position: string | null
          pending_amount: number | null
          pending_rewards: number | null
          r_filled: number | null
          spillover_count: number | null
          total_earned: number | null
          total_matrix_members: number | null
          total_rewards: number | null
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
      rewards_stats_view: {
        Row: {
          available_balance: number | null
          balance_claimed: number | null
          current_reward_balance: number | null
          has_claimable_rewards: boolean | null
          has_pending_rewards: boolean | null
          last_updated: string | null
          net_earnings: number | null
          total_claimable: number | null
          total_claimed: number | null
          total_direct_referrals: number | null
          total_earned: number | null
          total_pending: number | null
          total_rewards_count: number | null
          total_rolled_up: number | null
          total_withdrawn: number | null
          wallet_address: string | null
          withdrawal_rate_percent: number | null
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
      check_pending_rewards_after_upgrade: {
        Args: { p_new_level: number; p_upgraded_wallet: string }
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
      find_next_qualified_upline: {
        Args: { current_wallet: string; required_level: number }
        Returns: string
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
      get_member_status: {
        Args: { p_wallet_address: string }
        Returns: Json
      }
      get_nft_level_price: {
        Args: { p_level: number }
        Returns: number
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
      place_member_matrix_complete: {
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
      place_new_member_in_matrix_correct: {
        Args: { p_member_wallet: string; p_referrer_wallet: string }
        Returns: Json
      }
      process_all_eligible_pending_rewards: {
        Args: Record<PropertyKey, never>
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
        Args: { _root_wallet: string }
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
      messages_2025_09_25: {
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
      messages_2025_09_26: {
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
      messages_2025_09_27: {
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
      messages_2025_09_28: {
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
      messages_2025_09_29: {
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
      messages_2025_09_30: {
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
      messages_2025_10_01: {
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
      delete_leaf_prefixes: {
        Args: { bucket_ids: string[]; names: string[] }
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
      lock_top_prefixes: {
        Args: { bucket_ids: string[]; names: string[] }
        Returns: undefined
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
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
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
  graphql: {
    Enums: {},
  },
  graphql_public: {
    Enums: {},
  },
  pgmq: {
    Enums: {},
  },
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
  vault: {
    Enums: {},
  },
} as const
