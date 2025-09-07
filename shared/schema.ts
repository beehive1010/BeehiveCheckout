import { pgTable, varchar, text, boolean, integer, timestamp, uuid, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Simplified users table - the core of the new architecture
export const users = pgTable('users', {
  wallet_address: varchar('wallet_address', { length: 42 }).primaryKey().notNull(),
  referrer_wallet: varchar('referrer_wallet', { length: 42 }),
  username: text('username'),
  email: text('email'),
  is_upgraded: boolean('is_upgraded').notNull().default(false),
  upgrade_timer_enabled: boolean('upgrade_timer_enabled').notNull().default(false),
  current_level: integer('current_level').notNull().default(0),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  is_admin: boolean('is_admin').default(false),
  auth_user_id: uuid('auth_user_id'),
  email_verified: boolean('email_verified').default(false),
  phone_verified: boolean('phone_verified').default(false),
}, (table) => ({
  usersUsernameKey: uniqueIndex('users_username_key').on(table.username),
  idxUsersReferrer: index('idx_users_referrer').on(table.referrer_wallet),
  idxUsersCreated: index('idx_users_created').on(table.created_at),
  idxUsersLevel: index('idx_users_level').on(table.current_level),
  idxUsersAuthUserId: uniqueIndex('idx_users_auth_user_id').on(table.auth_user_id),
}));

// Members table - created only when user claims Level 1 NFT
export const members = pgTable('members', {
  wallet_address: varchar('wallet_address', { length: 42 }).primaryKey().notNull(),
  current_level: integer('current_level').notNull().default(1),
  levels_owned: text('levels_owned').array().notNull().default(sql`'{}'::text[]`),
  total_direct_referrals: integer('total_direct_referrals').notNull().default(0),
  total_team_volume: integer('total_team_volume').notNull().default(0),
  is_activated: boolean('is_activated').notNull().default(true),
  activation_date: timestamp('activation_date', { withTimezone: true }).notNull().defaultNow(),
  last_activity: timestamp('last_activity', { withTimezone: true }).notNull().defaultNow(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  idxMembersLevel: index('idx_members_level').on(table.current_level),
  idxMembersActivated: index('idx_members_activated').on(table.is_activated),
}));

// Referrals table - tracks the 3x3 matrix structure
export const referrals = pgTable('referrals', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  wallet_address: varchar('wallet_address', { length: 42 }).notNull(),
  referrer_wallet: varchar('referrer_wallet', { length: 42 }).notNull(),
  level: integer('level').notNull(),
  position: integer('position').notNull(), // 1-9 for 3x3 matrix
  is_active: boolean('is_active').notNull().default(true),
  referral_date: timestamp('referral_date', { withTimezone: true }).notNull().defaultNow(),
  commission_earned: integer('commission_earned').notNull().default(0),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  idxReferralsWallet: index('idx_referrals_wallet').on(table.wallet_address),
  idxReferralsReferrer: index('idx_referrals_referrer').on(table.referrer_wallet),
  idxReferralsLevel: index('idx_referrals_level').on(table.level),
}));

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({
  created_at: true,
  updated_at: true,
});

export const insertMemberSchema = createInsertSchema(members).omit({
  created_at: true,
  updated_at: true,
  activation_date: true,
  last_activity: true,
});

export const insertReferralSchema = createInsertSchema(referrals).omit({
  id: true,
  created_at: true,
  updated_at: true,
  referral_date: true,
});

// TypeScript types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Member = typeof members.$inferSelect;
export type InsertMember = z.infer<typeof insertMemberSchema>;

export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = z.infer<typeof insertReferralSchema>;