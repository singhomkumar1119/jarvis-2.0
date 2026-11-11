-- ==============================================================
-- 🔮 Jarvis AI — Supabase PostgreSQL Schema Setup
-- ==============================================================
-- Paste and run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- ==============================================================

-- 1. Chat History Table
CREATE TABLE IF NOT EXISTS public.chat_history (
    id TEXT PRIMARY KEY,
    user_id TEXT DEFAULT 'owner',
    channel TEXT DEFAULT 'chat',
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    model TEXT,
    created_at BIGINT NOT NULL
);

-- Index for speedy timeline queries
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON public.chat_history (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON public.chat_history (user_id);

-- 2. Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    detail TEXT DEFAULT '',
    progress INTEGER DEFAULT 0,
    state TEXT DEFAULT 'queued',
    created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON public.tasks (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_state ON public.tasks (state);

-- 3. Visitor / System Events Table
CREATE TABLE IF NOT EXISTS public.visitor_events (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    event_type TEXT DEFAULT 'visit',
    channel TEXT,
    content TEXT,
    file_name TEXT,
    file_type TEXT,
    file_size BIGINT,
    file_path TEXT,
    created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_visitor_events_created_at ON public.visitor_events (created_at DESC);

-- 4. User Settings Table
CREATE TABLE IF NOT EXISTS public.user_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Default open policies for self-hosted Jarvis backend
DROP POLICY IF EXISTS "Jarvis full access on chat_history" ON public.chat_history;
CREATE POLICY "Jarvis full access on chat_history" ON public.chat_history FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Jarvis full access on tasks" ON public.tasks;
CREATE POLICY "Jarvis full access on tasks" ON public.tasks FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Jarvis full access on visitor_events" ON public.visitor_events;
CREATE POLICY "Jarvis full access on visitor_events" ON public.visitor_events FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Jarvis full access on user_settings" ON public.user_settings;
CREATE POLICY "Jarvis full access on user_settings" ON public.user_settings FOR ALL USING (true) WITH CHECK (true);

