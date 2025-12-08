-- Fix UUID default values for tables
-- This script adds UUID default values to tables that are missing them

-- Fix User table (MOST IMPORTANT - for Santri, Guru, Admin, Komite)
ALTER TABLE "User" 
ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- Fix Halaqah table
ALTER TABLE "Halaqah" 
ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- Fix Shift table
ALTER TABLE "Shift" 
ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- Fix Announcement table
ALTER TABLE "Announcement" 
ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- Fix Transaction table
ALTER TABLE "Transaction" 
ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- Fix TransactionCategory table (if needed)
ALTER TABLE "TransactionCategory" 
ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- Fix SppInstallmentSettings table (if needed)
ALTER TABLE "SppInstallmentSettings" 
ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- Fix SppInstallmentPayment table (if needed)
ALTER TABLE "SppInstallmentPayment" 
ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- Verify the changes
SELECT 
    table_name,
    column_name,
    column_default
FROM information_schema.columns
WHERE table_name IN ('User', 'Halaqah', 'Shift', 'Announcement', 'Transaction', 'TransactionCategory', 'SppInstallmentSettings', 'SppInstallmentPayment')
AND column_name = 'id'
ORDER BY table_name;
