#!/usr/bin/env python3

import subprocess
import json

def run_sql_query(query):
    """Run SQL query using psql command"""
    try:
        result = subprocess.run([
            'psql', 
            '-h', '34.56.229.13',
            '-U', 'postgres', 
            '-d', 'postgres',
            '-t', '-A', '-F', '|',
            '-c', query
        ], 
        capture_output=True, 
        text=True, 
        env={'PGPASSWORD': 'bee8881941'}
        )
        
        if result.returncode == 0:
            return result.stdout.strip().split('\n') if result.stdout.strip() else []
        else:
            print(f"❌ Query failed: {result.stderr}")
            return None
    except Exception as e:
        print(f"❌ Error running query: {e}")
        return None

def main():
    print("🔍 Checking Database Synchronization Status")
    print("=" * 50)
    
    # Check members with levels
    print("\n📊 Members Table - Users with Levels:")
    members_query = """
    SELECT wallet_address, current_level, levels_owned, activation_time 
    FROM members 
    WHERE current_level > 0 
    ORDER BY current_level DESC 
    LIMIT 5;
    """
    
    members = run_sql_query(members_query)
    if members:
        for member in members:
            if member:
                parts = member.split('|')
                if len(parts) >= 4:
                    wallet = parts[0][:10] + '...'
                    level = parts[1]
                    levels_owned = parts[2]
                    activation = parts[3]
                    print(f"  {wallet} -> Level {level}, Owned: {levels_owned}")
    
    # Check membership records
    print("\n📋 Membership Table - NFT Records:")
    membership_query = """
    SELECT wallet_address, nft_level, is_member, unlock_membership_level, claimed_at 
    FROM membership 
    ORDER BY nft_level DESC 
    LIMIT 5;
    """
    
    memberships = run_sql_query(membership_query)
    if memberships:
        for membership in memberships:
            if membership:
                parts = membership.split('|')
                if len(parts) >= 5:
                    wallet = parts[0][:10] + '...'
                    nft_level = parts[1]
                    is_member = parts[2]
                    unlock_level = parts[3]
                    claimed = parts[4]
                    print(f"  {wallet} -> NFT L{nft_level}, Member: {is_member}, Unlock: {unlock_level}")
    
    # Check sync status for Level 2 users
    print("\n🔍 Level 2 Synchronization Check:")
    sync_query = """
    SELECT 
        m.wallet_address, 
        m.current_level, 
        COALESCE(ms.nft_level, 0) as nft_level,
        COALESCE(ms.unlock_membership_level, 0) as unlock_level,
        CASE 
            WHEN m.current_level >= 2 AND ms.nft_level = 2 THEN 'SYNCED'
            WHEN m.current_level < 2 AND ms.nft_level = 2 THEN 'NFT_AHEAD'
            WHEN m.current_level >= 2 AND ms.nft_level IS NULL THEN 'MEMBER_AHEAD'
            ELSE 'OTHER'
        END as sync_status
    FROM members m 
    LEFT JOIN membership ms ON LOWER(m.wallet_address) = LOWER(ms.wallet_address) AND ms.nft_level = 2
    WHERE m.current_level >= 1
    ORDER BY m.current_level DESC
    LIMIT 8;
    """
    
    sync_results = run_sql_query(sync_query)
    if sync_results:
        for result in sync_results:
            if result:
                parts = result.split('|')
                if len(parts) >= 5:
                    wallet = parts[0][:10] + '...'
                    member_level = parts[1]
                    nft_level = parts[2]
                    unlock_level = parts[3]
                    status = parts[4]
                    print(f"  {wallet} -> Member L{member_level}, NFT L{nft_level}, Unlock: {unlock_level} [{status}]")

if __name__ == "__main__":
    main()