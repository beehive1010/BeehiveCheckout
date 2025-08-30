CREATE TABLE "ad_slots" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"banner_image_url" text NOT NULL,
	"link_url" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"position" text DEFAULT 'top' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" varchar NOT NULL,
	"session_token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "admin_settings" (
	"setting_key" text PRIMARY KEY NOT NULL,
	"setting_value" text NOT NULL,
	"description" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'viewer' NOT NULL,
	"permissions" text[] DEFAULT '{}',
	"status" text DEFAULT 'active' NOT NULL,
	"full_name" text,
	"notes" text,
	"created_by" text,
	"two_factor_secret" text,
	"two_factor_enabled" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_username_unique" UNIQUE("username"),
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "advertisement_nft_claims" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" varchar(42) NOT NULL,
	"nft_id" varchar NOT NULL,
	"bcc_amount_locked" integer NOT NULL,
	"bucket_used" text NOT NULL,
	"active_code" text NOT NULL,
	"status" text DEFAULT 'claimed' NOT NULL,
	"claimed_at" timestamp DEFAULT now() NOT NULL,
	"burned_at" timestamp,
	"code_used_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "advertisement_nfts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"image_url" text NOT NULL,
	"service_name" text NOT NULL,
	"service_type" text NOT NULL,
	"website_url" text,
	"price_bcc" integer NOT NULL,
	"code_template" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"total_supply" integer DEFAULT 1000 NOT NULL,
	"claimed_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" varchar NOT NULL,
	"action" text NOT NULL,
	"module" text NOT NULL,
	"target_id" text,
	"target_type" text,
	"old_values" jsonb,
	"new_values" jsonb,
	"ip_address" text,
	"user_agent" text,
	"severity" text DEFAULT 'info' NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bcc_balances" (
	"wallet_address" varchar(42) PRIMARY KEY NOT NULL,
	"transferable" integer DEFAULT 0 NOT NULL,
	"restricted" integer DEFAULT 0 NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"excerpt" text NOT NULL,
	"content" text NOT NULL,
	"author" text NOT NULL,
	"image_url" text,
	"published" boolean DEFAULT true NOT NULL,
	"published_at" timestamp DEFAULT now() NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"language" text DEFAULT 'en' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bridge_payments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" varchar NOT NULL,
	"source_chain" varchar NOT NULL,
	"source_tx_hash" varchar NOT NULL,
	"target_chain" varchar DEFAULT 'alpha-centauri' NOT NULL,
	"target_tx_hash" varchar,
	"usdt_amount" varchar NOT NULL,
	"membership_level" integer NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"bridge_wallet" varchar NOT NULL,
	"nft_token_id" varchar,
	"verified_at" timestamp,
	"minted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bridge_payments_source_tx_hash_unique" UNIQUE("source_tx_hash")
);
--> statement-breakpoint
CREATE TABLE "course_access" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" varchar(42) NOT NULL,
	"course_id" varchar NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"granted_at" timestamp DEFAULT now() NOT NULL,
	"zoom_nickname" text
);
--> statement-breakpoint
CREATE TABLE "course_lessons" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"video_url" text NOT NULL,
	"duration" text NOT NULL,
	"lesson_order" integer NOT NULL,
	"price_bcc" integer DEFAULT 0 NOT NULL,
	"is_free" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"required_level" integer DEFAULT 1 NOT NULL,
	"price_bcc" integer DEFAULT 0 NOT NULL,
	"is_free" boolean DEFAULT true NOT NULL,
	"duration" text NOT NULL,
	"course_type" text DEFAULT 'video' NOT NULL,
	"zoom_meeting_id" text,
	"zoom_password" text,
	"zoom_link" text,
	"video_url" text,
	"download_link" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cth_balances" (
	"wallet_address" varchar(42) PRIMARY KEY NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dapp_types" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon_url" text,
	"color" text DEFAULT '#FFA500' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dapp_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "discover_partners" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"logo_url" text,
	"website_url" text NOT NULL,
	"short_description" text NOT NULL,
	"long_description" text NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"chains" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"dapp_type" text NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"submitter_wallet" varchar(42),
	"redeem_code_used" text,
	"approved_by" varchar,
	"approved_at" timestamp,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "earnings_wallet" (
	"wallet_address" varchar(42) PRIMARY KEY NOT NULL,
	"total_earnings" numeric(10, 2) DEFAULT '0' NOT NULL,
	"referral_earnings" numeric(10, 2) DEFAULT '0' NOT NULL,
	"level_earnings" numeric(10, 2) DEFAULT '0' NOT NULL,
	"pending_rewards" numeric(10, 2) DEFAULT '0' NOT NULL,
	"withdrawn_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"last_reward_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "global_matrix_positions_v2" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" varchar(42) NOT NULL,
	"global_position" integer NOT NULL,
	"layer" integer NOT NULL,
	"position_in_layer" integer NOT NULL,
	"parent_wallet" varchar(42),
	"root_wallet" varchar(42) NOT NULL,
	"direct_sponsor_wallet" varchar(42) NOT NULL,
	"placement_sponsor_wallet" varchar(42) NOT NULL,
	"activated_at" timestamp DEFAULT now() NOT NULL,
	"last_active_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "layer_rewards_v2" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"root_wallet" varchar(42) NOT NULL,
	"trigger_wallet" varchar(42) NOT NULL,
	"trigger_level" integer NOT NULL,
	"trigger_layer" integer NOT NULL,
	"trigger_position" integer NOT NULL,
	"reward_amount_usdt" integer NOT NULL,
	"required_level" integer NOT NULL,
	"qualified" boolean NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"special_rule" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"confirmed_at" timestamp,
	"expired_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "lesson_access" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" varchar(42) NOT NULL,
	"lesson_id" varchar NOT NULL,
	"course_id" varchar NOT NULL,
	"unlocked_at" timestamp DEFAULT now() NOT NULL,
	"watch_progress" integer DEFAULT 0 NOT NULL,
	"completed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "level_config" (
	"level" integer PRIMARY KEY NOT NULL,
	"level_name" text NOT NULL,
	"price_usdt" integer NOT NULL,
	"nft_price_usdt" integer NOT NULL,
	"platform_fee_usdt" integer NOT NULL,
	"required_direct_referrals" integer DEFAULT 1 NOT NULL,
	"max_matrix_count" integer DEFAULT 9 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matrix_tree_v2" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"root_wallet" varchar(42) NOT NULL,
	"layer" integer NOT NULL,
	"member_wallet" varchar(42) NOT NULL,
	"position" integer NOT NULL,
	"parent_wallet" varchar(42),
	"joined_tree_at" timestamp DEFAULT now() NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_nft_verification" (
	"wallet_address" varchar(42) PRIMARY KEY NOT NULL,
	"nft_contract_address" varchar(42) NOT NULL,
	"token_id" varchar NOT NULL,
	"chain_id" integer NOT NULL,
	"verification_status" text DEFAULT 'pending' NOT NULL,
	"last_verified" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membership_nfts_v2" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" varchar(42) NOT NULL,
	"level" integer NOT NULL,
	"level_name" text NOT NULL,
	"price_paid_usdt" integer NOT NULL,
	"nft_token_id" integer,
	"contract_address" varchar(42),
	"tx_hash" text,
	"purchased_at" timestamp DEFAULT now() NOT NULL,
	"activated_at" timestamp,
	"status" text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merchant_nfts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"image_url" text NOT NULL,
	"price_bcc" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nft_claim_records" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" varchar(42) NOT NULL,
	"level" integer NOT NULL,
	"token_id" integer NOT NULL,
	"source_chain" varchar NOT NULL,
	"target_chain" varchar NOT NULL,
	"payment_tx_hash" varchar NOT NULL,
	"claim_tx_hash" varchar,
	"bridge_wallet" varchar(42) NOT NULL,
	"usdt_amount" integer NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"verified_at" timestamp,
	"claimed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nft_purchases" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" varchar(42) NOT NULL,
	"nft_id" varchar NOT NULL,
	"amount_bcc" integer NOT NULL,
	"bucket_used" text NOT NULL,
	"tx_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" varchar(42) NOT NULL,
	"level" integer NOT NULL,
	"token_id" integer NOT NULL,
	"amount_usdt" integer NOT NULL,
	"chain" text NOT NULL,
	"tx_hash" text,
	"payembed_intent_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "partner_chains" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"logo_url" text,
	"explorer_url" text NOT NULL,
	"docs_url" text,
	"rpc_url" text,
	"chain_id" integer,
	"native_currency" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "partner_chains_name_unique" UNIQUE("name"),
	CONSTRAINT "partner_chains_chain_id_unique" UNIQUE("chain_id")
);
--> statement-breakpoint
CREATE TABLE "pending_rewards_v2" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"original_reward_id" varchar NOT NULL,
	"current_recipient_wallet" varchar(42) NOT NULL,
	"original_recipient_wallet" varchar(42) NOT NULL,
	"reward_amount_usdt" integer NOT NULL,
	"required_level" integer NOT NULL,
	"timeout_hours" integer DEFAULT 72 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reallocation_attempts" integer DEFAULT 0 NOT NULL,
	"claimed_at" timestamp,
	"reallocated_at" timestamp,
	"reallocated_to_wallet" varchar(42)
);
--> statement-breakpoint
CREATE TABLE "platform_revenue_v2" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trigger_wallet" varchar(42) NOT NULL,
	"trigger_level" integer NOT NULL,
	"revenue_amount_usdt" integer NOT NULL,
	"revenue_type" text NOT NULL,
	"nft_price_usdt" integer NOT NULL,
	"tx_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"collected_at" timestamp,
	"status" text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "redeem_codes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"service_nft_type" text NOT NULL,
	"generated_from_wallet" varchar(42) NOT NULL,
	"burn_tx_hash" text NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"used_by" varchar(42),
	"used_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"partner_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "redeem_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "reward_distributions_v2" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_wallet" varchar(42) NOT NULL,
	"reward_type" text NOT NULL,
	"amount_usdt" integer NOT NULL,
	"source_reward_id" varchar,
	"trigger_wallet" varchar(42) NOT NULL,
	"trigger_level" integer NOT NULL,
	"trigger_layer" integer,
	"distribution_method" text NOT NULL,
	"tx_hash" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"failed_at" timestamp,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "system_status" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service" text NOT NULL,
	"status" text NOT NULL,
	"latency" integer,
	"block_height" varchar,
	"error_message" text,
	"last_checked" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "token_purchases" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" varchar(42) NOT NULL,
	"token_type" text NOT NULL,
	"token_amount" integer NOT NULL,
	"usdt_amount" integer NOT NULL,
	"source_chain" text NOT NULL,
	"tx_hash" text,
	"payembed_intent_id" text,
	"airdrop_tx_hash" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_activities" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" varchar(42) NOT NULL,
	"activity_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"amount" numeric(10, 2),
	"amount_type" text,
	"related_wallet" varchar(42),
	"related_level" integer,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" varchar(42) NOT NULL,
	"title" varchar NOT NULL,
	"message" text NOT NULL,
	"type" varchar NOT NULL,
	"related_wallet" varchar(42),
	"amount" varchar,
	"metadata" jsonb,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"wallet_address" varchar(42) PRIMARY KEY NOT NULL,
	"email" text,
	"username" text,
	"secondary_password_hash" text,
	"ipfs_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_updated_at" timestamp DEFAULT now() NOT NULL,
	"referrer_wallet" varchar(42),
	"member_activated" boolean DEFAULT false NOT NULL,
	"current_level" integer DEFAULT 0 NOT NULL,
	"preferred_language" text DEFAULT 'en' NOT NULL,
	"registration_status" text DEFAULT 'not_started' NOT NULL,
	"ipfs_avatar_cid" text,
	"ipfs_cover_cid" text,
	"ipfs_profile_json_cid" text,
	"prepared_level" integer,
	"prepared_token_id" integer,
	"prepared_price" integer,
	"activation_at" timestamp,
	"registered_at" timestamp,
	"registration_expires_at" timestamp,
	"registration_timeout_hours" integer DEFAULT 48,
	"last_wallet_connection_at" timestamp,
	"wallet_connection_count" integer DEFAULT 0,
	"referral_code" text,
	"is_company_direct_referral" boolean DEFAULT false,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "wallet_connection_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" varchar(42) NOT NULL,
	"connection_type" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"referrer_url" text,
	"referral_code" text,
	"upline_wallet" varchar(42),
	"connection_status" text DEFAULT 'success' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ad_slots" ADD CONSTRAINT "ad_slots_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_id_admin_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advertisement_nft_claims" ADD CONSTRAINT "advertisement_nft_claims_wallet_address_users_wallet_address_fk" FOREIGN KEY ("wallet_address") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advertisement_nft_claims" ADD CONSTRAINT "advertisement_nft_claims_nft_id_advertisement_nfts_id_fk" FOREIGN KEY ("nft_id") REFERENCES "public"."advertisement_nfts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_id_admin_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bcc_balances" ADD CONSTRAINT "bcc_balances_wallet_address_users_wallet_address_fk" FOREIGN KEY ("wallet_address") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_access" ADD CONSTRAINT "course_access_wallet_address_users_wallet_address_fk" FOREIGN KEY ("wallet_address") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_access" ADD CONSTRAINT "course_access_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_lessons" ADD CONSTRAINT "course_lessons_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cth_balances" ADD CONSTRAINT "cth_balances_wallet_address_users_wallet_address_fk" FOREIGN KEY ("wallet_address") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discover_partners" ADD CONSTRAINT "discover_partners_approved_by_admin_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "earnings_wallet" ADD CONSTRAINT "earnings_wallet_wallet_address_users_wallet_address_fk" FOREIGN KEY ("wallet_address") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "global_matrix_positions_v2" ADD CONSTRAINT "global_matrix_positions_v2_wallet_address_users_wallet_address_fk" FOREIGN KEY ("wallet_address") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "layer_rewards_v2" ADD CONSTRAINT "layer_rewards_v2_root_wallet_users_wallet_address_fk" FOREIGN KEY ("root_wallet") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "layer_rewards_v2" ADD CONSTRAINT "layer_rewards_v2_trigger_wallet_users_wallet_address_fk" FOREIGN KEY ("trigger_wallet") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_access" ADD CONSTRAINT "lesson_access_wallet_address_users_wallet_address_fk" FOREIGN KEY ("wallet_address") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_access" ADD CONSTRAINT "lesson_access_lesson_id_course_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."course_lessons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_access" ADD CONSTRAINT "lesson_access_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matrix_tree_v2" ADD CONSTRAINT "matrix_tree_v2_root_wallet_users_wallet_address_fk" FOREIGN KEY ("root_wallet") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matrix_tree_v2" ADD CONSTRAINT "matrix_tree_v2_member_wallet_users_wallet_address_fk" FOREIGN KEY ("member_wallet") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_nft_verification" ADD CONSTRAINT "member_nft_verification_wallet_address_users_wallet_address_fk" FOREIGN KEY ("wallet_address") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_nfts_v2" ADD CONSTRAINT "membership_nfts_v2_wallet_address_users_wallet_address_fk" FOREIGN KEY ("wallet_address") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nft_claim_records" ADD CONSTRAINT "nft_claim_records_wallet_address_users_wallet_address_fk" FOREIGN KEY ("wallet_address") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nft_purchases" ADD CONSTRAINT "nft_purchases_wallet_address_users_wallet_address_fk" FOREIGN KEY ("wallet_address") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nft_purchases" ADD CONSTRAINT "nft_purchases_nft_id_merchant_nfts_id_fk" FOREIGN KEY ("nft_id") REFERENCES "public"."merchant_nfts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_wallet_address_users_wallet_address_fk" FOREIGN KEY ("wallet_address") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_rewards_v2" ADD CONSTRAINT "pending_rewards_v2_original_reward_id_layer_rewards_v2_id_fk" FOREIGN KEY ("original_reward_id") REFERENCES "public"."layer_rewards_v2"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_rewards_v2" ADD CONSTRAINT "pending_rewards_v2_current_recipient_wallet_users_wallet_address_fk" FOREIGN KEY ("current_recipient_wallet") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_rewards_v2" ADD CONSTRAINT "pending_rewards_v2_original_recipient_wallet_users_wallet_address_fk" FOREIGN KEY ("original_recipient_wallet") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_revenue_v2" ADD CONSTRAINT "platform_revenue_v2_trigger_wallet_users_wallet_address_fk" FOREIGN KEY ("trigger_wallet") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redeem_codes" ADD CONSTRAINT "redeem_codes_partner_id_discover_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."discover_partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_distributions_v2" ADD CONSTRAINT "reward_distributions_v2_recipient_wallet_users_wallet_address_fk" FOREIGN KEY ("recipient_wallet") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_purchases" ADD CONSTRAINT "token_purchases_wallet_address_users_wallet_address_fk" FOREIGN KEY ("wallet_address") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_activities" ADD CONSTRAINT "user_activities_wallet_address_users_wallet_address_fk" FOREIGN KEY ("wallet_address") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;