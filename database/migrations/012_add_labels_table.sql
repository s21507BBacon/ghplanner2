-- Migration: Add labels table for color-coded task labels
-- This allows users to create predefined labels with colors for tasks

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

-- Migration: Add task_labels junction table to link tasks with labels
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
