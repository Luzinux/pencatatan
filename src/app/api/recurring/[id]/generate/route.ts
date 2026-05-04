import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

function getNextOccurrence(currentNext: Date, frequency: string, dayOfWeek?: number | null, dayOfMonth?: number | null): Date {
  const next = new Date(currentNext)

  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1)
      break
    case 'weekly': {
      const targetDay = dayOfWeek ?? next.getDay()
      next.setDate(next.getDate() + 7)
      // Adjust to the target day of week
      const currentDay = next.getDay()
      let diff = targetDay - currentDay
      if (diff < -3) diff += 7
      if (diff > 3) diff -= 7
      next.setDate(next.getDate() + diff)
      break
    }
    case 'monthly': {
      const targetDay = dayOfMonth ?? next.getDate()
      next.setMonth(next.getMonth() + 1)
      const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
      next.setDate(Math.min(targetDay, maxDay))
      break
    }
    case 'yearly': {
      next.setFullYear(next.getFullYear() + 1)
      const targetDay = dayOfMonth ?? next.getDate()
      const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
      next.setDate(Math.min(targetDay, maxDay))
      break
    }
    default:
      next.setDate(next.getDate() + 30)
  }

  next.setHours(0, 0, 0, 0)
  return next
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const recurring = await db.recurringTransaction.findUnique({
      where: { id },
      include: {
        category: true,
        paymentMethod: true,
        toPaymentMethod: true,
      },
    })

    if (!recurring) {
      return NextResponse.json(
        { error: 'Transaksi berulang tidak ditemukan' },
        { status: 404 }
      )
    }

    if (!recurring.active) {
      return NextResponse.json(
        { error: 'Transaksi berulang tidak aktif' },
        { status: 400 }
      )
    }

    // Check if endDate has passed
    if (recurring.endDate && new Date(recurring.endDate) < new Date()) {
      return NextResponse.json(
        { error: 'Transaksi berulang sudah berakhir' },
        { status: 400 }
      )
    }

    // Create the transaction
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const transaction = await db.transaction.create({
      data: {
        type: recurring.type,
        amount: recurring.amount,
        date: today,
        note: recurring.note ? `${recurring.note} (Berulang: ${recurring.name})` : `Berulang: ${recurring.name}`,
        source: 'recurring',
        categoryId: recurring.categoryId,
        paymentMethodId: recurring.paymentMethodId,
        toPaymentMethodId: recurring.toPaymentMethodId,
      },
      include: {
        category: true,
        paymentMethod: true,
        toPaymentMethod: true,
      },
    })

    // Calculate next occurrence and update recurring transaction
    const nextDate = getNextOccurrence(
      recurring.nextDate,
      recurring.frequency,
      recurring.dayOfWeek,
      recurring.dayOfMonth
    )

    // Check if nextDate is past endDate
    const isPastEnd = recurring.endDate && nextDate > new Date(recurring.endDate)

    await db.recurringTransaction.update({
      where: { id },
      data: {
        lastGeneratedDate: today,
        nextDate,
        active: isPastEnd ? false : recurring.active,
      },
    })

    return NextResponse.json({
      transaction,
      nextDate,
      deactivated: isPastEnd,
    })
  } catch (error) {
    console.error('Error generating recurring transaction:', error)
    return NextResponse.json(
      { error: 'Gagal membuat transaksi dari template berulang' },
      { status: 500 }
    )
  }
}
