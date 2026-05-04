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
      type,
      amount,
      categoryId,
      paymentMethodId,
      toPaymentMethodId,
      note,
      frequency,
      dayOfWeek,
      dayOfMonth,
      startDate,
      endDate,
      active,
    } = body

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (type !== undefined) updateData.type = type
    if (amount !== undefined) updateData.amount = parseFloat(amount)
    if (categoryId !== undefined) updateData.categoryId = categoryId || null
    if (paymentMethodId !== undefined) updateData.paymentMethodId = paymentMethodId || null
    if (toPaymentMethodId !== undefined) updateData.toPaymentMethodId = toPaymentMethodId || null
    if (note !== undefined) updateData.note = note || null
    if (frequency !== undefined) updateData.frequency = frequency
    if (dayOfWeek !== undefined) updateData.dayOfWeek = dayOfWeek != null ? parseInt(dayOfWeek) : null
    if (dayOfMonth !== undefined) updateData.dayOfMonth = dayOfMonth != null ? parseInt(dayOfMonth) : null
    if (startDate !== undefined) updateData.startDate = new Date(startDate)
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null
    if (active !== undefined) updateData.active = active

    const recurring = await db.recurringTransaction.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        paymentMethod: true,
        toPaymentMethod: true,
      },
    })

    return NextResponse.json(recurring)
  } catch (error) {
    console.error('Error updating recurring transaction:', error)
    return NextResponse.json(
      { error: 'Gagal memperbarui transaksi berulang' },
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
    await db.recurringTransaction.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting recurring transaction:', error)
    return NextResponse.json(
      { error: 'Gagal menghapus transaksi berulang' },
      { status: 500 }
    )
  }
}
