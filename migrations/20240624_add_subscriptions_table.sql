-- Create subscription enums
CREATE TYPE subscription_plan AS ENUM ('FREE', 'PREMIUM');
CREATE TYPE subscription_status AS ENUM ('ACTIVE', 'EXPIRED');

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan subscription_plan DEFAULT 'FREE' NOT NULL,
  status subscription_status DEFAULT 'ACTIVE' NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 year') NOT NULL,
  razorpay_payment_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  UNIQUE(user_id)
);

-- Add RLS policies
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own subscriptions
CREATE POLICY "Users can view their own subscriptions" 
  ON user_subscriptions FOR SELECT 
  USING (auth.uid() = user_id);

-- Only allow service role to insert/update/delete
CREATE POLICY "Service role can manage all subscriptions" 
  ON user_subscriptions FOR ALL 
  USING (auth.role() = 'service_role');

-- Add subscription fields to users table
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS subscription_plan TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT,
  ADD COLUMN IF NOT EXISTS subscription_id TEXT REFERENCES user_subscriptions(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);