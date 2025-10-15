-- Migration: Add GitHub OAuth fields to users table
-- This migration adds support for user-level GitHub OAuth connections
-- allowing users to connect their GitHub accounts and sync comments to PRs

-- Add GitHub OAuth fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS github_access_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS github_refresh_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS github_username TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS github_connected_at BIGINT;

-- Add comments for documentation
COMMENT ON COLUMN users.github_access_token IS 'User''s GitHub OAuth access token for API access';
COMMENT ON COLUMN users.github_refresh_token IS 'User''s GitHub OAuth refresh token';
COMMENT ON COLUMN users.github_username IS 'User''s GitHub username';
COMMENT ON COLUMN users.github_connected_at IS 'Timestamp when GitHub account was connected';

-- Create index for GitHub username lookups (optional, for future features)
CREATE INDEX IF NOT EXISTS idx_users_github_username ON users(github_username) WHERE github_username IS NOT NULL;
