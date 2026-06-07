supabase migration up
npx tsx scripts/generators/09-simulate-cost-actuals.ts --force
npx tsx scripts/generators/17-simulate-purchase-orders.ts
npx tsx scripts/generators/10-simulate-resources.ts --force