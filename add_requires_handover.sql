-- Add requiresHandover column to TransactionCategory table
-- This allows flexible configuration of which income categories require handover from Admin to Komite

ALTER TABLE "TransactionCategory" 
ADD COLUMN IF NOT EXISTS "requiresHandover" BOOLEAN NOT NULL DEFAULT false;

-- Set requiresHandover to true for KAS and TABUNGAN (default handover categories)
UPDATE "TransactionCategory" 
SET "requiresHandover" = true 
WHERE "code" IN ('KAS', 'TABUNGAN');

-- Add comment to explain the column
COMMENT ON COLUMN "TransactionCategory"."requiresHandover" IS 'Indicates if transactions of this category created by ADMIN require handover to KOMITE';
