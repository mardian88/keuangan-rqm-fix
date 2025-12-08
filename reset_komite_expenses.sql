-- Reset Komite Expense Transactions
-- This script will delete all expense transactions created by KOMITE role
-- Run this in Supabase SQL Editor to reset expense tracking to 0

-- First, let's see what will be deleted (optional - for verification)
-- Uncomment the following query to preview before deleting:
/*
SELECT 
    t.id,
    t.date,
    t.type,
    t.amount,
    t.description,
    tc.name as category_name,
    tc.type as category_type
FROM "Transaction" t
JOIN "TransactionCategory" tc ON t.type = tc.code
JOIN "User" u ON t."creatorId" = u.id
WHERE u.role = 'KOMITE'
  AND tc.type = 'EXPENSE'
ORDER BY t.date DESC;
*/

-- Delete all expense transactions created by KOMITE
DELETE FROM "Transaction"
WHERE "creatorId" IN (
    SELECT id FROM "User" WHERE role = 'KOMITE'
)
AND type IN (
    SELECT code FROM "TransactionCategory" WHERE type = 'EXPENSE'
);

-- Verify the deletion
SELECT COUNT(*) as remaining_komite_expenses
FROM "Transaction" t
JOIN "User" u ON t."creatorId" = u.id
JOIN "TransactionCategory" tc ON t.type = tc.code
WHERE u.role = 'KOMITE'
  AND tc.type = 'EXPENSE';

-- This should return 0 if successful
