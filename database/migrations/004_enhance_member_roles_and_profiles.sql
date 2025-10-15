-- Migration: Enhance Member Roles and Profiles
-- Description: Add new role types, profile images, usernames, and activity tracking
-- Date: 2025-01-15

-- Add image_url column to users table for profile pictures
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS last_active_at BIGINT;

-- Create index for username lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Update enterprise_memberships to support new role types
-- First, drop the existing CHECK constraint
ALTER TABLE enterprise_memberships 
DROP CONSTRAINT IF EXISTS enterprise_memberships_role_check;

-- Add the new CHECK constraint with expanded roles
ALTER TABLE enterprise_memberships 
ADD CONSTRAINT enterprise_memberships_role_check 
CHECK(role IN (
  'owner',              -- Full system access
  'admin',              -- Legacy admin role (kept for backwards compatibility)
  'company_admin',      -- Full access over company and related content
  'project_admin',      -- Full access over a specific project
  'project_lead',       -- Edit planner elements, move tasks, cannot edit locked tasks
  'code_reviewer',      -- Comment on discussions of any task
  'member',             -- Standard member role (legacy)
  'user',               -- Standard user access
  'staff'               -- Legacy staff role (kept for backwards compatibility)
));

-- Update status constraint to include 'inactive'
ALTER TABLE enterprise_memberships 
DROP CONSTRAINT IF EXISTS enterprise_memberships_status_check;

ALTER TABLE enterprise_memberships 
ADD CONSTRAINT enterprise_memberships_status_check 
CHECK(status IN ('active', 'pending', 'inactive'));

-- Add last_active_at to enterprise_memberships for tracking user activity
ALTER TABLE enterprise_memberships 
ADD COLUMN IF NOT EXISTS last_active_at BIGINT;

-- Create a table for role-based permissions per project
CREATE TABLE IF NOT EXISTS project_role_assignments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN (
    'project_admin',
    'project_lead',
    'code_reviewer',
    'member'
  )),
  assigned_by TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id),
  UNIQUE(user_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_project_role_assignments_user ON project_role_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_project_role_assignments_project ON project_role_assignments(project_id);

-- Create a table for company-level role assignments
CREATE TABLE IF NOT EXISTS company_role_assignments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN (
    'company_admin',
    'member'
  )),
  assigned_by TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id),
  UNIQUE(user_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_company_role_assignments_user ON company_role_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_company_role_assignments_company ON company_role_assignments(company_id);

-- Create audit log table for role changes
CREATE TABLE IF NOT EXISTS role_change_audit (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK(entity_type IN ('enterprise', 'company', 'project')),
  entity_id TEXT NOT NULL,
  old_role TEXT,
  new_role TEXT NOT NULL,
  reason TEXT,
  created_at BIGINT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_role_change_audit_user ON role_change_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_role_change_audit_entity ON role_change_audit(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_role_change_audit_created ON role_change_audit(created_at);

-- Add comment to explain role hierarchy
COMMENT ON COLUMN enterprise_memberships.role IS 
'Role hierarchy:
- owner: Full system access, can manage everything
- company_admin: Full access over company and all its projects
- project_admin: Full access over a specific project
- project_lead: Can edit planner, move tasks, but cannot edit locked tasks
- code_reviewer: Can comment on any task discussion
- user/member: Standard user access';

-- Migration complete
-- Note: Existing 'admin' and 'member' roles are preserved for backwards compatibility
-- New installations should use the new role types
