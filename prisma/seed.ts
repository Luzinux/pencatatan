import { db } from '../src/lib/db'

async function seed() {
  console.log('🌱 Seeding database...\n')

  // ── Default Categories ──────────────────────────────────────────────
  const expenseCategories = [
    { name: 'Makanan & Minuman', icon: '🍔', type: 'expense' },
    { name: 'Transportasi', icon: '🚗', type: 'expense' },
    { name: 'Belanja', icon: '🛍️', type: 'expense' },
    { name: 'Hiburan', icon: '🎬', type: 'expense' },
    { name: 'Kesehatan', icon: '💊', type: 'expense' },
    { name: 'Pendidikan', icon: '📚', type: 'expense' },
    { name: 'Tagihan & Utilitas', icon: '💡', type: 'expense' },
    { name: 'Lainnya', icon: '📝', type: 'expense' },
  ]

  const incomeCategories = [
    { name: 'Gaji', icon: '💰', type: 'income' },
    { name: 'Freelance', icon: '💻', type: 'income' },
    { name: 'Investasi', icon: '📈', type: 'income' },
    { name: 'Lainnya', icon: '💵', type: 'income' },
  ]

  // Check existing categories to avoid duplicates
  const existingCategories = await db.category.findMany({
    select: { name: true, type: true },
  })
  const existingCategoryKeys = new Set(
    existingCategories.map((c) => `${c.name}:${c.type}`)
  )

  const allCategories = [...expenseCategories, ...incomeCategories]
  const newCategories = allCategories.filter(
    (c) => !existingCategoryKeys.has(`${c.name}:${c.type}`)
  )

  if (newCategories.length > 0) {
    const categoryResult = await db.category.createMany({
      data: newCategories,
    })
    console.log(`✅ Created ${categoryResult.count} categories:`)
    newCategories.forEach((c) => console.log(`   ${c.icon} ${c.name} (${c.type})`))
  } else {
    console.log('⏭️  Categories already exist, skipping.')
  }

  console.log()

  // ── Default Payment Methods ─────────────────────────────────────────
  const paymentMethods = [
    { name: 'Cash', type: 'cash', initialBalance: 0 },
    { name: 'GoPay', type: 'ewallet', initialBalance: 0 },
    { name: 'OVO', type: 'ewallet', initialBalance: 0 },
    { name: 'DANA', type: 'ewallet', initialBalance: 0 },
    { name: 'BCA', type: 'bank', initialBalance: 0 },
    { name: 'Mandiri', type: 'bank', initialBalance: 0 },
  ]

  // Check existing payment methods to avoid duplicates
  const existingPaymentMethods = await db.paymentMethod.findMany({
    select: { name: true },
  })
  const existingPMNames = new Set(existingPaymentMethods.map((p) => p.name))

  const newPaymentMethods = paymentMethods.filter(
    (p) => !existingPMNames.has(p.name)
  )

  if (newPaymentMethods.length > 0) {
    const pmResult = await db.paymentMethod.createMany({
      data: newPaymentMethods,
    })
    console.log(`✅ Created ${pmResult.count} payment methods:`)
    newPaymentMethods.forEach((p) =>
      console.log(`   ${p.name} (${p.type}) — balance: ${p.initialBalance}`)
    )
  } else {
    console.log('⏭️  Payment methods already exist, skipping.')
  }

  console.log('\n🎉 Seeding complete!')

  await db.$disconnect()
}

seed().catch(async (e) => {
  console.error('❌ Seed failed:', e)
  await db.$disconnect()
  process.exit(1)
})
