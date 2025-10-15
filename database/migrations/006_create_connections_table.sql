DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'connections'
    ) THEN
        CREATE TABLE connections (
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
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_connections_board ON connections(board_id);
