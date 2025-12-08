-- Check all NOT NULL columns in User table
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'User'
AND is_nullable = 'NO'
ORDER BY ordinal_position;
