-- Add image_url column to task_comments table
-- This allows users to attach images to their comments

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'task_comments'
                   AND column_name = 'image_url') THEN
        ALTER TABLE task_comments ADD COLUMN image_url TEXT;
        COMMENT ON COLUMN task_comments.image_url IS 'URL of attached image for the comment';
    END IF;
END $$;
