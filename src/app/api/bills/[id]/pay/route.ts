import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const bill = await db.bill.findUnique({
      where: { id },
      include: {
        category: true,
        paymentMethod: true,
      },
    })

    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
    }

    if (bill.status === 'paid') {
      return NextResponse.json(
        { error: 'Bill already paid' },
        { status: 400 }
      )
    }

    // Update bill status to paid
    const updatedBill = await db.bill.update({
      where: { id },
      data: { status: 'paid' },
      include: {
        category: true,
        paymentMethod: true,
      },
    })

    // Auto-create an expense transaction
    const transaction = await db.transaction.create({
      data: {
        type: 'expense',
        amount: bill.amount,
        date: new Date(),
        note: `Bill: ${bill.name}`,
        source: 'bill',
        categoryId: bill.categoryId,
        paymentMethodId: bill.paymentMethodId,
        billId: bill.id,
      },
      include: {
        category: true,
        paymentMethod: true,
        toPaymentMethod: true,
        wishlist: true,
        bill: true,
      },
    })

    return NextResponse.json({ bill: updatedBill, transaction })
  } catch (error) {
    console.error('Error paying bill:', error)
    return NextResponse.json(
      { error: 'Failed to pay bill' },
      { status: 500 }
    )
  }
}
