// Check for all NOT NULL columns without defaults
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkSchema() {
    console.log('=== Checking User Table Schema ===\n')

    // Try a simple insert with minimal data
    const testUsername = `test_${Date.now()}`

    const { data, error } = await supabase
        .from('User')
        .insert({
            name: 'Test User',
            username: testUsername,
            password: 'hashed_password_here',
            role: 'SANTRI'
        })
        .select()

    if (error) {
        console.error('❌ Insert Error:')
        console.error('Message:', error.message)
        console.error('Code:', error.code)
        console.error('Details:', error.details)
        console.error('Hint:', error.hint)
        console.error('\nFull error:', JSON.stringify(error, null, 2))
    } else {
        console.log('✅ Insert successful!')
        console.log('Data:', data)

        // Clean up
        await supabase.from('User').delete().eq('username', testUsername)
        console.log('✅ Cleaned up test data')
    }
}

checkSchema()
