'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  CheckCircle2,
  Loader2,
  Banknote,
  Smartphone,
  Building2,
  Clock,
  Info,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, formatDateShort } from '@/lib/format'

type TransactionType = 'expense' | 'income' | 'transfer'

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

interface RecentTransaction {
  id: string
  amount: number
  note: string | null
  date: string
  category: { id: string; name: string; icon: string } | null
  paymentMethod: { id: string; name: string; type: string } | null
}

function getTodayString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const TYPE_CONFIG: Record<
  TransactionType,
  {
    label: string
    icon: React.ReactNode
    color: string
    activeTabClass: string
    buttonClass: string
    gradientBg: string
    ringColor: string
  }
> = {
  expense: {
    label: 'Pengeluaran',
    icon: <ArrowDownLeft className="size-4" />,
    color: 'text-red-600',
    activeTabClass:
      'data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-md',
    buttonClass: 'bg-red-600 hover:bg-red-700 text-white',
    gradientBg: 'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/20',
    ringColor: 'ring-red-500 dark:ring-red-400',
  },
  income: {
    label: 'Pemasukan',
    icon: <ArrowUpRight className="size-4" />,
    color: 'text-emerald-600',
    activeTabClass:
      'data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md',
    buttonClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    gradientBg: 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20',
    ringColor: 'ring-emerald-500 dark:ring-emerald-400',
  },
  transfer: {
    label: 'Transfer',
    icon: <ArrowLeftRight className="size-4" />,
    color: 'text-sky-600',
    activeTabClass:
      'data-[state=active]:bg-sky-600 data-[state=active]:text-white data-[state=active]:shadow-md',
    buttonClass: 'bg-sky-600 hover:bg-sky-700 text-white',
    gradientBg: 'bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-950/30 dark:to-blue-950/20',
    ringColor: 'ring-sky-500 dark:ring-sky-400',
  },
}

const QUICK_AMOUNTS: Record<TransactionType, number[]> = {
  expense: [10000, 25000, 50000, 100000, 250000, 500000],
  income: [500000, 1000000, 2000000, 5000000],
  transfer: [50000, 100000, 250000, 500000, 1000000],
}

const PM_TYPE_CONFIG: Record<string, { icon: React.ReactNode; iconBg: string; iconText: string }> = {
  cash: {
    icon: <Banknote className="size-4" />,
    iconBg: 'bg-green-100 dark:bg-green-900/30',
    iconText: 'text-green-600 dark:text-green-400',
  },
  ewallet: {
    icon: <Smartphone className="size-4" />,
    iconBg: 'bg-purple-100 dark:bg-purple-900/30',
    iconText: 'text-purple-600 dark:text-purple-400',
  },
  bank: {
    icon: <Building2 className="size-4" />,
    iconBg: 'bg-sky-100 dark:bg-sky-900/30',
    iconText: 'text-sky-600 dark:text-sky-400',
  },
}

function formatQuickAmount(n: number): string {
  if (n >= 1000000) return `${n / 1000000}jt`
  if (n >= 1000) return `${n / 1000}rb`
  return String(n)
}

// ── Success Overlay ──────────────────────────────────────────────────────
function SuccessOverlay({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="flex flex-col items-center gap-2"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
              <CheckCircle2 className="size-10 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              Tersimpan!
            </p>
          </motion.div>
          {/* Confetti-like particles */}
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute h-2 w-2 rounded-full"
              style={{
                backgroundColor: ['#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'][i],
              }}
              initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
              animate={{
                x: Math.cos((i * Math.PI) / 4) * 80,
                y: Math.sin((i * Math.PI) / 4) * 80,
                scale: 0,
                opacity: 0,
              }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Main Component ───────────────────────────────────────────────────────
export default function Transaksi() {
  const { toast } = useToast()
  const { transactionTemplate, setTransactionTemplate } = useAppStore()

  // Tab state
  const [activeType, setActiveType] = useState<TransactionType>('expense')

  // Form state
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [toPaymentMethodId, setToPaymentMethodId] = useState('')
  const [date, setDate] = useState(getTodayString)
  const [note, setNote] = useState('')

  // Data
  const [categories, setCategories] = useState<Category[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([])
  const [budgetInfo, setBudgetInfo] = useState<{ budgetAmount: number; spent: number; remaining: number } | null>(null)

  // Loading
  const [loadingData, setLoadingData] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Animation states
  const [showSuccess, setShowSuccess] = useState(false)
  const [shakeField, setShakeField] = useState<string | null>(null)
  const formRef = useRef<HTMLDivElement>(null)

  // Fetch categories based on type
  const fetchCategories = useCallback(async (type: TransactionType) => {
    try {
      if (type === 'transfer') {
        setCategories([])
        return
      }
      const data = await api.getCategories(type === 'expense' ? 'expense' : 'income')
      setCategories(data)
    } catch {
      setCategories([])
    }
  }, [])

  // Fetch payment methods
  const fetchPaymentMethods = useCallback(async () => {
    try {
      const data = await api.getPaymentMethods()
      setPaymentMethods(data)
    } catch {
      setPaymentMethods([])
    }
  }, [])

  // Fetch recent transactions
  const fetchRecentTransactions = useCallback(async (type: TransactionType) => {
    try {
      const res = await api.getTransactions({ type, limit: '3' })
      const txns = res.transactions || res
      setRecentTransactions(Array.isArray(txns) ? txns.slice(0, 3) : [])
    } catch {
      setRecentTransactions([])
    }
  }, [])

  // Initial data load
  useEffect(() => {
    async function loadData() {
      setLoadingData(true)
      await Promise.all([
        fetchCategories('expense'),
        fetchPaymentMethods(),
        fetchRecentTransactions('expense'),
      ])
      setLoadingData(false)
    }
    loadData()
  }, [fetchCategories, fetchPaymentMethods, fetchRecentTransactions])

  // Apply transaction template from duplicate action
  useEffect(() => {
    if (transactionTemplate) {
      const tType = transactionTemplate.type as TransactionType
      if (tType === 'expense' || tType === 'income' || tType === 'transfer') {
        setActiveType(tType)
      }
      if (transactionTemplate.amount > 0) {
        setAmount(String(transactionTemplate.amount))
      }
      if (transactionTemplate.categoryId) {
        setCategoryId(transactionTemplate.categoryId)
      }
      if (transactionTemplate.paymentMethodId) {
        setPaymentMethodId(transactionTemplate.paymentMethodId)
      }
      if (transactionTemplate.note) {
        setNote(transactionTemplate.note)
      }
      // Clear the template after applying it
      setTransactionTemplate(undefined)
    }
  }, [transactionTemplate, setTransactionTemplate])

  // Fetch budget info when category changes for expense type
  useEffect(() => {
    if (activeType === 'expense' && categoryId) {
      const currentMonth = (() => {
        const now = new Date()
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      })()
      api.getBudgets(currentMonth).then((budgets) => {
        const budget = budgets.find((b: { categoryId: string }) => b.categoryId === categoryId)
        if (budget) {
          setBudgetInfo({
            budgetAmount: budget.amount,
            spent: budget.spent ?? 0,
            remaining: budget.amount - (budget.spent ?? 0),
          })
        } else {
          setBudgetInfo(null)
        }
      }).catch(() => setBudgetInfo(null))
    } else {
      setBudgetInfo(null)
    }
  }, [activeType, categoryId])

  // Re-fetch categories & recent when type changes
  useEffect(() => {
    if (activeType !== 'transfer') {
      fetchCategories(activeType)
    } else {
      setCategories([])
    }
    setCategoryId('')
    fetchRecentTransactions(activeType)
  }, [activeType, fetchCategories, fetchRecentTransactions])

  // Reset form
  const resetForm = useCallback(() => {
    setAmount('')
    setCategoryId('')
    setPaymentMethodId('')
    setToPaymentMethodId('')
    setDate(getTodayString())
    setNote('')
  }, [])

  // Shake animation helper
  const triggerShake = useCallback((field: string) => {
    setShakeField(field)
    setTimeout(() => setShakeField(null), 600)
  }, [])

  // Quick amount handler — adds to current value
  const handleQuickAmount = useCallback((quickValue: number) => {
    setAmount((prev) => {
      const current = parseFloat(prev) || 0
      return String(current + quickValue)
    })
  }, [])

  // Validation
  const validate = (): string | null => {
    if (!amount || parseFloat(amount) <= 0) {
      triggerShake('amount')
      return 'Nominal harus diisi dan lebih dari 0'
    }
    if (activeType === 'expense' && !categoryId) {
      triggerShake('category')
      return 'Kategori wajib dipilih untuk pengeluaran'
    }
    if (activeType === 'income' && !categoryId) {
      triggerShake('category')
      return 'Kategori wajib dipilih untuk pemasukan'
    }
    if (activeType === 'transfer') {
      if (!paymentMethodId) {
        triggerShake('paymentFrom')
        return 'Pilih sumber transfer (Dari)'
      }
      if (!toPaymentMethodId) {
        triggerShake('paymentTo')
        return 'Pilih tujuan transfer (Ke)'
      }
      if (paymentMethodId === toPaymentMethodId) {
        return 'Sumber dan tujuan transfer tidak boleh sama'
      }
    }
    return null
  }

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const error = validate()
    if (error) {
      toast({
        title: 'Validasi Gagal',
        description: error,
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)

    try {
      const payload: Record<string, unknown> = {
        type: activeType,
        amount: parseFloat(amount),
        date,
        note: note || undefined,
        source: 'manual',
      }

      if (activeType === 'expense' || activeType === 'income') {
        payload.categoryId = categoryId || undefined
        payload.paymentMethodId = paymentMethodId || undefined
      }

      if (activeType === 'transfer') {
        payload.paymentMethodId = paymentMethodId
        payload.toPaymentMethodId = toPaymentMethodId
      }

      await api.createTransaction(payload)

      // Show success animation
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 1500)

      toast({
        title: 'Berhasil!',
        description: `Transaksi ${TYPE_CONFIG[activeType].label.toLowerCase()} berhasil ditambahkan`,
      })

      resetForm()

      // Refresh recent transactions
      fetchRecentTransactions(activeType)
    } catch {
      toast({
        title: 'Gagal',
        description: 'Terjadi kesalahan saat menyimpan transaksi',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Format display amount
  const displayAmount = amount
    ? formatCurrency(parseFloat(amount))
    : 'Rp0'

  const config = TYPE_CONFIG[activeType]

  return (
    <Card className="w-full relative overflow-hidden">
      <SuccessOverlay visible={showSuccess} />
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <span className={config.color}>{config.icon}</span>
          <span>Tambah Transaksi</span>
        </CardTitle>
      </CardHeader>
      <CardContent ref={formRef}>
        <Tabs
          value={activeType}
          onValueChange={(v) => setActiveType(v as TransactionType)}
        >
          <TabsList className="grid w-full grid-cols-3 h-auto p-1 gap-1">
            {(Object.keys(TYPE_CONFIG) as TransactionType[]).map((type) => {
              const cfg = TYPE_CONFIG[type]
              return (
                <TabsTrigger
                  key={type}
                  value={type}
                  className={`${cfg.activeTabClass} text-xs sm:text-sm py-2 transition-all duration-200`}
                >
                  <span className="flex items-center gap-1.5">
                    {cfg.icon}
                    <span className="hidden sm:inline">{cfg.label}</span>
                    <span className="sm:hidden">
                      {type === 'expense'
                        ? 'Keluar'
                        : type === 'income'
                          ? 'Masuk'
                          : 'Transfer'}
                    </span>
                  </span>
                </TabsTrigger>
              )
            })}
          </TabsList>

          {/* Shared Form — only the content changes per tab */}
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Amount Display — Enhanced with gradient */}
            <motion.div
              className={`rounded-xl p-4 text-center ${config.gradientBg} border border-border/50`}
              layout
              transition={{ duration: 0.2 }}
            >
              <p className="text-xs text-muted-foreground mb-1">
                Total Nominal
              </p>
              <p
                className={`text-3xl sm:text-4xl font-bold ${config.color} transition-colors duration-200`}
              >
                {displayAmount}
              </p>
            </motion.div>

            {/* Nominal Input */}
            <motion.div
              className="space-y-2"
              animate={shakeField === 'amount' ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center gap-1.5">
                <Label htmlFor="amount" className="text-sm font-medium">
                  Nominal <span className="text-red-500">*</span>
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="size-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Masukkan jumlah uang</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="amount"
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`h-14 text-2xl font-bold text-center border-2 focus:border-primary transition-colors ${shakeField === 'amount' ? 'border-red-500' : ''}`}
                min={0}
                required
              />
            </motion.div>

            {/* Quick Amount Buttons */}
            <div className="flex flex-wrap gap-1.5">
              {QUICK_AMOUNTS[activeType].map((qAmount) => (
                <motion.button
                  key={qAmount}
                  type="button"
                  onClick={() => handleQuickAmount(qAmount)}
                  className="h-7 rounded-full bg-muted hover:bg-muted/80 px-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors active:scale-95"
                  whileTap={{ scale: 0.9 }}
                >
                  +{formatQuickAmount(qAmount)}
                </motion.button>
              ))}
              {amount && parseFloat(amount) > 0 && (
                <motion.button
                  type="button"
                  onClick={() => setAmount('')}
                  className="h-7 rounded-full bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 px-3 text-xs font-medium text-red-600 dark:text-red-400 transition-colors active:scale-95"
                  whileTap={{ scale: 0.9 }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  Hapus
                </motion.button>
              )}
            </div>

            {/* Category — Visual Picker for expense & income */}
            {(activeType === 'expense' || activeType === 'income') && (
              <motion.div
                className="space-y-2"
                animate={shakeField === 'category' ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="flex items-center gap-1.5">
                  <Label className="text-sm font-medium">
                    Kategori{' '}
                    {activeType === 'expense' && (
                      <span className="text-red-500">*</span>
                    )}
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="size-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Pilih kategori transaksi</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                {loadingData ? (
                  <div className="flex gap-2 flex-wrap">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-16 w-16 rounded-lg bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    Belum ada kategori. Tambahkan kategori terlebih dahulu.
                  </p>
                ) : (
                  <ScrollArea className="w-full">
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pb-1">
                      {categories.map((cat) => {
                        const isSelected = categoryId === cat.id
                        return (
                          <motion.button
                            key={cat.id}
                            type="button"
                            onClick={() => setCategoryId(isSelected ? '' : cat.id)}
                            className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 px-3 py-2.5 transition-all min-w-[68px] ${
                              isSelected
                                ? `${config.ringColor} ring-2 border-transparent bg-background shadow-sm`
                                : 'border-transparent bg-muted/60 hover:bg-muted'
                            }`}
                            whileTap={{ scale: 0.93 }}
                          >
                            <span className="text-xl leading-none">{cat.icon}</span>
                            <span className="text-[10px] leading-tight text-muted-foreground font-medium truncate max-w-[60px]">
                              {cat.name}
                            </span>
                          </motion.button>
                        )
                      })}
                    </div>
                  </ScrollArea>
                )}
              </motion.div>
            )}

            {/* Transfer: From / To — Visual Payment Method Picker */}
            {activeType === 'transfer' && (
              <div className="space-y-3">
                <motion.div
                  className="space-y-2"
                  animate={shakeField === 'paymentFrom' ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Label className="text-sm font-medium">
                    Dari <span className="text-red-500">*</span>
                  </Label>
                  {loadingData ? (
                    <div className="flex gap-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-12 w-24 rounded-lg bg-muted animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {paymentMethods.map((pm) => {
                        const isSelected = paymentMethodId === pm.id
                        const pmCfg = PM_TYPE_CONFIG[pm.type] || PM_TYPE_CONFIG.cash
                        return (
                          <motion.button
                            key={pm.id}
                            type="button"
                            onClick={() => setPaymentMethodId(isSelected ? '' : pm.id)}
                            className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 transition-all shrink-0 ${
                              isSelected
                                ? 'ring-sky-500 dark:ring-sky-400 ring-2 border-transparent bg-background shadow-sm'
                                : 'border-transparent bg-muted/60 hover:bg-muted'
                            }`}
                            whileTap={{ scale: 0.93 }}
                          >
                            <span className={`flex h-7 w-7 items-center justify-center rounded-full ${pmCfg.iconBg}`}>
                              <span className={pmCfg.iconText}>{pmCfg.icon}</span>
                            </span>
                            <span className="text-xs font-medium whitespace-nowrap">{pm.name}</span>
                          </motion.button>
                        )
                      })}
                    </div>
                  )}
                </motion.div>

                <div className="flex justify-center">
                  <div className="rounded-full bg-muted p-1.5">
                    <ArrowLeftRight className="size-4 text-muted-foreground" />
                  </div>
                </div>

                <motion.div
                  className="space-y-2"
                  animate={shakeField === 'paymentTo' ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Label className="text-sm font-medium">
                    Ke <span className="text-red-500">*</span>
                  </Label>
                  {loadingData ? (
                    <div className="flex gap-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-12 w-24 rounded-lg bg-muted animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {paymentMethods.map((pm) => {
                        const isSelected = toPaymentMethodId === pm.id
                        const pmCfg = PM_TYPE_CONFIG[pm.type] || PM_TYPE_CONFIG.cash
                        return (
                          <motion.button
                            key={pm.id}
                            type="button"
                            onClick={() => setToPaymentMethodId(isSelected ? '' : pm.id)}
                            className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 transition-all shrink-0 ${
                              isSelected
                                ? 'ring-sky-500 dark:ring-sky-400 ring-2 border-transparent bg-background shadow-sm'
                                : 'border-transparent bg-muted/60 hover:bg-muted'
                            }`}
                            whileTap={{ scale: 0.93 }}
                          >
                            <span className={`flex h-7 w-7 items-center justify-center rounded-full ${pmCfg.iconBg}`}>
                              <span className={pmCfg.iconText}>{pmCfg.icon}</span>
                            </span>
                            <span className="text-xs font-medium whitespace-nowrap">{pm.name}</span>
                          </motion.button>
                        )
                      })}
                    </div>
                  )}
                </motion.div>
              </div>
            )}

            {/* Payment Method — Visual Picker for expense & income */}
            {(activeType === 'expense' || activeType === 'income') && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label className="text-sm font-medium">Metode Pembayaran</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="size-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Pilih metode pembayaran yang digunakan</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                {loadingData ? (
                  <div className="flex gap-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-12 w-24 rounded-lg bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : paymentMethods.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    Belum ada metode pembayaran.
                  </p>
                ) : (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {paymentMethods.map((pm) => {
                      const isSelected = paymentMethodId === pm.id
                      const pmCfg = PM_TYPE_CONFIG[pm.type] || PM_TYPE_CONFIG.cash
                      return (
                        <motion.button
                          key={pm.id}
                          type="button"
                          onClick={() => setPaymentMethodId(isSelected ? '' : pm.id)}
                          className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 transition-all shrink-0 ${
                            isSelected
                              ? `${config.ringColor} ring-2 border-transparent bg-background shadow-sm`
                              : 'border-transparent bg-muted/60 hover:bg-muted'
                          }`}
                          whileTap={{ scale: 0.93 }}
                        >
                          <span className={`flex h-7 w-7 items-center justify-center rounded-full ${pmCfg.iconBg}`}>
                            <span className={pmCfg.iconText}>{pmCfg.icon}</span>
                          </span>
                          <span className="text-xs font-medium whitespace-nowrap">{pm.name}</span>
                        </motion.button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Date */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="date" className="text-sm font-medium">
                  Tanggal
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="size-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Tanggal transaksi dilakukan</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Note */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="note" className="text-sm font-medium">
                  Catatan
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="size-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Tambahkan keterangan tambahan (opsional)</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Textarea
                id="note"
                placeholder="Tambahkan catatan (opsional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>

            {/* Submit */}
            <motion.div whileTap={{ scale: 0.98 }}>
              <Button
                type="submit"
                className={`w-full h-12 text-base font-semibold ${config.buttonClass}`}
                disabled={submitting || loadingData}
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4 mr-2" />
                    Simpan {config.label}
                  </>
                )}
              </Button>
            </motion.div>

            {/* Budget Context Widget */}
            {activeType === 'expense' && budgetInfo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`rounded-lg p-3 border ${
                  budgetInfo.remaining < 0
                    ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/50'
                    : budgetInfo.remaining < budgetInfo.budgetAmount * 0.2
                      ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50'
                      : 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Sisa Anggaran Kategori</span>
                  <span className={`text-xs font-bold ${
                    budgetInfo.remaining < 0
                      ? 'text-red-600 dark:text-red-400'
                      : budgetInfo.remaining < budgetInfo.budgetAmount * 0.2
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {formatCurrency(Math.max(budgetInfo.remaining, 0))}
                    {budgetInfo.remaining < 0 && <span className="ml-1">⚠️ Lebih!</span>}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      budgetInfo.remaining < 0
                        ? 'bg-red-500'
                        : budgetInfo.remaining < budgetInfo.budgetAmount * 0.2
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(Math.max((budgetInfo.spent / budgetInfo.budgetAmount) * 100, 0), 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground">Terpakai: {formatCurrency(budgetInfo.spent)}</span>
                  <span className="text-[10px] text-muted-foreground">Anggaran: {formatCurrency(budgetInfo.budgetAmount)}</span>
                </div>
              </motion.div>
            )}

            {/* Recent Transactions */}
            {!loadingData && recentTransactions.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-1.5">
                  <Clock className="size-3.5 text-muted-foreground" />
                  <Label className="text-xs font-medium text-muted-foreground">
                    Terakhir
                  </Label>
                </div>
                <div className="space-y-1.5">
                  {recentTransactions.map((tx) => (
                    <motion.button
                      key={tx.id}
                      type="button"
                      onClick={() => {
                        setAmount(String(tx.amount))
                        if (tx.category?.id) setCategoryId(tx.category.id)
                        if (tx.paymentMethod?.id) setPaymentMethodId(tx.paymentMethod.id)
                        if (tx.note) setNote(tx.note)
                      }}
                      className="flex w-full items-center gap-3 rounded-lg bg-muted/50 hover:bg-muted px-3 py-2 text-left transition-colors"
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="text-base leading-none">
                        {tx.category?.icon || (activeType === 'transfer' ? '🔄' : '💰')}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate text-foreground">
                          {tx.category?.name || activeType === 'transfer' ? 'Transfer' : 'Lainnya'}
                          {tx.note ? ` · ${tx.note}` : ''}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDateShort(tx.date)}
                        </p>
                      </div>
                      <span className={`text-xs font-semibold whitespace-nowrap ${config.color}`}>
                        {activeType === 'expense' ? '-' : '+'}{formatCurrency(tx.amount)}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
          </form>
        </Tabs>
      </CardContent>
    </Card>
  )
}
