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
      name,
      amount,
      dueDate,
      recurring,
      status,
      note,
      categoryId,
      paymentMethodId,
    } = body

    const existing = await db.bill.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
    }

    const bill = await db.bill.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(dueDate !== undefined && { dueDate: new Date(dueDate) }),
        ...(recurring !== undefined && { recurring }),
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

    return NextResponse.json(bill)
  } catch (error) {
    console.error('Error updating bill:', error)
    return NextResponse.json(
      { error: 'Failed to update bill' },
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

    const existing = await db.bill.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
    }

    await db.bill.delete({ where: { id } })

    return NextResponse.json({ message: 'Bill deleted successfully' })
  } catch (error) {
    console.error('Error deleting bill:', error)
    return NextResponse.json(
      { error: 'Failed to delete bill' },
      { status: 500 }
    )
  }
}
