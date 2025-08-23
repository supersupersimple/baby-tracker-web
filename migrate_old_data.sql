-- Update existing activities to have ULIDs
-- This generates a ULID-like string for existing records
-- Format: timestamp(10) + random(16) = 26 characters

UPDATE activities 
SET ulid = 
  CASE 
    WHEN ulid IS NULL OR ulid = '' THEN
      -- Generate ULID-like string: 10 char timestamp + 16 char random
      PRINTF('%010d%s', 
        CAST(strftime('%s', createdAt) AS INTEGER),
        UPPER(SUBSTR(hex(randomblob(8)), 1, 16))
      )
    ELSE ulid
  END
WHERE ulid IS NULL OR ulid = '';

-- Verify the update
SELECT COUNT(*) as total_activities, 
       COUNT(ulid) as activities_with_ulid,
       COUNT(CASE WHEN ulid IS NULL OR ulid = '' THEN 1 END) as activities_without_ulid
FROM activities;