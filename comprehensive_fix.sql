-- Comprehensive fix for UUID and default value issues
-- Run this entire script in Supabase SQL Editor

-- Step 1: Drop and recreate UUID defaults to force refresh
ALTER TABLE "User" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "Halaqah" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "Halaqah" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "Shift" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "Shift" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "Announcement" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "Announcement" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "Transaction" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "Transaction" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "TransactionCategory" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "TransactionCategory" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "SppInstallmentSettings" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "SppInstallmentSettings" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "SppInstallmentPayment" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "SppInstallmentPayment" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- Step 2: Ensure User table timestamps have defaults
ALTER TABLE "User" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "User" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- Step 3: Test insert to User table
DO $$
DECLARE
    test_id uuid;
BEGIN
    INSERT INTO "User" (name, username, password, role)
    VALUES ('Test User', 'test_' || floor(random() * 1000000), 'test123', 'SANTRI')
    RETURNING id INTO test_id;
    
    RAISE NOTICE 'SUCCESS! Created user with ID: %', test_id;
    
    -- Clean up test data
    DELETE FROM "User" WHERE id = test_id;
    RAISE NOTICE 'Test user deleted';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'FAILED! Error: %', SQLERRM;
END $$;

-- Step 4: Verify all UUID defaults are set
SELECT 
    table_name,
    column_name,
    column_default
FROM information_schema.columns
WHERE table_name IN ('User', 'Halaqah', 'Shift', 'Announcement', 'Transaction', 'TransactionCategory', 'SppInstallmentSettings', 'SppInstallmentPayment')
AND column_name = 'id'
ORDER BY table_name;
