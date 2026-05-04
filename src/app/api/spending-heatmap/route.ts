import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') // YYYY-MM

    const now = new Date()
    const currentMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const [year, mon] = currentMonth.split('-').map(Number)

    // Get data for 3 months: the selected month and 2 previous months
    const months: { key: string; start: Date; end: Date }[] = []
    for (let i = 0; i < 3; i++) {
      const m = mon - i
      const date = new Date(year, m - 1, 1)
      const start = new Date(date.getFullYear(), date.getMonth(), 1)
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 1)
      months.push({
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        start,
        end,
      })
    }

    // Reverse so it's chronological: 2 months ago, 1 month ago, current
    months.reverse()

    const allDays: { date: string; amount: number; count: number }[] = []

    for (const m of months) {
      const daysInMonth = new Date(m.start.getFullYear(), m.start.getMonth() + 1, 0).getDate()

      // Get daily spending for this month
      const dailySpending = await db.transaction.groupBy({
        by: ['date'],
        where: {
          type: 'expense',
          date: { gte: m.start, lt: m.end },
        },
        _sum: { amount: true },
        _count: { id: true },
      })

      // Create a map for quick lookup
      const spendingMap = new Map<string, { amount: number; count: number }>()
      for (const ds of dailySpending) {
        const dayStr = ds.date instanceof Date
          ? `${ds.date.getFullYear()}-${String(ds.date.getMonth() + 1).padStart(2, '0')}-${String(ds.date.getDate()).padStart(2, '0')}`
          : String(ds.date).slice(0, 10)
        spendingMap.set(dayStr, {
          amount: ds._sum.amount || 0,
          count: ds._count.id || 0,
        })
      }

      // Fill all days of the month
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${m.key}-${String(d).padStart(2, '0')}`
        const spending = spendingMap.get(dateStr)
        allDays.push({
          date: dateStr,
          amount: spending?.amount || 0,
          count: spending?.count || 0,
        })
      }
    }

    return NextResponse.json({
      month: currentMonth,
      days: allDays,
    })
  } catch (error) {
    console.error('Error fetching spending heatmap:', error)
    return NextResponse.json(
      { error: 'Failed to fetch spending heatmap data' },
      { status: 500 }
    )
  }
}
