-- Migration: Add style JSONB column to notes for formatting
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'notes'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'style'
        ) THEN
            ALTER TABLE notes ADD COLUMN style JSONB;
            COMMENT ON COLUMN notes.style IS 'JSON style for note text: { fontSize, bold, italic, underline, fontFamily, textColor }';
        END IF;
    END IF;
END $$;
