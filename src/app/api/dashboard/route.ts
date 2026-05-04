import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') // YYYY-MM

    // Determine current month if not provided
    const now = new Date()
    const currentMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const [year, mon] = currentMonth.split('-').map(Number)
    const monthStart = new Date(year, mon - 1, 1)
    const monthEnd = new Date(year, mon, 1)

    // Total expense for the month
    const expenseAgg = await db.transaction.aggregate({
      _sum: { amount: true },
      where: {
        type: 'expense',
        date: { gte: monthStart, lt: monthEnd },
      },
    })

    // Total income for the month
    const incomeAgg = await db.transaction.aggregate({
      _sum: { amount: true },
      where: {
        type: 'income',
        date: { gte: monthStart, lt: monthEnd },
      },
    })

    const totalExpense = expenseAgg._sum.amount || 0
    const totalIncome = incomeAgg._sum.amount || 0
    const balance = totalIncome - totalExpense

    // Top 5 categories by expense amount
    const topCategories = await db.transaction.groupBy({
      by: ['categoryId'],
      where: {
        type: 'expense',
        date: { gte: monthStart, lt: monthEnd },
        categoryId: { not: null },
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 5,
    })

    // Fetch category details for top categories
    const categoryIds = topCategories
      .map((tc) => tc.categoryId)
      .filter((id): id is string => id !== null)

    const categories = await db.category.findMany({
      where: { id: { in: categoryIds } },
    })

    const topCategoriesWithDetails = topCategories.map((tc) => {
      const cat = categories.find((c) => c.id === tc.categoryId)
      return {
        categoryId: tc.categoryId,
        category: cat,
        totalAmount: tc._sum.amount || 0,
      }
    })

    // Recent 5 transactions
    const recentTransactions = await db.transaction.findMany({
      where: {
        date: { gte: monthStart, lt: monthEnd },
      },
      include: {
        category: true,
        paymentMethod: true,
        toPaymentMethod: true,
        wishlist: true,
        bill: true,
      },
      orderBy: { date: 'desc' },
      take: 5,
    })

    // Monthly trend: last 6 months
    const monthlyTrend = []
    for (let i = 5; i >= 0; i--) {
      const trendDate = new Date(year, mon - 1 - i, 1)
      const trendStart = new Date(trendDate.getFullYear(), trendDate.getMonth(), 1)
      const trendEnd = new Date(trendDate.getFullYear(), trendDate.getMonth() + 1, 1)

      const [trendExpense, trendIncome] = await Promise.all([
        db.transaction.aggregate({
          _sum: { amount: true },
          where: {
            type: 'expense',
            date: { gte: trendStart, lt: trendEnd },
          },
        }),
        db.transaction.aggregate({
          _sum: { amount: true },
          where: {
            type: 'income',
            date: { gte: trendStart, lt: trendEnd },
          },
        }),
      ])

      monthlyTrend.push({
        month: `${trendDate.getFullYear()}-${String(trendDate.getMonth() + 1).padStart(2, '0')}`,
        expense: trendExpense._sum.amount || 0,
        income: trendIncome._sum.amount || 0,
      })
    }

    // Upcoming bills with pending status and dueDate in the future
    const upcomingBills = await db.bill.findMany({
      where: {
        status: 'pending',
        dueDate: { gte: new Date() },
      },
      include: {
        category: true,
        paymentMethod: true,
      },
      orderBy: { dueDate: 'asc' },
    })

    // Budget data for the month
    const budgets = await db.budget.findMany({
      where: { month: currentMonth },
      include: { category: true },
    })

    // Calculate spent per category for the month
    const categorySpending = await db.transaction.groupBy({
      by: ['categoryId'],
      where: {
        type: 'expense',
        date: { gte: monthStart, lt: monthEnd },
        categoryId: { not: null },
      },
      _sum: { amount: true },
    })

    const budgetProgress = budgets.map((budget) => {
      const spent = categorySpending.find(
        (cs) => cs.categoryId === budget.categoryId
      )?._sum.amount || 0
      return {
        id: budget.id,
        categoryId: budget.categoryId,
        categoryName: budget.category.name,
        categoryIcon: budget.category.icon,
        budgetAmount: budget.amount,
        spent,
        percentage: budget.amount > 0 ? Math.round((spent / budget.amount) * 100) : 0,
      }
    })

    return NextResponse.json({
      month: currentMonth,
      totalExpense,
      totalIncome,
      balance,
      topCategories: topCategoriesWithDetails,
      recentTransactions,
      monthlyTrend,
      upcomingBills,
      budgetProgress,
    })
  } catch (error) {
    console.error('Error fetching dashboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
