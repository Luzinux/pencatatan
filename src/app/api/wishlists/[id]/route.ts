import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, amount, targetDate, status, note, categoryId, paymentMethodId } =
      body

    const existing = await db.wishlist.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Wishlist not found' },
        { status: 404 }
      )
    }

    const wishlist = await db.wishlist.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(targetDate !== undefined && {
          targetDate: targetDate ? new Date(targetDate) : null,
        }),
        ...(status !== undefined && { status }),
        ...(note !== undefined && { note: note || null }),
        ...(categoryId !== undefined && { categoryId: categoryId || null }),
        ...(paymentMethodId !== undefined && {
          paymentMethodId: paymentMethodId || null,
        }),
      },
      include: {
        category: true,
        paymentMethod: true,
      },
    })

    return NextResponse.json(wishlist)
  } catch (error) {
    console.error('Error updating wishlist:', error)
    return NextResponse.json(
      { error: 'Failed to update wishlist' },
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

    const existing = await db.wishlist.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Wishlist not found' },
        { status: 404 }
      )
    }

    await db.wishlist.delete({ where: { id } })

    return NextResponse.json({ message: 'Wishlist deleted successfully' })
  } catch (error) {
    console.error('Error deleting wishlist:', error)
    return NextResponse.json(
      { error: 'Failed to delete wishlist' },
      { status: 500 }
    )
  }
}
