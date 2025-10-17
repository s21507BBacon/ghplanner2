-- Migration: Create shapes table for freeform board shapes and text elements
-- This adds support for drawing shapes (circle, oval, triangle, rectangle, square, diamond) and text on the freeform board

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'shapes'
    ) THEN
        CREATE TABLE shapes (
          id TEXT PRIMARY KEY,
          board_id TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('circle', 'oval', 'triangle', 'rectangle', 'square', 'diamond', 'text')),
          x INTEGER NOT NULL,
          y INTEGER NOT NULL,
          width INTEGER NOT NULL,
          height INTEGER NOT NULL,
          fill_color TEXT NOT NULL DEFAULT '#60a5fa',
          stroke_color TEXT DEFAULT '#1e293b',
          stroke_width INTEGER DEFAULT 2,
          -- Text-specific properties (only used when type = 'text')
          text_content TEXT,
          font_family TEXT DEFAULT 'Inter, system-ui, sans-serif',
          font_size INTEGER DEFAULT 16,
          font_weight TEXT DEFAULT 'normal',
          text_color TEXT DEFAULT '#ffffff',
          text_align TEXT DEFAULT 'left',
          -- Common properties
          rotation INTEGER DEFAULT 0,
          opacity REAL DEFAULT 1.0,
          z_index INTEGER DEFAULT 0,
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL,
          FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
        );

        CREATE INDEX idx_shapes_board ON shapes(board_id);
        CREATE INDEX idx_shapes_type ON shapes(type);
        
        RAISE NOTICE 'Created shapes table';
    ELSE
        RAISE NOTICE 'Shapes table already exists, skipping';
    END IF;
END $$;
