import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')

    const budgets = await db.budget.findMany({
      where: month ? { month } : undefined,
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(budgets)
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

    return NextResponse.json(budget)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create budget' }, { status: 500 })
  }
}
