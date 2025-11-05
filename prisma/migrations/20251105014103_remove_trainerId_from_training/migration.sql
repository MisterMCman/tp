-- First, migrate any existing trainerId assignments to TrainingRequest records
-- This ensures we don't lose data when removing the column
INSERT INTO TrainingRequest (trainingId, trainerId, status, createdAt, updatedAt)
SELECT 
    t.id as trainingId,
    t.trainerId,
    'ACCEPTED' as status,
    NOW() as createdAt,
    NOW() as updatedAt
FROM Training t
WHERE t.trainerId IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM TrainingRequest tr 
    WHERE tr.trainingId = t.id 
      AND tr.trainerId = t.trainerId 
      AND tr.status = 'ACCEPTED'
  );

-- Drop the foreign key constraint first
-- Find and drop the foreign key constraint
SET @foreign_key_name = (
  SELECT CONSTRAINT_NAME 
  FROM information_schema.TABLE_CONSTRAINTS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'Training' 
    AND CONSTRAINT_TYPE = 'FOREIGN KEY' 
    AND CONSTRAINT_NAME LIKE '%trainerId%'
  LIMIT 1
);

SET @sql = IF(@foreign_key_name IS NOT NULL, 
  CONCAT('ALTER TABLE `Training` DROP FOREIGN KEY `', @foreign_key_name, '`'), 
  'SELECT "No foreign key to drop" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop the index (check if it exists first)
SET @index_exists = (
  SELECT COUNT(*) 
  FROM information_schema.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'Training' 
    AND INDEX_NAME = 'Training_trainerId_fkey'
);

SET @drop_index_sql = IF(@index_exists > 0, 
  'ALTER TABLE `Training` DROP INDEX `Training_trainerId_fkey`',
  'SELECT "Index does not exist" AS message'
);

PREPARE stmt FROM @drop_index_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check if column exists before dropping
SET @column_exists = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'Training' 
    AND COLUMN_NAME = 'trainerId'
);

SET @drop_column_sql = IF(@column_exists > 0, 
  'ALTER TABLE `Training` DROP COLUMN `trainerId`',
  'SELECT "Column does not exist" AS message'
);

PREPARE stmt FROM @drop_column_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

