-- Add missing columns to activities table in Turso database
ALTER TABLE activities ADD COLUMN ulid TEXT;
ALTER TABLE activities ADD COLUMN status TEXT DEFAULT 'active';

-- Create unique index for ulid
CREATE UNIQUE INDEX activities_ulid_key ON activities(ulid);