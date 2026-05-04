import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Enrich a budget record with spent amount and percentage.
 * Used by both GET (list) and POST (create/update) endpoints.
 */
async function enrichBudget(budget: {
  id: string
  amount: number
  month: string
  categoryId: string
  category: { name: string; icon: string }
}) {
  const [year, mon] = budget.month.split('-').map(Number)
  const monthStart = new Date(year, mon - 1, 1)
  const monthEnd = new Date(year, mon, 1)

  const spending = await db.transaction.groupBy({
    by: ['categoryId'],
    where: {
      type: 'expense',
      date: { gte: monthStart, lt: monthEnd },
      categoryId: budget.categoryId,
    },
    _sum: { amount: true },
  })

  const spent = spending.find((s) => s.categoryId === budget.categoryId)?._sum.amount || 0

  return {
    id: budget.id,
    categoryId: budget.categoryId,
    categoryName: budget.category.name,
    categoryIcon: budget.category.icon,
    budgetAmount: budget.amount,
    spent,
    percentage: budget.amount > 0 ? Math.round((spent / budget.amount) * 100) : 0,
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')

    const budgets = await db.budget.findMany({
      where: month ? { month } : undefined,
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    })

    // When a month filter is provided, compute all category spending in one query
    if (month && budgets.length > 0) {
      const [year, mon] = month.split('-').map(Number)
      const monthStart = new Date(year, mon - 1, 1)
      const monthEnd = new Date(year, mon, 1)

      const categorySpending = await db.transaction.groupBy({
        by: ['categoryId'],
        where: {
          type: 'expense',
          date: { gte: monthStart, lt: monthEnd },
          categoryId: { not: null },
        },
        _sum: { amount: true },
      })

      const enriched = budgets.map((budget) => {
        const spent =
          categorySpending.find((cs) => cs.categoryId === budget.categoryId)?._sum.amount || 0
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

      return NextResponse.json(enriched)
    }

    // No month filter: fall back to per-budget enrichment
    const enriched = await Promise.all(budgets.map(enrichBudget))
    return NextResponse.json(enriched)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch budgets' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, month, categoryId } = body

    if (!amount || !month || !categoryId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Upsert: if budget exists for this category+month, update it
    const existing = await db.budget.findFirst({
      where: { categoryId, month },
    })

    let budget
    if (existing) {
      budget = await db.budget.update({
        where: { id: existing.id },
        data: { amount },
        include: { category: true },
      })
    } else {
      budget = await db.budget.create({
        data: { amount, month, categoryId },
        include: { category: true },
      })
    }

    const enriched = await enrichBudget(budget)

    return NextResponse.json(enriched)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create budget' }, { status: 500 })
  }
}
