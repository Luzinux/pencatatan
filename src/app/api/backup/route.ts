import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createId } from '@paralleldrive/cuid2'

// GET - Export all data as JSON backup
export async function GET() {
  try {
    const [categories, paymentMethods, transactions, wishlists, bills, budgets, savingsGoals] = await Promise.all([
      db.category.findMany({ orderBy: { createdAt: 'asc' } }),
      db.paymentMethod.findMany({ orderBy: { createdAt: 'asc' } }),
      db.transaction.findMany({ orderBy: { createdAt: 'asc' } }),
      db.wishlist.findMany({ orderBy: { createdAt: 'asc' } }),
      db.bill.findMany({ orderBy: { createdAt: 'asc' } }),
      db.budget.findMany({ orderBy: { createdAt: 'asc' } }),
      db.savingsGoal.findMany({ orderBy: { createdAt: 'asc' } }),
    ])

    const backupData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      data: {
        categories,
        paymentMethods,
        transactions,
        wishlists,
        bills,
        budgets,
        savingsGoals,
      },
    }

    const dateStr = new Date().toISOString().split('T')[0]
    const filename = `dompetku-backup-${dateStr}.json`

    return new NextResponse(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename=${filename}`,
      },
    })
  } catch (error) {
    console.error('Backup export error:', error)
    return NextResponse.json({ error: 'Gagal mengekspor data backup' }, { status: 500 })
  }
}

// POST - Import data from JSON backup
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate structure
    if (!body.version || !body.data) {
      return NextResponse.json(
        { error: 'Format file backup tidak valid. File harus memiliki versi dan data.' },
        { status: 400 }
      )
    }

    const { data } = body

    // Validate required data fields
    const requiredFields = ['categories', 'paymentMethods', 'transactions', 'wishlists', 'bills', 'budgets', 'savingsGoals']
    for (const field of requiredFields) {
      if (!Array.isArray(data[field])) {
        return NextResponse.json(
          { error: `Field "${field}" tidak ditemukan atau bukan array dalam data backup.` },
          { status: 400 }
        )
      }
    }

    // Use a Prisma transaction to ensure atomicity
    const result = await db.$transaction(async (tx) => {
      // 1. Delete all existing data in correct order (respect foreign keys)
      // Transactions reference categories, paymentMethods, wishlists, bills
      await tx.transaction.deleteMany()
      // Budgets reference categories
      await tx.budget.deleteMany()
      // SavingsGoals reference paymentMethods
      await tx.savingsGoal.deleteMany()
      // Wishlists reference categories, paymentMethods
      await tx.wishlist.deleteMany()
      // Bills reference categories, paymentMethods
      await tx.bill.deleteMany()
      // Categories and PaymentMethods are referenced by others, delete last
      await tx.category.deleteMany()
      await tx.paymentMethod.deleteMany()

      // 2. Create ID mapping tables
      const categoryIdMap = new Map<string, string>()
      const paymentMethodIdMap = new Map<string, string>()

      // 3. Create categories with new IDs
      for (const cat of data.categories) {
        const newId = createId()
        categoryIdMap.set(cat.id, newId)
        await tx.category.create({
          data: {
            id: newId,
            name: cat.name,
            icon: cat.icon ?? '📝',
            type: cat.type ?? 'expense',
            createdAt: cat.createdAt ? new Date(cat.createdAt) : new Date(),
            updatedAt: cat.updatedAt ? new Date(cat.updatedAt) : new Date(),
          },
        })
      }

      // 4. Create payment methods with new IDs
      for (const pm of data.paymentMethods) {
        const newId = createId()
        paymentMethodIdMap.set(pm.id, newId)
        await tx.paymentMethod.create({
          data: {
            id: newId,
            name: pm.name,
            type: pm.type ?? 'cash',
            initialBalance: pm.initialBalance ?? 0,
            createdAt: pm.createdAt ? new Date(pm.createdAt) : new Date(),
            updatedAt: pm.updatedAt ? new Date(pm.updatedAt) : new Date(),
          },
        })
      }

      // 5. Create wishlists with mapped IDs
      for (const wl of data.wishlists) {
        await tx.wishlist.create({
          data: {
            id: createId(),
            name: wl.name,
            amount: wl.amount ?? 0,
            targetDate: wl.targetDate ? new Date(wl.targetDate) : null,
            status: wl.status ?? 'pending',
            note: wl.note ?? null,
            categoryId: wl.categoryId ? (categoryIdMap.get(wl.categoryId) ?? null) : null,
            paymentMethodId: wl.paymentMethodId ? (paymentMethodIdMap.get(wl.paymentMethodId) ?? null) : null,
            createdAt: wl.createdAt ? new Date(wl.createdAt) : new Date(),
            updatedAt: wl.updatedAt ? new Date(wl.updatedAt) : new Date(),
          },
        })
      }

      // 6. Create bills with mapped IDs
      for (const bill of data.bills) {
        await tx.bill.create({
          data: {
            id: createId(),
            name: bill.name,
            amount: bill.amount ?? 0,
            dueDate: bill.dueDate ? new Date(bill.dueDate) : new Date(),
            recurring: bill.recurring ?? 'monthly',
            status: bill.status ?? 'pending',
            note: bill.note ?? null,
            categoryId: bill.categoryId ? (categoryIdMap.get(bill.categoryId) ?? null) : null,
            paymentMethodId: bill.paymentMethodId ? (paymentMethodIdMap.get(bill.paymentMethodId) ?? null) : null,
            createdAt: bill.createdAt ? new Date(bill.createdAt) : new Date(),
            updatedAt: bill.updatedAt ? new Date(bill.updatedAt) : new Date(),
          },
        })
      }

      // 7. Create budgets with mapped IDs
      for (const budget of data.budgets) {
        await tx.budget.create({
          data: {
            id: createId(),
            amount: budget.amount ?? 0,
            month: budget.month,
            categoryId: categoryIdMap.get(budget.categoryId) ?? budget.categoryId,
            createdAt: budget.createdAt ? new Date(budget.createdAt) : new Date(),
            updatedAt: budget.updatedAt ? new Date(budget.updatedAt) : new Date(),
          },
        })
      }

      // 8. Create savings goals with mapped IDs
      for (const sg of data.savingsGoals) {
        await tx.savingsGoal.create({
          data: {
            id: createId(),
            name: sg.name,
            targetAmount: sg.targetAmount ?? 0,
            currentAmount: sg.currentAmount ?? 0,
            targetDate: sg.targetDate ? new Date(sg.targetDate) : null,
            status: sg.status ?? 'active',
            note: sg.note ?? null,
            paymentMethodId: sg.paymentMethodId ? (paymentMethodIdMap.get(sg.paymentMethodId) ?? null) : null,
            createdAt: sg.createdAt ? new Date(sg.createdAt) : new Date(),
            updatedAt: sg.updatedAt ? new Date(sg.updatedAt) : new Date(),
          },
        })
      }

      // 9. Create transactions with mapped IDs
      for (const txItem of data.transactions) {
        await tx.transaction.create({
          data: {
            id: createId(),
            type: txItem.type,
            amount: txItem.amount ?? 0,
            date: txItem.date ? new Date(txItem.date) : new Date(),
            note: txItem.note ?? null,
            source: txItem.source ?? 'manual',
            categoryId: txItem.categoryId ? (categoryIdMap.get(txItem.categoryId) ?? null) : null,
            paymentMethodId: txItem.paymentMethodId ? (paymentMethodIdMap.get(txItem.paymentMethodId) ?? null) : null,
            toPaymentMethodId: txItem.toPaymentMethodId ? (paymentMethodIdMap.get(txItem.toPaymentMethodId) ?? null) : null,
            wishlistId: txItem.wishlistId ?? null,
            billId: txItem.billId ?? null,
            createdAt: txItem.createdAt ? new Date(txItem.createdAt) : new Date(),
            updatedAt: txItem.updatedAt ? new Date(txItem.updatedAt) : new Date(),
          },
        })
      }

      return {
        categories: data.categories.length,
        paymentMethods: data.paymentMethods.length,
        transactions: data.transactions.length,
        wishlists: data.wishlists.length,
        bills: data.bills.length,
        budgets: data.budgets.length,
        savingsGoals: data.savingsGoals.length,
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Data berhasil dipulihkan',
      imported: result,
    })
  } catch (error) {
    console.error('Backup import error:', error)
    return NextResponse.json({ error: 'Gagal mengimpor data backup. Pastikan format file valid.' }, { status: 500 })
  }
}
