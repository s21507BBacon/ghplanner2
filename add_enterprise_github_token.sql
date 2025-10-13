-- Migration: Add github_token_encrypted column to enterprises table
-- This adds support for enterprise-level GitHub access tokens

ALTER TABLE enterprises ADD COLUMN IF NOT EXISTS github_token_encrypted TEXT;

-- Add comment to the column
COMMENT ON COLUMN enterprises.github_token_encrypted IS 'Enterprise admin''s personal GitHub access token (encrypted)';

-- Note: This migration is safe to run multiple times due to the IF NOT EXISTS clause
