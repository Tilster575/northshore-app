-- ============================================================
-- NORTHSHORE LIFT & LAUNCH — Supabase Database Setup
-- ============================================================
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- This creates the jobs table, storage bucket, and access policies.
-- ============================================================

-- 1. Create the jobs table (flat structure — completion fields included)
CREATE TABLE IF NOT EXISTS jobs (
  id BIGSERIAL PRIMARY KEY,
  job_ref TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  boat_name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  location TEXT DEFAULT '',
  activity TEXT NOT NULL,
  scheduled_date DATE,
  priority TEXT DEFAULT 'Medium',
  issues TEXT DEFAULT '',
  photo_url TEXT,
  status TEXT DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,

  -- Completion fields (populated when job is completed)
  completion_team_member TEXT,
  completion_from_location TEXT,
  completion_to_location TEXT,
  completion_planned_activity TEXT,
  completion_actual_activity TEXT,
  completion_notes TEXT,
  completion_issues TEXT,
  completion_photo_url TEXT,
  completion_submitted_at TIMESTAMPTZ
);

-- 2. Create indexes for common queries
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_scheduled_date ON jobs(scheduled_date);
CREATE INDEX idx_jobs_activity ON jobs(activity);
CREATE INDEX idx_jobs_job_ref ON jobs(job_ref);

-- 3. Enable Row Level Security (required by Supabase)
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- 4. Create access policy — allows full access via anon key
--    NOTE: When you add authentication later, replace this with
--    user-specific policies (e.g. only team members can read/write)
CREATE POLICY "Allow full access with anon key"
  ON jobs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 5. Create storage bucket for job photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-photos', 'job-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 6. Storage policies — allow public read and anon upload
CREATE POLICY "Public read access for job photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'job-photos');

CREATE POLICY "Allow uploads to job photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'job-photos');

CREATE POLICY "Allow updates to job photos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'job-photos')
  WITH CHECK (bucket_id = 'job-photos');

-- ============================================================
-- DONE! Your database is ready.
-- Now paste your Supabase URL and anon key into the React app.
-- ============================================================
