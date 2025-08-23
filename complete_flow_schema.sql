-- Multi-Agent AI Debate System SQL Schema for Supabase

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types (enums)
CREATE TYPE session_status AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');
CREATE TYPE agent_role AS ENUM ('PARTICIPANT', 'VALIDATOR', 'MODERATOR', 'TASK_DISTRIBUTOR', 'REPORT_GENERATOR');
CREATE TYPE round_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');
CREATE TYPE response_status AS ENUM ('SUBMITTED', 'VALIDATED', 'ACCEPTED', 'REJECTED');
CREATE TYPE feedback_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE report_type AS ENUM ('INTERIM', 'FINAL', 'SUMMARY');
CREATE TYPE report_status AS ENUM ('GENERATING', 'COMPLETED', 'FAILED');

-- Users table (integrates with Supabase Auth)
CREATE TABLE users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    supabase_id TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Agents table
CREATE TABLE agents (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    prompt TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Debate sessions table
CREATE TABLE debate_sessions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT,
    initial_query TEXT NOT NULL,
    status session_status DEFAULT 'ACTIVE' NOT NULL,
    current_round INTEGER DEFAULT 1 NOT NULL,
    max_rounds INTEGER DEFAULT 5 NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Session agents junction table
CREATE TABLE session_agents (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    session_id TEXT NOT NULL REFERENCES debate_sessions(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    role agent_role DEFAULT 'PARTICIPANT' NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(session_id, agent_id)
);

-- Debate rounds table
CREATE TABLE debate_rounds (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    round_number INTEGER NOT NULL,
    session_id TEXT NOT NULL REFERENCES debate_sessions(id) ON DELETE CASCADE,
    distributor_query TEXT,
    distributor_response JSONB,
    status round_status DEFAULT 'IN_PROGRESS' NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(session_id, round_number)
);

-- Agent responses table
CREATE TABLE agent_responses (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    round_id TEXT NOT NULL REFERENCES debate_rounds(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    response TEXT NOT NULL,
    reasoning TEXT,
    confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    processing_time INTEGER, -- milliseconds
    status response_status DEFAULT 'SUBMITTED' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Validation results table
CREATE TABLE validation_results (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    round_id TEXT NOT NULL REFERENCES debate_rounds(id) ON DELETE CASCADE,
    response_id TEXT REFERENCES agent_responses(id) ON DELETE CASCADE,
    validator_prompt TEXT NOT NULL,
    validation_score DECIMAL(3,2) CHECK (validation_score >= 0 AND validation_score <= 1),
    validation_notes TEXT,
    issues JSONB, -- Array of identified issues
    suggestions JSONB, -- Array of suggestions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- User feedback table
CREATE TABLE user_feedbacks (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    session_id TEXT NOT NULL REFERENCES debate_sessions(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    agent_id TEXT, -- nullable for general feedback
    is_accepted BOOLEAN NOT NULL,
    feedback_text TEXT,
    suggestions JSONB, -- User's additional suggestions
    priority feedback_priority DEFAULT 'MEDIUM' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Reports table
CREATE TABLE reports (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    session_id TEXT NOT NULL REFERENCES debate_sessions(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    recommendations JSONB, -- Structured recommendations
    pdf_url TEXT,
    report_type report_type DEFAULT 'FINAL' NOT NULL,
    status report_status DEFAULT 'GENERATING' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX idx_agents_user_id ON agents(user_id);
CREATE INDEX idx_agents_is_active ON agents(is_active);
CREATE INDEX idx_debate_sessions_user_id ON debate_sessions(user_id);
CREATE INDEX idx_debate_sessions_status ON debate_sessions(status);
CREATE INDEX idx_session_agents_session_id ON session_agents(session_id);
CREATE INDEX idx_session_agents_agent_id ON session_agents(agent_id);
CREATE INDEX idx_debate_rounds_session_id ON debate_rounds(session_id);
CREATE INDEX idx_debate_rounds_status ON debate_rounds(status);
CREATE INDEX idx_agent_responses_round_id ON agent_responses(round_id);
CREATE INDEX idx_agent_responses_agent_id ON agent_responses(agent_id);
CREATE INDEX idx_validation_results_round_id ON validation_results(round_id);
CREATE INDEX idx_validation_results_response_id ON validation_results(response_id);
CREATE INDEX idx_user_feedbacks_session_id ON user_feedbacks(session_id);
CREATE INDEX idx_reports_session_id ON reports(session_id);
CREATE INDEX idx_reports_user_id ON reports(user_id);
CREATE INDEX idx_reports_status ON reports(status);

-- Create functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for auto-updating timestamps
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at 
    BEFORE UPDATE ON agents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_debate_sessions_updated_at 
    BEFORE UPDATE ON debate_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS policies removed as requested

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Comment documentation
COMMENT ON TABLE users IS 'User accounts integrated with Supabase Auth';
COMMENT ON TABLE agents IS 'AI agents created by users with custom prompts';
COMMENT ON TABLE debate_sessions IS 'Main debate/discussion sessions';
COMMENT ON TABLE session_agents IS 'Junction table for agents participating in sessions';
COMMENT ON TABLE debate_rounds IS 'Individual rounds within debate sessions';
COMMENT ON TABLE agent_responses IS 'Individual agent responses within rounds';
COMMENT ON TABLE validation_results IS 'Validation results from validator agents';
COMMENT ON TABLE user_feedbacks IS 'User feedback on agent suggestions';
COMMENT ON TABLE reports IS 'Generated reports in PDF format';