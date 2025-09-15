-- Add only the status column
ALTER TABLE activities ADD COLUMN status TEXT DEFAULT 'active';