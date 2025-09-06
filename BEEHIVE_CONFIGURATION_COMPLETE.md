# 🐝 Beehive Platform - Complete Configuration

## 🎯 Layer Rules & Matrix System (19 Levels)

### **3×3 Matrix Structure**
- **Width**: 3 positions per level (L, M, R)
- **Depth**: 19 layers maximum
- **Growth**: Exponential (Layer 1: 3, Layer 2: 9, Layer 3: 27, etc.)
- **Spillover**: Enabled across all layers
- **Total Positions**: 1,743,391,199 at Layer 19

### **Layer Configuration**
```sql
Layer 1:  3 positions (Direct Referrals)
Layer 2:  9 positions (Second Level) 
Layer 3:  27 positions (Third Level) - 24h delay
Layer 4:  81 positions (Fourth Level) - 24h delay
Layer 5:  243 positions (Fifth Level) - 48h delay
...continuing exponentially to...
Layer 19: 1,162,261,467 positions (Ultimate Level) - 216h delay
```

## 💎 NFT Level Details (Token IDs 1-19)

### **Level 1-5: Basic Membership ($100-$500)**
| Level | Token ID | Name | Price USDT | BCC Reward | Benefits |
|-------|----------|------|------------|------------|----------|
| 1 | 1 | Bronze Bee | $100 | 10,000 | Basic courses, community, 10K BCC |
| 2 | 2 | Silver Bee | $150 | 15,000 | Level 2 courses, increased rewards, 15K BCC |
| 3 | 3 | Gold Bee | $200 | 22,000 | Priority support, advanced courses, 22K BCC |
| 4 | 4 | Platinum Bee | $300 | 35,000 | VIP access, exclusive events, 35K BCC |
| 5 | 5 | Diamond Bee | $500 | 60,000 | Mentorship, diamond rewards, 60K BCC |

### **Level 6-10: Advanced Membership ($600-$1,000)**
| Level | Token ID | Name | Price USDT | BCC Reward | Benefits |
|-------|----------|------|------------|------------|----------|
| 6 | 6 | Ruby Master | $600 | 75,000 | Master training, ruby rewards, 75K BCC |
| 7 | 7 | Sapphire Elite | $700 | 90,000 | Elite networking, advanced strategies, 90K BCC |
| 8 | 8 | Emerald Pro | $750 | 100,000 | Pro tools, market insights, 100K BCC |
| 9 | 9 | Titanium Exec | $800 | 115,000 | Executive access, premium analytics, 115K BCC |
| 10 | 10 | Quantum Innovator | $1,000 | 150,000 | Innovation labs, quantum rewards, 150K BCC |

### **Level 11-15: Master Tier ($1,200-$2,000)**
| Level | Token ID | Name | Price USDT | BCC Reward | Benefits |
|-------|----------|------|------------|------------|----------|
| 11 | 11 | Phoenix Rising | $1,200 | 180,000 | Phoenix access, rising rewards, 180K BCC |
| 12 | 12 | Dragon Master | $1,400 | 210,000 | Dragon power, master rewards, 210K BCC |
| 13 | 13 | Cosmic Guardian | $1,600 | 240,000 | Cosmic insights, guardian privileges, 240K BCC |
| 14 | 14 | Galaxy Emperor | $1,800 | 280,000 | Emperor status, galaxy rewards, 280K BCC |
| 15 | 15 | Universe Architect | $2,000 | 320,000 | Architect powers, universe access, 320K BCC |

### **Level 16-19: Legendary Tier ($2,500-$5,000)**
| Level | Token ID | Name | Price USDT | BCC Reward | Benefits |
|-------|----------|------|------------|------------|----------|
| 16 | 16 | Infinity Sage | $2,500 | 400,000 | Infinite wisdom, sage rewards, 400K BCC |
| 17 | 17 | Eternity Lord | $3,000 | 500,000 | Eternal status, lord privileges, 500K BCC |
| 18 | 18 | Omnipotent Deity | $4,000 | 700,000 | Omnipotent powers, divine rewards, 700K BCC |
| 19 | 19 | Ultimate Genesis | $5,000 | 1,000,000 | Genesis creation, ultimate mastery, 1M BCC |

## 💰 Reward Distribution Rules

### **1. Direct Referral Rewards**
- **Rate**: 10% of upgrade price
- **Eligibility**: Must be activated member
- **Claim Window**: 168 hours (7 days)
- **Auto-claim**: No (manual claiming required)

### **2. Layer-Based Matrix Rewards**
| Layer Range | Reward Rate | Description |
|-------------|-------------|-------------|
| Layer 1 | 5.00% | Direct referrals |
| Layer 2 | 3.00% | Second level |
| Layers 3-5 | 2.00% | Early expansion |
| Layers 6-10 | 1.50% | Mid-tier growth |
| Layers 11-15 | 1.00% | Advanced levels |
| Layers 16-19 | 0.50% | Ultimate reach |

### **3. Upgrade Bonus Rewards**
- **Level 5** (Diamond Bee): $50 USDT bonus
- **Level 10** (Quantum Innovator): $100 USDT bonus  
- **Level 15** (Universe Architect): $200 USDT bonus
- **Level 19** (Ultimate Genesis): $500 USDT bonus
- **Auto-claim**: Yes (automatic distribution)

### **4. Spillover Rewards**
- **Amount**: $5 USDT per spillover placement
- **Auto-claim**: Yes
- **Claim Window**: 72 hours
- **Trigger**: When someone is placed in your matrix via spillover

## ⚡ Claim Rules & Processing

### **Claim Windows**
- **Direct Referrals**: 168 hours (7 days)
- **Layer Rewards**: 168 hours (7 days)
- **Upgrade Bonuses**: 168 hours (7 days) - Auto-claimed
- **Spillover Rewards**: 72 hours (3 days) - Auto-claimed

### **Claim Status Types**
- `pending`: Available for claiming
- `claimed`: Successfully claimed and distributed
- `expired`: Claim window expired
- `cancelled`: Manually cancelled by admin

### **Auto-Claim Rules**
- **Enabled for**: Upgrade bonuses, spillover rewards
- **Disabled for**: Direct referrals, layer rewards (require manual claiming)
- **Processing**: Automatic background job every hour

## 🔧 System Functions & Automation

### **Core Functions**
1. `calculate_reward_amount(rule_id, base_amount)` - Calculate reward based on rules
2. `create_reward_claim(wallet, type, layer, level, amount)` - Create new reward claim
3. `process_reward_claim(claim_id)` - Process and distribute reward
4. `distribute_upgrade_rewards(wallet, level, price)` - Distribute all upgrade rewards
5. `process_expired_claims()` - Mark expired claims
6. `process_auto_claims()` - Process auto-claimable rewards

### **Background Processes**
- **Expired Claims Cleanup**: Runs every 6 hours
- **Auto-Claim Processing**: Runs every hour  
- **Matrix Position Updates**: Real-time via triggers
- **Reward Distribution**: Triggered on NFT purchases

## 📊 Configuration Views & Reporting

### **Available Views**
- `level_configuration` - Complete NFT level and layer info
- `reward_rules_summary` - Active reward rules overview
- `user_dashboard` - User profile with rewards and matrix data
- `reward_claims` - All reward claims tracking

### **Key Metrics Tracked**
- Total rewards distributed per user
- Matrix completion rates by layer
- NFT level progression statistics
- Claim success/expiry rates
- Spillover frequency and patterns

## 🚀 Deployment Status

✅ **All Configuration Complete**
- 19 NFT levels configured (Token IDs 1-19)
- 19 matrix layers defined with exponential growth
- Complete reward rule matrix (76 rules configured)
- All claim processing functions implemented
- Automated background processes ready
- Administrative views and reports available

The Beehive Platform is now **fully configured** with a comprehensive 19-level NFT membership system, complete matrix referral tracking, and automated reward distribution! 🎉