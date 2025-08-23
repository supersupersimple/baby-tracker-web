-- Simple ULID generation for existing records
-- Generate timestamp-based unique IDs for old data

UPDATE activities 
SET ulid = PRINTF('01%s%s', 
  PRINTF('%08X', CAST(strftime('%s', createdAt) AS INTEGER)),
  PRINTF('%018X', CAST(RANDOM() * 1000000000000000000 AS INTEGER))
)
WHERE ulid IS NULL;

-- Check results
SELECT COUNT(*) as updated_count FROM activities WHERE ulid IS NOT NULL;