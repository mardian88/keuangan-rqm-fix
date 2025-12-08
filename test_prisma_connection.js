const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPrismaConnection() {
    try {
        console.log('Testing Prisma connection to Supabase...');

        const users = await prisma.user.findMany({
            select: {
                username: true,
                role: true,
                name: true
            }
        });

        console.log('✅ Prisma connection successful!');
        console.log('Users in database:', users);

        // Test finding admin user
        const admin = await prisma.user.findUnique({
            where: { username: 'admin' }
        });

        if (admin) {
            console.log('\n✅ Admin user found:', {
                id: admin.id,
                username: admin.username,
                role: admin.role,
                hasPassword: !!admin.password
            });
        } else {
            console.log('\n❌ Admin user NOT FOUND');
        }

    } catch (error) {
        console.error('❌ Prisma connection failed:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

testPrismaConnection();
