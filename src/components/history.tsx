'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { api } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/format'
import { useAppStore } from '@/lib/store'
import { useAnimatedCounter } from '@/hooks/use-animated-counter'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Search,
  Trash2,
  Pencil,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Filter,
  X,
  Receipt,
  Plus,
  Loader2,
  Download,
  Wallet,
  CalendarDays,
  ChevronDown,
  ArrowRight,
  RotateCcw,
  ChevronLeft,
  Copy,
  ArrowUp,
  TrendingDown,
  Target,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '@/hooks/use-toast'

interface Category {
  id: string
  name: string
  icon: string
  type: string
}

interface PaymentMethod {
  id: string
  name: string
  type: string
}

interface Transaction {
  id: string
  type: string
  amount: number
  date: string
  note: string | null
  source: string
  categoryId: string | null
  paymentMethodId: string | null
  toPaymentMethodId: string | null
  wishlistId: string | null
  billId: string | null
  category: Category | null
  paymentMethod: PaymentMethod | null
  toPaymentMethod: PaymentMethod | null
  wishlist: { id: string; name: string } | null
  bill: { id: string; name: string } | null
}

interface GroupedTransactions {
  date: string
  label: string
  transactions: Transaction[]
}

const TYPE_OPTIONS = [
  { value: 'all', label: 'Semua' },
  { value: 'expense', label: 'Pengeluaran' },
  { value: 'income', label: 'Pemasukan' },
  { value: 'transfer', label: 'Transfer' },
] as const

const TYPE_COLORS = {
  expense: 'text-red-600',
  income: 'text-emerald-600',
  transfer: 'text-sky-600',
} as const

const TYPE_BG_CIRCLE = {
  expense: 'bg-red-100 dark:bg-red-950/40',
  income: 'bg-emerald-100 dark:bg-emerald-950/40',
  transfer: 'bg-sky-100 dark:bg-sky-950/40',
} as const

const TYPE_BORDER_LEFT = {
  expense: 'border-l-red-500',
  income: 'border-l-emerald-500',
  transfer: 'border-l-sky-500',
} as const

const TYPE_ICONS = {
  expense: ArrowUpRight,
  income: ArrowDownLeft,
  transfer: ArrowLeftRight,
} as const

const TYPE_LABELS = {
  expense: 'Pengeluaran',
  income: 'Pemasukan',
  transfer: 'Transfer',
} as const

const SOURCE_LABELS: Record<string, string> = {
  manual: 'Manual',
  wishlist: 'Wishlist',
  bill: 'Tagihan',
}

const SOURCE_COLORS: Record<string, string> = {
  wishlist: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300',
  bill: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
}

function getTodayMonth(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function formatGroupDate(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()

  if (isSameDay(date, today)) return 'Hari Ini'
  if (isSameDay(date, yesterday)) return 'Kemarin'

  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function groupByDate(transactions: Transaction[]): GroupedTransactions[] {
  const groups = new Map<string, Transaction[]>()

  for (const tx of transactions) {
    const dateKey = new Date(tx.date).toISOString().split('T')[0]
    if (!groups.has(dateKey)) {
      groups.set(dateKey, [])
    }
    groups.get(dateKey)!.push(tx)
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, transactions]) => ({
      date,
      label: formatGroupDate(date),
      transactions: transactions.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    }))
}

function TransactionSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3">
      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-36" />
      </div>
      <Skeleton className="h-4 w-20" />
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-5 w-24" />
        {[1, 2, 3].map((i) => (
          <TransactionSkeleton key={i} />
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        {[1, 2].map((i) => (
          <TransactionSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

function EmptyState({ onAddClick }: { onAddClick?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {/* 3 overlapping gradient cards illustration */}
      <div className="relative w-36 h-36 mb-6">
        {/* Back card */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-24 h-28 rounded-2xl bg-gradient-to-br from-red-100 to-red-200/50 dark:from-red-900/30 dark:to-red-800/20 flex items-center justify-center rotate-12 translate-x-2 shadow-sm border border-red-200/30 dark:border-red-800/20">
            <Receipt className="h-8 w-8 text-red-400/60 dark:text-red-500/40" />
          </div>
        </div>
        {/* Middle card */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-24 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-200/50 dark:from-emerald-900/30 dark:to-teal-800/20 flex items-center justify-center -rotate-3 translate-y-1 shadow-sm border border-emerald-200/30 dark:border-emerald-800/20">
            <Wallet className="h-7 w-7 text-emerald-400/60 dark:text-emerald-500/40" />
          </div>
        </div>
        {/* Front card */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-20 rounded-xl bg-gradient-to-br from-violet-100 to-purple-200/50 dark:from-violet-900/30 dark:to-purple-800/20 flex items-center justify-center -rotate-6 -translate-y-2 shadow-sm border border-violet-200/30 dark:border-violet-800/20">
            <ArrowUpRight className="h-5 w-5 text-violet-400/60 dark:text-violet-500/40" />
          </div>
        </div>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">
        Belum ada transaksi
      </h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs">
        Tambahkan transaksi pertama untuk mulai mencatat keuangan Anda
      </p>
      {onAddClick && (
        <Button onClick={onAddClick} className="gap-2 bg-emerald-600 hover:bg-emerald-700 press-scale">
          <Plus className="h-4 w-4" />
          Tambah Transaksi
        </Button>
      )}
    </div>
  )
}

function NoResultsState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="relative w-28 h-28 mb-6">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-200/50 dark:from-amber-900/30 dark:to-orange-800/20 flex items-center justify-center rotate-3 shadow-sm border border-amber-200/30 dark:border-amber-800/20">
            <Search className="h-9 w-9 text-amber-400/60 dark:text-amber-500/40" />
          </div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-100 to-rose-200/50 dark:from-red-900/30 dark:to-rose-800/20 flex items-center justify-center -rotate-6 -translate-y-1 shadow-sm border border-red-200/30 dark:border-red-800/20">
            <X className="h-6 w-6 text-red-400/60 dark:text-red-500/40" />
          </div>
        </div>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">
        Tidak ada hasil
      </h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs">
        Tidak ditemukan transaksi yang sesuai dengan filter Anda
      </p>
      <Button onClick={onClear} variant="outline" className="gap-2 press-scale">
        <X className="h-4 w-4" />
        Hapus Filter
      </Button>
    </div>
  )
}

function AnimatedStatValue({ amount, format }: { amount: number; format: (v: number) => string }) {
  const animated = useAnimatedCounter(amount, 800, amount > 0)
  return <span>{format(animated)}</span>
}

// ── Today's Spending Summary Bar ──────────────────────────────────────────
function TodaySpendingBar({ transactions }: { transactions: Transaction[] }) {
  const todayStr = new Date().toISOString().split('T')[0]
  const todayExpense = transactions
    .filter((t) => t.type === 'expense' && new Date(t.date).toISOString().split('T')[0] === todayStr)
    .reduce((s, t) => s + t.amount, 0)

  // Calculate this week's spending (Mon-Sun)
  const now = new Date()
  const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1 // Monday = 0
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - dayOfWeek)
  weekStart.setHours(0, 0, 0, 0)

  const weekExpense = transactions
    .filter((t) => t.type === 'expense' && new Date(t.date) >= weekStart)
    .reduce((s, t) => s + t.amount, 0)

  const daysInWeek = dayOfWeek + 1
  const dailyBudget = daysInWeek > 0 ? weekExpense / daysInWeek : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center gap-3 rounded-xl border bg-gradient-to-r from-teal-50 via-white to-emerald-50 dark:from-teal-950/20 dark:via-card dark:to-emerald-950/20 p-3 border-teal-200/30 dark:border-teal-800/20"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900/40 shrink-0">
        <Target className="h-4 w-4 text-teal-600 dark:text-teal-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Pengeluaran hari ini</span>
          <span className="text-xs text-muted-foreground/60">•</span>
          <span className="text-xs text-muted-foreground">Minggu ini</span>
        </div>
        <div className="flex items-baseline gap-3 mt-0.5">
          <span className="text-sm font-bold text-teal-700 dark:text-teal-300 stat-value">
            {formatCurrency(todayExpense)}
          </span>
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(weekExpense)}
          </span>
          {dailyBudget > 0 && (
            <span className="text-[10px] text-muted-foreground">
              ~{formatCurrency(Math.round(dailyBudget))}/hari
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function SummaryStats({ transactions }: { transactions: Transaction[] }) {
  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0)
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0)
  const netBalance = totalIncome - totalExpense
  const count = transactions.length

  const stats = [
    {
      label: 'Total Pengeluaran',
      amount: totalExpense,
      icon: ArrowDownLeft,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-950/20',
      iconBg: 'bg-red-100 dark:bg-red-900/40',
      format: (v: number) => `-${formatCurrency(v)}`,
    },
    {
      label: 'Total Pemasukan',
      amount: totalIncome,
      icon: ArrowUpRight,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/20',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
      format: (v: number) => `+${formatCurrency(v)}`,
    },
    {
      label: 'Saldo Bersih',
      amount: netBalance,
      icon: Wallet,
      color: netBalance >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-red-600 dark:text-red-400',
      bg: netBalance >= 0 ? 'bg-teal-50 dark:bg-teal-950/20' : 'bg-red-50 dark:bg-red-950/20',
      iconBg: netBalance >= 0 ? 'bg-teal-100 dark:bg-teal-900/40' : 'bg-red-100 dark:bg-red-900/40',
      format: (v: number) => (v >= 0 ? '+' : '') + formatCurrency(v),
    },
    {
      label: 'Jumlah Transaksi',
      amount: count,
      icon: Receipt,
      color: 'text-muted-foreground',
      bg: 'bg-muted/50',
      iconBg: 'bg-muted dark:bg-muted/60',
      format: (v: number) => `${v} transaksi`,
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat, index) => {
        const Icon = stat.icon
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.08 }}
            className={`rounded-xl p-3 sm:p-4 ${stat.bg} border border-border/30 transition-all duration-200 hover:shadow-sm`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`flex items-center justify-center h-7 w-7 rounded-lg ${stat.iconBg}`}>
                <Icon className={`h-3.5 w-3.5 ${stat.color}`} />
              </div>
              <span className="text-[11px] sm:text-xs text-muted-foreground font-medium leading-tight">
                {stat.label}
              </span>
            </div>
            <div className={`text-sm sm:text-base font-bold ${stat.color} leading-tight`}>
              <AnimatedStatValue amount={stat.amount} format={stat.format} />
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

function ActiveFilterPills({
  search,
  typeFilter,
  monthFilter,
  categoryFilter,
  categories,
  onRemoveSearch,
  onRemoveType,
  onRemoveMonth,
  onRemoveCategory,
}: {
  search: string
  typeFilter: string
  monthFilter: string
  categoryFilter: string
  categories: Category[]
  onRemoveSearch: () => void
  onRemoveType: () => void
  onRemoveMonth: () => void
  onRemoveCategory: () => void
}) {
  const pills: { label: string; onRemove: () => void }[] = []

  if (search.trim()) {
    pills.push({ label: `Cari: "${search.trim()}"`, onRemove: onRemoveSearch })
  }
  if (typeFilter !== 'all') {
    const typeLabel = TYPE_OPTIONS.find((o) => o.value === typeFilter)?.label || typeFilter
    pills.push({ label: `Tipe: ${typeLabel}`, onRemove: onRemoveType })
  }
  if (monthFilter) {
    const [y, m] = monthFilter.split('-')
    const monthLabel = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(
      new Date(parseInt(y), parseInt(m) - 1, 1)
    )
    pills.push({ label: `Bulan: ${monthLabel}`, onRemove: onRemoveMonth })
  }
  if (categoryFilter !== 'all') {
    const cat = categories.find((c) => c.id === categoryFilter)
    pills.push({
      label: `Kategori: ${cat?.icon || ''} ${cat?.name || categoryFilter}`,
      onRemove: onRemoveCategory,
    })
  }

  if (pills.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      <AnimatePresence mode="popLayout">
        {pills.map((pill) => (
          <motion.div
            key={pill.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
          >
            <Badge
              variant="secondary"
              className="gap-1 pr-1 text-xs font-normal shadow-sm bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/30"
            >
              {pill.label}
              <button
                onClick={pill.onRemove}
                className="ml-0.5 rounded-full p-0.5 hover:bg-emerald-200/50 dark:hover:bg-emerald-800/40 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

// Swipe-to-delete transaction item
function SwipeableTransactionItem({
  tx,
  onEdit,
  onDelete,
  onDuplicate,
  index,
  showSwipeHint,
  isEvenRow = false,
}: {
  tx: Transaction
  onEdit: () => void
  onDelete: () => void
  onDuplicate: () => void
  index: number
  showSwipeHint: boolean
  isEvenRow?: boolean
}) {
  const typeColor = TYPE_COLORS[tx.type as keyof typeof TYPE_COLORS] || 'text-foreground'
  const typeBgCircle = TYPE_BG_CIRCLE[tx.type as keyof typeof TYPE_BG_CIRCLE] || 'bg-muted'
  const typeBorderLeft = TYPE_BORDER_LEFT[tx.type as keyof typeof TYPE_BORDER_LEFT] || ''
  const sourceColor = SOURCE_COLORS[tx.source] || ''
  const sourceLabel = SOURCE_LABELS[tx.source] || tx.source

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      className="relative overflow-hidden"
    >
      {/* Delete button behind the item */}
      <div className="absolute inset-y-0 right-0 flex items-center justify-center w-20 bg-red-500 dark:bg-red-600">
        <button
          onClick={onDelete}
          className="flex flex-col items-center justify-center h-full w-full text-white hover:bg-red-600 dark:hover:bg-red-700 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          <span className="text-[10px] mt-0.5">Hapus</span>
        </button>
      </div>

      {/* Draggable transaction item */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={0.1}
        onDragEnd={(_, info) => {
          // Snap back if not swiped far enough
          if (info.offset.x > -80) {
            // The dragConstraints will snap it back
          }
        }}
        className={`relative flex items-center gap-3 px-4 py-3 border-l-[3px] ${typeBorderLeft} hover:bg-muted/30 transition-colors duration-150 cursor-default ${isEvenRow ? 'bg-muted/[0.03] dark:bg-muted/[0.02]' : 'bg-card'} touch-pan-y`}
      >
        {/* Swipe hint */}
        <AnimatePresence>
          {showSwipeHint && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute top-1 right-2 flex items-center gap-1 text-[9px] text-muted-foreground/50 pointer-events-none"
            >
              <span>Geser untuk hapus</span>
              <ChevronLeft className="h-3 w-3" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Category icon in colored circle */}
        <div className={`flex items-center justify-center h-10 w-10 rounded-full ${typeBgCircle} shrink-0 text-lg`}>
          {tx.type === 'transfer'
            ? '🔄'
            : tx.category?.icon || '📝'}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-foreground truncate">
              {tx.type === 'transfer'
                ? 'Transfer'
                : tx.category?.name || 'Tanpa Kategori'}
            </span>
            {/* For transfer: show arrow between payment methods */}
            {tx.type === 'transfer' && tx.paymentMethod && tx.toPaymentMethod ? (
              <div className="flex items-center gap-1 shrink-0">
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 h-4 font-normal"
                >
                  {tx.paymentMethod.name}
                </Badge>
                <ArrowRight className="h-3 w-3 text-sky-500 shrink-0" />
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 h-4 font-normal"
                >
                  {tx.toPaymentMethod.name}
                </Badge>
              </div>
            ) : (
              tx.paymentMethod && (
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 h-4 font-normal shrink-0"
                >
                  {tx.paymentMethod.name}
                </Badge>
              )
            )}
            {tx.source !== 'manual' && (
              <Badge
                className={`text-[10px] px-1.5 py-0 h-4 font-normal shrink-0 border-0 ${sourceColor}`}
              >
                {sourceLabel}
              </Badge>
            )}
          </div>
          {tx.note && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-muted-foreground truncate">
                {tx.note}
              </span>
            </div>
          )}
        </div>

        {/* Amount & actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <div className={`text-sm font-semibold ${typeColor}`}>
              {tx.type === 'expense' ? '-' : tx.type === 'income' ? '+' : ''}
              {formatCurrency(tx.amount)}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {new Intl.DateTimeFormat('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
              }).format(new Date(tx.date))}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
            onClick={onEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 shrink-0"
            onClick={onDuplicate}
            title="Duplikat Transaksi"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-red-600 shrink-0 md:hidden"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function History() {
  const { toast } = useToast()
  const { setCurrentPage, setTransactionTemplate } = useAppStore()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [filterOpen, setFilterOpen] = useState(true)
  const [showSwipeHint, setShowSwipeHint] = useState(true)
  const [showScrollTop, setShowScrollTop] = useState(false)

  // Edit state
  const [editTarget, setEditTarget] = useState<Transaction | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editCategoryId, setEditCategoryId] = useState('')
  const [editPaymentMethodId, setEditPaymentMethodId] = useState('')
  const [editToPaymentMethodId, setEditToPaymentMethodId] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editNote, setEditNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])

  // Hide swipe hint after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowSwipeHint(false), 3000)
    return () => clearTimeout(timer)
  }, [loading])

  // Scroll-to-top detection
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const hasActiveFilters =
    search !== '' || typeFilter !== 'all' || monthFilter !== '' || categoryFilter !== 'all'

  const clearFilters = useCallback(() => {
    setSearch('')
    setTypeFilter('all')
    setMonthFilter('')
    setCategoryFilter('all')
  }, [])

  // Fetch categories for the filter dropdown
  useEffect(() => {
    api
      .getCategories()
      .then((data) => setCategories(data))
      .catch(() => {})
  }, [])

  // Fetch payment methods for edit dialog
  useEffect(() => {
    api
      .getPaymentMethods()
      .then((data) => setPaymentMethods(data))
      .catch(() => {})
  }, [])

  // Fetch transactions when filters change
  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (typeFilter !== 'all') params.type = typeFilter
      if (monthFilter) params.month = monthFilter
      if (search.trim()) params.search = search.trim()

      const data = await api.getTransactions(
        Object.keys(params).length > 0 ? params : undefined
      )
      const txList = Array.isArray(data) ? data : data.transactions || []
      setTransactions(txList)
    } catch {
      toast({
        title: 'Gagal memuat transaksi',
        description: 'Terjadi kesalahan saat memuat data transaksi',
        variant: 'destructive',
      })
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }, [typeFilter, monthFilter, search, toast])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  // Apply category filter client-side (API doesn't support it)
  const filteredTransactions = useMemo(() => {
    if (categoryFilter === 'all') return transactions
    return transactions.filter((tx) => tx.categoryId === categoryFilter)
  }, [transactions, categoryFilter])

  const grouped = useMemo(() => groupByDate(filteredTransactions), [filteredTransactions])

  const handleExportCSV = useCallback(() => {
    const headers = ['Tanggal', 'Jenis', 'Kategori', 'Jumlah', 'Metode Pembayaran', 'Catatan']
    const typeLabels: Record<string, string> = { expense: 'Pengeluaran', income: 'Pemasukan', transfer: 'Transfer' }
    const rows = filteredTransactions.map(tx => [
      new Date(tx.date).toISOString().split('T')[0],
      typeLabels[tx.type] || tx.type,
      tx.type === 'transfer' ? 'Transfer' : tx.category?.name || '',
      tx.amount.toString(),
      tx.paymentMethod?.name || '',
      (tx.note || '').replace(/,/g, ';')
    ])
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transaksi_${monthFilter || 'semua'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [filteredTransactions, monthFilter])

  const handleOpenEdit = (tx: Transaction) => {
    setEditTarget(tx)
    setEditAmount(String(tx.amount))
    setEditCategoryId(tx.categoryId || '')
    setEditPaymentMethodId(tx.paymentMethodId || '')
    setEditToPaymentMethodId(tx.toPaymentMethodId || '')
    // Format date as YYYY-MM-DD for the date input
    const d = new Date(tx.date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    setEditDate(`${year}-${month}-${day}`)
    setEditNote(tx.note || '')
  }

  const handleSaveEdit = async () => {
    if (!editTarget) return
    if (!editAmount || parseFloat(editAmount) <= 0) {
      toast({ title: 'Validasi Gagal', description: 'Nominal harus diisi dan lebih dari 0', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        amount: parseFloat(editAmount),
        date: editDate,
        note: editNote || undefined,
      }
      if (editTarget.type === 'expense' || editTarget.type === 'income') {
        payload.categoryId = editCategoryId || null
        payload.paymentMethodId = editPaymentMethodId || null
      }
      if (editTarget.type === 'transfer') {
        payload.paymentMethodId = editPaymentMethodId || null
        payload.toPaymentMethodId = editToPaymentMethodId || null
      }
      await api.updateTransaction(editTarget.id, payload)
      toast({ title: 'Berhasil!', description: 'Transaksi berhasil diperbarui' })
      setEditTarget(null)
      await fetchTransactions()
    } catch {
      toast({ title: 'Gagal', description: 'Terjadi kesalahan saat memperbarui transaksi', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.deleteTransaction(deleteTarget.id)
      toast({
        title: 'Transaksi dihapus',
        description: 'Transaksi berhasil dihapus',
      })
      setDeleteTarget(null)
      await fetchTransactions()
    } catch {
      toast({
        title: 'Gagal menghapus',
        description: 'Terjadi kesalahan saat menghapus transaksi',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  const handleDuplicate = (tx: Transaction) => {
    setTransactionTemplate({
      type: tx.type,
      amount: tx.amount,
      categoryId: tx.categoryId || undefined,
      paymentMethodId: tx.paymentMethodId || undefined,
      note: tx.note || undefined,
    })
    setCurrentPage('transaksi')
    toast({
      title: 'Template Diterapkan',
      description: 'Form transaksi telah diisi dengan data duplikat',
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filter Bar - Collapsible with AnimatePresence */}
      <Collapsible open={filterOpen} onOpenChange={setFilterOpen}>
        <Card className={`transition-all duration-300 ${hasActiveFilters ? 'border-l-4 border-l-emerald-500' : ''}`}>
          <CardContent className="p-4 space-y-0">
            <CollapsibleTrigger asChild>
              <div className="flex items-center gap-2 cursor-pointer select-none">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filter</span>
                {/* Transaction count badge */}
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                  {filteredTransactions.length}
                </Badge>
                {/* Active filter count indicator */}
                {hasActiveFilters && (
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                )}
                <div className="ml-auto flex items-center gap-2">
                  {filteredTransactions.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleExportCSV()
                      }}
                      className="h-7 text-xs gap-1 px-2"
                    >
                      <Download className="h-3 w-3" />
                      Export CSV
                    </Button>
                  )}
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        clearFilters()
                      }}
                      className="h-7 text-xs gap-1 px-2 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Reset Filter
                    </Button>
                  )}
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                      filterOpen ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </div>
            </CollapsibleTrigger>

            <AnimatePresence initial={false}>
              {filterOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="space-y-3 pt-3">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Cari catatan transaksi..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-9 ring-primary/30 focus-visible:ring-2 focus-visible:ring-primary/50 transition-shadow"
                      />
                    </div>

                    {/* Filters row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {/* Type filter */}
                      <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Tipe" />
                        </SelectTrigger>
                        <SelectContent>
                          {TYPE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Month filter */}
                      <Input
                        type="month"
                        value={monthFilter}
                        onChange={(e) => setMonthFilter(e.target.value)}
                        placeholder="Bulan"
                        className="h-9"
                      />

                      {/* Category filter */}
                      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Kategori" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Semua Kategori</SelectItem>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.icon} {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Active filter pills */}
                    <ActiveFilterPills
                      search={search}
                      typeFilter={typeFilter}
                      monthFilter={monthFilter}
                      categoryFilter={categoryFilter}
                      categories={categories}
                      onRemoveSearch={() => setSearch('')}
                      onRemoveType={() => setTypeFilter('all')}
                      onRemoveMonth={() => setMonthFilter('')}
                      onRemoveCategory={() => setCategoryFilter('all')}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </Collapsible>

      {/* Transaction List */}
      {loading ? (
        <Card>
          <CardContent className="p-4">
            <LoadingSkeleton />
          </CardContent>
        </Card>
      ) : filteredTransactions.length === 0 ? (
        <Card>
          <CardContent className="p-4">
            {hasActiveFilters ? (
              <NoResultsState onClear={clearFilters} />
            ) : (
              <EmptyState onAddClick={() => setCurrentPage('transaksi')} />
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Stats Banner */}
          <SummaryStats transactions={filteredTransactions} />

          {/* Today's Spending Summary Bar */}
          <TodaySpendingBar transactions={filteredTransactions} />

          <ScrollArea className="max-h-[60vh] [&>div]:scrollbar-thin [&>div]:scrollbar-thumb-muted-foreground/20 [&>div]:scrollbar-track-transparent">
            <div className="space-y-3 pr-1">
              {grouped.map((group, groupIndex) => {
                const dayExpense = group.transactions
                  .filter((t) => t.type === 'expense')
                  .reduce((s, t) => s + t.amount, 0)
                const dayIncome = group.transactions
                  .filter((t) => t.type === 'income')
                  .reduce((s, t) => s + t.amount, 0)

                return (
                  <motion.div
                    key={group.date}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: groupIndex * 0.06 }}
                  >
                    <Card className="overflow-hidden">
                      <CardContent className="p-0">
                        {/* Date header - Enhanced */}
                        <div className="sticky top-0 z-10 bg-card px-4 pt-3 pb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                              <h3 className="text-sm font-semibold text-foreground">
                                {group.label}
                              </h3>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(group.date)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            {dayExpense > 0 && (
                              <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                                -{formatCurrency(dayExpense)}
                              </span>
                            )}
                            {dayIncome > 0 && (
                              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                +{formatCurrency(dayIncome)}
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground">
                              {group.transactions.length} transaksi
                            </span>
                          </div>
                          <Separator className="mt-2" />
                        </div>

                        {/* Transaction items */}
                        <div className="divide-y divide-border/30">
                          {group.transactions.map((tx, txIndex) => {
                            const globalIndex = groupIndex * 10 + txIndex
                            const isEvenRow = txIndex % 2 === 0
                            return (
                              <SwipeableTransactionItem
                                key={tx.id}
                                tx={tx}
                                onEdit={() => handleOpenEdit(tx)}
                                onDelete={() => setDeleteTarget(tx)}
                                onDuplicate={() => handleDuplicate(tx)}
                                index={txIndex}
                                showSwipeHint={showSwipeHint && groupIndex === 0 && txIndex === 0}
                                isEvenRow={isEvenRow}
                              />
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          </ScrollArea>
        </>
      )}

      {/* Scroll-to-top FAB */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-20 md:bottom-8 right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-background border shadow-lg hover:bg-muted transition-colors press-scale"
            aria-label="Kembali ke atas"
          >
            <ArrowUp className="h-4 w-4 text-muted-foreground" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Transaksi?</AlertDialogTitle>
            <AlertDialogDescription>
              Transaksi{' '}
              <span className="font-medium">
                {deleteTarget?.type === 'transfer'
                  ? 'Transfer'
                  : deleteTarget?.category?.name || 'Tanpa Kategori'}
              </span>{' '}
              sebesar{' '}
              <span className="font-medium">
                {deleteTarget ? formatCurrency(deleteTarget.amount) : ''}
              </span>{' '}
              akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleting ? 'Menghapus...' : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Transaction Dialog */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
      >
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit{' '}
              {editTarget?.type === 'expense'
                ? 'Pengeluaran'
                : editTarget?.type === 'income'
                  ? 'Pemasukan'
                  : 'Transfer'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Nominal */}
            <div className="space-y-2">
              <Label htmlFor="edit-amount" className="text-sm font-medium">
                Nominal <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-amount"
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                min={0}
              />
            </div>

            {/* Category — for expense & income only */}
            {(editTarget?.type === 'expense' || editTarget?.type === 'income') && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Kategori{' '}
                  {editTarget?.type === 'expense' && (
                    <span className="text-red-500">*</span>
                  )}
                </Label>
                <Select value={editCategoryId} onValueChange={setEditCategoryId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories
                      .filter(
                        (cat) =>
                          cat.type === editTarget?.type
                      )
                      .map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Transfer: From / To */}
            {editTarget?.type === 'transfer' && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Dari</Label>
                  <Select
                    value={editPaymentMethodId}
                    onValueChange={setEditPaymentMethodId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih sumber" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((pm) => (
                        <SelectItem key={pm.id} value={pm.id}>
                          {pm.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Ke</Label>
                  <Select
                    value={editToPaymentMethodId}
                    onValueChange={setEditToPaymentMethodId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih tujuan" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((pm) => (
                        <SelectItem key={pm.id} value={pm.id}>
                          {pm.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Payment Method — for expense & income */}
            {(editTarget?.type === 'expense' || editTarget?.type === 'income') && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Metode Pembayaran
                </Label>
                <Select
                  value={editPaymentMethodId}
                  onValueChange={setEditPaymentMethodId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih metode pembayaran" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((pm) => (
                      <SelectItem key={pm.id} value={pm.id}>
                        {pm.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="edit-date" className="text-sm font-medium">
                Tanggal
              </Label>
              <Input
                id="edit-date"
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Note */}
            <div className="space-y-2">
              <Label htmlFor="edit-note" className="text-sm font-medium">
                Catatan
              </Label>
              <Textarea
                id="edit-note"
                placeholder="Tambahkan catatan (opsional)"
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setEditTarget(null)}
              disabled={saving}
            >
              Batal
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Menyimpan...
                </>
              ) : (
                'Simpan'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
