const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
    try {
        console.log('Testing database connection...');

        const users = await prisma.user.findMany({
            select: {
                username: true,
                role: true,
                name: true
            }
        });

        console.log('✅ Connection successful!');
        console.log('Users in database:', users);

        // Test finding admin user
        const admin = await prisma.user.findUnique({
            where: { username: 'admin' }
        });

        console.log('\nAdmin user:', admin ? {
            id: admin.id,
            username: admin.username,
            role: admin.role,
            hasPassword: !!admin.password
        } : 'NOT FOUND');

    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        console.error('Full error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testConnection();
