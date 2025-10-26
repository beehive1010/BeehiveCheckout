# Matrix Structure - Root Node 0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab

**根节点**: 0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab (root_beehive)
**等级**: Level 1
**NFT 数量**: 1

---

## 📊 Matrix 结构图

### Layer 0: 根节点
```
                    root_beehive
          (0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab)
                     Level 1, NFT: 1
                          |
           +--------------+---------------+
           |              |               |
           L              M               R
```

### Layer 1: 第一层（根节点的直接下级）

| 位置 | 钱包地址 | 用户名 | 等级 | NFT | 推荐类型 |
|------|----------|--------|------|-----|----------|
| **L** | `0xfd91667229a122265aF123a75bb624A9C35B5032` | **olddata_root** | Level 1 | 1 | direct |
| **M** | `0x5B307A53edFA4A3fbfB35Eb622827D31a685d0Fd` | **user_5** | Level 1 | 1 | direct |
| **R** | `0x96D05a1F161E7989618e08e211840ce4E07B14b1` | **user_6** | Level 1 | 1 | direct |

```
           olddata_root              user_5                 user_6
     (0xfd9...5032)            (0x5B3...d0Fd)         (0x96D...4b1)
       Level 1, NFT: 1           Level 1, NFT: 1        Level 1, NFT: 1
           |                         |                      |
     +-----+-----+             +-----+-----+          +-----+-----+
     |     |     |             |     |     |          |     |     |
     L     M     R             L     M     R          L     M     R
```

---

### Layer 2: 第二层

#### L 分支 (olddata_root 的下级)

| 父节点 | 位置 | 钱包地址 | 用户名 | 等级 | NFT | 推荐类型 |
|--------|------|----------|--------|------|-----|----------|
| olddata_root | **L** | `0x6c4C4E5702ed65c6F0fE84E45771Cb9c2e6196fd` | **user_4** | Level 1 | 1 | direct |
| olddata_root | **M** | `0x0314f6075959B7B3d1b156f693683d3155280F07` | **BeeHive2** | Level 1 | 1 | spillover |
| olddata_root | **R** | `0x7E2f17F2C1f6c1dD619B69C641E228EE0455ed6C` | **test_downline_2** | Level 1 | 1 | spillover |

```
                olddata_root (0xfd9...5032)
                        |
        +---------------+---------------+
        |               |               |
     user_4          BeeHive2    test_downline_2
  (0x6c4...6fd)    (0x031...0F07)  (0x7E2...d6C)
   Level 1, NFT: 1  Level 1, NFT: 1  Level 1, NFT: 1
   [direct]         [spillover]      [spillover]
```

#### M 分支 (user_5 的下级)

| 父节点 | 位置 | 钱包地址 | 用户名 | 等级 | NFT | 推荐类型 |
|--------|------|----------|--------|------|-----|----------|
| user_5 | **L** | `0x3C1FF5B4BE2A1FB8c157aF55aa6450eF66D7E242` | **user_7** | Level 2 | 2 | spillover |
| user_5 | **M** | `0x0bA198F73DF3A1374a49Acb2c293ccA20e150Fe0` | **test008** | Level 1 | 1 | spillover |
| user_5 | **R** | `0x32A1C9755C2b5AB526d2a6345E2eA9E44bB92f33` | **Test003** | Level 1 | 1 | spillover |

```
                    user_5 (0x5B3...d0Fd)
                        |
        +---------------+---------------+
        |               |               |
     user_7          test008          Test003
  (0x3C1...E242)   (0x0bA...0Fe0)  (0x32A...2f33)
   Level 2, NFT: 2  Level 1, NFT: 1  Level 1, NFT: 1
   [spillover]      [spillover]      [spillover]
```

#### R 分支 (user_6 的下级)

| 父节点 | 位置 | 钱包地址 | 用户名 | 等级 | NFT | 推荐类型 |
|--------|------|----------|--------|------|-----|----------|
| user_6 | **L** | `0x25E68a0ac4cba0Fe24409Dc4C97dE749113acB3A` | **Laurent3** | Level 1 | 1 | spillover |
| user_6 | **M** | `0x79f51D452c657ab7a5f1E60E2F432AaBEccD3173` | **test_downline_1** | Level 1 | 1 | spillover |
| user_6 | **R** | `0x17f5A6885ca39cc10983C76e9a476855E7b048aa` | **user_3** | Level 1 | 1 | spillover |

```
                    user_6 (0x96D...4b1)
                        |
        +---------------+---------------+
        |               |               |
    Laurent3      test_downline_1      user_3
  (0x25E...cB3A)  (0x79f...3173)   (0x17f...8aa)
   Level 1, NFT: 1  Level 1, NFT: 1  Level 1, NFT: 1
   [spillover]      [spillover]      [spillover]
```

---

## 📊 统计数据

### Layer 统计

| Layer | 成员数量 | L 位置 | M 位置 | R 位置 |
|-------|----------|--------|--------|--------|
| 0 (Root) | 1 | - | - | - |
| 1 | 3 | olddata_root | user_5 | user_6 |
| 2 | 9 | 3 | 3 | 3 |
| **Total** | **13** | - | - | - |

### 推荐类型统计

| 推荐类型 | Layer 1 | Layer 2 | Total |
|----------|---------|---------|-------|
| direct | 3 | 1 | 4 |
| spillover | 0 | 8 | 8 |
| **Total** | **3** | **9** | **12** |

### 等级分布

| 等级 | 数量 | 百分比 |
|------|------|--------|
| Level 1 | 11 | 91.7% |
| Level 2 | 1 | 8.3% |
| **Total** | **12** | **100%** |

---

## 🔍 重要发现

### 1. 满员情况
- ✅ **Layer 1**: 全满 (3/3 位置) - L, M, R 都有成员
- ✅ **Layer 2**: 全满 (9/9 位置) - 所有三个父节点的 L, M, R 都有成员

### 2. 推荐类型分析
- **Layer 1**: 全部为 `direct` (直接推荐)
  - 这是正常的，因为根节点直接推荐了这三个人

- **Layer 2**: 8个 `spillover` + 1个 `direct`
  - `user_4` 是 `olddata_root` 的直接推荐 (direct)
  - 其余 8 个都是 spillover (溢出分配)

### 3. 唯一的 Level 2 成员
- **user_7** (`0x3C1FF5B4BE2A1FB8c157aF55aa6450eF66D7E242`)
  - 位于 user_5 → L
  - 拥有 2 个 NFT
  - 是整个 matrix 中唯一的 Level 2 成员

### 4. Matrix 完整性
- ✅ 所有位置都已填满
- ✅ 没有重复位置
- ✅ BFS 顺序正确（从左到右，从上到下）

---

## 🎯 下一步 Matrix 扩展

如果继续添加新成员，下一层 (Layer 3) 将开始填充：

### Layer 3 预计结构
- 将在 Layer 2 的 9 个成员下继续扩展
- 每个 Layer 2 成员可以有 3 个下级 (L, M, R)
- Layer 3 最多可以容纳 **27 个成员** (9 × 3)

### 填充顺序 (BFS + L→M→R)
1. user_4 → L
2. user_4 → M
3. user_4 → R
4. BeeHive2 → L
5. BeeHive2 → M
6. ...依此类推

---

## 📝 数据来源

**数据库视图**: `v_matrix_direct_children`
**查询时间**: 2025-10-19
**根节点**: `0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab` (root_beehive)

**SQL 查询**:
```sql
-- Layer 1
SELECT * FROM v_matrix_direct_children
WHERE matrix_root_wallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab'
  AND parent_wallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab'
  AND layer_index = 1;

-- Layer 2
SELECT * FROM v_matrix_direct_children
WHERE matrix_root_wallet = '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab'
  AND layer_index = 2;
```

---

**创建时间**: 2025-10-19
**创建者**: Claude Code
