
import { supabaseAdmin } from "@/lib/db";

async function main() {
    const { data: categories } = await supabaseAdmin.from('TransactionCategory').select('*');
    console.log("Categories:", JSON.stringify(categories, null, 2));

    const { data: recentTransactions } = await supabaseAdmin.from('Transaction').select('type, date, amount').limit(5);
    console.log("Recent Transactions:", JSON.stringify(recentTransactions, null, 2));
}

main();
