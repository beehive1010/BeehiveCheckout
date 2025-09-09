export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          wallet_address: string;
          username: string;
          email: string | null;
          referrer_wallet: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          wallet_address: string;
          username: string;
          email?: string | null;
          referrer_wallet?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          wallet_address?: string;
          username?: string;
          email?: string | null;
          referrer_wallet?: string | null;
          updated_at?: string;
        };
      };
      members: {
        Row: {
          wallet_address: string;
          current_level: number;
          levels_owned: number[];
          has_pending_rewards: boolean;
          referrer_wallet: string | null;
          activation_rank: number;
          tier_level: number;
          is_active: boolean | null;
          is_activated: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          wallet_address: string;
          current_level: number;
          levels_owned?: number[];
          has_pending_rewards?: boolean;
          referrer_wallet?: string | null;
          activation_rank?: number;
          tier_level?: number;
          is_active?: boolean;
          is_activated?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          current_level?: number;
          levels_owned?: number[];
          has_pending_rewards?: boolean;
          referrer_wallet?: string | null;
          activation_rank?: number;
          tier_level?: number;
          is_active?: boolean;
          is_activated?: boolean;
          updated_at?: string;
        };
      };
      referrals: {
        Row: {
          id: number;
          referred_wallet: string;
          referrer_wallet: string;
          placement_root: string;
          placement_layer: number;
          placement_position: string;
          placement_path: string;
          referral_type: string;
          status: string;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          referred_wallet: string;
          referrer_wallet: string;
          placement_root: string;
          placement_layer: number;
          placement_position: string;
          placement_path: string;
          referral_type: string;
          status: string;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          referred_wallet?: string;
          referrer_wallet?: string;
          placement_root?: string;
          placement_layer?: number;
          placement_position?: string;
          placement_path?: string;
          referral_type?: string;
          status?: string;
          updated_at?: string;
        };
      };
      bcc_balances: {
        Row: {
          wallet_address: string;
          transferable_amount: number;
          locked_amount: number;
          restricted_amount: number;
          total_earned: number;
          last_updated: string;
          created_at: string;
        };
        Insert: {
          wallet_address: string;
          transferable_amount?: number;
          locked_amount?: number;
          restricted_amount?: number;
          total_earned?: number;
          last_updated?: string;
          created_at?: string;
        };
        Update: {
          transferable_amount?: number;
          locked_amount?: number;
          restricted_amount?: number;
          total_earned?: number;
          last_updated?: string;
        };
      };
      bcc_transactions: {
        Row: {
          id: number;
          wallet_address: string;
          amount: number;
          balance_type: string;
          transaction_type: string;
          purpose: string;
          status: string;
          created_at: string;
          processed_at: string | null;
          metadata: Record<string, any> | null;
        };
        Insert: {
          wallet_address: string;
          amount: number;
          balance_type: string;
          transaction_type: string;
          purpose: string;
          status: string;
          created_at?: string;
          processed_at?: string | null;
          metadata?: Record<string, any> | null;
        };
        Update: {
          amount?: number;
          balance_type?: string;
          transaction_type?: string;
          purpose?: string;
          status?: string;
          processed_at?: string | null;
          metadata?: Record<string, any> | null;
        };
      };
      matrix_positions: {
        Row: {
          id: number;
          wallet_address: string;
          level: number;
          parent_wallet: string | null;
          position_in_parent: string | null;
          root_wallet: string;
          layer: number;
          left_child: string | null;
          center_child: string | null;
          right_child: string | null;
          is_filled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          wallet_address: string;
          level: number;
          parent_wallet?: string | null;
          position_in_parent?: string | null;
          root_wallet: string;
          layer: number;
          left_child?: string | null;
          center_child?: string | null;
          right_child?: string | null;
          is_filled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          parent_wallet?: string | null;
          position_in_parent?: string | null;
          root_wallet?: string;
          layer?: number;
          left_child?: string | null;
          center_child?: string | null;
          right_child?: string | null;
          is_filled?: boolean;
          updated_at?: string;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}