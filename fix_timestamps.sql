-- Fix updatedAt column defaults for all tables
-- Run this in Supabase SQL Editor

-- Fix TransactionCategory timestamps
ALTER TABLE "TransactionCategory" 
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- Also fix other tables that might have the same issue
ALTER TABLE "Announcement" 
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Transaction" 
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "SppInstallmentSettings" 
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "SppInstallmentPayment" 
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- Verify the changes
SELECT 
    table_name,
    column_name,
    column_default
FROM information_schema.columns
WHERE column_name IN ('createdAt', 'updatedAt')
AND table_name IN ('User', 'TransactionCategory', 'Announcement', 'Transaction', 'SppInstallmentSettings', 'SppInstallmentPayment')
ORDER BY table_name, column_name;
