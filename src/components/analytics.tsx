'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { formatCurrency, formatDate, getMonthYear, getMonthLabel } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  BarChart3,
  ArrowUpRight,
  ArrowDownLeft,
  Trophy,
  CalendarDays,
  Activity,
  Minus,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts'
import { motion } from 'framer-motion'

// ── Types ──────────────────────────────────────────────────────────────────
interface CategoryBreakdownItem {
  categoryId: string | null
  categoryName: string
  categoryIcon: string
  totalAmount: number
  percentage: number
  transactionCount: number
}

interface DailySpendingItem {
  day: number
  amount: number
}

interface WeekDayAverageItem {
  dayName: string
  averageAmount: number
}

interface TopExpenseItem {
  id: string
  amount: number
  date: string
  note: string | null
  categoryName: string
  categoryIcon: string
}

interface MonthlyComparisonData {
  currentMonth: { expense: number; income: number }
  previousMonth: { expense: number; income: number }
  expenseChange: number
  incomeChange: number
}

interface AnalyticsData {
  categoryBreakdown: CategoryBreakdownItem[]
  dailySpending: DailySpendingItem[]
  weekDayAverage: WeekDayAverageItem[]
  topExpenses: TopExpenseItem[]
  monthlyComparison: MonthlyComparisonData
}

// ── Chart Colors ───────────────────────────────────────────────────────────
const CATEGORY_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f59e0b', // amber
  '#6366f1', // indigo
]

const WEEKDAY_COLORS = [
  '#14b8a6', // Senin - teal
  '#06b6d4', // Selasa - cyan
  '#8b5cf6', // Rabu - violet
  '#f59e0b', // Kamis - amber
  '#ef4444', // Jumat - red
  '#22c55e', // Sabtu - green
  '#f97316', // Minggu - orange
]

const TOP_EXPENSE_MEDALS = ['🥇', '🥈', '🥉']

// ── Custom Tooltip ─────────────────────────────────────────────────────────
function AreaChartTooltip({ active, payload, label, dailyAverage }: any) {
  if (!active || !payload?.length) return null
  const amount = payload[0].value
  const isAboveAverage = amount > dailyAverage && dailyAverage > 0
  const pctAbove = dailyAverage > 0 ? Math.round(((amount - dailyAverage) / dailyAverage) * 100) : 0

  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="mb-1 text-sm font-medium text-muted-foreground">
        Tanggal {label}
      </p>
      <p className="text-sm font-semibold text-red-500">
        {formatCurrency(amount)}
      </p>
      {isAboveAverage && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">
          ↑ {pctAbove}% di atas rata-rata
        </p>
      )}
    </div>
  )
}

function BarChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="mb-1 text-sm font-medium text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-semibold text-teal-600 dark:text-teal-400">
        Rata-rata: {formatCurrency(payload[0].value)}
      </p>
    </div>
  )
}

// ── Loading Skeleton ───────────────────────────────────────────────────────
function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Month selector skeleton */}
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-1">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-8 w-32 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      </div>
      {/* Monthly comparison skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Category breakdown skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16 ml-auto" />
              </div>
              <Skeleton className="h-3 w-full rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
      {/* Charts skeleton */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-44" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full rounded-md" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-44" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full rounded-md" />
          </CardContent>
        </Card>
      </div>
      {/* Top expenses skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

// ── Main Analytics Component ───────────────────────────────────────────────
export default function Analytics() {
  const [currentMonth, setCurrentMonth] = useState(getMonthYear())
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (month: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.getAnalytics(month)
      setData(result)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal memuat data analisis'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(currentMonth)
  }, [currentMonth, fetchData])

  // ── Month Navigation ────────────────────────────────────────────────────
  const goToPrevMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number)
    const date = new Date(year, month - 2, 1)
    setCurrentMonth(getMonthYear(date))
  }

  const goToNextMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number)
    const date = new Date(year, month, 1)
    setCurrentMonth(getMonthYear(date))
  }

  const goToCurrentMonth = () => {
    setCurrentMonth(getMonthYear())
  }

  const isCurrentMonth = currentMonth === getMonthYear()

  // ── Derived data ────────────────────────────────────────────────────────
  const dailyMax = data?.dailySpending
    ? Math.max(...data.dailySpending.map((d) => d.amount))
    : 0
  const dailyAverage = data?.dailySpending
    ? data.dailySpending.reduce((sum, d) => sum + d.amount, 0) / data.dailySpending.length
    : 0

  // ── Render ──────────────────────────────────────────────────────────────
  if (loading) return <AnalyticsSkeleton />

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 rounded-full bg-destructive/10 p-4">
          <BarChart3 className="h-8 w-8 text-destructive" />
        </div>
        <p className="mb-2 text-lg font-semibold text-destructive">Oops!</p>
        <p className="mb-4 text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={() => fetchData(currentMonth)}>
          Coba Lagi
        </Button>
      </div>
    )
  }

  if (!data) return null

  const hasCategories = data.categoryBreakdown.length > 0
  const hasDailyData = data.dailySpending.some((d) => d.amount > 0)
  const hasWeekDayData = data.weekDayAverage.some((d) => d.averageAmount > 0)
  const hasTopExpenses = data.topExpenses.length > 0
  const { monthlyComparison: mc } = data
  const topExpenseMax = hasTopExpenses ? data.topExpenses[0].amount : 0

  return (
    <div className="space-y-6">
      {/* ── Month Selector ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-1 rounded-full border bg-muted/50 px-1 py-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPrevMonth}
            aria-label="Bulan sebelumnya"
            className="h-8 w-8 rounded-full"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            className="min-w-[130px] rounded-full text-sm font-semibold"
            onClick={goToCurrentMonth}
          >
            {getMonthLabel(currentMonth)}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToNextMonth}
            disabled={isCurrentMonth}
            aria-label="Bulan berikutnya"
            className="h-8 w-8 rounded-full"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Monthly Comparison ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Expense Comparison */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-red-200/60 bg-gradient-to-br from-red-50/50 to-white dark:border-red-900/30 dark:from-red-950/20 dark:to-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-red-100 p-2 dark:bg-red-900/30">
                    <ArrowDownLeft className="h-4 w-4 text-red-500" />
                  </div>
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">
                    Pengeluaran
                  </span>
                </div>
                {mc.expenseChange !== 0 && (
                  <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm ${
                    mc.expenseChange > 0
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  }`}>
                    <div className={`rounded-full p-0.5 ${mc.expenseChange > 0 ? 'bg-red-200 dark:bg-red-800/50' : 'bg-green-200 dark:bg-green-800/50'}`}>
                      {mc.expenseChange > 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                    </div>
                    {Math.abs(mc.expenseChange).toFixed(1)}%
                  </div>
                )}
              </div>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {formatCurrency(mc.currentMonth.expense)}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Bulan lalu: {formatCurrency(mc.previousMonth.expense)}</span>
                {/* vs badge */}
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    mc.expenseChange > 0 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' 
                    : mc.expenseChange < 0 ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-muted text-muted-foreground'
                  }`}>
                    {mc.expenseChange > 0 ? '↑ Naik' : mc.expenseChange < 0 ? '↓ Turun' : '= Sama'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Income Comparison */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-green-200/60 bg-gradient-to-br from-green-50/50 to-white dark:border-green-900/30 dark:from-green-950/20 dark:to-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/30">
                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                  </div>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    Pemasukan
                  </span>
                </div>
                {mc.incomeChange !== 0 && (
                  <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm ${
                    mc.incomeChange > 0
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    <div className={`rounded-full p-0.5 ${mc.incomeChange > 0 ? 'bg-green-200 dark:bg-green-800/50' : 'bg-red-200 dark:bg-red-800/50'}`}>
                      {mc.incomeChange > 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                    </div>
                    {Math.abs(mc.incomeChange).toFixed(1)}%
                  </div>
                )}
              </div>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(mc.currentMonth.income)}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Bulan lalu: {formatCurrency(mc.previousMonth.income)}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  mc.incomeChange > 0 ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' 
                  : mc.incomeChange < 0 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-muted text-muted-foreground'
                }`}>
                  {mc.incomeChange > 0 ? '↑ Naik' : mc.incomeChange < 0 ? '↓ Turun' : '= Sama'}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* VS Badge between cards */}
        <div className="hidden sm:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none" />
      </div>

      {/* ── VS Badge (between the two cards) ───────────────────────────── */}
      <div className="flex items-center justify-center -mt-8 sm:-mt-6 relative z-10">
        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-background border-2 shadow-sm text-xs font-bold text-muted-foreground">
          vs
        </div>
      </div>

      {/* ── Category Breakdown ──────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Rincian per Kategori
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasCategories ? (
            <div className="space-y-4">
              {data.categoryBreakdown.map((cat, index) => {
                const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length]
                return (
                  <motion.div
                    key={cat.categoryId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.06 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base"
                        style={{ backgroundColor: `${color}15` }}
                      >
                        <span role="img" aria-label={cat.categoryName}>
                          {cat.categoryIcon}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{cat.categoryName}</p>
                        <p className="text-xs text-muted-foreground">
                          {cat.transactionCount} transaksi
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold">{formatCurrency(cat.totalAmount)}</p>
                        <p className="text-xs text-muted-foreground">{cat.percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                    {/* Horizontal bar - animated with CSS transition and staggered delay */}
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${cat.percentage}%`,
                          backgroundColor: color,
                          transition: 'width 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                          transitionDelay: `${index * 0.1}s`,
                        }}
                      />
                    </div>
                  </motion.div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 rounded-full bg-muted p-4">
                <BarChart3 className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Belum ada data kategori pengeluaran
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Charts Section ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Daily Spending Pattern - Area Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              Pola Pengeluaran Harian
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasDailyData ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data.dailySpending} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="dailyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    interval={Math.floor(data.dailySpending.length / 8)}
                  />
                  <YAxis
                    tickFormatter={(v: number) => {
                      if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}jt`
                      if (v >= 1_000) return `${(v / 1_000).toFixed(0)}rb`
                      return `${v}`
                    }}
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<AreaChartTooltip dailyAverage={dailyAverage} />} />
                  {/* Reference line for daily average */}
                  <ReferenceLine
                    y={dailyAverage}
                    stroke="#f59e0b"
                    strokeDasharray="6 3"
                    strokeWidth={1.5}
                    label={{
                      value: 'Rata-rata',
                      position: 'right',
                      fill: '#f59e0b',
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#ef4444"
                    strokeWidth={2}
                    fill="url(#dailyGradient)"
                    dot={(props: any) => {
                      const { cx, cy, payload } = props
                      // Highlight days above average with a different color/marker
                      if (payload.amount > dailyAverage && payload.amount > 0) {
                        return (
                          <circle
                            key={`dot-${payload.day}`}
                            cx={cx}
                            cy={cy}
                            r={4}
                            fill="#f59e0b"
                            stroke="#fff"
                            strokeWidth={2}
                          />
                        )
                      }
                      // Regular dots for very high spending (>2x average)
                      if (payload.amount > dailyAverage * 2 && payload.amount > 0) {
                        return (
                          <circle
                            key={`dot-high-${payload.day}`}
                            cx={cx}
                            cy={cy}
                            r={5}
                            fill="#ef4444"
                            stroke="#fff"
                            strokeWidth={2}
                          />
                        )
                      }
                      return null
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-3 rounded-full bg-muted p-4">
                  <CalendarDays className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Belum ada data pengeluaran harian
                </p>
              </div>
            )}
            {hasDailyData && dailyMax > 0 && (
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                  Di atas rata-rata
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                  Sangat tinggi (&gt;2x rata-rata)
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Week Day Average - Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Rata-rata per Hari
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasWeekDayData ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.weekDayAverage} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="dayName"
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v: number) => {
                      if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}jt`
                      if (v >= 1_000) return `${(v / 1_000).toFixed(0)}rb`
                      return `${v}`
                    }}
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<BarChartTooltip />} />
                  <Bar dataKey="averageAmount" name="Rata-rata" radius={[6, 6, 0, 0]} maxBarSize={48}>
                    {data.weekDayAverage.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={WEEKDAY_COLORS[index]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-3 rounded-full bg-muted p-4">
                  <Activity className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Belum ada data rata-rata harian
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Top Expenses ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4 text-amber-500" />
            Pengeluaran Terbesar
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasTopExpenses ? (
            <div className="space-y-1">
              {data.topExpenses.map((tx, index) => {
                const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length]
                const relativeWidth = topExpenseMax > 0 ? (tx.amount / topExpenseMax) * 100 : 0

                return (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: index * 0.05 }}
                    className="flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-muted/50"
                  >
                    {/* Position badge */}
                    <div className="shrink-0">
                      {index < 3 ? (
                        <div className="flex h-8 w-8 items-center justify-center text-lg">
                          {TOP_EXPENSE_MEDALS[index]}
                        </div>
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                          {index + 1}
                        </div>
                      )}
                    </div>

                    {/* Category icon in colored circle */}
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base"
                      style={{ backgroundColor: `${color}20`, color }}
                    >
                      <span role="img" aria-label={tx.categoryName}>
                        {tx.categoryIcon}
                      </span>
                    </div>

                    {/* Description + relative bar */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {tx.note || tx.categoryName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tx.categoryName} • {formatDate(tx.date)}
                      </p>
                      {/* Relative size bar */}
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${relativeWidth}%`,
                            backgroundColor: color,
                            transitionDelay: `${index * 0.1}s`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Amount */}
                    <p className="shrink-0 text-sm font-semibold text-red-600 dark:text-red-400">
                      -{formatCurrency(tx.amount)}
                    </p>
                  </motion.div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 rounded-full bg-muted p-4">
                <Trophy className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Belum ada data pengeluaran
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
