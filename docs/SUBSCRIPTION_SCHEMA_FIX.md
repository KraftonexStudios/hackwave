# Subscription Schema Fix

## Problem Description

The original subscription system had a critical flaw in the database schema. The `user_subscriptions` table was incorrectly referencing `users.id` (internal database ID) instead of `users.supabase_id` (Supabase auth ID). This caused several issues:

1. **Foreign Key Mismatch**: The `user_subscriptions.user_id` field was referencing the wrong column
2. **Authentication Issues**: Code was trying to use Supabase auth IDs but the database expected internal IDs
3. **Data Inconsistency**: Users couldn't properly access their subscriptions due to ID mismatches

## Root Cause

The schema was designed as:
```sql
-- INCORRECT (Original)
CREATE TABLE user_subscriptions (
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE  -- ❌ Wrong reference
);

-- CORRECT (Fixed)
CREATE TABLE user_subscriptions (
  user_id TEXT REFERENCES users(supabase_id) ON DELETE CASCADE  -- ✅ Correct reference
);
```

## Changes Made

### 1. Database Migration (`20241220000003_fix_user_subscriptions_schema.sql`)

- Dropped the incorrect foreign key constraint
- Added the correct foreign key constraint referencing `users.supabase_id`
- Recreated the index for performance
- Updated RLS policies to use the correct user reference

### 2. API Route Updates

#### `app/api/razorpay/verify-subscription/route.ts`
- Changed from using `users.id` to `users.supabase_id` directly
- Added user creation logic for consistency
- Updated all database queries to use Supabase auth ID

#### `app/api/razorpay/create-subscription/route.ts`
- Fixed to use authenticated user's Supabase ID instead of request body
- Updated response structure to use `supabaseUserId`

### 3. Subscription Library (`lib/subscription.ts`)
- Simplified user ID handling - now directly uses Supabase auth ID
- Removed complex ID conversion logic
- Direct queries to `user_subscriptions` table

### 4. Frontend Component (`components/subscription/subscription-checkout.tsx`)
- Updated to use `supabaseUserId` from API response
- Fixed verification payload structure

## Benefits of the Fix

1. **Simplified Architecture**: No more complex ID conversion between auth and database IDs
2. **Better Performance**: Direct queries without joins or lookups
3. **Data Consistency**: Proper foreign key relationships ensure data integrity
4. **Easier Maintenance**: Clear separation between auth IDs and internal IDs
5. **Proper RLS**: Row-level security now works correctly with auth.uid()

## Database Schema After Fix

```sql
-- Users table (unchanged)
CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT NOT NULL,
  name TEXT,
  supabase_id TEXT UNIQUE NOT NULL,  -- Links to Supabase auth
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User subscriptions table (fixed)
CREATE TABLE user_subscriptions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,  -- Now correctly references users.supabase_id
  plan subscription_plan DEFAULT 'FREE',
  status subscription_status DEFAULT 'ACTIVE',
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + '1 year'),
  razorpay_payment_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT user_subscriptions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(supabase_id) ON DELETE CASCADE
);
```

## Migration Steps

1. **Run the migration**:
   ```bash
   # Apply the migration to your Supabase project
   supabase db push
   ```

2. **Verify the changes**:
   ```sql
   -- Check foreign key constraint
   SELECT constraint_name, table_name, column_name, referenced_table_name, referenced_column_name
   FROM information_schema.key_column_usage
   WHERE table_name = 'user_subscriptions';
   
   -- Check index
   SELECT indexname FROM pg_indexes WHERE tablename = 'user_subscriptions';
   ```

3. **Test the system**:
   - Create a new subscription
   - Verify payment processing
   - Check subscription access

## Testing

After applying the fix, test the following scenarios:

1. **New User Registration**: Ensure users are created in both auth and database tables
2. **Subscription Creation**: Verify subscriptions are linked to the correct user
3. **Payment Verification**: Test the complete subscription flow
4. **Subscription Access**: Confirm users can view their own subscriptions
5. **Data Integrity**: Verify foreign key constraints work properly

## Rollback Plan

If issues arise, the migration can be rolled back:

```sql
-- Rollback the foreign key change
ALTER TABLE public.user_subscriptions 
DROP CONSTRAINT user_subscriptions_user_id_fkey;

-- Revert to old constraint (if needed)
ALTER TABLE public.user_subscriptions 
ADD CONSTRAINT user_subscriptions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
```

## Future Considerations

1. **Audit Trail**: Consider adding audit logs for subscription changes
2. **Data Migration**: If existing data exists, ensure proper migration scripts
3. **Monitoring**: Add monitoring for subscription creation/updates
4. **Testing**: Implement comprehensive tests for subscription flows



