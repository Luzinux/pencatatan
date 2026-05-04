import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const month = searchParams.get('month')

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: 'Parameter month (YYYY-MM) diperlukan' }, { status: 400 })
    }

    const [yearStr, monthStr] = month.split('-')
    const year = parseInt(yearStr)
    const m = parseInt(monthStr)

    const startDate = new Date(year, m - 1, 1)
    const endDate = new Date(year, m, 1)

    // Previous month boundaries
    const prevStartDate = new Date(year, m - 2, 1)
    const prevEndDate = new Date(year, m - 1, 1)

    // ─── Summary ──────────────────────────────────────────────────────────
    const currentTransactions = await db.transaction.findMany({
      where: {
        date: { gte: startDate, lt: endDate },
      },
      include: {
        category: true,
        paymentMethod: true,
      },
    })

    const totalExpense = currentTransactions
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0)
    const totalIncome = currentTransactions
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0)
    const balance = totalIncome - totalExpense
    const savingsRate = totalIncome > 0 ? Math.max(0, ((totalIncome - totalExpense) / totalIncome) * 100) : 0
    const transactionCount = currentTransactions.length

    // ─── Expense By Category ──────────────────────────────────────────────
    const expenseTransactions = currentTransactions.filter((t) => t.type === 'expense')

    const expenseByCategoryMap = new Map<string, { categoryId: string; categoryName: string; categoryIcon: string; amount: number }>()
    for (const tx of expenseTransactions) {
      const catId = tx.categoryId || 'uncategorized'
      if (!expenseByCategoryMap.has(catId)) {
        expenseByCategoryMap.set(catId, {
          categoryId: catId,
          categoryName: tx.category?.name || 'Tanpa Kategori',
          categoryIcon: tx.category?.icon || '📝',
          amount: 0,
        })
      }
      expenseByCategoryMap.get(catId)!.amount += tx.amount
    }

    // Fetch budgets for this month
    const budgets = await db.budget.findMany({
      where: { month },
      include: { category: true },
    })

    const budgetMap = new Map(budgets.map((b) => [b.categoryId, b.amount]))

    const expenseByCategory = Array.from(expenseByCategoryMap.values())
      .map((cat) => ({
        ...cat,
        percentage: totalExpense > 0 ? (cat.amount / totalExpense) * 100 : 0,
        budgetAmount: budgetMap.get(cat.categoryId) || 0,
        budgetSpent: cat.amount,
      }))
      .sort((a, b) => b.amount - a.amount)

    // ─── Income By Category ───────────────────────────────────────────────
    const incomeTransactions = currentTransactions.filter((t) => t.type === 'income')

    const incomeByCategoryMap = new Map<string, { categoryId: string; categoryName: string; categoryIcon: string; amount: number }>()
    for (const tx of incomeTransactions) {
      const catId = tx.categoryId || 'uncategorized'
      if (!incomeByCategoryMap.has(catId)) {
        incomeByCategoryMap.set(catId, {
          categoryId: catId,
          categoryName: tx.category?.name || 'Tanpa Kategori',
          categoryIcon: tx.category?.icon || '📝',
          amount: 0,
        })
      }
      incomeByCategoryMap.get(catId)!.amount += tx.amount
    }

    const incomeByCategory = Array.from(incomeByCategoryMap.values())
      .map((cat) => ({
        ...cat,
        percentage: totalIncome > 0 ? (cat.amount / totalIncome) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)

    // ─── Expense By Payment Method ────────────────────────────────────────
    const expenseByPmMap = new Map<string, { paymentMethodId: string; paymentMethodName: string; amount: number }>()
    for (const tx of expenseTransactions) {
      const pmId = tx.paymentMethodId || 'none'
      if (!expenseByPmMap.has(pmId)) {
        expenseByPmMap.set(pmId, {
          paymentMethodId: pmId,
          paymentMethodName: tx.paymentMethod?.name || 'Tanpa Metode',
          amount: 0,
        })
      }
      expenseByPmMap.get(pmId)!.amount += tx.amount
    }

    const expenseByPaymentMethod = Array.from(expenseByPmMap.values())
      .sort((a, b) => b.amount - a.amount)

    // ─── Daily Spending ───────────────────────────────────────────────────
    const daysInMonth = new Date(year, m, 0).getDate()
    const dailySpendingMap = new Map<string, number>()
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      dailySpendingMap.set(dateStr, 0)
    }

    for (const tx of expenseTransactions) {
      const dateKey = new Date(tx.date).toISOString().split('T')[0]
      if (dailySpendingMap.has(dateKey)) {
        dailySpendingMap.set(dateKey, (dailySpendingMap.get(dateKey) || 0) + tx.amount)
      }
    }

    const dailySpending = Array.from(dailySpendingMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // ─── Bills Status ─────────────────────────────────────────────────────
    const allBills = await db.bill.findMany()
    const billsThisMonth = allBills.filter((b) => {
      const dueDate = new Date(b.dueDate)
      return dueDate >= startDate && dueDate < endDate
    })

    const paidBills = billsThisMonth.filter((b) => b.status === 'paid')
    const unpaidBills = billsThisMonth.filter((b) => b.status === 'pending')
    const totalUnpaidAmount = unpaidBills.reduce((s, b) => s + b.amount, 0)

    // ─── Savings Goals ────────────────────────────────────────────────────
    const savingsGoals = await db.savingsGoal.findMany()
    const activeGoals = savingsGoals.filter((g) => g.status === 'active')
    const completedGoals = savingsGoals.filter((g) => g.status === 'completed')
    const totalSaved = savingsGoals.reduce((s, g) => s + g.currentAmount, 0)

    // ─── Previous Month Comparison ────────────────────────────────────────
    const prevTransactions = await db.transaction.findMany({
      where: {
        date: { gte: prevStartDate, lt: prevEndDate },
      },
    })

    const prevTotalExpense = prevTransactions
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0)
    const prevTotalIncome = prevTransactions
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0)

    const expenseChange = prevTotalExpense > 0
      ? ((totalExpense - prevTotalExpense) / prevTotalExpense) * 100
      : totalExpense > 0 ? 100 : 0
    const incomeChange = prevTotalIncome > 0
      ? ((totalIncome - prevTotalIncome) / prevTotalIncome) * 100
      : totalIncome > 0 ? 100 : 0

    // ─── Top Expenses ─────────────────────────────────────────────────────
    const topExpenses = expenseTransactions
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map((tx) => ({
        id: tx.id,
        note: tx.note || '',
        amount: tx.amount,
        categoryName: tx.category?.name || 'Tanpa Kategori',
        categoryIcon: tx.category?.icon || '📝',
        date: tx.date.toISOString(),
      }))

    return NextResponse.json({
      month,
      summary: {
        totalExpense,
        totalIncome,
        balance,
        savingsRate,
        transactionCount,
      },
      expenseByCategory,
      incomeByCategory,
      expenseByPaymentMethod,
      dailySpending,
      billsStatus: {
        totalBills: billsThisMonth.length,
        paidBills: paidBills.length,
        unpaidBills: unpaidBills.length,
        totalUnpaidAmount,
      },
      savingsGoals: {
        totalGoals: savingsGoals.length,
        activeGoals: activeGoals.length,
        completedGoals: completedGoals.length,
        totalSaved,
      },
      previousMonthComparison: {
        expenseChange,
        incomeChange,
      },
      topExpenses,
    })
  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json({ error: 'Gagal membuat laporan' }, { status: 500 })
  }
}
