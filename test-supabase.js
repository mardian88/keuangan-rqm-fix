// Test Supabase Connection
// Run this with: node test-supabase.js

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('Testing Supabase Connection...')
console.log('URL:', supabaseUrl)
console.log('Service Key exists:', !!supabaseServiceKey)

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

async function testConnection() {
    try {
        // Test 1: Check if we can connect
        console.log('\n=== Test 1: Basic Connection ===')
        const { data: users, error: usersError } = await supabase
            .from('User')
            .select('id, name, role')
            .limit(1)

        if (usersError) {
            console.error('❌ Error fetching users:', usersError)
        } else {
            console.log('✅ Successfully connected! Found', users?.length || 0, 'users')
        }

        // Test 2: Check Halaqah table
        console.log('\n=== Test 2: Halaqah Table ===')
        const { data: halaqahs, error: halaqahError } = await supabase
            .from('Halaqah')
            .select('*')
            .limit(1)

        if (halaqahError) {
            console.error('❌ Error fetching halaqahs:', halaqahError)
            console.error('Error details:', JSON.stringify(halaqahError, null, 2))
        } else {
            console.log('✅ Halaqah table exists! Found', halaqahs?.length || 0, 'records')
        }

        // Test 3: Check Shift table
        console.log('\n=== Test 3: Shift Table ===')
        const { data: shifts, error: shiftError } = await supabase
            .from('Shift')
            .select('*')
            .limit(1)

        if (shiftError) {
            console.error('❌ Error fetching shifts:', shiftError)
            console.error('Error details:', JSON.stringify(shiftError, null, 2))
        } else {
            console.log('✅ Shift table exists! Found', shifts?.length || 0, 'records')
        }

        // Test 4: Check Announcement table
        console.log('\n=== Test 4: Announcement Table ===')
        const { data: announcements, error: announcementError } = await supabase
            .from('Announcement')
            .select('*')
            .limit(1)

        if (announcementError) {
            console.error('❌ Error fetching announcements:', announcementError)
            console.error('Error details:', JSON.stringify(announcementError, null, 2))
        } else {
            console.log('✅ Announcement table exists! Found', announcements?.length || 0, 'records')
        }

        // Test 5: Check Transaction table
        console.log('\n=== Test 5: Transaction Table ===')
        const { data: transactions, error: transactionError } = await supabase
            .from('Transaction')
            .select('*')
            .limit(1)

        if (transactionError) {
            console.error('❌ Error fetching transactions:', transactionError)
            console.error('Error details:', JSON.stringify(transactionError, null, 2))
        } else {
            console.log('✅ Transaction table exists! Found', transactions?.length || 0, 'records')
        }

        // Test 6: Check TransactionCategory table
        console.log('\n=== Test 6: TransactionCategory Table ===')
        const { data: categories, error: categoryError } = await supabase
            .from('TransactionCategory')
            .select('*')
            .limit(1)

        if (categoryError) {
            console.error('❌ Error fetching categories:', categoryError)
            console.error('Error details:', JSON.stringify(categoryError, null, 2))
        } else {
            console.log('✅ TransactionCategory table exists! Found', categories?.length || 0, 'records')
        }

        console.log('\n=== Connection Test Complete ===')
    } catch (error) {
        console.error('Fatal error:', error)
    }
}

testConnection()
