const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Ambil dari .env atau hardcode sementara untuk test
const supabaseUrl = 'https://jiipbznncfhmyseoaxqw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppaXBiem5uY2ZobXlzZW9heHF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MzEyODcsImV4cCI6MjA4MDUwNzI4N30.NP-HzG-HFFznnIaeIPqv0gddSr9qcVKa3f9_nqh5Rj0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSupabaseConnection() {
    try {
        console.log('Testing Supabase connection...');

        // Test query ke tabel User
        const { data, error } = await supabase
            .from('User')
            .select('username, role, name')
            .limit(5);

        if (error) {
            console.error('❌ Supabase query error:', error);
            return;
        }

        console.log('✅ Supabase connection successful!');
        console.log('Users found:', data);

        // Test find admin
        const { data: admin, error: adminError } = await supabase
            .from('User')
            .select('*')
            .eq('username', 'admin')
            .single();

        if (adminError) {
            console.error('❌ Admin not found:', adminError);
        } else {
            console.log('\n✅ Admin user found:', {
                username: admin.username,
                role: admin.role,
                hasPassword: !!admin.password
            });
        }

    } catch (error) {
        console.error('❌ Connection failed:', error.message);
    }
}

testSupabaseConnection();
