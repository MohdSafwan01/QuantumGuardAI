-- ============================================
-- QuantumGuard AI — Initial Database Schema
-- Migration 001
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ──────────────────────────────────────────────
-- SCANS table
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('github', 'upload', 'snippet')),
  source_label TEXT NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('javascript', 'typescript', 'python', 'mixed')),
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'scanning', 'complete', 'error')),
  total_files_scanned INTEGER DEFAULT 0,
  total_vulnerabilities INTEGER DEFAULT 0,
  max_severity TEXT CHECK (max_severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'NONE')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ──────────────────────────────────────────────
-- VULNERABILITIES table
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vulnerabilities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  line_number INTEGER,
  vulnerability_type TEXT NOT NULL,
  pattern_matched TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  confidence TEXT NOT NULL CHECK (confidence IN ('HIGH', 'MEDIUM', 'LOW')),
  description TEXT NOT NULL,
  ai_fix_suggestion TEXT,
  nist_reference TEXT,
  quantum_safe_replacement TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- SCAN FILES table (tracks which files were scanned)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scan_files (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  language TEXT NOT NULL,
  was_flagged BOOLEAN DEFAULT FALSE,
  vulnerability_count INTEGER DEFAULT 0
);

-- ──────────────────────────────────────────────
-- Row Level Security
-- ──────────────────────────────────────────────
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies — users can only see their own data
CREATE POLICY "Users see own scans" ON scans
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users see own vulnerabilities" ON vulnerabilities
  FOR ALL USING (
    scan_id IN (SELECT id FROM scans WHERE user_id = auth.uid())
  );

CREATE POLICY "Users see own scan files" ON scan_files
  FOR ALL USING (
    scan_id IN (SELECT id FROM scans WHERE user_id = auth.uid())
  );

-- ──────────────────────────────────────────────
-- Indexes for performance
-- ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_scans_user_id ON scans(user_id);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_scan_id ON vulnerabilities(scan_id);
CREATE INDEX IF NOT EXISTS idx_scan_files_scan_id ON scan_files(scan_id);
