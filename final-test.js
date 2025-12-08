// Final test with complete data
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

async function finalTest() {
    console.log('=== Final Insert Test ===\n')

    const testUsername = `santri_test_${Date.now()}`

    console.log('Attempting to insert user with username:', testUsername)

    const { data, error } = await supabase
        .from('User')
        .insert({
            name: 'Test Santri',
            username: testUsername,
            password: '$2a$10$abcdefghijklmnopqrstuv', // bcrypt hash format
            role: 'SANTRI',
            isActive: true
        })
        .select()

    if (error) {
        console.error('\n❌ INSERT FAILED')
        console.error('Error code:', error.code)
        console.error('Error message:', error.message)
        console.error('Error details:', error.details)
        console.error('Error hint:', error.hint)
        console.error('\nFull error object:')
        console.error(JSON.stringify(error, null, 2))
    } else {
        console.log('\n✅ INSERT SUCCESSFUL!')
        console.log('Inserted data:', JSON.stringify(data, null, 2))

        // Clean up
        console.log('\nCleaning up test data...')
        const { error: deleteError } = await supabase
            .from('User')
            .delete()
            .eq('username', testUsername)

        if (deleteError) {
            console.error('Cleanup failed:', deleteError)
        } else {
            console.log('✅ Test data cleaned up')
        }
    }

    console.log('\n=== Test Complete ===')
}

finalTest()
