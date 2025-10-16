-- GitHub Planner PostgreSQL Database Schema
-- Compatible with Neon PostgreSQL
-- This file combines the initial schema with all migrations
-- Safe to run multiple times due to IF NOT EXISTS clauses

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  email_verification_token TEXT,
  email_verification_expires BIGINT,
  otp_code TEXT,
  otp_expires BIGINT,
  otp_attempts INTEGER DEFAULT 0,
  github_access_token TEXT,
  github_refresh_token TEXT,
  github_username TEXT,
  github_connected_at BIGINT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(email_verification_token);

-- NextAuth tables
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_provider ON accounts(provider, provider_account_id);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  session_token TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  expires BIGINT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires BIGINT NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- Enterprises table
CREATE TABLE IF NOT EXISTS enterprises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_user_id TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  invite_link_salt TEXT NOT NULL,
  domain_allowlist JSONB, -- JSON array
  github_token_encrypted TEXT, -- Enterprise admin's personal GitHub access token (encrypted)
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  FOREIGN KEY (owner_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_enterprises_owner ON enterprises(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_enterprises_invite_code ON enterprises(invite_code);

-- Enterprise memberships
CREATE TABLE IF NOT EXISTS enterprise_memberships (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  enterprise_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('owner', 'admin', 'staff', 'member')),
  status TEXT NOT NULL CHECK(status IN ('active', 'pending')),
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (enterprise_id) REFERENCES enterprises(id) ON DELETE CASCADE,
  UNIQUE(user_id, enterprise_id)
);

CREATE INDEX IF NOT EXISTS idx_enterprise_memberships_user ON enterprise_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_memberships_enterprise ON enterprise_memberships(enterprise_id);

-- Enterprise invites
CREATE TABLE IF NOT EXISTS enterprise_invites (
  id TEXT PRIMARY KEY,
  enterprise_id TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  token TEXT UNIQUE NOT NULL,
  invited_by_user_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending', 'accepted', 'expired')),
  expires_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL,
  accepted_at BIGINT,
  FOREIGN KEY (enterprise_id) REFERENCES enterprises(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_enterprise_invites_token ON enterprise_invites(token);
CREATE INDEX IF NOT EXISTS idx_enterprise_invites_email ON enterprise_invites(email);

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_user_id TEXT NOT NULL,
  enterprise_id TEXT,
  invite_code TEXT UNIQUE NOT NULL,
  invite_link_salt TEXT NOT NULL,
  domain_allowlist JSONB, -- JSON array
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  FOREIGN KEY (owner_user_id) REFERENCES users(id),
  FOREIGN KEY (enterprise_id) REFERENCES enterprises(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_companies_owner ON companies(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_companies_enterprise ON companies(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_companies_invite_code ON companies(invite_code);

-- Company memberships
CREATE TABLE IF NOT EXISTS memberships (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('owner', 'admin', 'staff', 'member')),
  status TEXT NOT NULL CHECK(status IN ('active', 'pending')),
  created_at BIGINT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  UNIQUE(user_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_company ON memberships(company_id);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  max_seats INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  invite_code TEXT UNIQUE NOT NULL,
  invite_link_salt TEXT NOT NULL,
  repo_owner TEXT,
  repo_name TEXT,
  repo_token_encrypted TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_projects_company ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_invite_code ON projects(invite_code);

-- Project preferences
CREATE TABLE IF NOT EXISTS project_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  rank INTEGER NOT NULL,
  created_at BIGINT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE(user_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_project_preferences_user ON project_preferences(user_id, company_id);

-- Assignments
CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  assigned_at BIGINT NOT NULL,
  assigned_by_user_id TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE(user_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_assignments_user ON assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_project ON assignments(project_id);

-- User preferences (for enterprise allocation flow)
CREATE TABLE IF NOT EXISTS user_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  enterprise_id TEXT NOT NULL,
  company_id TEXT,
  project_id TEXT,
  status TEXT NOT NULL CHECK(status IN ('pending', 'allocated', 'rejected')),
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (enterprise_id) REFERENCES enterprises(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_enterprise ON user_preferences(enterprise_id);

-- Boards table
CREATE TABLE IF NOT EXISTS boards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  company_id TEXT,
  project_id TEXT,
  view_mode TEXT NOT NULL DEFAULT 'free-form' CHECK (view_mode IN ('free-form', 'traditional', 'grid')),
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_boards_company ON boards(company_id);
CREATE INDEX IF NOT EXISTS idx_boards_project ON boards(project_id);
CREATE INDEX IF NOT EXISTS idx_boards_view_mode ON boards(view_mode);

-- Columns table
CREATE TABLE IF NOT EXISTS columns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  order_num INTEGER NOT NULL,
  board_id TEXT NOT NULL,
  requires_pr BOOLEAN DEFAULT FALSE,
  move_to_column_on_merge TEXT,
  move_to_column_on_closed TEXT,
  move_to_column_on_request_changes TEXT,
  x INTEGER DEFAULT 0,
  y INTEGER DEFAULT 0,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_columns_board ON columns(board_id, order_num);

-- Connections table (arrows between columns)
CREATE TABLE IF NOT EXISTS connections (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL,
  source_column_id TEXT NOT NULL,
  target_column_id TEXT NOT NULL,
  label TEXT,
  color TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
  FOREIGN KEY (source_column_id) REFERENCES columns(id) ON DELETE CASCADE,
  FOREIGN KEY (target_column_id) REFERENCES columns(id) ON DELETE CASCADE,
  UNIQUE(board_id, source_column_id, target_column_id)
);

CREATE INDEX IF NOT EXISTS idx_connections_board ON connections(board_id);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  column_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending', 'in_progress', 'completed', 'blocked', 'approved', 'merged', 'changes_requested')),
  labels JSONB, -- JSON array
  pr_url TEXT,
  pr_number INTEGER,
  assignee TEXT, -- deprecated
  assignees JSONB, -- JSON array of user IDs
  checklist JSONB, -- JSON array of checklist items
  board_id TEXT NOT NULL,
  order_num INTEGER NOT NULL,
  company_id TEXT,
  project_id TEXT,
  created_by_user_id TEXT,
  is_locked BOOLEAN DEFAULT FALSE,
  locked_by_user_id TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE,
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_column ON tasks(column_id, order_num);
CREATE INDEX IF NOT EXISTS idx_tasks_board ON tasks(board_id);
CREATE INDEX IF NOT EXISTS idx_tasks_company ON tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);

-- Task comments
CREATE TABLE IF NOT EXISTS task_comments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id, created_at);

-- Migration: Add github_token_encrypted column to enterprises table (if not exists)
-- This adds support for enterprise-level GitHub access tokens
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'enterprises'
                   AND column_name = 'github_token_encrypted') THEN
        ALTER TABLE enterprises ADD COLUMN github_token_encrypted TEXT;
        COMMENT ON COLUMN enterprises.github_token_encrypted IS 'Enterprise admin''s personal GitHub access token (encrypted)';
    END IF;
END $$;

-- Sticky notes table
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  color TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notes_board ON notes(board_id);

-- Migration: Add free-position coordinates to columns (x, y) if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'columns' AND column_name = 'x'
    ) THEN
        ALTER TABLE columns ADD COLUMN x INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'columns' AND column_name = 'y'
    ) THEN
        ALTER TABLE columns ADD COLUMN y INTEGER DEFAULT 0;
    END IF;
END $$;

-- Migration: Add GitHub OAuth fields to users table (if not exists)
-- This adds support for user-level GitHub OAuth connections
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'users'
                   AND column_name = 'github_access_token') THEN
        ALTER TABLE users ADD COLUMN github_access_token TEXT;
        COMMENT ON COLUMN users.github_access_token IS 'User''s GitHub OAuth access token';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'users'
                   AND column_name = 'github_refresh_token') THEN
        ALTER TABLE users ADD COLUMN github_refresh_token TEXT;
        COMMENT ON COLUMN users.github_refresh_token IS 'User''s GitHub OAuth refresh token';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'users'
                   AND column_name = 'github_username') THEN
        ALTER TABLE users ADD COLUMN github_username TEXT;
        COMMENT ON COLUMN users.github_username IS 'User''s GitHub username';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'users'
                   AND column_name = 'github_connected_at') THEN
        ALTER TABLE users ADD COLUMN github_connected_at BIGINT;
        COMMENT ON COLUMN users.github_connected_at IS 'Timestamp when GitHub account was connected';
    END IF;
END $$;

-- Migration: Add view_mode column to boards table (if not exists)
-- This enables different board layouts: free-form, traditional planner, and grid view
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'boards' AND column_name = 'view_mode'
    ) THEN
        ALTER TABLE boards ADD COLUMN view_mode TEXT NOT NULL DEFAULT 'free-form'
            CHECK (view_mode IN ('free-form', 'traditional', 'grid'));
        COMMENT ON COLUMN boards.view_mode IS 'Board layout mode: free-form (drag anywhere), traditional (fixed row), or grid (task grid view)';
    END IF;
END $$;

-- Labels table for color-coded task labels
CREATE TABLE IF NOT EXISTS labels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  board_id TEXT NOT NULL,
  project_id TEXT,
  company_id TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_labels_board ON labels(board_id);
CREATE INDEX IF NOT EXISTS idx_labels_project ON labels(project_id);

-- Task labels junction table to link tasks with labels
CREATE TABLE IF NOT EXISTS task_labels (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  label_id TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE,
  UNIQUE(task_id, label_id)
);

CREATE INDEX IF NOT EXISTS idx_task_labels_task ON task_labels(task_id);
CREATE INDEX IF NOT EXISTS idx_task_labels_label ON task_labels(label_id);

-- Task attachments table for file uploads
CREATE TABLE IF NOT EXISTS task_attachments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  uploaded_by TEXT,
  created_at BIGINT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_task_attachments_task ON task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_uploaded_by ON task_attachments(uploaded_by);
