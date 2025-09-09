#!/usr/bin/env python3

import re

# Read the file
with open('/home/runner/workspace/supabase/functions/matrix-operations/index.ts', 'r') as f:
    content = f.read()

# Remove all created_at references from referrals table queries
content = re.sub(r'select\([^)]*created_at[^)]*\)', lambda m: m.group(0).replace(', created_at', '').replace('created_at, ', '').replace('created_at', ''), content, flags=re.IGNORECASE)

# Replace created_at field references with id
content = content.replace('created_at: currentTime', '')
content = content.replace(', created_at', '')
content = content.replace('created_at,', '')
content = content.replace('created_at:', 'id:')
content = content.replace('r.created_at', 'r.id')
content = content.replace('ref.created_at', 'ref.id')

# Remove time-based calculations that rely on created_at
content = re.sub(r'new Date\([^)]*created_at[^)]*\)', 'new Date()', content)
content = re.sub(r'\.gte\(\'created_at\'[^)]*\)', '', content)
content = re.sub(r'\.order\(\'created_at\'[^)]*\)', '.order(\'id\')', content)

# Fix broken syntax from removals
content = content.replace(',\n      })', '\n      })')
content = content.replace('{\n        member_wallet,\n        referrer_wallet\n      }', '{\n        member_wallet,\n        referrer_wallet\n      }')

# Write back the file
with open('/home/runner/workspace/supabase/functions/matrix-operations/index.ts', 'w') as f:
    f.write(content)

print("Fixed matrix-operations function by removing created_at references")