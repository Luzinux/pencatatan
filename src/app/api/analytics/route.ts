import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') // YYYY-MM

    const now = new Date()
    const currentMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const [year, mon] = currentMonth.split('-').map(Number)
    const monthStart = new Date(year, mon - 1, 1)
    const monthEnd = new Date(year, mon, 1)

    // ── Category Breakdown ──────────────────────────────────────────────────
    const categoryGroups = await db.transaction.groupBy({
      by: ['categoryId'],
      where: {
        type: 'expense',
        date: { gte: monthStart, lt: monthEnd },
        categoryId: { not: null },
      },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
    })

    const categoryIds = categoryGroups
      .map((cg) => cg.categoryId)
      .filter((id): id is string => id !== null)

    const categories = await db.category.findMany({
      where: { id: { in: categoryIds } },
    })

    const totalExpense = categoryGroups.reduce((sum, cg) => sum + (cg._sum.amount || 0), 0)

    const categoryBreakdown = categoryGroups.map((cg) => {
      const cat = categories.find((c) => c.id === cg.categoryId)
      return {
        categoryId: cg.categoryId,
        categoryName: cat?.name ?? 'Tidak Diketahui',
        categoryIcon: cat?.icon ?? '📝',
        totalAmount: cg._sum.amount || 0,
        percentage: totalExpense > 0 ? Math.round(((cg._sum.amount || 0) / totalExpense) * 10000) / 100 : 0,
        transactionCount: cg._count,
      }
    })

    // ── Daily Spending ──────────────────────────────────────────────────────
    const daysInMonth = new Date(year, mon, 0).getDate()
    const dailySpendingMap: Record<number, number> = {}
    for (let d = 1; d <= daysInMonth; d++) {
      dailySpendingMap[d] = 0
    }

    const dailyGroups = await db.transaction.groupBy({
      by: ['date'],
      where: {
        type: 'expense',
        date: { gte: monthStart, lt: monthEnd },
      },
      _sum: { amount: true },
    })

    for (const dg of dailyGroups) {
      const day = new Date(dg.date).getDate()
      dailySpendingMap[day] = dg._sum.amount || 0
    }

    const dailySpending = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      amount: dailySpendingMap[i + 1] || 0,
    }))

    // ── Week Day Average ────────────────────────────────────────────────────
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
    const weekDayTotals: Record<number, { total: number; count: number }> = {}
    for (let d = 0; d < 7; d++) {
      weekDayTotals[d] = { total: 0, count: 0 }
    }

    // Get all expense transactions for the month with dates
    const allExpenses = await db.transaction.findMany({
      where: {
        type: 'expense',
        date: { gte: monthStart, lt: monthEnd },
      },
      select: { date: true, amount: true },
    })

    // Group by day of week
    const weekDayAmounts: Record<number, number[]> = {}
    for (let d = 0; d < 7; d++) {
      weekDayAmounts[d] = []
    }

    for (const tx of allExpenses) {
      const dayOfWeek = new Date(tx.date).getDay()
      weekDayAmounts[dayOfWeek].push(tx.amount)
    }

    // Order: Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Minggu
    const weekDayOrder = [1, 2, 3, 4, 5, 6, 0]
    const weekDayAverage = weekDayOrder.map((dayIndex) => {
      const amounts = weekDayAmounts[dayIndex]
      const total = amounts.reduce((sum, a) => sum + a, 0)
      const count = amounts.length
      return {
        dayName: dayNames[dayIndex],
        averageAmount: count > 0 ? Math.round(total / count) : 0,
      }
    })

    // ── Top Expenses ────────────────────────────────────────────────────────
    const topExpenses = await db.transaction.findMany({
      where: {
        type: 'expense',
        date: { gte: monthStart, lt: monthEnd },
      },
      include: {
        category: true,
      },
      orderBy: { amount: 'desc' },
      take: 5,
    })

    const topExpensesFormatted = topExpenses.map((tx) => ({
      id: tx.id,
      amount: tx.amount,
      date: tx.date.toISOString(),
      note: tx.note,
      categoryName: tx.category?.name ?? 'Tidak Diketahui',
      categoryIcon: tx.category?.icon ?? '📝',
    }))

    // ── Monthly Comparison ──────────────────────────────────────────────────
    // Previous month
    const prevMonthStart = new Date(year, mon - 2, 1)
    const prevMonthEnd = new Date(year, mon - 1, 1)

    const [currentExpense, currentIncome, prevExpense, prevIncome] = await Promise.all([
      db.transaction.aggregate({
        _sum: { amount: true },
        where: { type: 'expense', date: { gte: monthStart, lt: monthEnd } },
      }),
      db.transaction.aggregate({
        _sum: { amount: true },
        where: { type: 'income', date: { gte: monthStart, lt: monthEnd } },
      }),
      db.transaction.aggregate({
        _sum: { amount: true },
        where: { type: 'expense', date: { gte: prevMonthStart, lt: prevMonthEnd } },
      }),
      db.transaction.aggregate({
        _sum: { amount: true },
        where: { type: 'income', date: { gte: prevMonthStart, lt: prevMonthEnd } },
      }),
    ])

    const curExp = currentExpense._sum.amount || 0
    const curInc = currentIncome._sum.amount || 0
    const prvExp = prevExpense._sum.amount || 0
    const prvInc = prevIncome._sum.amount || 0

    const expenseChange = prvExp > 0
      ? Math.round(((curExp - prvExp) / prvExp) * 10000) / 100
      : curExp > 0 ? 100 : 0

    const incomeChange = prvInc > 0
      ? Math.round(((curInc - prvInc) / prvInc) * 10000) / 100
      : curInc > 0 ? 100 : 0

    const monthlyComparison = {
      currentMonth: { expense: curExp, income: curInc },
      previousMonth: { expense: prvExp, income: prvInc },
      expenseChange,
      incomeChange,
    }

    return NextResponse.json({
      categoryBreakdown,
      dailySpending,
      weekDayAverage,
      topExpenses: topExpensesFormatted,
      monthlyComparison,
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }
}
