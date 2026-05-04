'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/format'
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
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

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
      <Skeleton className="h-20 w-full rounded-xl" />
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

  // Fetch data
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

  // Fetch spending data from dashboard
  useEffect(() => {
    if (methods.length > 0) {
      api.getDashboard().then((dash) => {
        const spending: Record<string, number> = {}
        if (dash.paymentMethodBreakdown && Array.isArray(dash.paymentMethodBreakdown)) {
          dash.paymentMethodBreakdown.forEach((pm: { paymentMethodId: string; totalAmount: number }) => {
            spending[pm.paymentMethodId] = pm.totalAmount
          })
        }
        setMethodSpending(spending)
      }).catch(() => {})
    }
  }, [methods])

  // Summary counts by type
  const cashCount = methods.filter((m) => m.type === 'cash').length
  const ewalletCount = methods.filter((m) => m.type === 'ewallet').length
  const bankCount = methods.filter((m) => m.type === 'bank').length

  // Open dialog for adding
  const openAddDialog = () => {
    setEditingId(null)
    setFormName('')
    setFormType('cash')
    setFormBalance('')
    setDialogOpen(true)
  }

  // Open dialog for editing
  const openEditDialog = (method: PaymentMethod) => {
    setEditingId(method.id)
    setFormName(method.name)
    setFormType(method.type as PaymentMethodType)
    setFormBalance(
      method.initialBalance ? String(method.initialBalance) : ''
    )
    setDialogOpen(true)
  }

  // Submit handler (create or update)
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

  // Delete handler
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
        <Card className="border-border/50 bg-gradient-to-br from-muted/30 to-card overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Cash count */}
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/30">
                    <Banknote className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tunai</p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                      {cashCount}
                    </p>
                  </div>
                </div>

                <div className="h-8 w-px bg-border" />

                {/* E-Wallet count */}
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900/30">
                    <Smartphone className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">E-Wallet</p>
                    <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      {ewalletCount}
                    </p>
                  </div>
                </div>

                <div className="h-8 w-px bg-border" />

                {/* Bank count */}
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-sky-100 p-2 dark:bg-sky-900/30">
                    <Building2 className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Bank</p>
                    <p className="text-lg font-bold text-sky-600 dark:text-sky-400">
                      {bankCount}
                    </p>
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
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {methods.map((method) => {
            const config = TYPE_CONFIG[(method.type as PaymentMethodType) ?? 'cash']
            const monthlySpent = methodSpending[method.id]

            return (
              <Card
                key={method.id}
                className={`relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${config.cardBorderClass} ${config.cardBgClass}`}
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
                    <p className="text-sm font-semibold text-foreground">
                      {formatCurrency(method.initialBalance ?? 0)}
                    </p>
                  </div>

                  {/* Monthly spending indicator */}
                  {monthlySpent !== undefined && monthlySpent > 0 && (
                    <div className="mt-2 flex items-center gap-1">
                      <TrendingDown className="h-3 w-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">
                        Bulan ini: <span className="font-medium text-foreground">{formatCurrency(monthlySpent)}</span>
                      </p>
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
            )
          })}
        </div>
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
