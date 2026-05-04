import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, targetAmount, currentAmount, targetDate, status, note, paymentMethodId } = body

    const existing = await db.savingsGoal.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Savings goal not found' },
        { status: 404 }
      )
    }

    const savings = await db.savingsGoal.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(targetAmount !== undefined && { targetAmount: parseFloat(targetAmount) }),
        ...(currentAmount !== undefined && { currentAmount: parseFloat(currentAmount) }),
        ...(targetDate !== undefined && {
          targetDate: targetDate ? new Date(targetDate) : null,
        }),
        ...(status !== undefined && { status }),
        ...(note !== undefined && { note: note || null }),
        ...(paymentMethodId !== undefined && { paymentMethodId: paymentMethodId || null }),
      },
      include: {
        paymentMethod: true,
      },
    })

    return NextResponse.json(savings)
  } catch (error) {
    console.error('Error updating savings goal:', error)
    return NextResponse.json(
      { error: 'Failed to update savings goal' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.savingsGoal.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Savings goal not found' },
        { status: 404 }
      )
    }

    await db.savingsGoal.delete({ where: { id } })

    return NextResponse.json({ message: 'Savings goal deleted successfully' })
  } catch (error) {
    console.error('Error deleting savings goal:', error)
    return NextResponse.json(
      { error: 'Failed to delete savings goal' },
      { status: 500 }
    )
  }
}
