-- Migration: Create notes table for sticky notes on planner boards
-- This adds support for user-created sticky notes that can be positioned anywhere on the board

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'notes'
    ) THEN
        CREATE TABLE notes (
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
        
        COMMENT ON TABLE notes IS 'Sticky notes that can be placed on planner boards';
        COMMENT ON COLUMN notes.x IS 'X coordinate position on the board';
        COMMENT ON COLUMN notes.y IS 'Y coordinate position on the board';
        COMMENT ON COLUMN notes.color IS 'Note color (yellow, pink, blue, green, purple, orange)';
        COMMENT ON COLUMN notes.content IS 'Text content of the note';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notes_board ON notes(board_id);
