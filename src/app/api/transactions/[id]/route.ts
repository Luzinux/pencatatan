import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      type,
      amount,
      date,
      note,
      source,
      categoryId,
      paymentMethodId,
      toPaymentMethodId,
      wishlistId,
      billId,
    } = body

    const existing = await db.transaction.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    const transaction = await db.transaction.update({
      where: { id },
      data: {
        ...(type !== undefined && { type }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(note !== undefined && { note: note || null }),
        ...(source !== undefined && { source }),
        ...(categoryId !== undefined && { categoryId: categoryId || null }),
        ...(paymentMethodId !== undefined && {
          paymentMethodId: paymentMethodId || null,
        }),
        ...(toPaymentMethodId !== undefined && {
          toPaymentMethodId: toPaymentMethodId || null,
        }),
        ...(wishlistId !== undefined && { wishlistId: wishlistId || null }),
        ...(billId !== undefined && { billId: billId || null }),
      },
      include: {
        category: true,
        paymentMethod: true,
        toPaymentMethod: true,
        wishlist: true,
        bill: true,
      },
    })

    return NextResponse.json(transaction)
  } catch (error) {
    console.error('Error updating transaction:', error)
    return NextResponse.json(
      { error: 'Failed to update transaction' },
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

    const existing = await db.transaction.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    await db.transaction.delete({ where: { id } })

    return NextResponse.json({ message: 'Transaction deleted successfully' })
  } catch (error) {
    console.error('Error deleting transaction:', error)
    return NextResponse.json(
      { error: 'Failed to delete transaction' },
      { status: 500 }
    )
  }
}
