import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { amount, paymentMethodId, note } = body

    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      )
    }

    const savings = await db.savingsGoal.findUnique({
      where: { id },
      include: { paymentMethod: true },
    })

    if (!savings) {
      return NextResponse.json(
        { error: 'Savings goal not found' },
        { status: 404 }
      )
    }

    if (savings.status !== 'active') {
      return NextResponse.json(
        { error: 'Cannot deposit to a non-active savings goal' },
        { status: 400 }
      )
    }

    const depositAmount = parseFloat(amount)
    const newCurrentAmount = savings.currentAmount + depositAmount

    // Determine new status
    const newStatus = newCurrentAmount >= savings.targetAmount ? 'completed' : 'active'

    // Update savings goal
    const updatedSavings = await db.savingsGoal.update({
      where: { id },
      data: {
        currentAmount: newCurrentAmount,
        status: newStatus,
        paymentMethodId: paymentMethodId || savings.paymentMethodId,
      },
      include: {
        paymentMethod: true,
      },
    })

    // Create an income transaction for the deposit
    const depositNote = note
      ? `Tabungan: ${savings.name} - ${note}`
      : `Tabungan: ${savings.name}`

    await db.transaction.create({
      data: {
        type: 'income',
        amount: depositAmount,
        date: new Date(),
        note: depositNote,
        source: 'savings',
        paymentMethodId: paymentMethodId || savings.paymentMethodId,
      },
    })

    return NextResponse.json({
      savings: updatedSavings,
      depositAmount,
      completed: newStatus === 'completed',
    })
  } catch (error) {
    console.error('Error depositing to savings goal:', error)
    return NextResponse.json(
      { error: 'Failed to deposit to savings goal' },
      { status: 500 }
    )
  }
}
