'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/format'

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
  }
> = {
  expense: {
    label: 'Pengeluaran',
    icon: <ArrowDownLeft className="size-4" />,
    color: 'text-red-600',
    activeTabClass:
      'data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-md',
    buttonClass: 'bg-red-600 hover:bg-red-700 text-white',
  },
  income: {
    label: 'Pemasukan',
    icon: <ArrowUpRight className="size-4" />,
    color: 'text-emerald-600',
    activeTabClass:
      'data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md',
    buttonClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  },
  transfer: {
    label: 'Transfer',
    icon: <ArrowLeftRight className="size-4" />,
    color: 'text-sky-600',
    activeTabClass:
      'data-[state=active]:bg-sky-600 data-[state=active]:text-white data-[state=active]:shadow-md',
    buttonClass: 'bg-sky-600 hover:bg-sky-700 text-white',
  },
}

export default function Transaksi() {
  const { toast } = useToast()

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

  // Loading
  const [loadingData, setLoadingData] = useState(true)
  const [submitting, setSubmitting] = useState(false)

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

  // Initial data load
  useEffect(() => {
    async function loadData() {
      setLoadingData(true)
      await Promise.all([fetchCategories('expense'), fetchPaymentMethods()])
      setLoadingData(false)
    }
    loadData()
  }, [fetchCategories, fetchPaymentMethods])

  // Re-fetch categories when type changes
  useEffect(() => {
    if (activeType !== 'transfer') {
      fetchCategories(activeType)
    } else {
      setCategories([])
    }
    setCategoryId('')
  }, [activeType, fetchCategories])

  // Reset form
  const resetForm = useCallback(() => {
    setAmount('')
    setCategoryId('')
    setPaymentMethodId('')
    setToPaymentMethodId('')
    setDate(getTodayString())
    setNote('')
  }, [])

  // Validation
  const validate = (): string | null => {
    if (!amount || parseFloat(amount) <= 0) {
      return 'Nominal harus diisi dan lebih dari 0'
    }
    if (activeType === 'expense' && !categoryId) {
      return 'Kategori wajib dipilih untuk pengeluaran'
    }
    if (activeType === 'transfer') {
      if (!paymentMethodId) return 'Pilih sumber transfer (Dari)'
      if (!toPaymentMethodId) return 'Pilih tujuan transfer (Ke)'
      if (paymentMethodId === toPaymentMethodId)
        return 'Sumber dan tujuan transfer tidak boleh sama'
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

      toast({
        title: 'Berhasil!',
        description: `Transaksi ${TYPE_CONFIG[activeType].label.toLowerCase()} berhasil ditambahkan`,
      })

      resetForm()
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
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <span className={config.color}>{config.icon}</span>
          <span>Tambah Transaksi</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
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
            {/* Amount Display */}
            <div className="rounded-lg bg-muted/50 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">
                Total Nominal
              </p>
              <p
                className={`text-2xl sm:text-3xl font-bold ${config.color} transition-colors duration-200`}
              >
                {displayAmount}
              </p>
            </div>

            {/* Nominal Input */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm font-medium">
                Nominal <span className="text-red-500">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-14 text-2xl font-bold text-center border-2 focus:border-primary"
                min={0}
                required
              />
            </div>

            {/* Category — only for expense & income */}
            {(activeType === 'expense' || activeType === 'income') && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Kategori{' '}
                  {activeType === 'expense' && (
                    <span className="text-red-500">*</span>
                  )}
                </Label>
                {loadingData ? (
                  <div className="h-9 rounded-md bg-muted animate-pulse" />
                ) : categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    Belum ada kategori. Tambahkan kategori terlebih dahulu.
                  </p>
                ) : (
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <span className="flex items-center gap-2">
                            <span>{cat.icon}</span>
                            <span>{cat.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Transfer: From / To */}
            {activeType === 'transfer' && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Dari <span className="text-red-500">*</span>
                  </Label>
                  {loadingData ? (
                    <div className="h-9 rounded-md bg-muted animate-pulse" />
                  ) : (
                    <Select
                      value={paymentMethodId}
                      onValueChange={setPaymentMethodId}
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
                  )}
                </div>

                <div className="flex justify-center">
                  <div className="rounded-full bg-muted p-1.5">
                    <ArrowLeftRight className="size-4 text-muted-foreground" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Ke <span className="text-red-500">*</span>
                  </Label>
                  {loadingData ? (
                    <div className="h-9 rounded-md bg-muted animate-pulse" />
                  ) : (
                    <Select
                      value={toPaymentMethodId}
                      onValueChange={setToPaymentMethodId}
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
                  )}
                </div>
              </div>
            )}

            {/* Payment Method — for expense & income */}
            {(activeType === 'expense' || activeType === 'income') && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Metode Pembayaran</Label>
                {loadingData ? (
                  <div className="h-9 rounded-md bg-muted animate-pulse" />
                ) : paymentMethods.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    Belum ada metode pembayaran.
                  </p>
                ) : (
                  <Select
                    value={paymentMethodId}
                    onValueChange={setPaymentMethodId}
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
                )}
              </div>
            )}

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date" className="text-sm font-medium">
                Tanggal
              </Label>
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
              <Label htmlFor="note" className="text-sm font-medium">
                Catatan
              </Label>
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
          </form>
        </Tabs>
      </CardContent>
    </Card>
  )
}
