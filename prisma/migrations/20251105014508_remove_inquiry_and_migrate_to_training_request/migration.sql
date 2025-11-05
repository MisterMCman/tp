-- Step 1: Migrate InquiryMessage data to TrainingRequestMessage
-- First, we need to create TrainingRequestMessage records from InquiryMessage records
-- that reference TrainingRequest. For InquiryMessage records that only reference Inquiry,
-- we need to create TrainingRequest records from Inquiry records first.

-- Step 1a: Create TrainingRequest records from Inquiry records (if they don't exist)
-- This creates training requests for inquiries that were accepted/completed
INSERT INTO TrainingRequest (trainingId, trainerId, status, message, counterPrice, createdAt, updatedAt)
SELECT 
    i.trainingId,
    i.trainerId,
    CASE 
        WHEN i.status = 'ACCEPTED' THEN 'ACCEPTED'
        WHEN i.status = 'REJECTED' THEN 'DECLINED'
        WHEN i.status = 'ABGESAGT' THEN 'WITHDRAWN'
        ELSE 'PENDING'
    END as status,
    i.message,
    i.counterPrice,
    i.createdAt,
    i.updatedAt
FROM Inquiry i
WHERE NOT EXISTS (
    SELECT 1 
    FROM TrainingRequest tr 
    WHERE tr.trainingId = i.trainingId 
      AND tr.trainerId = i.trainerId
)
ON DUPLICATE KEY UPDATE
    status = CASE 
        WHEN i.status = 'ACCEPTED' THEN 'ACCEPTED'
        WHEN i.status = 'REJECTED' THEN 'DECLINED'
        WHEN i.status = 'ABGESAGT' THEN 'WITHDRAWN'
        ELSE 'PENDING'
    END,
    message = COALESCE(i.message, TrainingRequest.message),
    counterPrice = COALESCE(i.counterPrice, TrainingRequest.counterPrice),
    updatedAt = i.updatedAt;

-- Step 1b: Migrate InquiryMessage records to TrainingRequestMessage
-- First, handle messages that reference TrainingRequest directly
INSERT INTO TrainingRequestMessage (
    trainingRequestId,
    senderId,
    senderType,
    recipientId,
    recipientType,
    subject,
    message,
    isRead,
    createdAt,
    updatedAt
)
SELECT 
    im.trainingRequestId,
    im.senderId,
    im.senderType,
    im.recipientId,
    im.recipientType,
    im.subject,
    im.message,
    im.isRead,
    im.createdAt,
    im.updatedAt
FROM InquiryMessage im
WHERE im.trainingRequestId IS NOT NULL;

-- Step 1c: Migrate InquiryMessage records that reference Inquiry
-- We need to find the corresponding TrainingRequest for each Inquiry
INSERT INTO TrainingRequestMessage (
    trainingRequestId,
    senderId,
    senderType,
    recipientId,
    recipientType,
    subject,
    message,
    isRead,
    createdAt,
    updatedAt
)
SELECT 
    tr.id as trainingRequestId,
    im.senderId,
    im.senderType,
    im.recipientId,
    im.recipientType,
    im.subject,
    im.message,
    im.isRead,
    im.createdAt,
    im.updatedAt
FROM InquiryMessage im
INNER JOIN Inquiry i ON im.inquiryId = i.id
INNER JOIN TrainingRequest tr ON tr.trainingId = i.trainingId AND tr.trainerId = i.trainerId
WHERE im.inquiryId IS NOT NULL AND im.trainingRequestId IS NULL;

-- Step 2: Migrate FileAttachment records to reference TrainingRequestMessage
-- First, update attachments that reference InquiryMessage with trainingRequestId
UPDATE FileAttachment fa
INNER JOIN InquiryMessage im ON fa.inquiryMessageId = im.id
INNER JOIN TrainingRequestMessage trm ON (
    (im.trainingRequestId IS NOT NULL AND trm.trainingRequestId = im.trainingRequestId AND trm.senderId = im.senderId AND trm.createdAt = im.createdAt)
    OR
    (im.inquiryId IS NOT NULL AND EXISTS (
        SELECT 1 FROM Inquiry i
        INNER JOIN TrainingRequest tr ON tr.trainingId = i.trainingId AND tr.trainerId = i.trainerId
        WHERE i.id = im.inquiryId AND trm.trainingRequestId = tr.id AND trm.senderId = im.senderId AND trm.createdAt = im.createdAt
    ))
)
SET fa.trainingRequestMessageId = trm.id,
    fa.inquiryMessageId = NULL
WHERE fa.inquiryMessageId IS NOT NULL;

-- Step 3: Drop foreign key constraints and indexes
-- Drop FileAttachment foreign key to InquiryMessage
SET @foreign_key_name = (
  SELECT CONSTRAINT_NAME 
  FROM information_schema.TABLE_CONSTRAINTS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'FileAttachment' 
    AND CONSTRAINT_TYPE = 'FOREIGN KEY' 
    AND CONSTRAINT_NAME LIKE '%inquiryMessageId%'
  LIMIT 1
);

SET @sql = IF(@foreign_key_name IS NOT NULL, 
  CONCAT('ALTER TABLE `FileAttachment` DROP FOREIGN KEY `', @foreign_key_name, '`'), 
  'SELECT "No foreign key to drop" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop InquiryMessage foreign keys
SET @foreign_key_name = (
  SELECT CONSTRAINT_NAME 
  FROM information_schema.TABLE_CONSTRAINTS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'InquiryMessage' 
    AND CONSTRAINT_TYPE = 'FOREIGN KEY' 
    AND CONSTRAINT_NAME LIKE '%inquiryId%'
  LIMIT 1
);

SET @sql = IF(@foreign_key_name IS NOT NULL, 
  CONCAT('ALTER TABLE `InquiryMessage` DROP FOREIGN KEY `', @foreign_key_name, '`'), 
  'SELECT "No foreign key to drop" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @foreign_key_name = (
  SELECT CONSTRAINT_NAME 
  FROM information_schema.TABLE_CONSTRAINTS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'InquiryMessage' 
    AND CONSTRAINT_TYPE = 'FOREIGN KEY' 
    AND CONSTRAINT_NAME LIKE '%trainingRequestId%'
  LIMIT 1
);

SET @sql = IF(@foreign_key_name IS NOT NULL, 
  CONCAT('ALTER TABLE `InquiryMessage` DROP FOREIGN KEY `', @foreign_key_name, '`'), 
  'SELECT "No foreign key to drop" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop Inquiry foreign keys
SET @foreign_key_name = (
  SELECT CONSTRAINT_NAME 
  FROM information_schema.TABLE_CONSTRAINTS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'Inquiry' 
    AND CONSTRAINT_TYPE = 'FOREIGN KEY' 
    AND CONSTRAINT_NAME LIKE '%trainerId%'
  LIMIT 1
);

SET @sql = IF(@foreign_key_name IS NOT NULL, 
  CONCAT('ALTER TABLE `Inquiry` DROP FOREIGN KEY `', @foreign_key_name, '`'), 
  'SELECT "No foreign key to drop" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @foreign_key_name = (
  SELECT CONSTRAINT_NAME 
  FROM information_schema.TABLE_CONSTRAINTS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'Inquiry' 
    AND CONSTRAINT_TYPE = 'FOREIGN KEY' 
    AND CONSTRAINT_NAME LIKE '%trainingId%'
  LIMIT 1
);

SET @sql = IF(@foreign_key_name IS NOT NULL, 
  CONCAT('ALTER TABLE `Inquiry` DROP FOREIGN KEY `', @foreign_key_name, '`'), 
  'SELECT "No foreign key to drop" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @foreign_key_name = (
  SELECT CONSTRAINT_NAME 
  FROM information_schema.TABLE_CONSTRAINTS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'Inquiry' 
    AND CONSTRAINT_TYPE = 'FOREIGN KEY' 
    AND CONSTRAINT_NAME LIKE '%trainingCompanyId%'
  LIMIT 1
);

SET @sql = IF(@foreign_key_name IS NOT NULL, 
  CONCAT('ALTER TABLE `Inquiry` DROP FOREIGN KEY `', @foreign_key_name, '`'), 
  'SELECT "No foreign key to drop" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 4: Drop indexes
DROP INDEX IF EXISTS `InquiryMessage_inquiryId_fkey` ON `InquiryMessage`;
DROP INDEX IF EXISTS `InquiryMessage_trainingRequestId_fkey` ON `InquiryMessage`;
DROP INDEX IF EXISTS `Inquiry_trainerId_fkey` ON `Inquiry`;
DROP INDEX IF EXISTS `Inquiry_trainingId_fkey` ON `Inquiry`;
DROP INDEX IF EXISTS `Inquiry_trainingCompanyId_fkey` ON `Inquiry`;
DROP INDEX IF EXISTS `FileAttachment_inquiryMessageId_fkey` ON `FileAttachment`;

-- Step 5: Drop columns that are no longer needed
SET @column_exists = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'FileAttachment' 
    AND COLUMN_NAME = 'inquiryMessageId'
);

SET @drop_column_sql = IF(@column_exists > 0, 
  'ALTER TABLE `FileAttachment` DROP COLUMN `inquiryMessageId`',
  'SELECT "Column does not exist" AS message'
);

PREPARE stmt FROM @drop_column_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 6: Drop tables
DROP TABLE IF EXISTS `InquiryMessage`;
DROP TABLE IF EXISTS `Inquiry`;

