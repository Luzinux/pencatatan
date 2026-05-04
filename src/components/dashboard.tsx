'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { formatCurrency, formatDate, getMonthYear, getMonthLabel } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Bell,
  Receipt,
  CircleDollarSign,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

// ── Types ──────────────────────────────────────────────────────────────────
interface TopCategory {
  categoryId: string | null
  category: {
    id: string
    name: string
    icon: string
    type: string
  } | null
  totalAmount: number
}

interface Transaction {
  id: string
  type: string
  amount: number
  date: string
  note: string | null
  source: string
  category: {
    id: string
    name: string
    icon: string
    type: string
  } | null
  paymentMethod: {
    id: string
    name: string
    type: string
  } | null
  toPaymentMethod: {
    id: string
    name: string
    type: string
  } | null
}

interface MonthlyTrendItem {
  month: string
  expense: number
  income: number
}

interface UpcomingBill {
  id: string
  name: string
  amount: number
  dueDate: string
  recurring: string
  status: string
  note: string | null
  category: {
    id: string
    name: string
    icon: string
  } | null
  paymentMethod: {
    id: string
    name: string
    type: string
  } | null
}

interface DashboardData {
  month: string
  totalExpense: number
  totalIncome: number
  balance: number
  topCategories: TopCategory[]
  recentTransactions: Transaction[]
  monthlyTrend: MonthlyTrendItem[]
  upcomingBills: UpcomingBill[]
}

// ── Chart Colors ───────────────────────────────────────────────────────────
const EXPENSE_COLOR = '#ef4444'
const INCOME_COLOR = '#22c55e'

const PIE_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#14b8a6',
]

// ── Custom Tooltip for Bar Chart ───────────────────────────────────────────
function BarChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="mb-1 text-sm font-medium text-muted-foreground">
        {getMonthLabel(label)}
      </p>
      {payload.map((entry: any, idx: number) => (
        <p key={idx} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.dataKey === 'expense' ? 'Pengeluaran' : 'Pemasukan'}:{' '}
          {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  )
}

// ── Custom Tooltip for Pie Chart ───────────────────────────────────────────
function PieChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const data = payload[0]
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="text-sm font-semibold">{data.name}</p>
      <p className="text-sm text-muted-foreground">{formatCurrency(data.value)}</p>
    </div>
  )
}

// ── Custom Pie Legend ───────────────────────────────────────────────────────
function PieLegend({ payload }: any) {
  if (!payload?.length) return null
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-2">
      {payload.map((entry: any, idx: number) => (
        <div key={idx} className="flex items-center gap-1.5 text-xs">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Loading Skeleton ───────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Month selector skeleton */}
      <div className="flex items-center justify-center gap-4">
        <Skeleton className="h-9 w-9 rounded-md" />
        <Skeleton className="h-8 w-32 rounded-md" />
        <Skeleton className="h-9 w-9 rounded-md" />
      </div>
      {/* Summary cards skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-28" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-9 w-36" />
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Charts skeleton */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-36" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full rounded-md" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-36" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full rounded-md" />
          </CardContent>
        </Card>
      </div>
      {/* Recent transactions skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1.5">
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

// ── Empty State ────────────────────────────────────────────────────────────
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 rounded-full bg-muted p-4">
        <Receipt className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

// ── Main Dashboard Component ───────────────────────────────────────────────
export default function Dashboard() {
  const [currentMonth, setCurrentMonth] = useState(getMonthYear())
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (month: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.getDashboard(month)
      setData(result)
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(currentMonth)
  }, [currentMonth, fetchData])

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

  // Prepare bar chart data
  const barChartData =
    data?.monthlyTrend.map((item) => ({
      ...item,
      monthLabel: getMonthLabel(item.month).split(' ')[0], // Just the month abbreviation
    })) ?? []

  // Prepare pie chart data
  const pieChartData =
    data?.topCategories
      .filter((tc) => tc.category)
      .map((tc) => ({
        name: tc.category!.name,
        value: tc.totalAmount,
      })) ?? []

  const isCurrentMonth = currentMonth === getMonthYear()

  // ── Render ─────────────────────────────────────────────────────────────
  if (loading) return <DashboardSkeleton />

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 rounded-full bg-destructive/10 p-4">
          <CircleDollarSign className="h-8 w-8 text-destructive" />
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

  const hasTransactions = data.recentTransactions.length > 0
  const hasTrendData = data.monthlyTrend.some((m) => m.expense > 0 || m.income > 0)
  const hasCategories = data.topCategories.length > 0

  return (
    <div className="space-y-6">
      {/* ── Month Selector ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" size="icon" onClick={goToPrevMonth} aria-label="Bulan sebelumnya">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          className="min-w-[140px] text-base font-semibold"
          onClick={goToCurrentMonth}
        >
          {getMonthLabel(currentMonth)}
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={goToNextMonth}
          disabled={isCurrentMonth}
          aria-label="Bulan berikutnya"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* ── Summary Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Total Pengeluaran */}
        <Card className="relative overflow-hidden border-red-200 dark:border-red-900/40">
          <div className="absolute right-3 top-3 rounded-full bg-red-100 p-2 dark:bg-red-900/30">
            <ArrowDownLeft className="h-5 w-5 text-red-500" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">
              Total Pengeluaran
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600 sm:text-3xl dark:text-red-400">
              {formatCurrency(data.totalExpense)}
            </p>
          </CardContent>
        </Card>

        {/* Total Pemasukan */}
        <Card className="relative overflow-hidden border-green-200 dark:border-green-900/40">
          <div className="absolute right-3 top-3 rounded-full bg-green-100 p-2 dark:bg-green-900/30">
            <ArrowUpRight className="h-5 w-5 text-green-500" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400">
              Total Pemasukan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600 sm:text-3xl dark:text-green-400">
              {formatCurrency(data.totalIncome)}
            </p>
          </CardContent>
        </Card>

        {/* Sisa Uang */}
        <Card className="relative overflow-hidden border-teal-200 dark:border-teal-900/40">
          <div className="absolute right-3 top-3 rounded-full bg-teal-100 p-2 dark:bg-teal-900/30">
            <Wallet className="h-5 w-5 text-teal-500" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-teal-600 dark:text-teal-400">
              Sisa Uang
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold sm:text-3xl ${
                data.balance >= 0
                  ? 'text-teal-600 dark:text-teal-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {formatCurrency(data.balance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Upcoming Bills ─────────────────────────────────────────────── */}
      {data.upcomingBills.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
              <Bell className="h-4 w-4" />
              Tagihan Mendatang
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-40">
              <div className="space-y-2">
                {data.upcomingBills.map((bill) => {
                  const dueDate = new Date(bill.dueDate)
                  const now = new Date()
                  const daysUntilDue = Math.ceil(
                    (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                  )
                  const isUrgent = daysUntilDue <= 3

                  return (
                    <div
                      key={bill.id}
                      className="flex items-center justify-between rounded-lg border border-amber-200 bg-background p-3 dark:border-amber-900/30"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg" role="img" aria-label={bill.category?.name ?? 'Tagihan'}>
                          {bill.category?.icon ?? '📄'}
                        </span>
                        <div>
                          <p className="text-sm font-medium">{bill.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Jatuh tempo: {formatDate(bill.dueDate)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          {formatCurrency(bill.amount)}
                        </span>
                        {isUrgent && (
                          <Badge variant="destructive" className="text-xs">
                            {daysUntilDue <= 0 ? 'Hari ini!' : `${daysUntilDue} hari lagi`}
                          </Badge>
                        )}
                        {daysUntilDue > 3 && daysUntilDue <= 7 && (
                          <Badge
                            variant="secondary"
                            className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          >
                            {daysUntilDue} hari lagi
                          </Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* ── Charts Section ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Bar Chart - Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Tren 6 Bulan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasTrendData ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barChartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="month"
                    tickFormatter={(v: string) => {
                      const parts = v.split('-')
                      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
                      return months[parseInt(parts[1]) - 1]
                    }}
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v: number) => {
                      if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}jt`
                      if (v >= 1_000) return `${(v / 1_000).toFixed(0)}rb`
                      return `${v}`
                    }}
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<BarChartTooltip />} />
                  <Bar
                    dataKey="expense"
                    name="Pengeluaran"
                    fill={EXPENSE_COLOR}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                  <Bar
                    dataKey="income"
                    name="Pemasukan"
                    fill={INCOME_COLOR}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="Belum ada data tren bulanan" />
            )}
          </CardContent>
        </Card>

        {/* Pie Chart - Top Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
              Kategori Terbesar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasCategories ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieChartData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<PieChartTooltip />} />
                  <Legend content={<PieLegend />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="Belum ada data kategori pengeluaran" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Recent Transactions ────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transaksi Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          {hasTransactions ? (
            <div className="space-y-1">
              {data.recentTransactions.map((tx) => {
                const isExpense = tx.type === 'expense'
                const isIncome = tx.type === 'income'
                const isTransfer = tx.type === 'transfer'

                const icon = tx.category?.icon ?? '💳'
                const description = tx.category?.name ?? tx.note ?? 'Lainnya'
                const subLabel = tx.note && tx.category ? tx.note : formatDate(tx.date)

                const amountColor = isExpense
                  ? 'text-red-600 dark:text-red-400'
                  : isIncome
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-teal-600 dark:text-teal-400'

                const amountPrefix = isExpense ? '-' : isIncome ? '+' : ''

                return (
                  <div
                    key={tx.id}
                    className="flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-muted/50"
                  >
                    {/* Icon */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-lg">
                      <span role="img" aria-label={tx.category?.name ?? 'Transaksi'}>
                        {icon}
                      </span>
                    </div>

                    {/* Description & date */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{description}</p>
                      <p className="text-xs text-muted-foreground">{subLabel}</p>
                    </div>

                    {/* Amount */}
                    <div className="shrink-0 text-right">
                      <p className={`text-sm font-semibold ${amountColor}`}>
                        {amountPrefix}
                        {formatCurrency(tx.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(tx.date)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState message="Belum ada transaksi bulan ini" />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
