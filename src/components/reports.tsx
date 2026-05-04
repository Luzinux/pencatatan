'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  PiggyBank,
  Receipt,
  ChevronLeft,
  ChevronRight,
  Printer,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  CalendarDays,
  Target,
  CreditCard,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

interface ReportData {
  month: string
  summary: {
    totalExpense: number
    totalIncome: number
    balance: number
    savingsRate: number
    transactionCount: number
  }
  expenseByCategory: {
    categoryId: string
    categoryName: string
    categoryIcon: string
    amount: number
    percentage: number
    budgetAmount: number
    budgetSpent: number
  }[]
  incomeByCategory: {
    categoryId: string
    categoryName: string
    categoryIcon: string
    amount: number
    percentage: number
  }[]
  expenseByPaymentMethod: {
    paymentMethodId: string
    paymentMethodName: string
    amount: number
  }[]
  dailySpending: {
    date: string
    amount: number
  }[]
  billsStatus: {
    totalBills: number
    paidBills: number
    unpaidBills: number
    totalUnpaidAmount: number
  }
  savingsGoals: {
    totalGoals: number
    activeGoals: number
    completedGoals: number
    totalSaved: number
  }
  previousMonthComparison: {
    expenseChange: number
    incomeChange: number
  }
  topExpenses: {
    id: string
    note: string
    amount: number
    categoryName: string
    categoryIcon: string
    date: string
  }[]
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getTodayMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function getMonthLabel(month: string): string {
  const [y, m] = month.split('-')
  const date = new Date(parseInt(y), parseInt(m) - 1, 1)
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(date)
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(date)
}

// Colors for pie chart bars
const CATEGORY_COLORS = [
  'bg-red-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-sky-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-orange-500',
  'bg-indigo-500',
  'bg-rose-500',
]

// ─── Loading Skeleton ───────────────────────────────────────────────────────

function ReportSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
      <Skeleton className="h-48 rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function Reports() {
  const [currentMonth, setCurrentMonth] = useState(getTodayMonth)
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchReport = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.getReports(currentMonth)
      setData(res)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [currentMonth])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const handlePrevMonth = () => setCurrentMonth((m) => shiftMonth(m, -1))
  const handleNextMonth = () => setCurrentMonth((m) => shiftMonth(m, 1))
  const handlePrint = () => window.print()

  if (loading) return <ReportSkeleton />
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Receipt className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-semibold mb-1">Gagal Memuat Laporan</h3>
        <p className="text-sm text-muted-foreground mb-4">Terjadi kesalahan saat memuat data laporan</p>
        <Button onClick={fetchReport} variant="outline">Coba Lagi</Button>
      </div>
    )
  }

  const { summary, expenseByCategory, incomeByCategory, expenseByPaymentMethod, dailySpending, billsStatus, savingsGoals, previousMonthComparison, topExpenses } = data

  // Calculate max daily spending for chart scaling
  const maxDailyAmount = Math.max(...dailySpending.map((d) => d.amount), 1)

  return (
    <div className="space-y-6 print-section">
      {/* Month Navigation + Print Button */}
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">{getMonthLabel(currentMonth)}</span>
          </div>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={handlePrint} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Printer className="h-4 w-4" />
          Cetak Laporan
        </Button>
      </div>

      {/* Print-only header */}
      <div className="hidden print:block print-header mb-6">
        <h1 className="text-2xl font-bold">Laporan Keuangan DompetKu</h1>
        <p className="text-sm text-gray-600">Periode: {getMonthLabel(currentMonth)}</p>
        <p className="text-xs text-gray-400 mt-1">Dicetak pada: {new Intl.DateTimeFormat('id-ID', { dateStyle: 'full', timeStyle: 'short' }).format(new Date())}</p>
        <hr className="mt-3 border-gray-300" />
      </div>

      {/* ─── Summary Section ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {/* Income */}
          <Card className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-card border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                  <ArrowDownLeft className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-xs text-muted-foreground font-medium">Pemasukan</span>
              </div>
              <p className="text-xl md:text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatCurrency(summary.totalIncome)}
              </p>
            </CardContent>
          </Card>

          {/* Expense */}
          <Card className="bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 dark:to-card border border-red-100 dark:border-red-900/30 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/40">
                  <ArrowUpRight className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <span className="text-xs text-muted-foreground font-medium">Pengeluaran</span>
              </div>
              <p className="text-xl md:text-2xl font-bold tabular-nums text-red-600 dark:text-red-400">
                {formatCurrency(summary.totalExpense)}
              </p>
            </CardContent>
          </Card>

          {/* Balance */}
          <Card className="bg-gradient-to-br from-teal-50 to-white dark:from-teal-950/20 dark:to-card border border-teal-100 dark:border-teal-900/30 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900/40">
                  <Wallet className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                </div>
                <span className="text-xs text-muted-foreground font-medium">Saldo</span>
              </div>
              <p className={`text-xl md:text-2xl font-bold tabular-nums ${summary.balance >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(summary.balance)}
              </p>
            </CardContent>
          </Card>

          {/* Savings Rate */}
          <Card className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-card border border-amber-100 dark:border-amber-900/30 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
                  <PiggyBank className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <span className="text-xs text-muted-foreground font-medium">Rasio Tabungan</span>
              </div>
              <p className={`text-xl md:text-2xl font-bold tabular-nums ${
                summary.savingsRate >= 20 ? 'text-emerald-600 dark:text-emerald-400'
                  : summary.savingsRate >= 10 ? 'text-amber-600 dark:text-amber-400'
                    : 'text-red-600 dark:text-red-400'
              }`}>
                {summary.savingsRate.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* ─── Expense Breakdown + Monthly Comparison ──────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Expense Breakdown (Pie-chart-style visual) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-red-500" />
                Rincian Pengeluaran
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {expenseByCategory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Tidak ada pengeluaran bulan ini</p>
              ) : (
                <>
                  {/* Colored proportion bars */}
                  <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                    {expenseByCategory.map((cat, i) => (
                      <div
                        key={cat.categoryId}
                        className={`${CATEGORY_COLORS[i % CATEGORY_COLORS.length]} transition-all duration-500`}
                        style={{ width: `${cat.percentage}%` }}
                        title={`${cat.categoryName}: ${cat.percentage.toFixed(1)}%`}
                      />
                    ))}
                  </div>

                  {/* Category list */}
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {expenseByCategory.map((cat, i) => (
                      <div key={cat.categoryId} className="flex items-center gap-2">
                        <div className={`h-3 w-3 rounded-sm shrink-0 ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}`} />
                        <span className="text-base shrink-0">{cat.categoryIcon}</span>
                        <span className="text-sm font-medium truncate flex-1">{cat.categoryName}</span>
                        <span className="text-xs text-muted-foreground w-12 text-right">{cat.percentage.toFixed(1)}%</span>
                        <span className="text-sm font-semibold text-red-600 dark:text-red-400 w-28 text-right">
                          {formatCurrency(cat.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Monthly Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-sky-500" />
                Perbandingan Bulan Lalu
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Expense comparison */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Pengeluaran</span>
                  <div className="flex items-center gap-1">
                    {previousMonthComparison.expenseChange > 0 ? (
                      <TrendingUp className="h-3.5 w-3.5 text-red-500" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5 text-emerald-500" />
                    )}
                    <span className={`text-sm font-semibold ${
                      previousMonthComparison.expenseChange > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {previousMonthComparison.expenseChange > 0 ? '+' : ''}{previousMonthComparison.expenseChange.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 items-end h-20">
                  <div className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-muted rounded-t-md transition-all duration-500"
                      style={{ height: '40%' }}
                    />
                    <span className="text-[10px] text-muted-foreground">Lalu</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-t-md transition-all duration-500 ${
                        previousMonthComparison.expenseChange > 0 ? 'bg-red-400' : 'bg-emerald-400'
                      }`}
                      style={{ height: previousMonthComparison.expenseChange > 0
                        ? `${40 + Math.min(Math.abs(previousMonthComparison.expenseChange) * 0.5, 50)}%`
                        : `${40 - Math.min(Math.abs(previousMonthComparison.expenseChange) * 0.3, 20)}%` }}
                    />
                    <span className="text-[10px] text-muted-foreground">Ini</span>
                  </div>
                </div>
              </div>

              {/* Income comparison */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Pemasukan</span>
                  <div className="flex items-center gap-1">
                    {previousMonthComparison.incomeChange > 0 ? (
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                    )}
                    <span className={`text-sm font-semibold ${
                      previousMonthComparison.incomeChange > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {previousMonthComparison.incomeChange > 0 ? '+' : ''}{previousMonthComparison.incomeChange.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 items-end h-20">
                  <div className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-muted rounded-t-md transition-all duration-500"
                      style={{ height: '40%' }}
                    />
                    <span className="text-[10px] text-muted-foreground">Lalu</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-t-md transition-all duration-500 ${
                        previousMonthComparison.incomeChange > 0 ? 'bg-emerald-400' : 'bg-red-400'
                      }`}
                      style={{ height: previousMonthComparison.incomeChange > 0
                        ? `${40 + Math.min(Math.abs(previousMonthComparison.incomeChange) * 0.5, 50)}%`
                        : `${40 - Math.min(Math.abs(previousMonthComparison.incomeChange) * 0.3, 20)}%` }}
                    />
                    <span className="text-[10px] text-muted-foreground">Ini</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ─── Category Analysis (Budget Status) ───────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-500" />
              Analisis Kategori & Anggaran
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expenseByCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Tidak ada data kategori</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-2 pr-3 font-medium text-muted-foreground text-xs">Kategori</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground text-xs">Jumlah</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground text-xs">%</th>
                      <th className="text-center py-2 px-3 font-medium text-muted-foreground text-xs">Anggaran</th>
                      <th className="text-center py-2 pl-3 font-medium text-muted-foreground text-xs">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenseByCategory.map((cat, i) => {
                      const hasBudget = cat.budgetAmount > 0
                      const budgetPercent = hasBudget ? (cat.budgetSpent / cat.budgetAmount) * 100 : 0
                      const isOverBudget = hasBudget && budgetPercent > 100
                      const isNearLimit = hasBudget && budgetPercent >= 75 && budgetPercent <= 100
                      const isUnderBudget = hasBudget && budgetPercent < 75

                      return (
                        <tr key={cat.categoryId} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 pr-3">
                            <div className="flex items-center gap-2">
                              <div className={`h-2.5 w-2.5 rounded-sm shrink-0 ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}`} />
                              <span className="text-base">{cat.categoryIcon}</span>
                              <span className="font-medium">{cat.categoryName}</span>
                            </div>
                          </td>
                          <td className="text-right py-2.5 px-3 font-semibold text-red-600 dark:text-red-400">
                            {formatCurrency(cat.amount)}
                          </td>
                          <td className="text-right py-2.5 px-3 text-muted-foreground">
                            {cat.percentage.toFixed(1)}%
                          </td>
                          <td className="text-center py-2.5 px-3">
                            {hasBudget ? (
                              <div className="flex flex-col items-center gap-1">
                                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      isOverBudget ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : 'bg-emerald-500'
                                    }`}
                                    style={{ width: `${Math.min(budgetPercent, 100)}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-muted-foreground">
                                  {formatCurrency(cat.budgetSpent)} / {formatCurrency(cat.budgetAmount)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="text-center py-2.5 pl-3">
                            {hasBudget ? (
                              isOverBudget ? (
                                <Badge className="gap-1 bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-0 text-[10px]">
                                  <XCircle className="h-3 w-3" /> Lebih
                                </Badge>
                              ) : isNearLimit ? (
                                <Badge className="gap-1 bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-0 text-[10px]">
                                  <AlertTriangle className="h-3 w-3" /> Mendekati
                                </Badge>
                              ) : (
                                <Badge className="gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-0 text-[10px]">
                                  <CheckCircle2 className="h-3 w-3" /> Aman
                                </Badge>
                              )
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Daily Spending + Payment Method ─────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Daily Spending Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-sky-500" />
                Pengeluaran Harian
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-40 flex items-end gap-[2px] overflow-x-auto">
                {dailySpending.map((day) => {
                  const height = maxDailyAmount > 0 ? (day.amount / maxDailyAmount) * 100 : 0
                  const dayNum = new Date(day.date).getDate()
                  const isToday = day.date === new Date().toISOString().split('T')[0]
                  return (
                    <div key={day.date} className="flex flex-col items-center min-w-[14px] group relative">
                      <div
                        className={`w-full rounded-t-sm transition-all duration-300 ${
                          isToday ? 'bg-emerald-500' : height > 0 ? 'bg-sky-400 dark:bg-sky-600' : 'bg-muted/30'
                        }`}
                        style={{ height: `${Math.max(height, 1)}%` }}
                        title={`${formatShortDate(day.date)}: ${formatCurrency(day.amount)}`}
                      />
                      {dayNum % 5 === 0 && (
                        <span className="text-[8px] text-muted-foreground mt-1">{dayNum}</span>
                      )}
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Total harian: {dailySpending.filter((d) => d.amount > 0).length} hari aktif
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Payment Method Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-purple-500" />
                Pengeluaran per Metode
              </CardTitle>
            </CardHeader>
            <CardContent>
              {expenseByPaymentMethod.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Tidak ada data</p>
              ) : (
                <div className="space-y-3">
                  {expenseByPaymentMethod.map((pm) => {
                    const percent = summary.totalExpense > 0 ? (pm.amount / summary.totalExpense) * 100 : 0
                    return (
                      <div key={pm.paymentMethodId} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{pm.paymentMethodName}</span>
                          <span className="text-sm font-semibold">{formatCurrency(pm.amount)}</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-purple-500 dark:bg-purple-400 transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{percent.toFixed(1)}% dari total</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ─── Bills + Savings + Top Expenses ──────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Bills Summary */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.35 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-4 w-4 text-amber-500" />
                Status Tagihan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Tagihan</span>
                <span className="text-sm font-semibold">{billsStatus.totalBills}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Sudah Dibayar</span>
                <Badge className="gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-0 text-xs">
                  <CheckCircle2 className="h-3 w-3" /> {billsStatus.paidBills}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Belum Dibayar</span>
                <Badge className={`gap-1 text-xs border-0 ${billsStatus.unpaidBills > 0 ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300' : 'bg-muted text-muted-foreground'}`}>
                  {billsStatus.unpaidBills}
                </Badge>
              </div>
              {billsStatus.totalUnpaidAmount > 0 && (
                <div className="pt-2 border-t border-border/30">
                  <span className="text-xs text-muted-foreground">Total Belum Dibayar</span>
                  <p className="text-base font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(billsStatus.totalUnpaidAmount)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Savings Progress */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <PiggyBank className="h-4 w-4 text-emerald-500" />
                Progres Tabungan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Target</span>
                <span className="text-sm font-semibold">{savingsGoals.totalGoals}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Aktif</span>
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-0 text-xs">
                  {savingsGoals.activeGoals}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tercapai</span>
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-0 text-xs">
                  {savingsGoals.completedGoals}
                </Badge>
              </div>
              <div className="pt-2 border-t border-border/30">
                <span className="text-xs text-muted-foreground">Total Ditabung</span>
                <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(savingsGoals.totalSaved)}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Expenses */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.45 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-red-500" />
                Pengeluaran Terbesar
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topExpenses.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Tidak ada data</p>
              ) : (
                <div className="space-y-2">
                  {topExpenses.map((tx, i) => (
                    <div key={tx.id} className="flex items-center gap-2">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold shrink-0 ${
                        i === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                          : i === 1 ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                            : i === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300'
                              : 'bg-muted text-muted-foreground'
                      }`}>
                        {i + 1}
                      </span>
                      <span className="text-base shrink-0">{tx.categoryIcon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{tx.note || tx.categoryName}</p>
                        <p className="text-[10px] text-muted-foreground">{formatShortDate(tx.date)}</p>
                      </div>
                      <span className="text-xs font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">
                        {formatCurrency(tx.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ─── Income Breakdown (if any) ──────────────────────────────────── */}
      {incomeByCategory.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
                Rincian Pemasukan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {incomeByCategory.map((cat) => (
                  <div key={cat.categoryId} className="flex items-center gap-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 p-3">
                    <span className="text-base">{cat.categoryIcon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{cat.categoryName}</p>
                      <p className="text-xs text-muted-foreground">{cat.percentage.toFixed(1)}%</p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(cat.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
