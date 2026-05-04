import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const bills = await db.bill.findMany({
      include: {
        category: true,
        paymentMethod: true,
      },
      orderBy: { dueDate: 'asc' },
    })

    return NextResponse.json(bills)
  } catch (error) {
    console.error('Error fetching bills:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bills' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, amount, dueDate, recurring, note, categoryId, paymentMethodId } =
      body

    if (!name || amount === undefined || !dueDate) {
      return NextResponse.json(
        { error: 'Name, amount, and dueDate are required' },
        { status: 400 }
      )
    }

    const bill = await db.bill.create({
      data: {
        name,
        amount: parseFloat(amount),
        dueDate: new Date(dueDate),
        recurring: recurring || 'monthly',
        note: note || null,
        categoryId: categoryId || null,
        paymentMethodId: paymentMethodId || null,
      },
      include: {
        category: true,
        paymentMethod: true,
      },
    })

    return NextResponse.json(bill, { status: 201 })
  } catch (error) {
    console.error('Error creating bill:', error)
    return NextResponse.json(
      { error: 'Failed to create bill' },
      { status: 500 }
    )
  }
}
