import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

function calculateNextDate(startDate: Date, frequency: string, dayOfWeek?: number | null, dayOfMonth?: number | null): Date {
  const start = new Date(startDate)
  const next = new Date()

  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1)
      break
    case 'weekly': {
      const targetDay = dayOfWeek ?? start.getDay()
      const currentDay = next.getDay()
      let daysUntil = targetDay - currentDay
      if (daysUntil <= 0) daysUntil += 7
      next.setDate(next.getDate() + daysUntil)
      break
    }
    case 'monthly': {
      const targetDayOfMonth = dayOfMonth ?? start.getDate()
      const currentMonth = next.getMonth()
      const currentYear = next.getFullYear()
      // Try next month
      let nextMonth = currentMonth + 1
      let nextYear = currentYear
      if (nextMonth > 11) {
        nextMonth = 0
        nextYear++
      }
      const maxDay = new Date(nextYear, nextMonth + 1, 0).getDate()
      const day = Math.min(targetDayOfMonth, maxDay)
      next.setFullYear(nextYear, nextMonth, day)
      break
    }
    case 'yearly': {
      const targetDayOfMonth = dayOfMonth ?? start.getDate()
      const targetMonth = start.getMonth()
      const nextYear = next.getFullYear() + 1
      const maxDay = new Date(nextYear, targetMonth + 1, 0).getDate()
      const day = Math.min(targetDayOfMonth, maxDay)
      next.setFullYear(nextYear, targetMonth, day)
      break
    }
    default:
      next.setDate(next.getDate() + 30)
  }

  // Set time to start of day
  next.setHours(0, 0, 0, 0)
  return next
}

export async function GET() {
  try {
    const recurring = await db.recurringTransaction.findMany({
      include: {
        category: true,
        paymentMethod: true,
        toPaymentMethod: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(recurring)
  } catch (error) {
    console.error('Error fetching recurring transactions:', error)
    return NextResponse.json(
      { error: 'Gagal memuat transaksi berulang' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
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
    } = body

    if (!name || !type || amount === undefined || !frequency || !startDate) {
      return NextResponse.json(
        { error: 'Nama, tipe, jumlah, frekuensi, dan tanggal mulai wajib diisi' },
        { status: 400 }
      )
    }

    const start = new Date(startDate)
    const nextDate = calculateNextDate(start, frequency, dayOfWeek, dayOfMonth)

    const recurring = await db.recurringTransaction.create({
      data: {
        name,
        type,
        amount: parseFloat(amount),
        categoryId: categoryId || null,
        paymentMethodId: paymentMethodId || null,
        toPaymentMethodId: toPaymentMethodId || null,
        note: note || null,
        frequency,
        dayOfWeek: dayOfWeek != null ? parseInt(dayOfWeek) : null,
        dayOfMonth: dayOfMonth != null ? parseInt(dayOfMonth) : null,
        startDate: start,
        nextDate,
        endDate: endDate ? new Date(endDate) : null,
        active: true,
      },
      include: {
        category: true,
        paymentMethod: true,
        toPaymentMethod: true,
      },
    })

    return NextResponse.json(recurring, { status: 201 })
  } catch (error) {
    console.error('Error creating recurring transaction:', error)
    return NextResponse.json(
      { error: 'Gagal membuat transaksi berulang' },
      { status: 500 }
    )
  }
}
