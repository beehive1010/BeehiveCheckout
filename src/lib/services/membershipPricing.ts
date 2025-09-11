import { supabase } from '../supabase';

export interface DatabaseMembershipLevel {
  level: number;
  level_name: string;
  price_usdc: number;
  bcc_release: number;
  unlock_layer: number;
  benefits?: any;
  is_active: boolean;
}

export interface LayerRule {
  layer: number;
  layer_name: string;
  positions_per_layer: number;
  direct_referrals_needed?: number;
  requires_direct_referrals: boolean;
  has_special_upgrade_rule: boolean;
  special_rule_description?: string;
}

/**
 * 从数据库获取所有NFT级别和价格
 */
export async function getMembershipLevelsFromDB(): Promise<DatabaseMembershipLevel[]> {
  try {
    const { data, error } = await supabase
      .from('nft_levels')
      .select('*')
      .eq('is_active', true)
      .order('level', { ascending: true });

    if (error) {
      console.error('❌ Error fetching membership levels:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('❌ Failed to load membership levels from database:', error);
    throw error;
  }
}

/**
 * 从数据库获取层级规则
 */
export async function getLayerRulesFromDB(): Promise<LayerRule[]> {
  try {
    const { data, error } = await supabase
      .from('layer_rules')
      .select('*')
      .order('layer', { ascending: true });

    if (error) {
      console.error('❌ Error fetching layer rules:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('❌ Failed to load layer rules from database:', error);
    throw error;
  }
}

/**
 * 获取特定级别的会员信息
 */
export async function getMembershipLevelFromDB(level: number): Promise<DatabaseMembershipLevel | null> {
  try {
    const { data, error } = await supabase
      .from('nft_levels')
      .select('*')
      .eq('level', level)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error(`❌ Error fetching membership level ${level}:`, error);
      return null;
    }

    return data;
  } catch (error) {
    console.error(`❌ Failed to load membership level ${level} from database:`, error);
    return null;
  }
}

/**
 * 获取特定层级的规则
 */
export async function getLayerRuleFromDB(layer: number): Promise<LayerRule | null> {
  try {
    const { data, error } = await supabase
      .from('layer_rules')
      .select('*')
      .eq('layer', layer)
      .single();

    if (error) {
      console.error(`❌ Error fetching layer rule ${layer}:`, error);
      return null;
    }

    return data;
  } catch (error) {
    console.error(`❌ Failed to load layer rule ${layer} from database:`, error);
    return null;
  }
}

/**
 * 格式化价格显示 (从分转换为美元)
 */
export function formatPrice(priceInCents: number): string {
  return (priceInCents / 100).toFixed(2);
}

/**
 * 格式化价格显示，显示美元符号
 */
export function formatPriceWithCurrency(priceInCents: number): string {
  return `$${formatPrice(priceInCents)} USDT`;
}