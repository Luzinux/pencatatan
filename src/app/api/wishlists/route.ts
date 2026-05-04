import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const wishlists = await db.wishlist.findMany({
      include: {
        category: true,
        paymentMethod: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(wishlists)
  } catch (error) {
    console.error('Error fetching wishlists:', error)
    return NextResponse.json(
      { error: 'Failed to fetch wishlists' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, amount, targetDate, note, categoryId, paymentMethodId } = body

    if (!name || amount === undefined) {
      return NextResponse.json(
        { error: 'Name and amount are required' },
        { status: 400 }
      )
    }

    const wishlist = await db.wishlist.create({
      data: {
        name,
        amount: parseFloat(amount),
        targetDate: targetDate ? new Date(targetDate) : null,
        note: note || null,
        categoryId: categoryId || null,
        paymentMethodId: paymentMethodId || null,
      },
      include: {
        category: true,
        paymentMethod: true,
      },
    })

    return NextResponse.json(wishlist, { status: 201 })
  } catch (error) {
    console.error('Error creating wishlist:', error)
    return NextResponse.json(
      { error: 'Failed to create wishlist' },
      { status: 500 }
    )
  }
}
