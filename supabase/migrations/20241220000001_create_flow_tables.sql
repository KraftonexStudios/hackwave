-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create rounds table
CREATE TABLE IF NOT EXISTS rounds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  agent_responses JSONB,
  validation_results JSONB,
  round_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_feedback table
CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  selected_validations TEXT[],
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  report_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create agents table if it doesn't exist
CREATE TABLE IF NOT EXISTS agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('advocate', 'opponent', 'moderator')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Insert default agents with enhanced system prompts for real AI processing
INSERT INTO agents (name, role, description, status) 
SELECT 'Dr. Sarah Chen', 'advocate', 'Expert advocate specializing in evidence-based argumentation and logical reasoning', 'active'
WHERE NOT EXISTS (SELECT 1 FROM agents WHERE name = 'Dr. Sarah Chen' AND role = 'advocate');

INSERT INTO agents (name, role, description, status) 
SELECT 'Prof. Michael Torres', 'opponent', 'Critical analyst focused on identifying flaws, risks, and counterarguments through systematic analysis', 'active'
WHERE NOT EXISTS (SELECT 1 FROM agents WHERE name = 'Prof. Michael Torres' AND role = 'opponent');

INSERT INTO agents (name, role, description, status) 
SELECT 'Dr. Elena Rodriguez', 'moderator', 'Balanced moderator providing objective analysis and synthesis of multiple perspectives', 'active'
WHERE NOT EXISTS (SELECT 1 FROM agents WHERE name = 'Dr. Elena Rodriguez' AND role = 'moderator');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_rounds_session_id ON rounds(session_id);
CREATE INDEX IF NOT EXISTS idx_rounds_round_number ON rounds(round_number);
CREATE INDEX IF NOT EXISTS idx_rounds_created_at ON rounds(created_at);
CREATE INDEX IF NOT EXISTS idx_user_feedback_session_id ON user_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_round_number ON user_feedback(round_number);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_reports_session_id ON reports(session_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_role ON agents(role);

-- Add composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_rounds_session_round ON rounds(session_id, round_number);
CREATE INDEX IF NOT EXISTS idx_feedback_session_round ON user_feedback(session_id, round_number);

-- Enable Row Level Security
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Sessions policies
CREATE POLICY "Users can view their own sessions" ON sessions
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create sessions" ON sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own sessions" ON sessions
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

-- Rounds policies
CREATE POLICY "Users can view rounds for their sessions" ON rounds
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = rounds.session_id 
      AND (sessions.user_id = auth.uid() OR sessions.user_id IS NULL)
    )
  );

CREATE POLICY "Users can create rounds for their sessions" ON rounds
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = rounds.session_id 
      AND (sessions.user_id = auth.uid() OR sessions.user_id IS NULL)
    )
  );

-- User feedback policies
CREATE POLICY "Users can view feedback for their sessions" ON user_feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = user_feedback.session_id 
      AND (sessions.user_id = auth.uid() OR sessions.user_id IS NULL)
    )
  );

CREATE POLICY "Users can create feedback for their sessions" ON user_feedback
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = user_feedback.session_id 
      AND (sessions.user_id = auth.uid() OR sessions.user_id IS NULL)
    )
  );

-- Reports policies
CREATE POLICY "Users can view reports for their sessions" ON reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = reports.session_id 
      AND (sessions.user_id = auth.uid() OR sessions.user_id IS NULL)
    )
  );

CREATE POLICY "Users can create reports for their sessions" ON reports
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = reports.session_id 
      AND (sessions.user_id = auth.uid() OR sessions.user_id IS NULL)
    )
  );

-- Agents policies
CREATE POLICY "Users can view all active agents" ON agents
  FOR SELECT USING (status = 'active');

CREATE POLICY "Users can create their own agents" ON agents
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own agents" ON agents
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);