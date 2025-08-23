-- Create sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create rounds table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.rounds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  agent_responses JSONB,
  validation_results JSONB,
  round_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_feedback table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  selected_validations TEXT[],
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reports table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  report_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create agents table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('advocate', 'opponent', 'moderator')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sessions
CREATE POLICY "Users can view their own sessions" ON public.sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions" ON public.sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON public.sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions" ON public.sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for rounds
CREATE POLICY "Users can view rounds from their sessions" ON public.rounds
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.sessions 
    WHERE sessions.id = rounds.session_id 
    AND sessions.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert rounds to their sessions" ON public.rounds
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.sessions 
    WHERE sessions.id = rounds.session_id 
    AND sessions.user_id = auth.uid()
  ));

-- Create RLS policies for agents
CREATE POLICY "Users can view their own agents" ON public.agents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agents" ON public.agents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agents" ON public.agents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agents" ON public.agents
  FOR DELETE USING (auth.uid() = user_id);

-- Insert default agents
INSERT INTO public.agents (name, role, description, user_id)
SELECT 
  'Advocate Agent' as name,
  'advocate' as role,
  'Presents arguments in favor of the topic' as description,
  auth.uid() as user_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.agents 
  WHERE name = 'Advocate Agent' AND user_id = auth.uid()
);

INSERT INTO public.agents (name, role, description, user_id)
SELECT 
  'Opponent Agent' as name,
  'opponent' as role,
  'Presents arguments against the topic' as description,
  auth.uid() as user_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.agents 
  WHERE name = 'Opponent Agent' AND user_id = auth.uid()
);

INSERT INTO public.agents (name, role, description, user_id)
SELECT 
  'Moderator Agent' as name,
  'moderator' as role,
  'Provides balanced analysis and moderation' as description,
  auth.uid() as user_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.agents 
  WHERE name = 'Moderator Agent' AND user_id = auth.uid()
);