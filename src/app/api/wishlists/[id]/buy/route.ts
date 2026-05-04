import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const wishlist = await db.wishlist.findUnique({
      where: { id },
      include: {
        category: true,
        paymentMethod: true,
      },
    })

    if (!wishlist) {
      return NextResponse.json(
        { error: 'Wishlist not found' },
        { status: 404 }
      )
    }

    if (wishlist.status === 'achieved') {
      return NextResponse.json(
        { error: 'Wishlist already achieved' },
        { status: 400 }
      )
    }

    // Update wishlist status to achieved
    const updatedWishlist = await db.wishlist.update({
      where: { id },
      data: { status: 'achieved' },
      include: {
        category: true,
        paymentMethod: true,
      },
    })

    // Auto-create an expense transaction
    const transaction = await db.transaction.create({
      data: {
        type: 'expense',
        amount: wishlist.amount,
        date: new Date(),
        note: `Wishlist: ${wishlist.name}`,
        source: 'wishlist',
        categoryId: wishlist.categoryId,
        paymentMethodId: wishlist.paymentMethodId,
        wishlistId: wishlist.id,
      },
      include: {
        category: true,
        paymentMethod: true,
        toPaymentMethod: true,
        wishlist: true,
        bill: true,
      },
    })

    return NextResponse.json({ wishlist: updatedWishlist, transaction })
  } catch (error) {
    console.error('Error buying wishlist:', error)
    return NextResponse.json(
      { error: 'Failed to buy wishlist item' },
      { status: 500 }
    )
  }
}
