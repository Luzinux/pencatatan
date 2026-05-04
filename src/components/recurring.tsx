'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/format'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { motion, AnimatePresence } from 'framer-motion'
import {
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  Play,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  Calendar,
  Clock,
  Zap,
  Repeat,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────
interface RecurringItem {
  id: string
  name: string
  type: string
  amount: number
  categoryId: string | null
  paymentMethodId: string | null
  toPaymentMethodId: string | null
  note: string | null
  frequency: string
  dayOfWeek: number | null
  dayOfMonth: number | null
  startDate: string
  nextDate: string
  endDate: string | null
  active: boolean
  lastGeneratedDate: string | null
  createdAt: string
  updatedAt: string
  category: { id: string; name: string; icon: string; type: string } | null
  paymentMethod: { id: string; name: string; type: string } | null
  toPaymentMethod: { id: string; name: string; type: string } | null
}

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

// ── Constants ──────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; darkBg: string; icon: React.ElementType }> = {
  expense: { label: 'Pengeluaran', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100', darkBg: 'dark:bg-red-900/40', icon: ArrowDownLeft },
  income: { label: 'Pemasukan', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100', darkBg: 'dark:bg-emerald-900/40', icon: ArrowUpRight },
  transfer: { label: 'Transfer', color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-100', darkBg: 'dark:bg-sky-900/40', icon: ArrowRight },
}

const FREQUENCY_CONFIG: Record<string, { label: string; color: string; bg: string; darkBg: string }> = {
  daily: { label: 'Harian', color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-100', darkBg: 'dark:bg-violet-900/40' },
  weekly: { label: 'Mingguan', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100', darkBg: 'dark:bg-amber-900/40' },
  monthly: { label: 'Bulanan', color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-100', darkBg: 'dark:bg-sky-900/40' },
  yearly: { label: 'Tahunan', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-100', darkBg: 'dark:bg-rose-900/40' },
}

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

// ── Countdown helper ───────────────────────────────────────────────────────
function getCountdown(nextDate: string): string {
  const next = new Date(nextDate)
  const now = new Date()
  const diffMs = next.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return 'Hari ini'
  if (diffDays === 1) return 'Besok'
  if (diffDays < 7) return `${diffDays} hari lagi`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} minggu lagi`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} bulan lagi`
  return `${Math.floor(diffDays / 365)} tahun lagi`
}

// ── Form State ─────────────────────────────────────────────────────────────
interface FormData {
  name: string
  type: string
  amount: string
  categoryId: string
  paymentMethodId: string
  toPaymentMethodId: string
  note: string
  frequency: string
  dayOfWeek: string
  dayOfMonth: string
  startDate: string
  endDate: string
}

const emptyForm: FormData = {
  name: '',
  type: 'expense',
  amount: '',
  categoryId: '',
  paymentMethodId: '',
  toPaymentMethodId: '',
  note: '',
  frequency: 'monthly',
  dayOfWeek: '',
  dayOfMonth: '',
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function RecurringTransactions() {
  const [items, setItems] = useState<RecurringItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [generating, setGenerating] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    try {
      const [recurringData, catData, pmData] = await Promise.all([
        api.getRecurring(),
        api.getCategories(),
        api.getPaymentMethods(),
      ])
      setItems(recurringData)
      setCategories(catData)
      setPaymentMethods(pmData)
    } catch (err: any) {
      toast({ title: 'Gagal memuat data', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filteredCategories = categories.filter(c => {
    if (form.type === 'expense') return c.type === 'expense' || c.type === 'both'
    if (form.type === 'income') return c.type === 'income' || c.type === 'both'
    return true
  })

  function openAddDialog() {
    setEditingId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEditDialog(item: RecurringItem) {
    setEditingId(item.id)
    setForm({
      name: item.name,
      type: item.type,
      amount: String(item.amount),
      categoryId: item.categoryId ?? '',
      paymentMethodId: item.paymentMethodId ?? '',
      toPaymentMethodId: item.toPaymentMethodId ?? '',
      note: item.note ?? '',
      frequency: item.frequency,
      dayOfWeek: item.dayOfWeek != null ? String(item.dayOfWeek) : '',
      dayOfMonth: item.dayOfMonth != null ? String(item.dayOfMonth) : '',
      startDate: new Date(item.startDate).toISOString().split('T')[0],
      endDate: item.endDate ? new Date(item.endDate).toISOString().split('T')[0] : '',
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.amount || !form.frequency || !form.startDate) {
      toast({ title: 'Lengkapi data', description: 'Nama, jumlah, frekuensi, dan tanggal mulai wajib diisi', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        amount: form.amount,
        categoryId: form.categoryId || null,
        paymentMethodId: form.paymentMethodId || null,
        toPaymentMethodId: form.type === 'transfer' ? form.toPaymentMethodId || null : null,
        note: form.note.trim() || null,
        frequency: form.frequency,
        dayOfWeek: form.frequency === 'weekly' && form.dayOfWeek ? parseInt(form.dayOfWeek) : null,
        dayOfMonth: (form.frequency === 'monthly' || form.frequency === 'yearly') && form.dayOfMonth ? parseInt(form.dayOfMonth) : null,
        startDate: form.startDate,
        endDate: form.endDate || null,
      }

      if (editingId) {
        await api.updateRecurring(editingId, payload)
        toast({ title: 'Berhasil', description: 'Transaksi berulang diperbarui' })
      } else {
        await api.createRecurring(payload)
        toast({ title: 'Berhasil', description: 'Transaksi berulang ditambahkan' })
      }

      setDialogOpen(false)
      fetchData()
    } catch (err: any) {
      toast({ title: 'Gagal menyimpan', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.deleteRecurring(id)
      toast({ title: 'Berhasil', description: 'Transaksi berulang dihapus' })
      setDeleteId(null)
      fetchData()
    } catch (err: any) {
      toast({ title: 'Gagal menghapus', description: err.message, variant: 'destructive' })
    }
  }

  async function handleToggleActive(item: RecurringItem) {
    try {
      await api.updateRecurring(item.id, { active: !item.active })
      toast({ title: item.active ? 'Dinonaktifkan' : 'Diaktifkan', description: `Transaksi berulang ${item.active ? 'dinonaktifkan' : 'diaktifkan'}` })
      fetchData()
    } catch (err: any) {
      toast({ title: 'Gagal', description: err.message, variant: 'destructive' })
    }
  }

  async function handleGenerate(item: RecurringItem) {
    setGenerating(item.id)
    try {
      const result = await api.generateRecurring(item.id)
      toast({
        title: 'Transaksi dibuat!',
        description: `${item.name}: ${formatCurrency(item.amount)}${result.deactivated ? ' (Template dinonaktifkan - sudah melewati tanggal akhir)' : ''}`,
      })
      fetchData()
    } catch (err: any) {
      toast({ title: 'Gagal membuat transaksi', description: err.message, variant: 'destructive' })
    } finally {
      setGenerating(null)
    }
  }

  // ── Loading Skeleton ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-7 w-48 animate-pulse rounded bg-muted" />
          <div className="h-9 w-28 animate-pulse rounded-md bg-muted" />
        </div>
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded bg-muted" />
                  <div className="h-3 w-24 rounded bg-muted" />
                </div>
                <div className="h-5 w-20 rounded-full bg-muted" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const activeCount = items.filter(i => i.active).length
  const inactiveCount = items.filter(i => !i.active).length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Transaksi Berulang
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {activeCount} aktif · {inactiveCount} nonaktif
          </p>
        </div>
        <Button onClick={openAddDialog} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Tambah
        </Button>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="mb-4 rounded-full bg-muted p-6">
            <RefreshCw className="h-10 w-10 text-muted-foreground/50" />
          </div>
          <h3 className="text-sm font-medium text-muted-foreground">Belum ada transaksi berulang</h3>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Tambahkan transaksi berulang seperti gaji, sewa, atau langganan
          </p>
          <Button onClick={openAddDialog} variant="outline" size="sm" className="mt-4 gap-1.5">
            <Plus className="h-4 w-4" />
            Tambah Transaksi Berulang
          </Button>
        </motion.div>
      ) : (
        <ScrollArea className="max-h-[calc(100vh-280px)]">
          <div className="space-y-3 pr-2">
            <AnimatePresence mode="popLayout">
              {items.map((item, index) => {
                const typeConf = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.expense
                const freqConf = FREQUENCY_CONFIG[item.frequency] ?? FREQUENCY_CONFIG.monthly
                const TypeIcon = typeConf.icon

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                    layout
                  >
                    <Card className={`transition-all hover:shadow-md ${!item.active ? 'opacity-60' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Icon */}
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${typeConf.bg} ${typeConf.darkBg}`}>
                            <TypeIcon className={`h-5 w-5 ${typeConf.color}`} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm truncate">{item.name}</span>
                              <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${typeConf.bg} ${typeConf.darkBg} ${typeConf.color} border-0`}>
                                {typeConf.label}
                              </Badge>
                              <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${freqConf.bg} ${freqConf.darkBg} ${freqConf.color} border-0`}>
                                {freqConf.label}
                              </Badge>
                            </div>

                            {/* Amount */}
                            <p className={`text-sm font-semibold mt-1 ${typeConf.color}`}>
                              {item.type === 'income' ? '+' : item.type === 'expense' ? '-' : ''}{formatCurrency(item.amount)}
                            </p>

                            {/* Details */}
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                              {item.category && (
                                <span className="flex items-center gap-1">
                                  <span>{item.category.icon}</span>
                                  {item.category.name}
                                </span>
                              )}
                              {item.paymentMethod && (
                                <span>{item.paymentMethod.name}</span>
                              )}
                              {item.type === 'transfer' && item.toPaymentMethod && (
                                <span className="flex items-center gap-1">
                                  <ArrowRight className="h-3 w-3" />
                                  {item.toPaymentMethod.name}
                                </span>
                              )}
                            </div>

                            {/* Next occurrence */}
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex items-center gap-1 text-xs">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                <span className="text-muted-foreground">
                                  {item.active ? `Selanjutnya: ${formatDate(item.nextDate)}` : 'Dinonaktifkan'}
                                </span>
                              </div>
                              {item.active && (
                                <div className="flex items-center gap-1 text-xs">
                                  <Clock className="h-3 w-3 text-emerald-500" />
                                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                    {getCountdown(item.nextDate)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <Switch
                              checked={item.active}
                              onCheckedChange={() => handleToggleActive(item)}
                              aria-label={item.active ? 'Nonaktifkan' : 'Aktifkan'}
                            />
                            <div className="flex items-center gap-1">
                              {item.active && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleGenerate(item)}
                                  disabled={generating === item.id}
                                  title="Buat transaksi sekarang"
                                >
                                  <Play className={`h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 ${generating === item.id ? 'animate-spin' : ''}`} />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => openEditDialog(item)}
                                title="Edit"
                              >
                                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setDeleteId(item.id)}
                                title="Hapus"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </ScrollArea>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Repeat className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              {editingId ? 'Edit Transaksi Berulang' : 'Tambah Transaksi Berulang'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="rec-name">Nama</Label>
              <Input
                id="rec-name"
                placeholder="Contoh: Gaji Bulanan, Sewa Kos"
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>

            {/* Type Toggle */}
            <div className="space-y-1.5">
              <Label>Tipe</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['expense', 'income', 'transfer'] as const).map(t => {
                  const conf = TYPE_CONFIG[t]
                  const Icon = conf.icon
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, type: t, categoryId: '', paymentMethodId: '', toPaymentMethodId: '' }))}
                      className={`flex flex-col items-center gap-1 rounded-lg border-2 p-2.5 transition-all ${
                        form.type === t
                          ? `border-current ${conf.color} ${conf.bg} ${conf.darkBg}`
                          : 'border-border hover:border-muted-foreground/30'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${form.type === t ? conf.color : 'text-muted-foreground'}`} />
                      <span className={`text-[11px] font-medium ${form.type === t ? conf.color : 'text-muted-foreground'}`}>
                        {conf.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="rec-amount">Jumlah (Rp)</Label>
              <Input
                id="rec-amount"
                type="number"
                placeholder="0"
                value={form.amount}
                onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
              />
              {form.amount && (
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(parseFloat(form.amount) || 0)}
                </p>
              )}
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label>Kategori</Label>
              <Select value={form.categoryId} onValueChange={v => setForm(f => ({ ...f, categoryId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Method */}
            <div className="space-y-1.5">
              <Label>
                {form.type === 'transfer' ? 'Dari Metode' : 'Metode Pembayaran'}
              </Label>
              <Select value={form.paymentMethodId} onValueChange={v => setForm(f => ({ ...f, paymentMethodId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih metode" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map(pm => (
                    <SelectItem key={pm.id} value={pm.id}>
                      {pm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* To Payment Method (for transfers) */}
            {form.type === 'transfer' && (
              <div className="space-y-1.5">
                <Label>Ke Metode</Label>
                <Select value={form.toPaymentMethodId} onValueChange={v => setForm(f => ({ ...f, toPaymentMethodId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih metode tujuan" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.filter(pm => pm.id !== form.paymentMethodId).map(pm => (
                      <SelectItem key={pm.id} value={pm.id}>
                        {pm.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Frequency */}
            <div className="space-y-1.5">
              <Label>Frekuensi</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['daily', 'weekly', 'monthly', 'yearly'] as const).map(f => {
                  const conf = FREQUENCY_CONFIG[f]
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, frequency: f, dayOfWeek: '', dayOfMonth: '' }))}
                      className={`flex items-center justify-center gap-1.5 rounded-lg border-2 p-2 transition-all text-xs font-medium ${
                        form.frequency === f
                          ? `border-current ${conf.color} ${conf.bg} ${conf.darkBg}`
                          : 'border-border hover:border-muted-foreground/30 text-muted-foreground'
                      }`}
                    >
                      <Zap className="h-3 w-3" />
                      {conf.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Day of Week (for weekly) */}
            {form.frequency === 'weekly' && (
              <div className="space-y-1.5">
                <Label>Hari</Label>
                <Select value={form.dayOfWeek} onValueChange={v => setForm(f => ({ ...f, dayOfWeek: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih hari" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAY_NAMES.map((name, idx) => (
                      <SelectItem key={idx} value={String(idx)}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Day of Month (for monthly/yearly) */}
            {(form.frequency === 'monthly' || form.frequency === 'yearly') && (
              <div className="space-y-1.5">
                <Label>Tanggal</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  placeholder="1-31"
                  value={form.dayOfMonth}
                  onChange={(e) => setForm(f => ({ ...f, dayOfMonth: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Jika tanggal melebihi hari di bulan tersebut, akan disesuaikan
                </p>
              </div>
            )}

            {/* Start Date */}
            <div className="space-y-1.5">
              <Label htmlFor="rec-start">Tanggal Mulai</Label>
              <Input
                id="rec-start"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm(f => ({ ...f, startDate: e.target.value }))}
              />
            </div>

            {/* End Date (optional) */}
            <div className="space-y-1.5">
              <Label htmlFor="rec-end">Tanggal Akhir (opsional)</Label>
              <Input
                id="rec-end"
                type="date"
                value={form.endDate}
                onChange={(e) => setForm(f => ({ ...f, endDate: e.target.value }))}
              />
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <Label htmlFor="rec-note">Catatan</Label>
              <Input
                id="rec-note"
                placeholder="Catatan opsional"
                value={form.note}
                onChange={(e) => setForm(f => ({ ...f, note: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambah'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Transaksi Berulang?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Transaksi berulang ini akan dihapus secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
