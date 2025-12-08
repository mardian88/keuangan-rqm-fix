// Test if UUID defaults are set correctly
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

async function testUUIDDefaults() {
    console.log('=== Testing UUID Defaults ===\n')

    // Check if UUID defaults are set
    const { data, error } = await supabase.rpc('exec_sql', {
        query: `
            SELECT 
                table_name,
                column_name,
                column_default
            FROM information_schema.columns
            WHERE table_name IN ('User', 'Halaqah', 'Shift', 'Announcement', 'Transaction')
            AND column_name = 'id'
            ORDER BY table_name;
        `
    })

    if (error) {
        console.error('Error checking defaults:', error)
        console.log('\n⚠️  Cannot check via RPC. Please run this query directly in Supabase SQL Editor:')
        console.log(`
SELECT 
    table_name,
    column_name,
    column_default
FROM information_schema.columns
WHERE table_name IN ('User', 'Halaqah', 'Shift', 'Announcement', 'Transaction')
AND column_name = 'id'
ORDER BY table_name;
        `)
    } else {
        console.log('UUID Defaults Status:')
        console.table(data)
    }

    // Try to insert a test user
    console.log('\n=== Testing User Insert ===')
    const testUsername = `test_${Date.now()}`

    const { data: insertData, error: insertError } = await supabase
        .from('User')
        .insert({
            name: 'Test User',
            username: testUsername,
            password: 'test123',
            role: 'SANTRI'
        })
        .select()

    if (insertError) {
        console.error('❌ Insert failed:', insertError.message)
        console.error('Error details:', JSON.stringify(insertError, null, 2))

        if (insertError.message.includes('null value in column "id"')) {
            console.log('\n🔴 UUID DEFAULT NOT SET! You need to run fix_uuid_defaults.sql')
        } else if (insertError.message.includes('already exists')) {
            console.log('\n⚠️  Username exists (this is OK for testing)')
        }
    } else {
        console.log('✅ Insert successful!')
        console.log('Inserted user:', insertData)

        // Clean up test user
        await supabase.from('User').delete().eq('username', testUsername)
        console.log('✅ Test user cleaned up')
    }
}

testUUIDDefaults()
