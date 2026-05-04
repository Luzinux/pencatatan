import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const monthParam = searchParams.get('month')

    const now = new Date()
    const year = monthParam ? parseInt(monthParam.split('-')[0]) : now.getFullYear()
    const month = monthParam ? parseInt(monthParam.split('-')[1]) - 1 : now.getMonth()

    // Get days in month
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const today = now.getDate()
    const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month

    // Only calculate up to today for current month
    const daysToCheck = isCurrentMonth ? today : daysInMonth

    // Get total budget for the month
    const budgets = await db.budget.findMany({
      where: { month: `${year}-${String(month + 1).padStart(2, '0')}` },
      include: { category: true },
    })

    const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0)

    if (totalBudget === 0) {
      return NextResponse.json({
        currentStreak: 0,
        longestStreak: 0,
        dailyBudget: 0,
        dailySpending: [],
        totalDaysWithinBudget: 0,
        totalDaysInMonth: daysInMonth,
        hasBudgets: false,
      })
    }

    const dailyBudget = totalBudget / daysInMonth

    // Get all expense transactions for the month
    const startDate = new Date(year, month, 1)
    const endDate = new Date(year, month + 1, 1)

    const transactions = await db.transaction.findMany({
      where: {
        type: 'expense',
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
      select: {
        amount: true,
        date: true,
      },
    })

    // Calculate daily spending
    const dailySpendingMap: Record<number, number> = {}
    for (let d = 1; d <= daysInMonth; d++) {
      dailySpendingMap[d] = 0
    }

    for (const tx of transactions) {
      const txDate = new Date(tx.date)
      const day = txDate.getDate()
      if (day >= 1 && day <= daysInMonth) {
        dailySpendingMap[day] = (dailySpendingMap[day] || 0) + tx.amount
      }
    }

    // Build daily spending array
    const dailySpending = []
    let totalDaysWithinBudget = 0

    for (let d = 1; d <= daysInMonth; d++) {
      const amount = dailySpendingMap[d] || 0
      const isPastOrToday = d <= daysToCheck
      const withinBudget = isPastOrToday && amount <= dailyBudget

      if (withinBudget && isPastOrToday) {
        totalDaysWithinBudget++
      }

      dailySpending.push({
        date: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        day: d,
        amount,
        withinBudget,
        isPast: d < today || !isCurrentMonth,
        isToday: d === today && isCurrentMonth,
        isFuture: d > today && isCurrentMonth,
      })
    }

    // Calculate streaks (from today backwards for current month)
    let currentStreak = 0
    let longestStreak = 0
    let tempStreak = 0

    if (isCurrentMonth) {
      // Current streak from today backwards
      for (let d = today; d >= 1; d--) {
        const spending = dailySpendingMap[d] || 0
        if (spending <= dailyBudget) {
          currentStreak++
        } else {
          break
        }
      }
    }

    // Longest streak in the month
    for (let d = 1; d <= daysToCheck; d++) {
      const spending = dailySpendingMap[d] || 0
      if (spending <= dailyBudget) {
        tempStreak++
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak
        }
      } else {
        tempStreak = 0
      }
    }

    // Make sure currentStreak is not longer than longestStreak
    if (currentStreak > longestStreak) {
      longestStreak = currentStreak
    }

    return NextResponse.json({
      currentStreak,
      longestStreak,
      dailyBudget,
      dailySpending,
      totalDaysWithinBudget,
      totalDaysInMonth: daysInMonth,
      hasBudgets: true,
    })
  } catch (error) {
    console.error('Error calculating streak:', error)
    return NextResponse.json(
      { error: 'Gagal menghitung tantangan hemat' },
      { status: 500 }
    )
  }
}
