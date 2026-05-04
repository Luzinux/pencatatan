'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { api } from '@/lib/api'
import { formatCurrency, formatDate, getMonthYear, getMonthLabel } from '@/lib/format'
import { useAnimatedCounter } from '@/hooks/use-animated-counter'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Bell,
  Receipt,
  CircleDollarSign,
  Target,
  PiggyBank,
  Banknote,
  Smartphone,
  Building2,
  ArrowRight,
  Clock,
  Shield,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ChevronRight as ChevronRightIcon,
} from 'lucide-react'
import { motion } from 'framer-motion'
import ReportPrint from '@/components/report-print'
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

interface BudgetProgress {
  id: string
  categoryId: string
  categoryName: string
  categoryIcon: string
  budgetAmount: number
  spent: number
  percentage: number
}

interface PaymentMethodBreakdown {
  paymentMethodId: string
  paymentMethodName: string
  paymentMethodType: string
  totalAmount: number
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
  budgetProgress: BudgetProgress[]
  savingsRate: number
  dailyAverageExpense: number
  paymentMethodBreakdown: PaymentMethodBreakdown[]
  transactionCount: number
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

const PM_COLORS: Record<string, string> = {
  cash: '#22c55e',
  ewallet: '#8b5cf6',
  bank: '#0ea5e9',
}

const PM_ICONS: Record<string, React.ElementType> = {
  cash: Banknote,
  ewallet: Smartphone,
  bank: Building2,
}

// ── Greeting based on time of day ──────────────────────────────────────────
function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 11) return 'Selamat Pagi'
  if (hour >= 11 && hour < 15) return 'Selamat Siang'
  if (hour >= 15 && hour < 18) return 'Selamat Sore'
  return 'Selamat Malam'
}

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

// ── Sparkline Component ────────────────────────────────────────────────────
function Sparkline({ data, color, width = 80, height = 28 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (!data || data.length < 2) return null

  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  const padding = 2
  const chartW = width - padding * 2
  const chartH = height - padding * 2

  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * chartW
    const y = padding + chartH - ((val - min) / range) * chartH
    return { x, y }
  })

  const pathD = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(' ')

  return (
    <svg width={width} height={height} className="opacity-60">
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ── Animated Gradient Border Card ──────────────────────────────────────────
function GradientBorderCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-xl p-[1px] overflow-hidden ${className}`}>
      {/* Animated gradient border */}
      <div
        className="absolute inset-0 animate-gradient-border rounded-xl"
        style={{
          background: 'linear-gradient(var(--border-angle, 0deg), #ef4444, #f59e0b, #22c55e, #06b6d4, #8b5cf6, #ef4444)',
        }}
      />
      {/* Inner content */}
      <div className="relative rounded-[11px]">
        {children}
      </div>
    </div>
  )
}

// ── Financial Health Score Gauge ───────────────────────────────────────────
interface HealthScoreResult {
  score: number
  savingsPoints: number
  budgetPoints: number
  billPoints: number
  emergencyPoints: number
  maxPossible: number
  statusLabel: string
  statusColor: string
}

function calculateHealthScore(data: DashboardData): HealthScoreResult {
  // Savings Rate (0-30 points)
  let savingsPoints = 0
  if (data.savingsRate > 20) savingsPoints = 30
  else if (data.savingsRate >= 10) savingsPoints = 20
  else if (data.savingsRate >= 5) savingsPoints = 10
  else if (data.savingsRate >= 0) savingsPoints = 5
  // negative = 0

  // Budget Adherence (0-25 points)
  let budgetPoints = 0
  const hasBudgets = data.budgetProgress && data.budgetProgress.length > 0
  if (hasBudgets) {
    const avgBudgetUsage = data.budgetProgress.reduce((sum, b) => sum + b.percentage, 0) / data.budgetProgress.length
    if (avgBudgetUsage < 75) budgetPoints = 25
    else if (avgBudgetUsage <= 100) budgetPoints = 15
    else budgetPoints = 5
  }

  // Bill Timeliness (0-20 points)
  let billPoints = 20 // Start with perfect score
  const now = new Date()
  const overdueBills = data.upcomingBills.filter((bill) => {
    const dueDate = new Date(bill.dueDate)
    return dueDate < now && bill.status === 'pending'
  })
  if (overdueBills.length === 0) billPoints = 20
  else if (overdueBills.length <= 2) billPoints = 10
  else billPoints = 0

  // Emergency Fund (0-25 points)
  let emergencyPoints = 0
  if (data.totalExpense > 0) {
    const monthsCovered = data.balance / data.totalExpense
    if (monthsCovered > 3) emergencyPoints = 25
    else if (monthsCovered > 2) emergencyPoints = 20
    else if (monthsCovered > 1) emergencyPoints = 15
    else emergencyPoints = 5
  }

  // Calculate max possible (if no budget data, adjust)
  const maxPossible = hasBudgets ? 100 : 75

  const rawScore = savingsPoints + budgetPoints + billPoints + emergencyPoints
  // Normalize score to 0-100 if no budgets
  const score = hasBudgets ? rawScore : Math.round((rawScore / 75) * 100)

  let statusLabel = ''
  let statusColor = ''
  if (score >= 80) {
    statusLabel = 'Sangat Sehat'
    statusColor = '#10b981'
  } else if (score >= 60) {
    statusLabel = 'Sehat'
    statusColor = '#22c55e'
  } else if (score >= 40) {
    statusLabel = 'Cukup'
    statusColor = '#f59e0b'
  } else {
    statusLabel = 'Perlu Perhatian'
    statusColor = '#ef4444'
  }

  return {
    score,
    savingsPoints,
    budgetPoints,
    billPoints,
    emergencyPoints,
    maxPossible,
    statusLabel,
    statusColor,
  }
}

function HealthScoreGauge({ healthScore }: { healthScore: HealthScoreResult }) {
  const { score, statusLabel, statusColor } = healthScore
  const radius = 70
  const strokeWidth = 12
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(score, 100) / 100
  const strokeDashoffset = circumference * (1 - progress)

  return (
    <div className="flex flex-col items-center">
      <p className="mb-2 text-sm font-semibold text-muted-foreground">Skor Keuangan</p>
      <div className="relative flex items-center justify-center">
        <svg width="180" height="180" className="-rotate-90">
          <defs>
            <linearGradient id="healthGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
          </defs>
          {/* Background ring */}
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted/20"
          />
          {/* Progress ring */}
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke="url(#healthGradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        {/* Score number in center */}
        <div className="absolute flex flex-col items-center">
          <span className="text-4xl font-bold" style={{ color: statusColor }}>
            {score}
          </span>
          <span
            className="mt-0.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={{
              color: statusColor,
              backgroundColor: `${statusColor}15`,
            }}
          >
            {statusLabel}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Health Score Breakdown ─────────────────────────────────────────────────
function HealthScoreBreakdown({ healthScore, hasBudgets }: { healthScore: HealthScoreResult; hasBudgets: boolean }) {
  const factors = [
    {
      label: 'Rasio Tabungan',
      points: healthScore.savingsPoints,
      max: 30,
      icon: PiggyBank,
      color: healthScore.savingsPoints >= 20 ? '#22c55e' : healthScore.savingsPoints >= 10 ? '#f59e0b' : '#ef4444',
    },
    {
      label: 'Kepatuhan Anggaran',
      points: healthScore.budgetPoints,
      max: 25,
      icon: Target,
      color: healthScore.budgetPoints >= 20 ? '#22c55e' : healthScore.budgetPoints >= 10 ? '#f59e0b' : '#ef4444',
      hidden: !hasBudgets,
    },
    {
      label: 'Ketepatan Tagihan',
      points: healthScore.billPoints,
      max: 20,
      icon: Receipt,
      color: healthScore.billPoints >= 15 ? '#22c55e' : healthScore.billPoints >= 10 ? '#f59e0b' : '#ef4444',
    },
    {
      label: 'Dana Darurat',
      points: healthScore.emergencyPoints,
      max: 25,
      icon: Shield,
      color: healthScore.emergencyPoints >= 20 ? '#22c55e' : healthScore.emergencyPoints >= 10 ? '#f59e0b' : '#ef4444',
    },
  ].filter((f) => !f.hidden)

  return (
    <div className="space-y-2.5">
      {factors.map((factor) => {
        const IconComponent = factor.icon
        const pct = (factor.points / factor.max) * 100
        return (
          <div key={factor.label} className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconComponent className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">{factor.label}</span>
              </div>
              <span className="text-xs font-semibold" style={{ color: factor.color }}>
                {factor.points}/{factor.max}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${pct}%`, backgroundColor: factor.color }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Smart Insight Card ─────────────────────────────────────────────────────
interface InsightItem {
  icon: React.ElementType
  iconColor: string
  iconBg: string
  text: string
  actionable: boolean
  targetPage?: string
}

function generateInsights(data: DashboardData, prevMonthTrend: MonthlyTrendItem | null): InsightItem[] {
  const insights: InsightItem[] = []

  // 1. Expense increase from last month
  if (prevMonthTrend && prevMonthTrend.expense > 0) {
    const expenseChange = ((data.totalExpense - prevMonthTrend.expense) / prevMonthTrend.expense) * 100
    if (expenseChange > 20) {
      const topCat = data.topCategories[0]?.category?.name ?? 'tertentu'
      insights.push({
        icon: TrendingUp,
        iconColor: '#ef4444',
        iconBg: '#fef2f2',
        text: `Pengeluaran naik ${expenseChange.toFixed(0)}% dari bulan lalu. Coba kurangi pengeluaran di kategori ${topCat}.`,
        actionable: true,
        targetPage: 'analytics',
      })
    }
  }

  // 2. Low savings rate
  if (data.savingsRate >= 0 && data.savingsRate < 10) {
    insights.push({
      icon: PiggyBank,
      iconColor: '#f59e0b',
      iconBg: '#fffbeb',
      text: `Rasio tabungan Anda rendah (${data.savingsRate.toFixed(0)}%). Idealnya simpan minimal 20% dari pemasukan.`,
      actionable: true,
      targetPage: 'budget',
    })
  }

  // 3. Budget category almost used up
  if (data.budgetProgress) {
    const nearLimit = data.budgetProgress.filter((b) => b.percentage >= 90 && b.percentage <= 100)
    nearLimit.forEach((b) => {
      const remaining = b.budgetAmount - b.spent
      insights.push({
        icon: AlertTriangle,
        iconColor: '#f59e0b',
        iconBg: '#fffbeb',
        text: `Anggaran ${b.categoryName} hampir habis (${b.percentage.toFixed(0)}%). Tersisa ${formatCurrency(remaining)} untuk sisa bulan ini.`,
        actionable: true,
        targetPage: 'budget',
      })
    })
  }

  // 4. Overdue bills
  const now = new Date()
  const overdueBills = data.upcomingBills.filter((bill) => {
    const dueDate = new Date(bill.dueDate)
    return dueDate < now && bill.status === 'pending'
  })
  if (overdueBills.length > 0) {
    insights.push({
      icon: AlertCircle,
      iconColor: '#ef4444',
      iconBg: '#fef2f2',
      text: `Ada ${overdueBills.length} tagihan yang sudah jatuh tempo. Bayar segera untuk menghindari denda.`,
      actionable: true,
      targetPage: 'tagihan',
    })
  }

  // 5. Budget overspent
  if (data.budgetProgress) {
    const overspent = data.budgetProgress.filter((b) => b.percentage > 100)
    overspent.forEach((b) => {
      const overPct = b.percentage - 100
      insights.push({
        icon: AlertCircle,
        iconColor: '#ef4444',
        iconBg: '#fef2f2',
        text: `Anggaran ${b.categoryName} sudah terlampaui ${overPct.toFixed(0)}%. Pertimbangkan untuk menyesuaikan anggaran bulan depan.`,
        actionable: true,
        targetPage: 'budget',
      })
    })
  }

  // 6. Positive balance and growing
  if (data.balance > 0 && prevMonthTrend) {
    const prevBalance = prevMonthTrend.income - prevMonthTrend.expense
    if (prevBalance > 0) {
      const balanceChange = ((data.balance - prevBalance) / prevBalance) * 100
      if (balanceChange > 5) {
        insights.push({
          icon: CheckCircle2,
          iconColor: '#22c55e',
          iconBg: '#f0fdf4',
          text: `Keuangan Anda dalam kondisi baik! Saldo naik ${balanceChange.toFixed(0)}% dari bulan lalu.`,
          actionable: false,
        })
      }
    }
  }

  // 7. General tip if no specific insights or fewer than 3
  if (insights.length < 3) {
    insights.push({
      icon: Lightbulb,
      iconColor: '#8b5cf6',
      iconBg: '#f5f3ff',
      text: 'Tips: Pisahkan kebutuhan dan keinginan saat berbelanja untuk mengontrol pengeluaran.',
      actionable: false,
    })
  }

  return insights.slice(0, 5)
}

function InsightCard({ insight, index, onNavigate }: { insight: InsightItem; index: number; onNavigate: (page: string) => void }) {
  const IconComponent = insight.icon
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.08 }}
      className="group flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/30"
    >
      {/* Colored icon circle */}
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: insight.iconBg }}
      >
        <IconComponent className="h-4 w-4" style={{ color: insight.iconColor }} />
      </div>
      {/* Text */}
      <p className="min-w-0 flex-1 text-sm leading-relaxed text-foreground/80">
        {insight.text}
      </p>
      {/* Actionable arrow */}
      {insight.actionable && insight.targetPage && (
        <button
          onClick={() => onNavigate(insight.targetPage!)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Lihat detail"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      )}
    </motion.div>
  )
}

// ── Month Comparison Text ──────────────────────────────────────────────────
function MonthComparisonText({ current, previous, type }: { current: number; previous: number; type: 'expense' | 'income' | 'balance' }) {
  if (previous === 0) return null
  const change = ((current - previous) / previous) * 100
  if (Math.abs(change) < 0.1) return null

  const isUp = change > 0
  const isPositive =
    type === 'income'
      ? isUp
      : type === 'expense'
        ? !isUp
        : isUp

  return (
    <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
      {isUp ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      <span>vs bulan lalu {Math.abs(change).toFixed(0)}%</span>
    </div>
  )
}

// ── Loading Skeleton ───────────────────────────────────────────────────────
function ShimmerBlock({ className = '' }: { className?: string }) {
  return <div className={`shimmer-loading rounded-md ${className}`} />
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Greeting skeleton */}
      <div className="space-y-1">
        <ShimmerBlock className="h-5 w-40" />
        <ShimmerBlock className="h-3 w-28" />
      </div>
      {/* Month selector skeleton */}
      <div className="flex items-center justify-center gap-4">
        <ShimmerBlock className="h-9 w-9 rounded-lg" />
        <ShimmerBlock className="h-8 w-32 rounded-full" />
        <ShimmerBlock className="h-9 w-9 rounded-lg" />
      </div>
      {/* Summary cards skeleton - with gradient-like shape hints */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <ShimmerBlock className="h-4 w-28" />
                <ShimmerBlock className="h-8 w-8 rounded-full" />
              </div>
            </CardHeader>
            <CardContent>
              <ShimmerBlock className="h-9 w-36 mb-2" />
              <ShimmerBlock className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Health score + Insights skeleton */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col items-center p-6">
            <ShimmerBlock className="h-5 w-28 mb-4" />
            <ShimmerBlock className="h-40 w-40 rounded-full" />
            <ShimmerBlock className="h-4 w-16 mt-3" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <ShimmerBlock className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
                <ShimmerBlock className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <ShimmerBlock className="h-3 w-full" />
                  <ShimmerBlock className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      {/* Stats row skeleton - circular icon + numbers */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-3">
              <ShimmerBlock className="h-12 w-12 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <ShimmerBlock className="h-3 w-20" />
                <ShimmerBlock className="h-5 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Charts skeleton - with title area */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <ShimmerBlock className="h-5 w-36" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <ShimmerBlock className="h-4 w-full" />
              <ShimmerBlock className="h-52 w-full rounded-md" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <ShimmerBlock className="h-5 w-36" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <ShimmerBlock className="h-4 w-full" />
              <ShimmerBlock className="h-52 w-full rounded-md" />
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Recent transactions skeleton - with circular icons */}
      <Card>
        <CardHeader>
          <ShimmerBlock className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <ShimmerBlock className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <ShimmerBlock className="h-4 w-32" />
                <ShimmerBlock className="h-3 w-20" />
              </div>
              <ShimmerBlock className="h-4 w-24" />
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

// ── Savings Rate Circle ────────────────────────────────────────────────────
function SavingsRateCircle({ rate }: { rate: number }) {
  const radius = 28
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(rate, 100) / 100
  const strokeDashoffset = circumference * (1 - progress)

  const colorClass =
    rate >= 20
      ? 'text-emerald-500'
      : rate >= 10
        ? 'text-amber-500'
        : 'text-red-500'

  const strokeColor =
    rate >= 20
      ? '#22c55e'
      : rate >= 10
        ? '#f59e0b'
        : '#ef4444'

  return (
    <div className="relative flex items-center justify-center">
      <svg width="72" height="72" className="-rotate-90">
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          className="text-muted/30"
        />
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className={`absolute text-sm font-bold ${colorClass}`}>
        {rate.toFixed(0)}%
      </span>
    </div>
  )
}

// ── Gradient Separator ─────────────────────────────────────────────────────
function GradientSeparator() {
  return (
    <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />
  )
}

// ── Trend Indicator Component ──────────────────────────────────────────────
function TrendIndicator({ current, previous, type }: { current: number; previous: number; type: 'expense' | 'income' }) {
  if (previous === 0) return null

  const change = ((current - previous) / previous) * 100
  const isUp = change > 0
  const isDown = change < 0

  // For expense: increase is bad (red), decrease is good (green)
  // For income: increase is good (green), decrease is bad (red)
  const isPositive = type === 'income' ? isUp : isDown

  if (Math.abs(change) < 0.1) return null

  return (
    <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
      {isUp ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      <span>{Math.abs(change).toFixed(0)}%</span>
    </div>
  )
}

// ── Main Dashboard Component ───────────────────────────────────────────────
export default function Dashboard() {
  const [currentMonth, setCurrentMonth] = useState(getMonthYear())
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const setCurrentPage = useAppStore((s) => s.setCurrentPage)

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

  // ── Animated counters ──────────────────────────────────────────────────
  const animatedExpense = useAnimatedCounter(data?.totalExpense ?? 0, 1000, !!data)
  const animatedIncome = useAnimatedCounter(data?.totalIncome ?? 0, 1000, !!data)
  const animatedBalance = useAnimatedCounter(data?.balance ?? 0, 1000, !!data)
  const animatedDailyAvg = useAnimatedCounter(data?.dailyAverageExpense ?? 0, 800, !!data)
  const animatedTxCount = useAnimatedCounter(data?.transactionCount ?? 0, 600, !!data)

  // ── Previous month trend for comparison ─────────────────────────────────
  const prevMonthTrend = useMemo(() => {
    if (!data?.monthlyTrend || data.monthlyTrend.length < 2) return null
    // Last item is current month, second-to-last is previous
    return data.monthlyTrend[data.monthlyTrend.length - 2]
  }, [data?.monthlyTrend])

  const currentMonthTrend = useMemo(() => {
    if (!data?.monthlyTrend || data.monthlyTrend.length < 1) return null
    return data.monthlyTrend[data.monthlyTrend.length - 1]
  }, [data?.monthlyTrend])

  // ── Health Score ─────────────────────────────────────────────────────────
  const healthScore = useMemo(() => {
    if (!data) return null
    return calculateHealthScore(data)
  }, [data])

  // ── Smart Insights ──────────────────────────────────────────────────────
  const insights = useMemo(() => {
    if (!data) return []
    return generateInsights(data, prevMonthTrend)
  }, [data, prevMonthTrend])

  // ── Sparkline data from monthly trend ───────────────────────────────────
  const expenseSparkline = useMemo(() => data?.monthlyTrend.map((m) => m.expense) ?? [], [data?.monthlyTrend])
  const incomeSparkline = useMemo(() => data?.monthlyTrend.map((m) => m.income) ?? [], [data?.monthlyTrend])
  const balanceSparkline = useMemo(
    () => data?.monthlyTrend.map((m) => m.income - m.expense) ?? [],
    [data?.monthlyTrend]
  )

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

  // Timestamp for "last updated"
  const lastUpdated = useMemo(() => {
    const now = new Date()
    return new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(now)
  }, [data])

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
  const hasPaymentMethodData = data.paymentMethodBreakdown.length > 0
  const hasBudgets = data.budgetProgress && data.budgetProgress.length > 0
  const maxPmAmount = hasPaymentMethodData
    ? Math.max(...data.paymentMethodBreakdown.map((pm) => pm.totalAmount))
    : 0

  return (
    <div className="space-y-6">
      {/* ── Greeting ──────────────────────────────────────────────────── */}
      <div className="space-y-0.5">
        <h2 className="text-lg font-semibold">{getGreeting()} 👋</h2>
        <p className="text-sm text-muted-foreground">
          Berikut ringkasan keuangan kamu
        </p>
      </div>

      {/* ── Month Selector (Pill) + Print Button ──────────────────────── */}
      <div className="flex items-center justify-center gap-2">
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
        <ReportPrint currentMonth={currentMonth} />
      </div>

      {/* ── Summary Cards with Sparkline & Gradient Border ──────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Total Pengeluaran */}
        <GradientBorderCard>
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-red-50 to-white shadow-sm transition-transform duration-200 hover:scale-[1.01] dark:from-red-950/20 dark:to-card">
            {/* Decorative ring behind amount */}
            <div className="absolute -right-6 -bottom-6 h-32 w-32 rounded-full border-[12px] border-red-100/40 dark:border-red-900/20" />
            <div className="absolute right-3 top-3 rounded-full bg-red-100 p-2 dark:bg-red-900/30">
              <ArrowDownLeft className="h-5 w-5 text-red-500" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">
                Total Pengeluaran
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold tabular-nums text-red-600 transition-all duration-500 sm:text-4xl dark:text-red-400">
                    {formatCurrency(animatedExpense)}
                  </p>
                  {prevMonthTrend && currentMonthTrend && (
                    <div className="mt-1.5">
                      <MonthComparisonText
                        current={currentMonthTrend.expense}
                        previous={prevMonthTrend.expense}
                        type="expense"
                      />
                    </div>
                  )}
                </div>
                <Sparkline data={expenseSparkline} color="#ef4444" />
              </div>
            </CardContent>
          </Card>
        </GradientBorderCard>

        {/* Total Pemasukan */}
        <GradientBorderCard>
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-green-50 to-white shadow-sm transition-transform duration-200 hover:scale-[1.01] dark:from-green-950/20 dark:to-card">
            {/* Decorative ring behind amount */}
            <div className="absolute -right-6 -bottom-6 h-32 w-32 rounded-full border-[12px] border-green-100/40 dark:border-green-900/20" />
            <div className="absolute right-3 top-3 rounded-full bg-green-100 p-2 dark:bg-green-900/30">
              <ArrowUpRight className="h-5 w-5 text-green-500" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400">
                Total Pemasukan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold tabular-nums text-green-600 transition-all duration-500 sm:text-4xl dark:text-green-400">
                    {formatCurrency(animatedIncome)}
                  </p>
                  {prevMonthTrend && currentMonthTrend && (
                    <div className="mt-1.5">
                      <MonthComparisonText
                        current={currentMonthTrend.income}
                        previous={prevMonthTrend.income}
                        type="income"
                      />
                    </div>
                  )}
                </div>
                <Sparkline data={incomeSparkline} color="#22c55e" />
              </div>
            </CardContent>
          </Card>
        </GradientBorderCard>

        {/* Sisa Uang */}
        <GradientBorderCard>
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-teal-50 to-white shadow-sm transition-transform duration-200 hover:scale-[1.01] dark:from-teal-950/20 dark:to-card">
            {/* Decorative ring behind amount */}
            <div className="absolute -right-6 -bottom-6 h-32 w-32 rounded-full border-[12px] border-teal-100/40 dark:border-teal-900/20" />
            <div className="absolute right-3 top-3 rounded-full bg-teal-100 p-2 dark:bg-teal-900/30">
              <Wallet className="h-5 w-5 text-teal-500" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-teal-600 dark:text-teal-400">
                Sisa Uang
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <p
                    className={`text-3xl font-bold tabular-nums transition-all duration-500 sm:text-4xl ${
                      data.balance >= 0
                        ? 'text-teal-600 dark:text-teal-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {formatCurrency(animatedBalance)}
                  </p>
                  {prevMonthTrend && currentMonthTrend && (
                    <div className="mt-1.5">
                      <MonthComparisonText
                        current={currentMonthTrend.income - currentMonthTrend.expense}
                        previous={prevMonthTrend.income - prevMonthTrend.expense}
                        type="balance"
                      />
                    </div>
                  )}
                </div>
                <Sparkline
                  data={balanceSparkline}
                  color={data.balance >= 0 ? '#14b8a6' : '#ef4444'}
                />
              </div>
            </CardContent>
          </Card>
        </GradientBorderCard>
      </div>

      {/* ── Financial Health Score + Smart Insights ────────────────────────── */}
      {healthScore && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Health Score Card */}
          <Card className="relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500" />
            <CardContent className="p-6">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-between">
                <HealthScoreGauge healthScore={healthScore} />
                <div className="w-full sm:flex-1 sm:pl-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Rincian Skor
                  </p>
                  <HealthScoreBreakdown healthScore={healthScore} hasBudgets={hasBudgets} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Smart Insights Card */}
          <Card className="relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2.5 text-base">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
                  <Lightbulb className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
                Wawasan Cerdas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {insights.map((insight, index) => (
                  <InsightCard
                    key={index}
                    insight={insight}
                    index={index}
                    onNavigate={(page) => setCurrentPage(page as any)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Stats Row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Savings Rate */}
        <Card className="transition-transform duration-200 hover:scale-[1.01]">
          <CardContent className="flex items-center gap-4 p-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                data.savingsRate >= 20
                  ? 'bg-emerald-100 dark:bg-emerald-900/30'
                  : data.savingsRate >= 10
                    ? 'bg-amber-100 dark:bg-amber-900/30'
                    : 'bg-red-100 dark:bg-red-900/30'
              }`}
            >
              <PiggyBank
                className={`h-6 w-6 ${
                  data.savingsRate >= 20
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : data.savingsRate >= 10
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-red-600 dark:text-red-400'
                }`}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">
                Rasio Tabungan
              </p>
              <div className="flex items-center gap-2">
                <SavingsRateCircle rate={data.savingsRate} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily Average */}
        <Card className="transition-transform duration-200 hover:scale-[1.01]">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900/30">
              <TrendingDown className="h-6 w-6 text-sky-600 dark:text-sky-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">
                Rata-rata Harian
              </p>
              <p className="text-xl font-bold text-sky-600 dark:text-sky-400">
                {formatCurrency(animatedDailyAvg)}
              </p>
              <p className="text-xs text-muted-foreground">per hari</p>
            </div>
          </CardContent>
        </Card>

        {/* Transaction Count */}
        <Card className="transition-transform duration-200 hover:scale-[1.01]">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
              <Receipt className="h-6 w-6 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">
                Jumlah Transaksi
              </p>
              <p className="text-xl font-bold text-violet-600 dark:text-violet-400">
                {animatedTxCount}
              </p>
              <p className="text-xs text-muted-foreground">transaksi bulan ini</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <GradientSeparator />

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

      {/* ── Charts Section with Enhanced Design ─────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Bar Chart - Monthly Trend */}
        <Card className="relative overflow-hidden">
          {/* Top accent line */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500 via-amber-500 to-green-500" />
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2.5 text-base">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                <TrendingUp className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              Tren 6 Bulan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasTrendData ? (
              <>
                {/* Subtle grid pattern background */}
                <div className="relative rounded-lg border bg-muted/20 p-2 dark:bg-muted/10">
                  <div
                    className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
                    style={{
                      backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
                      backgroundSize: '24px 24px',
                    }}
                  />
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
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Diperbarui {lastUpdated}</span>
                </div>
              </>
            ) : (
              <EmptyState message="Belum ada data tren bulanan" />
            )}
          </CardContent>
        </Card>

        {/* Pie Chart - Top Categories */}
        <Card className="relative overflow-hidden">
          {/* Top accent line */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-pink-500 to-orange-500" />
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2.5 text-base">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
                <CircleDollarSign className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              Kategori Terbesar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasCategories ? (
              <>
                {/* Subtle grid pattern background */}
                <div className="relative rounded-lg border bg-muted/20 p-2 dark:bg-muted/10">
                  <div
                    className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
                    style={{
                      backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
                      backgroundSize: '24px 24px',
                    }}
                  />
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
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Diperbarui {lastUpdated}</span>
                </div>
              </>
            ) : (
              <EmptyState message="Belum ada data kategori pengeluaran" />
            )}
          </CardContent>
        </Card>
      </div>

      <GradientSeparator />

      {/* ── Payment Method Breakdown ────────────────────────────────────── */}
      {hasPaymentMethodData && (
        <Card className="relative overflow-hidden">
          {/* Top accent line */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-green-500 via-purple-500 to-sky-500" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2.5 text-base">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/30">
                <Wallet className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              </div>
              Pengeluaran per Metode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.paymentMethodBreakdown.map((pm) => {
                const IconComponent = PM_ICONS[pm.paymentMethodType] || Banknote
                const color = PM_COLORS[pm.paymentMethodType] || '#6b7280'
                const percentage = maxPmAmount > 0 ? (pm.totalAmount / maxPmAmount) * 100 : 0

                return (
                  <div key={pm.paymentMethodId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-lg"
                          style={{ backgroundColor: `${color}15` }}
                        >
                          <IconComponent
                            className="h-4 w-4"
                            style={{ color }}
                          />
                        </div>
                        <span className="text-sm font-medium">{pm.paymentMethodName}</span>
                      </div>
                      <span className="text-sm font-semibold">
                        {formatCurrency(pm.totalAmount)}
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Budget Progress - Enhanced ─────────────────────────────────── */}
      {hasBudgets && (
        <Card className="relative overflow-hidden">
          {/* Top accent line */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2.5 text-base">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Target className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              Anggaran Bulan Ini
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {data.budgetProgress.map((item) => {
                const remaining = item.budgetAmount - item.spent
                const isOverBudget = remaining < 0

                const progressColor =
                  item.percentage > 100
                    ? 'bg-red-500'
                    : item.percentage >= 75
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'

                const badgeClass =
                  item.percentage > 100
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : item.percentage >= 75
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'

                return (
                  <div
                    key={item.id}
                    className="rounded-xl border p-4 space-y-3 transition-colors hover:bg-muted/20"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-full ${
                          item.percentage > 100
                            ? 'bg-red-100 dark:bg-red-900/30'
                            : item.percentage >= 75
                              ? 'bg-amber-100 dark:bg-amber-900/30'
                              : 'bg-emerald-100 dark:bg-emerald-900/30'
                        }`}>
                          <span className="text-base" role="img" aria-label={item.categoryName}>
                            {item.categoryIcon}
                          </span>
                        </div>
                        <span className="text-sm font-medium">{item.categoryName}</span>
                      </div>
                      <Badge variant="secondary" className={badgeClass}>
                        {item.percentage.toFixed(0)}%
                      </Badge>
                    </div>
                    {/* Thicker progress bar with animation */}
                    <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${progressColor}`}
                        style={{ width: `${Math.min(item.percentage, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        Terpakai: <span className="font-medium text-foreground">{formatCurrency(item.spent)}</span>
                      </span>
                      <span className={isOverBudget ? 'font-medium text-red-600 dark:text-red-400' : 'font-medium text-emerald-600 dark:text-emerald-400'}>
                        {isOverBudget
                          ? `Lebih: ${formatCurrency(Math.abs(remaining))}`
                          : `Sisa: ${formatCurrency(remaining)}`
                        }
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Anggaran: {formatCurrency(item.budgetAmount)}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <GradientSeparator />

      {/* ── Recent Transactions - Enhanced ────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Transaksi Terbaru</CardTitle>
            {hasTransactions && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setCurrentPage('history')}
              >
                Lihat Semua
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {hasTransactions ? (
            <div className="space-y-0">
              {data.recentTransactions.map((tx, index) => {
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

                // Left border color for type indicator
                const leftBorderColor = isExpense
                  ? 'border-l-red-500'
                  : isIncome
                    ? 'border-l-emerald-500'
                    : 'border-l-sky-500'

                // Alternating row backgrounds
                const rowBg = index % 2 === 1
                  ? 'bg-muted/20 dark:bg-muted/10'
                  : ''

                return (
                  <div
                    key={tx.id}
                    className={`flex items-center gap-3 rounded-lg border-l-[3px] ${leftBorderColor} px-2 py-3 transition-colors hover:bg-muted/50 ${rowBg}`}
                  >
                    {/* Icon */}
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${
                      isExpense
                        ? 'bg-red-100 dark:bg-red-950/40'
                        : isIncome
                          ? 'bg-emerald-100 dark:bg-emerald-950/40'
                          : 'bg-sky-100 dark:bg-sky-950/40'
                    }`}>
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
