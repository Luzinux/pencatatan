'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { api } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/format'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  CreditCard,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  AlertTriangle,
  Clock,
  RefreshCw,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// ── Types ──────────────────────────────────────────────────────────────────

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

interface Bill {
  id: string
  name: string
  amount: number
  dueDate: string
  recurring: string
  status: string
  note: string | null
  categoryId: string | null
  paymentMethodId: string | null
  category: Category | null
  paymentMethod: PaymentMethod | null
}

interface FormData {
  name: string
  amount: string
  dueDate: string
  recurring: string
  categoryId: string
  paymentMethodId: string
  note: string
}

const RECURRING_OPTIONS = [
  { value: 'none', label: 'Tidak Berulang' },
  { value: 'weekly', label: 'Mingguan' },
  { value: 'monthly', label: 'Bulanan' },
  { value: 'yearly', label: 'Tahunan' },
] as const

const RECURRING_LABELS: Record<string, string> = {
  none: 'Tidak Berulang',
  weekly: 'Mingguan',
  monthly: 'Bulanan',
  yearly: 'Tahunan',
}

const RECURRING_ICONS: Record<string, string> = {
  none: '',
  weekly: '🔄',
  monthly: '🔄',
  yearly: '🔄',
}

const INITIAL_FORM: FormData = {
  name: '',
  amount: '',
  dueDate: '',
  recurring: 'monthly',
  categoryId: '',
  paymentMethodId: '',
  note: '',
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getDaysUntilDue(dueDate: string): number {
  const due = new Date(dueDate)
  const now = new Date()
  // Normalize to start of day for accurate comparison
  due.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function getDueDateStyle(daysUntil: number): {
  borderClass: string
  bgClass: string
  textClass: string
  label: string | null
  icon: typeof AlertTriangle | null
} {
  if (daysUntil < 0) {
    return {
      borderClass: 'border-red-400 dark:border-red-700',
      bgClass: 'bg-red-50/60 dark:bg-red-950/30',
      textClass: 'text-red-600 dark:text-red-400',
      label: 'Terlambat!',
      icon: AlertTriangle,
    }
  }
  if (daysUntil <= 3) {
    return {
      borderClass: 'border-red-300 dark:border-red-800',
      bgClass: 'bg-red-50/40 dark:bg-red-950/20',
      textClass: 'text-red-600 dark:text-red-400',
      label: 'Segera jatuh tempo!',
      icon: AlertTriangle,
    }
  }
  if (daysUntil <= 7) {
    return {
      borderClass: 'border-orange-300 dark:border-orange-800',
      bgClass: 'bg-orange-50/40 dark:bg-orange-950/20',
      textClass: 'text-orange-600 dark:text-orange-400',
      label: null,
      icon: Clock,
    }
  }
  return {
    borderClass: '',
    bgClass: '',
    textClass: '',
    label: null,
    icon: null,
  }
}

function getDaysLabel(daysUntil: number): string {
  if (daysUntil < 0) return `${Math.abs(daysUntil)} hari terlambat`
  if (daysUntil === 0) return 'Hari ini'
  if (daysUntil === 1) return 'Besok'
  return `${daysUntil} hari lagi`
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function BillSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </CardContent>
    </Card>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <BillSkeleton key={i} />
      ))}
    </div>
  )
}

// ── Empty State ────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="mb-4 rounded-full bg-muted p-4">
        <CreditCard className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-foreground">
        Belum ada tagihan
      </h3>
      <p className="mb-4 max-w-xs text-sm text-muted-foreground">
        Tambahkan tagihan rutin Anda!
      </p>
      <Button onClick={onAdd} size="sm" className="gap-1.5">
        <Plus className="h-4 w-4" />
        Tambah Tagihan
      </Button>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function Tagihan() {
  const { toast } = useToast()

  // Data state
  const [bills, setBills] = useState<Bill[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)

  // Filter state
  const [activeTab, setActiveTab] = useState('all')

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBill, setEditingBill] = useState<Bill | null>(null)
  const [form, setForm] = useState<FormData>(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)

  // Pay confirmation state
  const [payTarget, setPayTarget] = useState<Bill | null>(null)
  const [paying, setPaying] = useState(false)

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Bill | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ── Data Fetching ──────────────────────────────────────────────────────

  const fetchBills = useCallback(async () => {
    try {
      const data = await api.getBills()
      setBills(Array.isArray(data) ? data : [])
    } catch {
      toast({
        title: 'Gagal memuat tagihan',
        description: 'Terjadi kesalahan saat memuat data tagihan',
        variant: 'destructive',
      })
      setBills([])
    } finally {
      setLoading(false)
    }
  }, [toast])

  const fetchSupportData = useCallback(async () => {
    try {
      const [cats, methods] = await Promise.all([
        api.getCategories('expense'),
        api.getPaymentMethods(),
      ])
      setCategories(Array.isArray(cats) ? cats : [])
      setPaymentMethods(Array.isArray(methods) ? methods : [])
    } catch {
      // Silently fail — categories and payment methods are optional in the form
    }
  }, [])

  useEffect(() => {
    Promise.all([fetchBills(), fetchSupportData()])
  }, [fetchBills, fetchSupportData])

  // ── Filtered Bills ─────────────────────────────────────────────────────

  const filteredBills = useMemo(() => {
    if (activeTab === 'pending') return bills.filter((b) => b.status === 'pending')
    if (activeTab === 'paid') return bills.filter((b) => b.status === 'paid')
    return bills
  }, [bills, activeTab])

  // ── Counts ─────────────────────────────────────────────────────────────

  const counts = useMemo(
    () => ({
      all: bills.length,
      pending: bills.filter((b) => b.status === 'pending').length,
      paid: bills.filter((b) => b.status === 'paid').length,
    }),
    [bills]
  )

  // ── Dialog Handlers ────────────────────────────────────────────────────

  const openAddDialog = () => {
    setEditingBill(null)
    setForm(INITIAL_FORM)
    setDialogOpen(true)
  }

  const openEditDialog = (bill: Bill) => {
    setEditingBill(bill)
    setForm({
      name: bill.name,
      amount: String(bill.amount),
      dueDate: new Date(bill.dueDate).toISOString().split('T')[0],
      recurring: bill.recurring || 'monthly',
      categoryId: bill.categoryId || '',
      paymentMethodId: bill.paymentMethodId || '',
      note: bill.note || '',
    })
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingBill(null)
    setForm(INITIAL_FORM)
  }

  const handleFormChange = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.amount || Number(form.amount) <= 0 || !form.dueDate) {
      toast({
        title: 'Data tidak lengkap',
        description: 'Nama, nominal, dan tanggal jatuh tempo wajib diisi',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        amount: Number(form.amount),
        dueDate: new Date(form.dueDate).toISOString(),
        recurring: form.recurring,
        note: form.note.trim() || null,
        categoryId: form.categoryId || null,
        paymentMethodId: form.paymentMethodId || null,
      }

      if (editingBill) {
        await api.updateBill(editingBill.id, payload)
        toast({
          title: 'Tagihan diperbarui',
          description: `"${form.name.trim()}" berhasil diperbarui`,
        })
      } else {
        await api.createBill(payload)
        toast({
          title: 'Tagihan ditambahkan',
          description: `"${form.name.trim()}" berhasil ditambahkan`,
        })
      }

      closeDialog()
      await fetchBills()
    } catch {
      toast({
        title: 'Gagal menyimpan',
        description: 'Terjadi kesalahan saat menyimpan tagihan',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // ── Pay Handler ────────────────────────────────────────────────────────

  const handlePay = async () => {
    if (!payTarget) return
    const isRecurring = payTarget.recurring && payTarget.recurring !== 'none'
    setPaying(true)
    try {
      const result = await api.payBill(payTarget.id)
      if (result.autoGenerated) {
        toast({
          title: 'Tagihan lunas!',
          description: 'Tagihan berikutnya telah dibuat otomatis.',
        })
      } else {
        toast({
          title: 'Tagihan lunas!',
          description: 'Transaksi pengeluaran telah dibuat.',
        })
      }
      setPayTarget(null)
      await fetchBills()
    } catch {
      toast({
        title: 'Gagal membayar',
        description: 'Terjadi kesalahan saat membayar tagihan',
        variant: 'destructive',
      })
    } finally {
      setPaying(false)
    }
  }

  // ── Delete Handler ─────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.deleteBill(deleteTarget.id)
      toast({
        title: 'Tagihan dihapus',
        description: `"${deleteTarget.name}" berhasil dihapus`,
      })
      setDeleteTarget(null)
      await fetchBills()
    } catch {
      toast({
        title: 'Gagal menghapus',
        description: 'Terjadi kesalahan saat menghapus tagihan',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Tagihan</h2>
        </div>
        <Button onClick={openAddDialog} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Tambah Tagihan
        </Button>
      </div>

      {/* ── Filter Tabs ────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="all" className="flex-1">
            Semua
            {counts.all > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-5 min-w-[20px] px-1.5 text-[10px]">
                {counts.all}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex-1">
            Belum Dibayar
            {counts.pending > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-5 min-w-[20px] px-1.5 text-[10px]">
                {counts.pending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="paid" className="flex-1">
            Lunas
            {counts.paid > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-5 min-w-[20px] px-1.5 text-[10px]">
                {counts.paid}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Bill list is rendered below tabs regardless of tab content */}
      </Tabs>

      {/* ── Bill List ──────────────────────────────────────────────────── */}
      {loading ? (
        <LoadingSkeleton />
      ) : filteredBills.length === 0 ? (
        <Card>
          <CardContent className="p-4">
            <EmptyState onAdd={openAddDialog} />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 max-h-[68vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
          {filteredBills.map((bill) => {
            const daysUntil = getDaysUntilDue(bill.dueDate)
            const dueStyle = getDueDateStyle(daysUntil)
            const isPending = bill.status === 'pending'
            const DueIcon = dueStyle.icon

            return (
              <Card
                key={bill.id}
                className={`transition-colors ${dueStyle.borderClass} ${dueStyle.bgClass} ${
                  isPending ? '' : 'opacity-70'
                }`}
              >
                <CardContent className="p-4 space-y-3">
                  {/* Top row: Name + Amount */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <h3 className="text-base font-semibold text-foreground truncate">
                        {bill.name}
                      </h3>
                      {/* Due date with icon */}
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span>{formatDate(bill.dueDate)}</span>
                        <span className="text-xs">•</span>
                        <span className={`text-xs font-medium ${dueStyle.textClass}`}>
                          {getDaysLabel(daysUntil)}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-base font-bold text-foreground">
                        {formatCurrency(bill.amount)}
                      </p>
                    </div>
                  </div>

                  {/* Due date warning */}
                  {dueStyle.label && DueIcon && isPending && (
                    <div className={`flex items-center gap-1.5 text-xs font-medium ${dueStyle.textClass}`}>
                      <DueIcon className="h-3.5 w-3.5" />
                      <span>{dueStyle.label}</span>
                    </div>
                  )}

                  {/* Badges row */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Status badge */}
                    {isPending ? (
                      <Badge
                        variant="outline"
                        className="border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-700 dark:bg-orange-950/30 dark:text-orange-400"
                      >
                        <Clock className="mr-1 h-3 w-3" />
                        Belum Dibayar
                      </Badge>
                    ) : (
                      <Badge className="border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950/30 dark:text-green-400">
                        Lunas
                      </Badge>
                    )}

                    {/* Recurring badge */}
                    {bill.recurring && bill.recurring !== 'none' && (
                      <Badge variant="secondary" className="gap-1">
                        <RefreshCw className="h-3 w-3" />
                        {RECURRING_LABELS[bill.recurring] || bill.recurring}
                      </Badge>
                    )}

                    {/* Category badge */}
                    {bill.category && (
                      <Badge variant="secondary" className="gap-1">
                        <span>{bill.category.icon}</span>
                        {bill.category.name}
                      </Badge>
                    )}

                    {/* Payment method badge */}
                    {bill.paymentMethod && (
                      <Badge variant="outline" className="gap-1">
                        {bill.paymentMethod.name}
                      </Badge>
                    )}
                  </div>

                  {/* Note */}
                  {bill.note && (
                    <p className="text-xs text-muted-foreground italic truncate">
                      {bill.note}
                    </p>
                  )}
                </CardContent>

                {/* Actions */}
                <CardFooter className="border-t px-4 py-3">
                  <div className="flex w-full items-center gap-2">
                    {isPending && (
                      <Button
                        size="sm"
                        className="gap-1.5 font-semibold"
                        onClick={() => setPayTarget(bill)}
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        Bayar
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => openEditDialog(bill)}
                      aria-label="Edit tagihan"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-red-600"
                      onClick={() => setDeleteTarget(bill)}
                      aria-label="Hapus tagihan"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── Add/Edit Dialog ────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingBill ? 'Edit Tagihan' : 'Tambah Tagihan'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Nama */}
            <div className="space-y-2">
              <Label htmlFor="bill-name">Nama</Label>
              <Input
                id="bill-name"
                placeholder="contoh: Listrik, Internet, Cicilan..."
                value={form.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
              />
            </div>

            {/* Nominal */}
            <div className="space-y-2">
              <Label htmlFor="bill-amount">Nominal</Label>
              <Input
                id="bill-amount"
                type="number"
                placeholder="0"
                min="0"
                value={form.amount}
                onChange={(e) => handleFormChange('amount', e.target.value)}
              />
              {form.amount && Number(form.amount) > 0 && (
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(Number(form.amount))}
                </p>
              )}
            </div>

            {/* Tanggal Jatuh Tempo */}
            <div className="space-y-2">
              <Label htmlFor="bill-due-date">Tanggal Jatuh Tempo</Label>
              <Input
                id="bill-due-date"
                type="date"
                value={form.dueDate}
                onChange={(e) => handleFormChange('dueDate', e.target.value)}
              />
            </div>

            {/* Berulang */}
            <div className="space-y-2">
              <Label>Berulang</Label>
              <Select
                value={form.recurring}
                onValueChange={(v) => handleFormChange('recurring', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih pengulangan" />
                </SelectTrigger>
                <SelectContent>
                  {RECURRING_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {RECURRING_ICONS[opt.value] && `${RECURRING_ICONS[opt.value]} `}
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Kategori */}
            <div className="space-y-2">
              <Label>Kategori (opsional)</Label>
              <Select
                value={form.categoryId}
                onValueChange={(v) => handleFormChange('categoryId', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Metode Pembayaran */}
            <div className="space-y-2">
              <Label>Metode Pembayaran (opsional)</Label>
              <Select
                value={form.paymentMethodId}
                onValueChange={(v) => handleFormChange('paymentMethodId', v)}
              >
                <SelectTrigger>
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

            {/* Catatan */}
            <div className="space-y-2">
              <Label htmlFor="bill-note">Catatan (opsional)</Label>
              <Textarea
                id="bill-note"
                placeholder="Catatan tambahan..."
                rows={2}
                value={form.note}
                onChange={(e) => handleFormChange('note', e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={submitting}>
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Menyimpan...' : editingBill ? 'Simpan Perubahan' : 'Tambah'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Pay Confirmation AlertDialog ────────────────────────────────── */}
      <AlertDialog
        open={!!payTarget}
        onOpenChange={(open) => !open && setPayTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bayar tagihan ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Akan membuat transaksi pengeluaran sebesar{' '}
              <span className="font-semibold text-foreground">
                {payTarget ? formatCurrency(payTarget.amount) : ''}
              </span>{' '}
              untuk tagihan &quot;{payTarget?.name}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={paying}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handlePay} disabled={paying}>
              {paying ? 'Memproses...' : 'Bayar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete Confirmation AlertDialog ─────────────────────────────── */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus tagihan?</AlertDialogTitle>
            <AlertDialogDescription>
              Tagihan &quot;{deleteTarget?.name}&quot; sebesar{' '}
              <span className="font-semibold text-foreground">
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
    </div>
  )
}
