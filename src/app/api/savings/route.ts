import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const savings = await db.savingsGoal.findMany({
      include: {
        paymentMethod: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(savings)
  } catch (error) {
    console.error('Error fetching savings goals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch savings goals' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, targetAmount, targetDate, note, paymentMethodId } = body

    if (!name || targetAmount === undefined) {
      return NextResponse.json(
        { error: 'Name and target amount are required' },
        { status: 400 }
      )
    }

    const savings = await db.savingsGoal.create({
      data: {
        name,
        targetAmount: parseFloat(targetAmount),
        currentAmount: 0,
        targetDate: targetDate ? new Date(targetDate) : null,
        note: note || null,
        paymentMethodId: paymentMethodId || null,
      },
      include: {
        paymentMethod: true,
      },
    })

    return NextResponse.json(savings, { status: 201 })
  } catch (error) {
    console.error('Error creating savings goal:', error)
    return NextResponse.json(
      { error: 'Failed to create savings goal' },
      { status: 500 }
    )
  }
}
