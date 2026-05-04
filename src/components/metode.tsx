'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { api } from '@/lib/api'
import { formatCurrency, getMonthYear } from '@/lib/format'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
import { Skeleton } from '@/components/ui/skeleton'
import {
  Plus,
  Pencil,
  Trash2,
  Banknote,
  Smartphone,
  Building2,
  Loader2,
  Wallet,
  TrendingDown,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAnimatedCounter } from '@/hooks/use-animated-counter'
import { motion } from 'framer-motion'

// ── Types ──────────────────────────────────────────────────────────────────
type PaymentMethodType = 'cash' | 'ewallet' | 'bank'

interface PaymentMethod {
  id: string
  name: string
  type: PaymentMethodType
  initialBalance: number
  createdAt: string
  updatedAt: string
}

// ── Config ─────────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<
  PaymentMethodType,
  {
    label: string
    icon: React.ReactNode
    badgeClass: string
    iconBgClass: string
    iconTextClass: string
    cardBorderClass: string
    cardBgClass: string
    patternColor: string
    shadowColor: string
  }
> = {
  cash: {
    label: 'Tunai',
    icon: <Banknote className="h-5 w-5" />,
    badgeClass:
      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    iconBgClass: 'bg-green-100 dark:bg-green-900/30',
    iconTextClass: 'text-green-600 dark:text-green-400',
    cardBorderClass: 'border-green-200 dark:border-green-900/40',
    cardBgClass: 'bg-gradient-to-br from-green-50/80 via-emerald-50/30 to-card dark:from-green-950/20 dark:via-emerald-950/5 dark:to-card',
    patternColor: 'bg-green-200/20 dark:bg-green-800/10',
    shadowColor: 'hover:shadow-green-200/30 dark:hover:shadow-green-900/20',
  },
  ewallet: {
    label: 'E-Wallet',
    icon: <Smartphone className="h-5 w-5" />,
    badgeClass:
      'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    iconBgClass: 'bg-purple-100 dark:bg-purple-900/30',
    iconTextClass: 'text-purple-600 dark:text-purple-400',
    cardBorderClass: 'border-purple-200 dark:border-purple-900/40',
    cardBgClass: 'bg-gradient-to-br from-purple-50/80 via-violet-50/30 to-card dark:from-purple-950/20 dark:via-violet-950/5 dark:to-card',
    patternColor: 'bg-purple-200/20 dark:bg-purple-800/10',
    shadowColor: 'hover:shadow-purple-200/30 dark:hover:shadow-purple-900/20',
  },
  bank: {
    label: 'Bank',
    icon: <Building2 className="h-5 w-5" />,
    badgeClass:
      'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
    iconBgClass: 'bg-sky-100 dark:bg-sky-900/30',
    iconTextClass: 'text-sky-600 dark:text-sky-400',
    cardBorderClass: 'border-sky-200 dark:border-sky-900/40',
    cardBgClass: 'bg-gradient-to-br from-sky-50/80 via-blue-50/30 to-card dark:from-sky-950/20 dark:via-blue-950/5 dark:to-card',
    patternColor: 'bg-sky-200/20 dark:bg-sky-800/10',
    shadowColor: 'hover:shadow-sky-200/30 dark:hover:shadow-sky-900/20',
  },
}

// ── Sparkline Component ────────────────────────────────────────────────────

function MiniSparkline({
  data,
  color,
  width = 64,
  height = 24,
}: {
  data: number[]
  color: string
  width?: number
  height?: number
}) {
  if (data.length < 2) return null

  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const padding = 2

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - padding * 2)
    const y = padding + (1 - (value - min) / range) * (height - padding * 2)
    return `${x},${y}`
  })

  const linePath = `M${points.join(' L')}`

  // Area fill path
  const areaPath = `${linePath} L${padding + ((data.length - 1) / (data.length - 1)) * (width - padding * 2)},${height - padding} L${padding},${height - padding} Z`

  return (
    <svg width={width} height={height} className="opacity-70">
      <path d={areaPath} fill={color} fillOpacity={0.15} />
      <path d={linePath} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Animation Variants ─────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.35,
      ease: 'easeOut',
    },
  },
}

// ── Loading Skeleton ───────────────────────────────────────────────────────
function MetodeSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-10 w-36" />
      </div>
      {/* Summary skeleton */}
      <Skeleton className="h-24 w-full rounded-xl" />
      {/* Cards skeleton */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
              <div className="mt-3">
                <Skeleton className="h-4 w-28" />
              </div>
              <div className="mt-3 flex gap-2 justify-end">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ── Empty State ────────────────────────────────────────────────────────────
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-full bg-muted p-4">
        <Wallet className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="mb-1 text-base font-semibold text-foreground">
        Belum ada metode pembayaran
      </p>
      <p className="mb-4 text-sm text-muted-foreground">
        Tambahkan metode pembayaran seperti tunai, e-wallet, atau rekening bank
      </p>
      <Button onClick={onAdd} className="gap-2">
        <Plus className="h-4 w-4" />
        Tambah Metode
      </Button>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function Metode() {
  const { toast } = useToast()

  // Data state
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)

  // Spending data per payment method (from dashboard)
  const [methodSpending, setMethodSpending] = useState<Record<string, number>>({})

  // Previous month spending data for comparison
  const [prevMonthSpending, setPrevMonthSpending] = useState<Record<string, number>>({})

  // Sparkline data per payment method (last 7 days)
  const [sparklineData, setSparklineData] = useState<Record<string, number[]>>({})

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState<PaymentMethodType>('cash')
  const [formBalance, setFormBalance] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Delete dialog state
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ── Computed values ──────────────────────────────────────────────────

  const totalBalance = useMemo(
    () => methods.reduce((sum, m) => sum + (m.initialBalance ?? 0), 0),
    [methods]
  )

  const animatedTotalBalance = useAnimatedCounter(
    Math.round(totalBalance),
    800,
    !loading && methods.length > 0
  )

  // Summary counts by type
  const cashCount = methods.filter((m) => m.type === 'cash').length
  const ewalletCount = methods.filter((m) => m.type === 'ewallet').length
  const bankCount = methods.filter((m) => m.type === 'bank').length

  // ── Data Fetching ──────────────────────────────────────────────────

  const fetchMethods = useCallback(async () => {
    try {
      const data = await api.getPaymentMethods()
      setMethods(data)
    } catch {
      setMethods([])
      toast({
        title: 'Gagal',
        description: 'Tidak dapat memuat metode pembayaran',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchMethods()
  }, [fetchMethods])

  // Fetch spending data from dashboard (current + previous month)
  useEffect(() => {
    if (methods.length > 0) {
      const currentMonth = getMonthYear()
      const now = new Date()
      const prevMonth = getMonthYear(new Date(now.getFullYear(), now.getMonth() - 1, 1))

      Promise.all([
        api.getDashboard(currentMonth).catch(() => ({})),
        api.getDashboard(prevMonth).catch(() => ({})),
      ]).then(([curDash, prevDash]) => {
        // Current month spending
        const curSpending: Record<string, number> = {}
        if (curDash.paymentMethodBreakdown && Array.isArray(curDash.paymentMethodBreakdown)) {
          curDash.paymentMethodBreakdown.forEach((pm: { paymentMethodId: string; totalAmount: number }) => {
            curSpending[pm.paymentMethodId] = pm.totalAmount
          })
        }
        setMethodSpending(curSpending)

        // Previous month spending
        const prevSpending: Record<string, number> = {}
        if (prevDash.paymentMethodBreakdown && Array.isArray(prevDash.paymentMethodBreakdown)) {
          prevDash.paymentMethodBreakdown.forEach((pm: { paymentMethodId: string; totalAmount: number }) => {
            prevSpending[pm.paymentMethodId] = pm.totalAmount
          })
        }
        setPrevMonthSpending(prevSpending)
      }).catch(() => {})

      // Fetch sparkline data: last 7 days of spending per payment method
      // We get this from the transactions API
      const now2 = new Date()
      const sevenDaysAgo = new Date(now2)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      api.getTransactions({
        type: 'expense',
        limit: '200',
      }).then((res) => {
        const transactions = Array.isArray(res) ? res : (res as { transactions: PaymentMethod[] }).transactions || []
        const dailyByMethod: Record<string, number[]> = {}

        // Initialize 7 days of 0s for each method
        methods.forEach((m) => {
          dailyByMethod[m.id] = Array(7).fill(0)
        })

        // Group transactions by payment method and day
        transactions.forEach((tx: { paymentMethodId?: string | null; amount: number; date: string }) => {
          if (!tx.paymentMethodId || !dailyByMethod[tx.paymentMethodId]) return
          const txDate = new Date(tx.date)
          const diffDays = Math.floor((now2.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24))
          if (diffDays >= 0 && diffDays < 7) {
            dailyByMethod[tx.paymentMethodId][6 - diffDays] += tx.amount
          }
        })

        setSparklineData(dailyByMethod)
      }).catch(() => {
        // Fallback: empty sparklines
        const empty: Record<string, number[]> = {}
        methods.forEach((m) => {
          empty[m.id] = []
        })
        setSparklineData(empty)
      })
    }
  }, [methods])

  // ── Dialog Handlers ──────────────────────────────────────────────────

  const openAddDialog = () => {
    setEditingId(null)
    setFormName('')
    setFormType('cash')
    setFormBalance('')
    setDialogOpen(true)
  }

  const openEditDialog = (method: PaymentMethod) => {
    setEditingId(method.id)
    setFormName(method.name)
    setFormType(method.type as PaymentMethodType)
    setFormBalance(
      method.initialBalance ? String(method.initialBalance) : ''
    )
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formName.trim()) {
      toast({
        title: 'Validasi Gagal',
        description: 'Nama metode pembayaran wajib diisi',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)

    try {
      const payload = {
        name: formName.trim(),
        type: formType,
        initialBalance: formBalance ? parseFloat(formBalance) : 0,
      }

      if (editingId) {
        await api.updatePaymentMethod(editingId, payload)
        toast({
          title: 'Berhasil!',
          description: 'Metode pembayaran berhasil diperbarui',
        })
      } else {
        await api.createPaymentMethod(payload)
        toast({
          title: 'Berhasil!',
          description: 'Metode pembayaran berhasil ditambahkan',
        })
      }

      setDialogOpen(false)
      fetchMethods()
    } catch {
      toast({
        title: 'Gagal',
        description: 'Terjadi kesalahan saat menyimpan metode pembayaran',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return

    setDeleting(true)
    try {
      await api.deletePaymentMethod(deleteId)
      toast({
        title: 'Berhasil!',
        description: 'Metode pembayaran berhasil dihapus',
      })
      setDeleteId(null)
      fetchMethods()
    } catch {
      toast({
        title: 'Gagal',
        description: 'Terjadi kesalahan saat menghapus metode pembayaran',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────
  if (loading) return <MetodeSkeleton />

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Metode Pembayaran</h2>
        <Button onClick={openAddDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Tambah Metode</span>
          <span className="sm:hidden">Tambah</span>
        </Button>
      </div>

      {/* ── Summary Banner ─────────────────────────────────────────────── */}
      {methods.length > 0 && (
        <Card className="border-border/50 bg-gradient-to-br from-sky-50/60 via-teal-50/30 to-card dark:from-sky-950/15 dark:via-teal-950/5 dark:to-card overflow-hidden">
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-sky-700 dark:text-sky-400">
                  Total Saldo Seluruh Metode
                </p>
                <p className="text-xl font-bold tabular-nums text-foreground">
                  {formatCurrency(animatedTotalBalance)}
                </p>
                <div className="flex items-center gap-4 mt-2">
                  {/* Cash count */}
                  <div className="flex items-center gap-1.5">
                    <div className="rounded-full bg-green-100 p-1 dark:bg-green-900/30">
                      <Banknote className="h-3 w-3 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-xs text-muted-foreground">{cashCount} Tunai</span>
                  </div>
                  {/* E-Wallet count */}
                  <div className="flex items-center gap-1.5">
                    <div className="rounded-full bg-purple-100 p-1 dark:bg-purple-900/30">
                      <Smartphone className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="text-xs text-muted-foreground">{ewalletCount} E-Wallet</span>
                  </div>
                  {/* Bank count */}
                  <div className="flex items-center gap-1.5">
                    <div className="rounded-full bg-sky-100 p-1 dark:bg-sky-900/30">
                      <Building2 className="h-3 w-3 text-sky-600 dark:text-sky-400" />
                    </div>
                    <span className="text-xs text-muted-foreground">{bankCount} Bank</span>
                  </div>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">
                Total: {methods.length}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Payment Method Cards ───────────────────────────────────────── */}
      {methods.length === 0 ? (
        <EmptyState onAdd={openAddDialog} />
      ) : (
        <motion.div
          className="grid grid-cols-2 gap-4 lg:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {methods.map((method) => {
            const config = TYPE_CONFIG[(method.type as PaymentMethodType) ?? 'cash']
            const monthlySpent = methodSpending[method.id]
            const prevSpent = prevMonthSpending[method.id]
            const sparkPoints = sparklineData[method.id]

            // Balance change indicator
            const spendingChange = monthlySpent !== undefined && prevSpent !== undefined && prevSpent > 0
              ? Math.round(((monthlySpent - prevSpent) / prevSpent) * 100)
              : null
            const spendingIncreased = spendingChange !== null && spendingChange > 0

            return (
              <motion.div key={method.id} variants={cardVariants}>
                <Card
                  className={`relative overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${config.cardBorderClass} ${config.cardBgClass} ${config.shadowColor}`}
                >
                  {/* Subtle border pattern overlay */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-50">
                    <div
                      className={`absolute -right-4 -top-4 h-16 w-16 rounded-full ${config.patternColor}`}
                    />
                    <div
                      className={`absolute -left-2 -bottom-2 h-12 w-12 rounded-full ${config.patternColor}`}
                    />
                  </div>

                  <CardContent className="p-4 relative">
                    {/* Icon, Name, Badge */}
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${config.iconBgClass}`}
                      >
                        <span className={config.iconTextClass}>{config.icon}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {method.name}
                        </p>
                        <Badge
                          variant="secondary"
                          className={`mt-1 text-xs ${config.badgeClass}`}
                        >
                          {config.label}
                        </Badge>
                      </div>
                    </div>

                    {/* Initial Balance */}
                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground">Saldo Awal</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          {formatCurrency(method.initialBalance ?? 0)}
                        </p>
                      </div>
                    </div>

                    {/* Monthly spending indicator + sparkline */}
                    {(monthlySpent !== undefined && monthlySpent > 0) ? (
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <TrendingDown className="h-3 w-3 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">
                            Bulan ini: <span className="font-medium text-foreground">{formatCurrency(monthlySpent)}</span>
                          </p>
                        </div>
                        {/* Mini Sparkline */}
                        {sparkPoints && sparkPoints.length >= 2 && (
                          <MiniSparkline
                            data={sparkPoints}
                            color={method.type === 'cash' ? '#22c55e' : method.type === 'ewallet' ? '#a855f7' : '#0ea5e9'}
                            width={56}
                            height={20}
                          />
                        )}
                      </div>
                    ) : (
                      sparkPoints && sparkPoints.length >= 2 && (
                        <div className="mt-2 flex items-center justify-end">
                          <MiniSparkline
                            data={sparkPoints}
                            color={method.type === 'cash' ? '#22c55e' : method.type === 'ewallet' ? '#a855f7' : '#0ea5e9'}
                            width={56}
                            height={20}
                          />
                        </div>
                      )
                    )}

                    {/* Balance change indicator */}
                    {spendingChange !== null && (
                      <div className={`mt-1.5 flex items-center gap-1 text-xs ${
                        spendingIncreased
                          ? 'text-red-500 dark:text-red-400'
                          : 'text-emerald-500 dark:text-emerald-400'
                      }`}>
                        {spendingIncreased ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3" />
                        )}
                        <span className="font-medium">
                          {spendingIncreased ? '+' : ''}{spendingChange}% dari bulan lalu
                        </span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="mt-3 flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => openEditDialog(method)}
                        aria-label={`Edit ${method.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteId(method.id)}
                        aria-label={`Hapus ${method.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {/* ── Add/Edit Dialog ─────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit Metode Pembayaran' : 'Tambah Metode Pembayaran'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="method-name" className="text-sm font-medium">
                Nama <span className="text-red-500">*</span>
              </Label>
              <Input
                id="method-name"
                placeholder="Contoh: BCA, GoPay, Dompet"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Tipe <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formType}
                onValueChange={(v) => setFormType(v as PaymentMethodType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih tipe" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TYPE_CONFIG) as PaymentMethodType[]).map((type) => {
                    const cfg = TYPE_CONFIG[type]
                    return (
                      <SelectItem key={type} value={type}>
                        <span className="flex items-center gap-2">
                          <span className={cfg.iconTextClass}>{cfg.icon}</span>
                          {cfg.label}
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Initial Balance */}
            <div className="space-y-2">
              <Label htmlFor="method-balance" className="text-sm font-medium">
                Saldo Awal
              </Label>
              <Input
                id="method-balance"
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={formBalance}
                onChange={(e) => setFormBalance(e.target.value)}
                min={0}
              />
              <p className="text-xs text-muted-foreground">
                Opsional. Isi jika ingin mencatat saldo awal metode ini.
              </p>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
              >
                Batal
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : editingId ? (
                  'Simpan Perubahan'
                ) : (
                  'Tambah'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ─────────────────────────────────────────── */}
      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Metode Pembayaran?</AlertDialogTitle>
            <AlertDialogDescription>
              Metode pembayaran ini akan dihapus secara permanen. Tindakan ini
              tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menghapus...
                </>
              ) : (
                'Hapus'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
