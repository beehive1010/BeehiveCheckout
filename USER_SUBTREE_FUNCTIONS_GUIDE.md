# User Matrix Subtree Functions - Usage Guide

## 📋 Overview

New database functions that allow each user to query their own 19-layer matrix subtree, even though all members share the same Genesis `matrix_root_wallet`.

**Migration**: `supabase/migrations/20251103000001_create_user_subtree_views.sql`

## 🎯 Problem Solved

Previously, all 4,076 members had the same `matrix_root_wallet` (Genesis: `0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab`), making it impossible to query "a user's tree" using `WHERE matrix_root_wallet = user_wallet`.

**Solution**: Use recursive CTEs based on `parent_wallet` relationships to build each user's subtree dynamically.

## 🔧 Available Functions

### 1. `fn_get_user_matrix_subtree(p_root_wallet)`

Returns the complete subtree (up to 19 layers) for a specific user.

**Returns:**
```sql
{
  matrix_root_wallet VARCHAR(42),    -- Genesis root
  layer INT,                         -- Layer relative to querying user (0 = user themselves)
  member_wallet VARCHAR(42),
  parent_wallet VARCHAR(42),
  slot CHAR(1),                      -- L, M, or R
  referral_type TEXT,                -- 'direct' or 'spillover'
  activation_time TIMESTAMP,
  activation_sequence INT,
  current_level INT,                 -- Membership level
  referrer_wallet VARCHAR(42),
  has_children BOOLEAN,
  children_count BIGINT,
  children_slots JSONB,              -- {L: wallet, M: wallet, R: wallet}
  depth_from_user INT                -- Same as layer
}
```

**Example:**
```sql
-- Get all downline members for user 0xfd91...5032
SELECT *
FROM fn_get_user_matrix_subtree('0xfd91667229a122265aF123a75bb624A9C35B5032')
WHERE layer <= 3
ORDER BY layer, activation_sequence;
```

**Result:**
- Layer 0: The user themselves
- Layer 1-19: All descendants in the matrix tree

### 2. `fn_get_user_matrix_stats(p_user_wallet)`

Returns summary statistics about a user's subtree.

**Returns:**
```sql
{
  total_members BIGINT,              -- Count of all downline members (excluding user)
  max_depth INT,                     -- Maximum depth of the tree
  direct_children INT,               -- Members directly referred
  spillover_children INT,            -- Members placed via spillover
  layer_distribution JSONB,          -- {"1": count, "2": count, ...}
  position_distribution JSONB        -- {"L": count, "M": count, "R": count}
}
```

**Example:**
```sql
SELECT * FROM fn_get_user_matrix_stats('0xfd91667229a122265aF123a75bb624A9C35B5032');
```

**Example Result:**
```
total_members: 1428
max_depth: 18
direct_children: 1226
spillover_children: 202
layer_distribution: {"1": 3, "2": 9, "3": 27, "4": 81, ...}
position_distribution: {"L": 574, "M": 461, "R": 393}
```

### 3. `fn_get_user_matrix_layer(p_user_wallet, p_layer, p_limit, p_offset)`

Returns members at a specific layer with pagination support.

**Parameters:**
- `p_user_wallet`: User to query
- `p_layer`: Layer number (1 = direct children, 2 = grandchildren, etc.)
- `p_limit`: Page size (default 100)
- `p_offset`: Offset for pagination (default 0)

**Returns:**
```sql
{
  member_wallet VARCHAR(42),
  parent_wallet VARCHAR(42),
  slot CHAR(1),
  referral_type TEXT,
  activation_time TIMESTAMP,
  activation_sequence INT,
  current_level INT,
  has_children BOOLEAN,
  children_count BIGINT
}
```

**Example:**
```sql
-- Get layer 1 (direct children) - first page
SELECT * FROM fn_get_user_matrix_layer('0xfd91...5032', 1, 20, 0);

-- Get layer 2 (grandchildren) - second page
SELECT * FROM fn_get_user_matrix_layer('0xfd91...5032', 2, 20, 20);
```

### 4. `v_user_matrix_subtree` (View)

Summary view for quick subtree info.

**Columns:**
```sql
{
  root_wallet VARCHAR(42),           -- User wallet
  genesis_root VARCHAR(42),          -- Genesis matrix_root_wallet
  root_layer_in_genesis INT,         -- User's layer in Genesis tree
  direct_children_count INT,         -- Count of L/M/R children
  direct_children_slots JSONB        -- {L: wallet, M: wallet, R: wallet}
}
```

**Example:**
```sql
SELECT * FROM v_user_matrix_subtree
WHERE root_wallet = '0xfd91667229a122265aF123a75bb624A9C35B5032';
```

## 📡 Frontend Integration

### TypeScript Types

```typescript
export interface UserSubtreeMember {
  matrix_root_wallet: string;
  layer: number;
  member_wallet: string;
  parent_wallet: string;
  slot: 'L' | 'M' | 'R' | null;
  referral_type: 'direct' | 'spillover';
  activation_time: string;
  activation_sequence: number;
  current_level: number;
  referrer_wallet: string;
  has_children: boolean;
  children_count: number;
  children_slots: {
    L: string | null;
    M: string | null;
    R: string | null;
  };
  depth_from_user: number;
}

export interface UserSubtreeStats {
  total_members: number;
  max_depth: number;
  direct_children: number;
  spillover_children: number;
  layer_distribution: Record<string, number>;
  position_distribution: {
    L: number;
    M: number;
    R: number;
  };
}
```

### React Query Hooks

```typescript
// Get user's full subtree
export function useUserSubtree(walletAddress: string | null) {
  return useQuery({
    queryKey: ['user-subtree', walletAddress],
    queryFn: async () => {
      if (!walletAddress) throw new Error('Wallet required');

      const { data, error } = await supabase
        .rpc('fn_get_user_matrix_subtree', {
          p_root_wallet: walletAddress
        });

      if (error) throw error;
      return data as UserSubtreeMember[];
    },
    enabled: !!walletAddress,
    staleTime: 60000, // 1 min cache
  });
}

// Get user's subtree statistics
export function useUserSubtreeStats(walletAddress: string | null) {
  return useQuery({
    queryKey: ['user-subtree-stats', walletAddress],
    queryFn: async () => {
      if (!walletAddress) throw new Error('Wallet required');

      const { data, error } = await supabase
        .rpc('fn_get_user_matrix_stats', {
          p_user_wallet: walletAddress
        });

      if (error) throw error;
      return data[0] as UserSubtreeStats;
    },
    enabled: !!walletAddress,
    staleTime: 60000,
  });
}

// Get specific layer with pagination
export function useUserMatrixLayer(
  walletAddress: string | null,
  layer: number,
  options: { limit?: number; offset?: number } = {}
) {
  const { limit = 100, offset = 0 } = options;

  return useQuery({
    queryKey: ['user-matrix-layer', walletAddress, layer, limit, offset],
    queryFn: async () => {
      if (!walletAddress) throw new Error('Wallet required');

      const { data, error } = await supabase
        .rpc('fn_get_user_matrix_layer', {
          p_user_wallet: walletAddress,
          p_layer: layer,
          p_limit: limit,
          p_offset: offset
        });

      if (error) throw error;
      return data;
    },
    enabled: !!walletAddress && layer >= 1 && layer <= 19,
    staleTime: 60000,
  });
}
```

### Component Example

```typescript
function UserMatrixDashboard({ walletAddress }: { walletAddress: string }) {
  const { data: stats, isLoading: loadingStats } = useUserSubtreeStats(walletAddress);
  const { data: layer1, isLoading: loadingLayer1 } = useUserMatrixLayer(walletAddress, 1);

  if (loadingStats || loadingLayer1) return <Spinner />;

  return (
    <div>
      <h2>Your Matrix Network</h2>

      {/* Statistics */}
      <div className="stats-grid">
        <StatCard title="Total Team" value={stats.total_members} />
        <StatCard title="Direct Referrals" value={stats.direct_children} />
        <StatCard title="Spillover Placements" value={stats.spillover_children} />
        <StatCard title="Maximum Depth" value={stats.max_depth} />
      </div>

      {/* Layer Distribution Chart */}
      <LayerDistributionChart data={stats.layer_distribution} />

      {/* Direct Children (Layer 1) */}
      <div>
        <h3>Your Direct Children (Layer 1)</h3>
        <MemberTable members={layer1} />
      </div>
    </div>
  );
}
```

## 🎨 UI/UX Recommendations

### Dashboard View
1. **Stats Overview**: Show `fn_get_user_matrix_stats()` summary cards
2. **Tree Visualization**: Use layer 1-3 data for interactive tree diagram
3. **Layer Navigation**: Tabs or dropdown to view layers 1-19 separately

### Matrix Tree View
1. **Root Node**: Show user at center/top
2. **Children Nodes**: Display L, M, R positions clearly
3. **Click to Drill Down**: When clicking a node, re-query with that member as root
4. **Color Coding**:
   - Direct referrals: Green
   - Spillover placements: Blue/Gray
   - Empty slots: Dotted outline

### Performance Tips
1. **Lazy Loading**: Load layers on-demand when user expands
2. **Pagination**: Use `fn_get_user_matrix_layer()` with limit/offset for large layers
3. **Caching**: React Query's staleTime prevents unnecessary re-fetches
4. **Virtualization**: For large lists (layer 5+), use `react-window` or `@tanstack/react-virtual`

## ✅ Testing Results

**Genesis User (0x479AB...E616Ab):**
- Total downline: 3,946 members
- Max depth: 19 layers
- Direct: 3,450 | Spillover: 496

**Regular User (0xfd916...35B5032):**
- Total downline: 1,428 members
- Max depth: 18 layers
- Direct: 1,226 | Spillover: 202
- Layer 1: 3 children (L, M, R)

## 🔗 Related Files

- Migration: `supabase/migrations/20251103000001_create_user_subtree_views.sql`
- Member Hooks: `src/hooks/useMemberAPI.ts` (can add subtree hooks here)
- Integration Guide: `MEMBER_MANAGEMENT_INTEGRATION_GUIDE.md`

## 📝 Notes

1. **Layer 0**: Always returns the querying user themselves
2. **Depth Limit**: Hard-coded to 19 layers (matches matrix design)
3. **Case Insensitive**: All wallet comparisons use `LOWER()` for consistency
4. **Performance**: Recursive CTEs are optimized with depth limit and proper indexing
5. **Referral Type Logic**:
   - `direct`: `referrer_wallet = parent_wallet`
   - `spillover`: `referrer_wallet != parent_wallet`
