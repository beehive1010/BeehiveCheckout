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
      ad_slots: {
        Row: {
          banner_image_url: string
          created_at: string
          created_by: string
          end_date: string
          id: string
          link_url: string
          position: string
          priority: number
          start_date: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          banner_image_url: string
          created_at?: string
          created_by: string
          end_date: string
          id?: string
          link_url: string
          position?: string
          priority?: number
          start_date: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          banner_image_url?: string
          created_at?: string
          created_by?: string
          end_date?: string
          id?: string
          link_url?: string
          position?: string
          priority?: number
          start_date?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_slots_created_by_admin_users_id_fk"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
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
            foreignKeyName: "admin_sessions_admin_id_admin_users_id_fk"
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
      advertisement_nft_claims: {
        Row: {
          active_code: string
          bcc_amount_locked: number
          bucket_used: string
          burned_at: string | null
          claimed_at: string
          code_used_at: string | null
          id: string
          nft_id: string
          status: string
          wallet_address: string
        }
        Insert: {
          active_code: string
          bcc_amount_locked: number
          bucket_used: string
          burned_at?: string | null
          claimed_at?: string
          code_used_at?: string | null
          id?: string
          nft_id: string
          status?: string
          wallet_address: string
        }
        Update: {
          active_code?: string
          bcc_amount_locked?: number
          bucket_used?: string
          burned_at?: string | null
          claimed_at?: string
          code_used_at?: string | null
          id?: string
          nft_id?: string
          status?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "advertisement_nft_claims_nft_id_advertisement_nfts_id_fk"
            columns: ["nft_id"]
            isOneToOne: false
            referencedRelation: "advertisement_nfts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advertisement_nft_claims_wallet_address_users_wallet_address_fk"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      advertisement_nfts: {
        Row: {
          active: boolean
          claimed_count: number
          code_template: string
          created_at: string
          description: string
          id: string
          image_url: string
          price_bcc: number
          service_name: string
          service_type: string
          title: string
          total_supply: number
          website_url: string | null
        }
        Insert: {
          active?: boolean
          claimed_count?: number
          code_template: string
          created_at?: string
          description: string
          id?: string
          image_url: string
          price_bcc: number
          service_name: string
          service_type: string
          title: string
          total_supply?: number
          website_url?: string | null
        }
        Update: {
          active?: boolean
          claimed_count?: number
          code_template?: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string
          price_bcc?: number
          service_name?: string
          service_type?: string
          title?: string
          total_supply?: number
          website_url?: string | null
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
            foreignKeyName: "audit_logs_admin_id_admin_users_id_fk"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      bcc_balances: {
        Row: {
          last_updated: string
          restricted: number
          transferable: number
          wallet_address: string
        }
        Insert: {
          last_updated?: string
          restricted?: number
          transferable?: number
          wallet_address: string
        }
        Update: {
          last_updated?: string
          restricted?: number
          transferable?: number
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "bcc_balances_wallet_address_users_wallet_address_fk"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author: string
          content: string
          excerpt: string
          id: string
          image_url: string | null
          language: string
          published: boolean
          published_at: string
          tags: Json
          title: string
          views: number
        }
        Insert: {
          author: string
          content: string
          excerpt: string
          id?: string
          image_url?: string | null
          language?: string
          published?: boolean
          published_at?: string
          tags?: Json
          title: string
          views?: number
        }
        Update: {
          author?: string
          content?: string
          excerpt?: string
          id?: string
          image_url?: string | null
          language?: string
          published?: boolean
          published_at?: string
          tags?: Json
          title?: string
          views?: number
        }
        Relationships: []
      }
      bridge_payments: {
        Row: {
          bridge_wallet: string
          created_at: string
          id: string
          membership_level: number
          minted_at: string | null
          nft_token_id: string | null
          source_chain: string
          source_tx_hash: string
          status: string
          target_chain: string
          target_tx_hash: string | null
          updated_at: string
          usdt_amount: string
          verified_at: string | null
          wallet_address: string
        }
        Insert: {
          bridge_wallet: string
          created_at?: string
          id?: string
          membership_level: number
          minted_at?: string | null
          nft_token_id?: string | null
          source_chain: string
          source_tx_hash: string
          status?: string
          target_chain?: string
          target_tx_hash?: string | null
          updated_at?: string
          usdt_amount: string
          verified_at?: string | null
          wallet_address: string
        }
        Update: {
          bridge_wallet?: string
          created_at?: string
          id?: string
          membership_level?: number
          minted_at?: string | null
          nft_token_id?: string | null
          source_chain?: string
          source_tx_hash?: string
          status?: string
          target_chain?: string
          target_tx_hash?: string | null
          updated_at?: string
          usdt_amount?: string
          verified_at?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
      course_access: {
        Row: {
          completed: boolean
          course_id: string
          granted_at: string
          id: string
          progress: number
          wallet_address: string
          zoom_nickname: string | null
        }
        Insert: {
          completed?: boolean
          course_id: string
          granted_at?: string
          id?: string
          progress?: number
          wallet_address: string
          zoom_nickname?: string | null
        }
        Update: {
          completed?: boolean
          course_id?: string
          granted_at?: string
          id?: string
          progress?: number
          wallet_address?: string
          zoom_nickname?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_access_course_id_courses_id_fk"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_access_wallet_address_users_wallet_address_fk"
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
            foreignKeyName: "course_lessons_course_id_courses_id_fk"
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
      cth_balances: {
        Row: {
          balance: number
          last_updated: string
          wallet_address: string
        }
        Insert: {
          balance?: number
          last_updated?: string
          wallet_address: string
        }
        Update: {
          balance?: number
          last_updated?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "cth_balances_wallet_address_users_wallet_address_fk"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      dapp_types: {
        Row: {
          active: boolean
          color: string
          created_at: string
          description: string | null
          display_order: number
          icon_url: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          color?: string
          created_at?: string
          description?: string | null
          display_order?: number
          icon_url?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          color?: string
          created_at?: string
          description?: string | null
          display_order?: number
          icon_url?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      discover_partners: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          chains: Json
          created_at: string
          dapp_type: string
          featured: boolean
          id: string
          logo_url: string | null
          long_description: string
          name: string
          redeem_code_used: string | null
          rejection_reason: string | null
          short_description: string
          status: string
          submitter_wallet: string | null
          tags: Json
          updated_at: string
          website_url: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          chains?: Json
          created_at?: string
          dapp_type: string
          featured?: boolean
          id?: string
          logo_url?: string | null
          long_description: string
          name: string
          redeem_code_used?: string | null
          rejection_reason?: string | null
          short_description: string
          status?: string
          submitter_wallet?: string | null
          tags?: Json
          updated_at?: string
          website_url: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          chains?: Json
          created_at?: string
          dapp_type?: string
          featured?: boolean
          id?: string
          logo_url?: string | null
          long_description?: string
          name?: string
          redeem_code_used?: string | null
          rejection_reason?: string | null
          short_description?: string
          status?: string
          submitter_wallet?: string | null
          tags?: Json
          updated_at?: string
          website_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "discover_partners_approved_by_admin_users_id_fk"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      earnings_wallet: {
        Row: {
          created_at: string
          last_reward_at: string | null
          level_earnings: number
          pending_rewards: number
          referral_earnings: number
          total_earnings: number
          wallet_address: string
          withdrawn_amount: number
        }
        Insert: {
          created_at?: string
          last_reward_at?: string | null
          level_earnings?: number
          pending_rewards?: number
          referral_earnings?: number
          total_earnings?: number
          wallet_address: string
          withdrawn_amount?: number
        }
        Update: {
          created_at?: string
          last_reward_at?: string | null
          level_earnings?: number
          pending_rewards?: number
          referral_earnings?: number
          total_earnings?: number
          wallet_address?: string
          withdrawn_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "earnings_wallet_wallet_address_users_wallet_address_fk"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      global_matrix_positions_v2: {
        Row: {
          activated_at: string
          direct_sponsor_wallet: string
          global_position: number
          id: string
          last_active_at: string
          layer: number
          parent_wallet: string | null
          placement_sponsor_wallet: string
          position_in_layer: number
          root_wallet: string
          wallet_address: string
        }
        Insert: {
          activated_at?: string
          direct_sponsor_wallet: string
          global_position: number
          id?: string
          last_active_at?: string
          layer: number
          parent_wallet?: string | null
          placement_sponsor_wallet: string
          position_in_layer: number
          root_wallet: string
          wallet_address: string
        }
        Update: {
          activated_at?: string
          direct_sponsor_wallet?: string
          global_position?: number
          id?: string
          last_active_at?: string
          layer?: number
          parent_wallet?: string | null
          placement_sponsor_wallet?: string
          position_in_layer?: number
          root_wallet?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "global_matrix_positions_v2_wallet_address_users_wallet_address_"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      layer_rewards_v2: {
        Row: {
          confirmed_at: string | null
          created_at: string
          expired_at: string | null
          id: string
          qualified: boolean
          required_level: number
          reward_amount_usdt: number
          root_wallet: string
          special_rule: string | null
          status: string
          trigger_layer: number
          trigger_level: number
          trigger_position: number
          trigger_wallet: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          expired_at?: string | null
          id?: string
          qualified: boolean
          required_level: number
          reward_amount_usdt: number
          root_wallet: string
          special_rule?: string | null
          status?: string
          trigger_layer: number
          trigger_level: number
          trigger_position: number
          trigger_wallet: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          expired_at?: string | null
          id?: string
          qualified?: boolean
          required_level?: number
          reward_amount_usdt?: number
          root_wallet?: string
          special_rule?: string | null
          status?: string
          trigger_layer?: number
          trigger_level?: number
          trigger_position?: number
          trigger_wallet?: string
        }
        Relationships: [
          {
            foreignKeyName: "layer_rewards_v2_root_wallet_users_wallet_address_fk"
            columns: ["root_wallet"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "layer_rewards_v2_trigger_wallet_users_wallet_address_fk"
            columns: ["trigger_wallet"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      lesson_access: {
        Row: {
          completed: boolean
          course_id: string
          id: string
          lesson_id: string
          unlocked_at: string
          wallet_address: string
          watch_progress: number
        }
        Insert: {
          completed?: boolean
          course_id: string
          id?: string
          lesson_id: string
          unlocked_at?: string
          wallet_address: string
          watch_progress?: number
        }
        Update: {
          completed?: boolean
          course_id?: string
          id?: string
          lesson_id?: string
          unlocked_at?: string
          wallet_address?: string
          watch_progress?: number
        }
        Relationships: [
          {
            foreignKeyName: "lesson_access_course_id_courses_id_fk"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_access_lesson_id_course_lessons_id_fk"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_access_wallet_address_users_wallet_address_fk"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      level_config: {
        Row: {
          level: number
          level_name: string
          max_matrix_count: number
          nft_price_usdt: number
          platform_fee_usdt: number
          price_usdt: number
          required_direct_referrals: number
        }
        Insert: {
          level: number
          level_name: string
          max_matrix_count?: number
          nft_price_usdt: number
          platform_fee_usdt: number
          price_usdt: number
          required_direct_referrals?: number
        }
        Update: {
          level?: number
          level_name?: string
          max_matrix_count?: number
          nft_price_usdt?: number
          platform_fee_usdt?: number
          price_usdt?: number
          required_direct_referrals?: number
        }
        Relationships: []
      }
      matrix_tree_v2: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          layer: number
          parent_wallet: string | null
          placed_at: string
          position: string
          position_index: number
          root_wallet: string
          updated_at: string
          wallet_address: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          layer: number
          parent_wallet?: string | null
          placed_at?: string
          position: string
          position_index: number
          root_wallet: string
          updated_at?: string
          wallet_address: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          layer?: number
          parent_wallet?: string | null
          placed_at?: string
          position?: string
          position_index?: number
          root_wallet?: string
          updated_at?: string
          wallet_address?: string
        }
        Relationships: []
      }
      member_nft_verification: {
        Row: {
          chain_id: number
          created_at: string
          last_verified: string | null
          nft_contract_address: string
          token_id: string
          verification_status: string
          wallet_address: string
        }
        Insert: {
          chain_id: number
          created_at?: string
          last_verified?: string | null
          nft_contract_address: string
          token_id: string
          verification_status?: string
          wallet_address: string
        }
        Update: {
          chain_id?: number
          created_at?: string
          last_verified?: string | null
          nft_contract_address?: string
          token_id?: string
          verification_status?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_nft_verification_wallet_address_users_wallet_address_fk"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      membership_nfts_v2: {
        Row: {
          activated_at: string | null
          contract_address: string | null
          id: string
          level: number
          level_name: string
          nft_token_id: number | null
          price_paid_usdt: number
          purchased_at: string
          status: string
          tx_hash: string | null
          wallet_address: string
        }
        Insert: {
          activated_at?: string | null
          contract_address?: string | null
          id?: string
          level: number
          level_name: string
          nft_token_id?: number | null
          price_paid_usdt: number
          purchased_at?: string
          status?: string
          tx_hash?: string | null
          wallet_address: string
        }
        Update: {
          activated_at?: string | null
          contract_address?: string | null
          id?: string
          level?: number
          level_name?: string
          nft_token_id?: number | null
          price_paid_usdt?: number
          purchased_at?: string
          status?: string
          tx_hash?: string | null
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_nfts_v2_wallet_address_users_wallet_address_fk"
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
      nft_claim_records: {
        Row: {
          bridge_wallet: string
          claim_tx_hash: string | null
          claimed_at: string | null
          created_at: string
          id: string
          level: number
          payment_tx_hash: string
          source_chain: string
          status: string
          target_chain: string
          token_id: number
          updated_at: string
          usdt_amount: number
          verified_at: string | null
          wallet_address: string
        }
        Insert: {
          bridge_wallet: string
          claim_tx_hash?: string | null
          claimed_at?: string | null
          created_at?: string
          id?: string
          level: number
          payment_tx_hash: string
          source_chain: string
          status?: string
          target_chain: string
          token_id: number
          updated_at?: string
          usdt_amount: number
          verified_at?: string | null
          wallet_address: string
        }
        Update: {
          bridge_wallet?: string
          claim_tx_hash?: string | null
          claimed_at?: string | null
          created_at?: string
          id?: string
          level?: number
          payment_tx_hash?: string
          source_chain?: string
          status?: string
          target_chain?: string
          token_id?: number
          updated_at?: string
          usdt_amount?: number
          verified_at?: string | null
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "nft_claim_records_wallet_address_users_wallet_address_fk"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      nft_purchases: {
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
            foreignKeyName: "nft_purchases_nft_id_merchant_nfts_id_fk"
            columns: ["nft_id"]
            isOneToOne: false
            referencedRelation: "merchant_nfts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nft_purchases_wallet_address_users_wallet_address_fk"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      orders: {
        Row: {
          amount_usdt: number
          chain: string
          completed_at: string | null
          created_at: string
          id: string
          level: number
          payembed_intent_id: string | null
          status: string
          token_id: number
          tx_hash: string | null
          wallet_address: string
        }
        Insert: {
          amount_usdt: number
          chain: string
          completed_at?: string | null
          created_at?: string
          id?: string
          level: number
          payembed_intent_id?: string | null
          status?: string
          token_id: number
          tx_hash?: string | null
          wallet_address: string
        }
        Update: {
          amount_usdt?: number
          chain?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          level?: number
          payembed_intent_id?: string | null
          status?: string
          token_id?: number
          tx_hash?: string | null
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_wallet_address_users_wallet_address_fk"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      partner_chains: {
        Row: {
          chain_id: number | null
          created_at: string
          display_order: number
          docs_url: string | null
          explorer_url: string
          featured: boolean
          id: string
          logo_url: string | null
          name: string
          native_currency: string
          rpc_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          chain_id?: number | null
          created_at?: string
          display_order?: number
          docs_url?: string | null
          explorer_url: string
          featured?: boolean
          id?: string
          logo_url?: string | null
          name: string
          native_currency: string
          rpc_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          chain_id?: number | null
          created_at?: string
          display_order?: number
          docs_url?: string | null
          explorer_url?: string
          featured?: boolean
          id?: string
          logo_url?: string | null
          name?: string
          native_currency?: string
          rpc_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      pending_rewards_v2: {
        Row: {
          claimed_at: string | null
          created_at: string
          current_recipient_wallet: string
          expires_at: string
          id: string
          original_recipient_wallet: string
          original_reward_id: string
          reallocated_at: string | null
          reallocated_to_wallet: string | null
          reallocation_attempts: number
          required_level: number
          reward_amount_usdt: number
          status: string
          timeout_hours: number
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          current_recipient_wallet: string
          expires_at: string
          id?: string
          original_recipient_wallet: string
          original_reward_id: string
          reallocated_at?: string | null
          reallocated_to_wallet?: string | null
          reallocation_attempts?: number
          required_level: number
          reward_amount_usdt: number
          status?: string
          timeout_hours?: number
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          current_recipient_wallet?: string
          expires_at?: string
          id?: string
          original_recipient_wallet?: string
          original_reward_id?: string
          reallocated_at?: string | null
          reallocated_to_wallet?: string | null
          reallocation_attempts?: number
          required_level?: number
          reward_amount_usdt?: number
          status?: string
          timeout_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "pending_rewards_v2_current_recipient_wallet_users_wallet_addres"
            columns: ["current_recipient_wallet"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "pending_rewards_v2_original_recipient_wallet_users_wallet_addre"
            columns: ["original_recipient_wallet"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "pending_rewards_v2_original_reward_id_layer_rewards_v2_id_fk"
            columns: ["original_reward_id"]
            isOneToOne: false
            referencedRelation: "layer_rewards_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_revenue_v2: {
        Row: {
          collected_at: string | null
          created_at: string
          id: string
          nft_price_usdt: number
          revenue_amount_usdt: number
          revenue_type: string
          status: string
          trigger_level: number
          trigger_wallet: string
          tx_hash: string | null
        }
        Insert: {
          collected_at?: string | null
          created_at?: string
          id?: string
          nft_price_usdt: number
          revenue_amount_usdt: number
          revenue_type: string
          status?: string
          trigger_level: number
          trigger_wallet: string
          tx_hash?: string | null
        }
        Update: {
          collected_at?: string | null
          created_at?: string
          id?: string
          nft_price_usdt?: number
          revenue_amount_usdt?: number
          revenue_type?: string
          status?: string
          trigger_level?: number
          trigger_wallet?: string
          tx_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_revenue_v2_trigger_wallet_users_wallet_address_fk"
            columns: ["trigger_wallet"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      redeem_codes: {
        Row: {
          burn_tx_hash: string
          code: string
          created_at: string
          expires_at: string
          generated_from_wallet: string
          id: string
          partner_id: string | null
          service_nft_type: string
          used: boolean
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          burn_tx_hash: string
          code: string
          created_at?: string
          expires_at: string
          generated_from_wallet: string
          id?: string
          partner_id?: string | null
          service_nft_type: string
          used?: boolean
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          burn_tx_hash?: string
          code?: string
          created_at?: string
          expires_at?: string
          generated_from_wallet?: string
          id?: string
          partner_id?: string | null
          service_nft_type?: string
          used?: boolean
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "redeem_codes_partner_id_discover_partners_id_fk"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "discover_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_distributions_v2: {
        Row: {
          amount_usdt: number
          completed_at: string | null
          created_at: string
          distribution_method: string
          error_message: string | null
          failed_at: string | null
          id: string
          recipient_wallet: string
          reward_type: string
          source_reward_id: string | null
          status: string
          trigger_layer: number | null
          trigger_level: number
          trigger_wallet: string
          tx_hash: string | null
        }
        Insert: {
          amount_usdt: number
          completed_at?: string | null
          created_at?: string
          distribution_method: string
          error_message?: string | null
          failed_at?: string | null
          id?: string
          recipient_wallet: string
          reward_type: string
          source_reward_id?: string | null
          status?: string
          trigger_layer?: number | null
          trigger_level: number
          trigger_wallet: string
          tx_hash?: string | null
        }
        Update: {
          amount_usdt?: number
          completed_at?: string | null
          created_at?: string
          distribution_method?: string
          error_message?: string | null
          failed_at?: string | null
          id?: string
          recipient_wallet?: string
          reward_type?: string
          source_reward_id?: string | null
          status?: string
          trigger_layer?: number | null
          trigger_level?: number
          trigger_wallet?: string
          tx_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reward_distributions_v2_recipient_wallet_users_wallet_address_f"
            columns: ["recipient_wallet"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      system_status: {
        Row: {
          block_height: string | null
          created_at: string
          error_message: string | null
          id: string
          last_checked: string
          latency: number | null
          service: string
          status: string
        }
        Insert: {
          block_height?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          last_checked?: string
          latency?: number | null
          service: string
          status: string
        }
        Update: {
          block_height?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          last_checked?: string
          latency?: number | null
          service?: string
          status?: string
        }
        Relationships: []
      }
      token_purchases: {
        Row: {
          airdrop_tx_hash: string | null
          completed_at: string | null
          created_at: string
          id: string
          payembed_intent_id: string | null
          source_chain: string
          status: string
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
          status?: string
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
          status?: string
          token_amount?: number
          token_type?: string
          tx_hash?: string | null
          usdt_amount?: number
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_purchases_wallet_address_users_wallet_address_fk"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      user_activities: {
        Row: {
          activity_type: string
          amount: number | null
          amount_type: string | null
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          related_level: number | null
          related_wallet: string | null
          title: string
          wallet_address: string
        }
        Insert: {
          activity_type: string
          amount?: number | null
          amount_type?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          related_level?: number | null
          related_wallet?: string | null
          title: string
          wallet_address: string
        }
        Update: {
          activity_type?: string
          amount?: number | null
          amount_type?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          related_level?: number | null
          related_wallet?: string | null
          title?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activities_wallet_address_users_wallet_address_fk"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      user_notifications: {
        Row: {
          amount: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          related_wallet: string | null
          title: string
          type: string
          wallet_address: string
        }
        Insert: {
          amount?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          related_wallet?: string | null
          title: string
          type: string
          wallet_address: string
        }
        Update: {
          amount?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          related_wallet?: string | null
          title?: string
          type?: string
          wallet_address?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          activation_at: string | null
          created_at: string
          current_level: number
          email: string | null
          ipfs_avatar_cid: string | null
          ipfs_cover_cid: string | null
          ipfs_hash: string | null
          ipfs_profile_json_cid: string | null
          is_company_direct_referral: boolean | null
          last_updated_at: string
          last_wallet_connection_at: string | null
          member_activated: boolean
          preferred_language: string
          prepared_level: number | null
          prepared_price: number | null
          prepared_token_id: number | null
          referral_code: string | null
          referrer_wallet: string | null
          registered_at: string | null
          registration_expires_at: string | null
          registration_status: string
          registration_timeout_hours: number | null
          secondary_password_hash: string | null
          username: string | null
          wallet_address: string
          wallet_connection_count: number | null
        }
        Insert: {
          activation_at?: string | null
          created_at?: string
          current_level?: number
          email?: string | null
          ipfs_avatar_cid?: string | null
          ipfs_cover_cid?: string | null
          ipfs_hash?: string | null
          ipfs_profile_json_cid?: string | null
          is_company_direct_referral?: boolean | null
          last_updated_at?: string
          last_wallet_connection_at?: string | null
          member_activated?: boolean
          preferred_language?: string
          prepared_level?: number | null
          prepared_price?: number | null
          prepared_token_id?: number | null
          referral_code?: string | null
          referrer_wallet?: string | null
          registered_at?: string | null
          registration_expires_at?: string | null
          registration_status?: string
          registration_timeout_hours?: number | null
          secondary_password_hash?: string | null
          username?: string | null
          wallet_address: string
          wallet_connection_count?: number | null
        }
        Update: {
          activation_at?: string | null
          created_at?: string
          current_level?: number
          email?: string | null
          ipfs_avatar_cid?: string | null
          ipfs_cover_cid?: string | null
          ipfs_hash?: string | null
          ipfs_profile_json_cid?: string | null
          is_company_direct_referral?: boolean | null
          last_updated_at?: string
          last_wallet_connection_at?: string | null
          member_activated?: boolean
          preferred_language?: string
          prepared_level?: number | null
          prepared_price?: number | null
          prepared_token_id?: number | null
          referral_code?: string | null
          referrer_wallet?: string | null
          registered_at?: string | null
          registration_expires_at?: string | null
          registration_status?: string
          registration_timeout_hours?: number | null
          secondary_password_hash?: string | null
          username?: string | null
          wallet_address?: string
          wallet_connection_count?: number | null
        }
        Relationships: []
      }
      wallet_connection_logs: {
        Row: {
          connection_status: string
          connection_type: string
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
          connection_type: string
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
          connection_type?: string
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
