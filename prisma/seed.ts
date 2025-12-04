import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Seeding database...')

    // Hash passwords with specific credentials
    const adminPassword = await hash('mardian28', 10)
    const komitePassword = await hash('komiteRQM2025', 10)

    // Admin
    const admin = await prisma.user.upsert({
        where: { username: 'admin' },
        update: {
            password: adminPassword,
            name: 'Administrator',
            role: 'ADMIN',
            isActive: true,
        },
        create: {
            username: 'admin',
            name: 'Administrator',
            password: adminPassword,
            role: 'ADMIN',
            isActive: true,
        },
    })

    console.log('✅ Admin user created/updated:', {
        username: admin.username,
        name: admin.name,
        role: admin.role,
    })

    // Komite
    const komite = await prisma.user.upsert({
        where: { username: 'komite' },
        update: {
            password: komitePassword,
            name: 'Komite RQM',
            role: 'KOMITE',
            isActive: true,
        },
        create: {
            username: 'komite',
            name: 'Komite RQM',
            password: komitePassword,
            role: 'KOMITE',
            isActive: true,
        },
    })

    console.log('✅ Komite user created/updated:', {
        username: komite.username,
        name: komite.name,
        role: komite.role,
    })

    // Check santri users
    const santriCount = await prisma.user.count({
        where: { role: 'SANTRI' },
    })

    console.log(`\n📊 Total Santri users: ${santriCount}`)

    if (santriCount === 0) {
        console.log('⚠️  No santri users found.')
        console.log('   Create santri users from admin panel (Data Santri)')
        console.log('   Santri can login using their NIS')
    } else {
        console.log('✅ Santri users exist. They can login using their NIS.')
    }

    console.log('\n🎉 Seeding completed!')
    console.log('\n📝 Login credentials:')
    console.log('   Admin  - Username: admin    Password: mardian28')
    console.log('   Komite - Username: komite   Password: komiteRQM2025')
    console.log('   Santri - Use NIS (no password needed)')

    // Seed Transaction Categories
    const categories = [
        { name: "Pembayaran SPP", code: "SPP", type: "INCOME", showToKomite: false, showToAdmin: true, isSystem: true },
        { name: "Tabungan Santri", code: "TABUNGAN", type: "INCOME", showToKomite: true, showToAdmin: true, isSystem: true },
        { name: "Uang Kas", code: "KAS", type: "INCOME", showToKomite: true, showToAdmin: true, isSystem: true },
        { name: "Pemasukan Lainnya", code: "PEMASUKAN_LAIN", type: "INCOME", showToKomite: true, showToAdmin: true, isSystem: true },
        { name: "Penarikan Tabungan", code: "PENARIKAN_TABUNGAN", type: "EXPENSE", showToKomite: true, showToAdmin: true, isSystem: true },
        { name: "Operasional Komite", code: "PENGELUARAN_KOMITE", type: "EXPENSE", showToKomite: true, showToAdmin: true, isSystem: true },
        { name: "Pengeluaran Admin", code: "PENGELUARAN_ADMIN", type: "EXPENSE", showToKomite: false, showToAdmin: true, isSystem: true },
    ]

    for (const cat of categories) {
        await prisma.transactionCategory.upsert({
            where: { code: cat.code },
            update: {},
            create: cat
        })
    }
    console.log('✅ Transaction Categories seeded.')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error('❌ Error:', e)
        await prisma.$disconnect()
        process.exit(1)
    })
