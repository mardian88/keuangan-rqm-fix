const bcrypt = require('bcryptjs');

async function verifyPasswords() {
    const adminHash = '$2b$10$gC8MqQ8GZw54fMnqFRy2ZOVuzgSvp/L818GgjrkM3cBPZqawKNm12';
    const komiteHash = '$2b$10$MNP7zEEqg0ITIHJ/Gli.XeYCGxNEBBB/bs0.sy8XDTFV.dOr2onFy';

    const adminMatch = await bcrypt.compare('mardian28', adminHash);
    const komiteMatch = await bcrypt.compare('komiteRQM2025', komiteHash);

    console.log('Admin password match:', adminMatch);
    console.log('Komite password match:', komiteMatch);

    // Generate fresh hashes
    const newAdminHash = await bcrypt.hash('mardian28', 10);
    const newKomiteHash = await bcrypt.hash('komiteRQM2025', 10);

    console.log('\n--- Fresh Hashes (jika diperlukan) ---');
    console.log('Admin:', newAdminHash);
    console.log('Komite:', newKomiteHash);
}

verifyPasswords();
