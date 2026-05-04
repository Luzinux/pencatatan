import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const month = searchParams.get('month') // YYYY-MM
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: Record<string, unknown> = {}

    if (type) {
      where.type = type
    }

    if (month) {
      const [year, mon] = month.split('-').map(Number)
      const startDate = new Date(year, mon - 1, 1)
      const endDate = new Date(year, mon, 1)
      where.date = {
        gte: startDate,
        lt: endDate,
      }
    }

    if (search) {
      where.note = {
        contains: search,
      }
    }

    const [transactions, total] = await Promise.all([
      db.transaction.findMany({
        where,
        include: {
          category: true,
          paymentMethod: true,
          toPaymentMethod: true,
          wishlist: true,
          bill: true,
        },
        orderBy: { date: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.transaction.count({ where }),
    ])

    return NextResponse.json({ transactions, total })
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
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

    if (!type || amount === undefined || !date) {
      return NextResponse.json(
        { error: 'Type, amount, and date are required' },
        { status: 400 }
      )
    }

    const transaction = await db.transaction.create({
      data: {
        type,
        amount: parseFloat(amount),
        date: new Date(date),
        note: note || null,
        source: source || 'manual',
        categoryId: categoryId || null,
        paymentMethodId: paymentMethodId || null,
        toPaymentMethodId: toPaymentMethodId || null,
        wishlistId: wishlistId || null,
        billId: billId || null,
      },
      include: {
        category: true,
        paymentMethod: true,
        toPaymentMethod: true,
        wishlist: true,
        bill: true,
      },
    })

    return NextResponse.json(transaction, { status: 201 })
  } catch (error) {
    console.error('Error creating transaction:', error)
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    )
  }
}
