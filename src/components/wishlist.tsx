'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ShoppingBag,
  Plus,
  Pencil,
  Trash2,
  Target,
  Calendar,
  Clock,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAnimatedCounter } from '@/hooks/use-animated-counter'

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

interface Wishlist {
  id: string
  name: string
  amount: number
  targetDate: string | null
  status: string
  note: string | null
  categoryId: string | null
  paymentMethodId: string | null
  createdAt: string
  updatedAt: string
  category: Category | null
  paymentMethod: PaymentMethod | null
}

interface WishlistFormData {
  name: string
  amount: string
  targetDate: string
  categoryId: string
  paymentMethodId: string
  note: string
}

const emptyForm: WishlistFormData = {
  name: '',
  amount: '',
  targetDate: '',
  categoryId: '',
  paymentMethodId: '',
  note: '',
}

function getDaysRemaining(targetDate: string | null): number | null {
  if (!targetDate) return null
  const target = new Date(targetDate)
  const now = new Date()
  const diff = target.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function WishlistCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-6 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-4 w-full" />
      </CardContent>
      <CardFooter className="p-4 pt-0 gap-2">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 w-9" />
        <Skeleton className="h-9 w-9" />
      </CardFooter>
    </Card>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <WishlistCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center mb-4">
        <Target className="h-8 w-8 text-amber-500" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">
        Belum ada wishlist
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        Tambahkan impian Anda!
      </p>
    </div>
  )
}

// ── Circular Progress Component ────────────────────────────────────────────
function CircularProgress({
  percentage,
  size = 56,
  strokeWidth = 5,
  colorClass = 'text-amber-500',
}: {
  percentage: number
  size?: number
  strokeWidth?: number
  colorClass?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(percentage, 100) / 100) * circumference

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        className="stroke-muted"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        className={`${colorClass} stroke-current`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
      />
    </svg>
  )
}

// ── Celebration Particles ──────────────────────────────────────────────────
function CelebrationParticles() {
  const colors = ['bg-emerald-400', 'bg-amber-400', 'bg-sky-400', 'bg-rose-400', 'bg-purple-400']
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {colors.map((color, i) => (
        <div
          key={i}
          className={`confetti-particle absolute w-1.5 h-1.5 rounded-full ${color}`}
          style={{
            left: `${20 + i * 15}%`,
            top: '40%',
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  )
}

export default function Wishlist() {
  const { toast } = useToast()
  const [wishlists, setWishlists] = useState<Wishlist[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [currentBalance, setCurrentBalance] = useState(0)
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const prevCompletedRef = useRef<Set<string>>(new Set())

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingWishlist, setEditingWishlist] = useState<Wishlist | null>(null)
  const [formData, setFormData] = useState<WishlistFormData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  // Buy confirmation
  const [buyTarget, setBuyTarget] = useState<Wishlist | null>(null)
  const [buying, setBuying] = useState(false)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Wishlist | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Fetch categories, payment methods, and dashboard balance
  useEffect(() => {
    Promise.all([
      api.getCategories('expense').catch(() => []),
      api.getPaymentMethods().catch(() => []),
      api.getDashboard().catch(() => ({ balance: 0 })),
    ]).then(([cats, pms, dash]) => {
      setCategories(Array.isArray(cats) ? cats : [])
      setPaymentMethods(Array.isArray(pms) ? pms : [])
      setCurrentBalance(dash.balance ?? 0)
    })
  }, [])

  // Fetch wishlists
  const fetchWishlists = useCallback(async () => {
    try {
      const data = await api.getWishlists()
      const list = Array.isArray(data) ? data : []

      // Detect newly completed goals for celebration
      const newCompleted = new Set(
        list.filter((w: Wishlist) => w.status === 'achieved').map((w: Wishlist) => w.id)
      )
      const justCompleted = new Set(
        [...newCompleted].filter((id) => !prevCompletedRef.current.has(id))
      )
      if (justCompleted.size > 0) {
        setCompletedIds(justCompleted)
        setTimeout(() => setCompletedIds(new Set()), 1500)
      }
      prevCompletedRef.current = newCompleted

      setWishlists(list)
    } catch {
      toast({
        title: 'Gagal memuat wishlist',
        description: 'Terjadi kesalahan saat memuat data wishlist',
        variant: 'destructive',
      })
      setWishlists([])
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchWishlists()
  }, [fetchWishlists])

  // Filter wishlists based on active tab
  const filteredWishlists =
    activeTab === 'all'
      ? wishlists
      : activeTab === 'pending'
        ? wishlists.filter((w) => w.status === 'pending')
        : wishlists.filter((w) => w.status === 'achieved')

  // Summary calculations
  const pendingWishlists = wishlists.filter((w) => w.status === 'pending')
  const totalWishlistValue = pendingWishlists.reduce((sum, w) => sum + w.amount, 0)
  const achievedCount = wishlists.filter((w) => w.status === 'achieved').length
  const totalCount = wishlists.length
  const animatedTotalValue = useAnimatedCounter(Math.round(totalWishlistValue), 800, !loading && totalCount > 0)

  // Open add dialog
  const handleAdd = () => {
    setEditingWishlist(null)
    setFormData(emptyForm)
    setDialogOpen(true)
  }

  // Open edit dialog
  const handleEdit = (wishlist: Wishlist) => {
    setEditingWishlist(wishlist)
    setFormData({
      name: wishlist.name,
      amount: String(wishlist.amount),
      targetDate: wishlist.targetDate
        ? new Date(wishlist.targetDate).toISOString().split('T')[0]
        : '',
      categoryId: wishlist.categoryId || '',
      paymentMethodId: wishlist.paymentMethodId || '',
      note: wishlist.note || '',
    })
    setDialogOpen(true)
  }

  // Submit form (create or update)
  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Nama wajib diisi',
        variant: 'destructive',
      })
      return
    }
    const amount = parseFloat(formData.amount)
    if (!amount || amount <= 0) {
      toast({
        title: 'Nominal harus lebih dari 0',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        name: formData.name.trim(),
        amount,
        targetDate: formData.targetDate || null,
        categoryId: formData.categoryId || null,
        paymentMethodId: formData.paymentMethodId || null,
        note: formData.note.trim() || null,
      }

      if (editingWishlist) {
        await api.updateWishlist(editingWishlist.id, payload)
        toast({
          title: 'Wishlist diperbarui',
          description: 'Data wishlist berhasil diperbarui',
        })
      } else {
        await api.createWishlist(payload)
        toast({
          title: 'Wishlist ditambahkan',
          description: 'Impian baru telah ditambahkan ke wishlist',
        })
      }

      setDialogOpen(false)
      setFormData(emptyForm)
      setEditingWishlist(null)
      await fetchWishlists()
    } catch {
      toast({
        title: editingWishlist ? 'Gagal memperbarui' : 'Gagal menambahkan',
        description: 'Terjadi kesalahan, silakan coba lagi',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Buy wishlist
  const handleBuy = async () => {
    if (!buyTarget) return
    setBuying(true)
    try {
      await api.buyWishlist(buyTarget.id)
      toast({
        title: 'Wishlist terrealisasi!',
        description: 'Transaksi pengeluaran telah dibuat.',
      })
      setBuyTarget(null)
      await fetchWishlists()
      // Refresh balance
      api.getDashboard().then((dash) => setCurrentBalance(dash.balance ?? 0)).catch(() => {})
    } catch {
      toast({
        title: 'Gagal merealisasikan',
        description: 'Terjadi kesalahan saat membuat transaksi',
        variant: 'destructive',
      })
    } finally {
      setBuying(false)
    }
  }

  // Delete wishlist
  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.deleteWishlist(deleteTarget.id)
      toast({
        title: 'Wishlist dihapus',
        description: 'Wishlist berhasil dihapus',
      })
      setDeleteTarget(null)
      await fetchWishlists()
    } catch {
      toast({
        title: 'Gagal menghapus',
        description: 'Terjadi kesalahan saat menghapus wishlist',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  // Expense categories for select
  const expenseCategories = categories.filter(
    (c) => c.type === 'expense' || c.type === 'both'
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-950/50">
            <Target className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Wishlist</h2>
        </div>
        <Button onClick={handleAdd} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Tambah Wishlist</span>
          <span className="sm:hidden">Tambah</span>
        </Button>
      </div>

      {/* Summary Banner */}
      {!loading && totalCount > 0 && (
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50 to-white dark:from-amber-950/20 dark:via-orange-950/10 dark:to-card dark:border-amber-900/50 overflow-hidden relative">
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <CircularProgress
                  percentage={totalCount > 0 ? (achievedCount / totalCount) * 100 : 0}
                  size={56}
                  strokeWidth={5}
                  colorClass="text-amber-500"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Target className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                  Total Nilai Wishlist
                </p>
                <p className="text-xl font-bold tabular-nums text-foreground">
                  {formatCurrency(animatedTotalValue)}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-xs text-muted-foreground">
                      {achievedCount} tercapai
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-xs text-muted-foreground">
                      {pendingWishlists.length} menunggu
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {achievedCount}/{totalCount}
                </p>
                <p className="text-xs text-muted-foreground">Tercapai</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="all" className="flex-1">
            Semua
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex-1">
            Belum Tercapai
          </TabsTrigger>
          <TabsTrigger value="achieved" className="flex-1">
            Tercapai
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {loading ? (
            <LoadingSkeleton />
          ) : filteredWishlists.length === 0 ? (
            <Card>
              <CardContent className="p-4">
                <EmptyState />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredWishlists.map((wishlist) => {
                const affordability = wishlist.amount > 0
                  ? Math.min(Math.round((currentBalance / wishlist.amount) * 100), 100)
                  : 0
                const canAfford = currentBalance >= wishlist.amount
                const daysRemaining = getDaysRemaining(wishlist.targetDate)
                const isJustCompleted = completedIds.has(wishlist.id)

                return (
                  <Card
                    key={wishlist.id}
                    className={`relative overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5 ${
                      wishlist.status === 'achieved'
                        ? 'border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/50 dark:bg-emerald-950/10'
                        : 'border-amber-200 bg-amber-50/30 dark:border-amber-900/50 dark:bg-amber-950/10'
                    }`}
                  >
                    {/* Celebration overlay */}
                    {isJustCompleted && <CelebrationParticles />}

                    <CardContent className="p-4 space-y-2">
                      {/* Name & Status */}
                      <div className="flex items-start justify-between gap-2">
                        <h3
                          className={`font-semibold text-foreground ${wishlist.status === 'achieved' ? 'line-through opacity-70' : ''}`}
                        >
                          {wishlist.name}
                        </h3>
                        <Badge
                          className={`shrink-0 text-xs ${
                            wishlist.status === 'achieved'
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900'
                              : 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900'
                          }`}
                          variant="outline"
                        >
                          {wishlist.status === 'achieved'
                            ? 'Tercapai'
                            : 'Belum'}
                        </Badge>
                      </div>

                      {/* Amount */}
                      <p
                        className={`text-2xl font-bold tabular-nums ${wishlist.status === 'achieved' ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}
                      >
                        {formatCurrency(wishlist.amount)}
                      </p>

                      {/* Affordability indicator for pending items */}
                      {wishlist.status === 'pending' && (
                        <div className="flex items-center justify-between text-xs">
                          <span className={`flex items-center gap-1 ${canAfford ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-muted-foreground'}`}>
                            {canAfford ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : (
                              <TrendingUp className="h-3.5 w-3.5" />
                            )}
                            Kemampuan: {affordability}%
                          </span>
                          {canAfford && (
                            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                              Mampu!
                            </span>
                          )}
                        </div>
                      )}

                      {/* Affordability progress bar for pending items */}
                      {wishlist.status === 'pending' && (
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full progress-animate ${
                              canAfford
                                ? 'bg-emerald-500'
                                : affordability >= 50
                                  ? 'bg-amber-500'
                                  : 'bg-rose-400'
                            }`}
                            style={{ width: `${affordability}%` }}
                          />
                        </div>
                      )}

                      {/* Target date countdown */}
                      {wishlist.targetDate && wishlist.status === 'pending' && daysRemaining !== null && (
                        <div className={`flex items-center gap-1 text-xs ${
                          daysRemaining <= 0
                            ? 'text-red-500 font-medium'
                            : daysRemaining <= 7
                              ? 'text-amber-500 font-medium'
                              : 'text-muted-foreground'
                        }`}>
                          <Clock className="h-3 w-3" />
                          {daysRemaining > 0 ? (
                            <span>{daysRemaining} hari lagi</span>
                          ) : daysRemaining === 0 ? (
                            <span>Hari ini!</span>
                          ) : (
                            <span>Terlambat {Math.abs(daysRemaining)} hari</span>
                          )}
                        </div>
                      )}

                      {/* Metadata */}
                      <div className="flex flex-wrap gap-2">
                        {wishlist.targetDate && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(wishlist.targetDate)}</span>
                          </div>
                        )}
                        {wishlist.category && (
                          <Badge
                            variant="secondary"
                            className="text-xs px-1.5 py-0 h-5 font-normal"
                          >
                            {wishlist.category.icon} {wishlist.category.name}
                          </Badge>
                        )}
                        {wishlist.paymentMethod && (
                          <Badge
                            variant="secondary"
                            className="text-xs px-1.5 py-0 h-5 font-normal"
                          >
                            {wishlist.paymentMethod.name}
                          </Badge>
                        )}
                      </div>

                      {/* Note */}
                      {wishlist.note && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {wishlist.note}
                        </p>
                      )}
                    </CardContent>

                    <CardFooter className="p-4 pt-0 gap-2">
                      {wishlist.status === 'pending' && (
                        <Button
                          onClick={() => setBuyTarget(wishlist)}
                          size="sm"
                          className={`flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white relative overflow-hidden ${
                            canAfford ? 'btn-shimmer' : ''
                          }`}
                        >
                          <ShoppingBag className="h-4 w-4" />
                          Beli
                        </Button>
                      )}
                      {wishlist.status === 'achieved' && (
                        <div className="flex-1" />
                      )}
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => handleEdit(wishlist)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-red-600 hover:border-red-200"
                        onClick={() => setDeleteTarget(wishlist)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingWishlist ? 'Edit Wishlist' : 'Tambah Wishlist'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Nama */}
            <div className="space-y-2">
              <Label htmlFor="wishlist-name">
                Nama <span className="text-red-500">*</span>
              </Label>
              <Input
                id="wishlist-name"
                placeholder="Contoh: iPhone 16 Pro"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            {/* Nominal */}
            <div className="space-y-2">
              <Label htmlFor="wishlist-amount">
                Nominal <span className="text-red-500">*</span>
              </Label>
              {formData.amount && parseFloat(formData.amount) > 0 && (
                <p className="text-sm font-medium text-foreground -mb-1">
                  {formatCurrency(parseFloat(formData.amount))}
                </p>
              )}
              <Input
                id="wishlist-amount"
                type="number"
                placeholder="0"
                min="0"
                value={formData.amount}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, amount: e.target.value }))
                }
              />
            </div>

            {/* Tanggal Target */}
            <div className="space-y-2">
              <Label htmlFor="wishlist-target">Tanggal Target</Label>
              <Input
                id="wishlist-target"
                type="date"
                value={formData.targetDate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    targetDate: e.target.value,
                  }))
                }
              />
            </div>

            {/* Kategori */}
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    categoryId: value === '__none' ? '' : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Tanpa kategori</SelectItem>
                  {expenseCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Metode Pembayaran */}
            <div className="space-y-2">
              <Label>Metode Pembayaran</Label>
              <Select
                value={formData.paymentMethodId}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    paymentMethodId: value === '__none' ? '' : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih metode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Tanpa metode</SelectItem>
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
              <Label htmlFor="wishlist-note">Catatan</Label>
              <Textarea
                id="wishlist-note"
                placeholder="Catatan tambahan..."
                rows={3}
                value={formData.note}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, note: e.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting
                ? 'Menyimpan...'
                : editingWishlist
                  ? 'Simpan Perubahan'
                  : 'Tambah Wishlist'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Buy Confirmation AlertDialog */}
      <AlertDialog
        open={!!buyTarget}
        onOpenChange={(open) => !open && setBuyTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Realisasikan wishlist ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Akan membuat transaksi pengeluaran sebesar{' '}
              <span className="font-semibold text-foreground">
                {buyTarget ? formatCurrency(buyTarget.amount) : ''}
              </span>{' '}
              untuk{' '}
              <span className="font-semibold text-foreground">
                {buyTarget?.name}
              </span>
              . Status wishlist akan berubah menjadi tercapai.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={buying}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBuy}
              disabled={buying}
              className="bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-600"
            >
              {buying ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Memproses...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  Beli Sekarang
                </span>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Wishlist?</AlertDialogTitle>
            <AlertDialogDescription>
              Wishlist &quot;{deleteTarget?.name}&quot; sebesar{' '}
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
