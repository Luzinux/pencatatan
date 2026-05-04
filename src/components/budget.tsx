'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { formatCurrency, getMonthYear, getMonthLabel } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Target,
  Wallet,
  Calendar,
  Clock,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAnimatedCounter } from '@/hooks/use-animated-counter'

// ── Types ──────────────────────────────────────────────────────────────────
interface Category {
  id: string
  name: string
  icon: string
  type: string
}

interface BudgetItem {
  id: string
  categoryId: string
  categoryName: string
  categoryIcon: string
  budgetAmount: number
  spent: number
  percentage: number
}

interface BudgetFormData {
  categoryId: string
  amount: string
}

// ── Helper: get progress bar color ────────────────────────────────────────
function getProgressColor(percentage: number): string {
  if (percentage > 100) return 'bg-red-500'
  if (percentage >= 75) return 'bg-amber-500'
  return 'bg-emerald-500'
}

function getProgressBgColor(percentage: number): string {
  if (percentage > 100) return 'bg-red-100 dark:bg-red-900/30'
  if (percentage >= 75) return 'bg-amber-100 dark:bg-amber-900/30'
  return 'bg-emerald-100 dark:bg-emerald-900/30'
}

function getBadgeStyle(percentage: number): string {
  if (percentage > 100) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  if (percentage >= 75) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
  return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
}

// ── Circular Progress Component ────────────────────────────────────────────
function CircularProgress({
  percentage,
  size = 80,
  strokeWidth = 6,
  colorClass = 'text-teal-500',
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

function getOverallProgressColor(percentage: number): string {
  if (percentage > 100) return 'text-red-500'
  if (percentage >= 75) return 'text-amber-500'
  return 'text-emerald-500'
}

// ── Loading Skeleton ───────────────────────────────────────────────────────
function BudgetSkeleton() {
  return (
    <div className="space-y-6">
      {/* Summary skeleton */}
      <Skeleton className="h-40 w-full rounded-xl" />
      {/* Month selector skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      {/* Budget cards skeleton */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-5 w-24" />
                </div>
                <Skeleton className="h-7 w-7 rounded-md" />
              </div>
              <Skeleton className="h-3 w-full rounded-full mb-2" />
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ── Budget Card ────────────────────────────────────────────────────────────
function BudgetCard({
  budget,
  onDelete,
  remainingDays,
}: {
  budget: BudgetItem
  onDelete: (budget: BudgetItem) => void
  remainingDays: number
}) {
  const clampedPercentage = Math.min(budget.percentage, 100)
  const isOverBudget = budget.percentage > 100
  const remaining = budget.budgetAmount - budget.spent
  const dailyRemaining = remainingDays > 0 && remaining > 0
    ? Math.round(remaining / remainingDays)
    : 0

  return (
    <Card className="relative overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5">
      <CardContent className="p-4">
        {/* Header: Category info + Delete button */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${getProgressBgColor(budget.percentage)}`}>
              <span className="text-lg" role="img" aria-label={budget.categoryName}>
                {budget.categoryIcon || '📝'}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold">{budget.categoryName}</p>
              <p className="text-xs text-muted-foreground">
                Anggaran: {formatCurrency(budget.budgetAmount)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getBadgeStyle(budget.percentage)}>
              {budget.percentage}%
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(budget)}
              aria-label={`Hapus anggaran ${budget.categoryName}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Progress Bar with animation */}
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full progress-animate ${getProgressColor(budget.percentage)}`}
            style={{ width: `${clampedPercentage}%` }}
          />
          {isOverBudget && (
            <div
              className="absolute top-0 h-full rounded-full bg-red-300/50 animate-pulse"
              style={{ width: '100%' }}
            />
          )}
        </div>

        {/* Footer: Spent / Remaining / Daily rate */}
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className={isOverBudget ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground'}>
            Terpakai: {formatCurrency(budget.spent)}
          </span>
          <span className={isOverBudget ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground'}>
            {isOverBudget
              ? `Lebih ${formatCurrency(budget.spent - budget.budgetAmount)}`
              : `Sisa: ${formatCurrency(remaining)}`
            }
          </span>
        </div>

        {/* Daily remaining budget indicator */}
        {!isOverBudget && remaining > 0 && remainingDays > 0 && (
          <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatCurrency(dailyRemaining)}/hari tersisa</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Main Budget Component ─────────────────────────────────────────────────
export default function Budget() {
  const { toast } = useToast()

  // State
  const [currentMonth, setCurrentMonth] = useState(getMonthYear())
  const [budgets, setBudgets] = useState<BudgetItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState<BudgetFormData>({
    categoryId: '',
    amount: '',
  })
  const [saving, setSaving] = useState(false)

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<BudgetItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ── Fetch Data ──────────────────────────────────────────────────────────
  const fetchData = useCallback(async (month: string) => {
    setLoading(true)
    setError(null)
    try {
      const [budgetData, catData] = await Promise.all([
        api.getBudgets(month),
        api.getCategories('expense'),
      ])
      setBudgets(budgetData)
      setCategories(catData)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal memuat data anggaran'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(currentMonth)
  }, [currentMonth, fetchData])

  // ── Month Navigation ────────────────────────────────────────────────────
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

  const isCurrentMonth = currentMonth === getMonthYear()

  // ── Derived data: filter categories that don't already have a budget ────
  const budgetedCategoryIds = budgets.map((b) => b.categoryId)
  const availableCategories = categories.filter(
    (c) => !budgetedCategoryIds.includes(c.id)
  )

  // ── Total budget summary ────────────────────────────────────────────────
  const totalBudget = budgets.reduce((sum, b) => sum + b.budgetAmount, 0)
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0)
  const totalRemaining = totalBudget - totalSpent
  const overallPercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0

  // Animated counters
  const animatedBudget = useAnimatedCounter(Math.round(totalBudget), 800, !loading && budgets.length > 0)
  const animatedSpent = useAnimatedCounter(Math.round(totalSpent), 800, !loading && budgets.length > 0)
  const animatedRemaining = useAnimatedCounter(Math.round(Math.abs(totalRemaining)), 800, !loading && budgets.length > 0)

  // Remaining days in the month
  const getRemainingDays = (): number => {
    const now = new Date()
    const [year, month] = currentMonth.split('-').map(Number)
    const lastDay = new Date(year, month, 0).getDate()
    const currentDay = now.getDate()
    if (year === now.getFullYear() && month === now.getMonth() + 1) {
      return Math.max(lastDay - currentDay, 0)
    }
    return lastDay
  }
  const remainingDays = getRemainingDays()

  // ── Dialog Handlers ─────────────────────────────────────────────────────
  const openAddDialog = () => {
    setFormData({ categoryId: '', amount: '' })
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setSaving(false)
  }

  const handleSave = async () => {
    if (!formData.categoryId) {
      toast({
        title: 'Validasi Gagal',
        description: 'Pilih kategori terlebih dahulu',
        variant: 'destructive',
      })
      return
    }

    const amount = parseFloat(formData.amount.replace(/\./g, '').replace(/,/g, ''))
    if (!amount || amount <= 0) {
      toast({
        title: 'Validasi Gagal',
        description: 'Masukkan nominal anggaran yang valid',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      await api.createBudget({
        amount,
        month: currentMonth,
        categoryId: formData.categoryId,
      })
      toast({
        title: 'Berhasil',
        description: 'Anggaran berhasil ditambahkan',
      })
      closeDialog()
      fetchData(currentMonth)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal menyimpan anggaran'
      toast({
        title: 'Gagal',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // ── Delete Handlers ─────────────────────────────────────────────────────
  const openDeleteConfirm = (budget: BudgetItem) => {
    setDeleteTarget(budget)
  }

  const closeDeleteConfirm = () => {
    setDeleteTarget(null)
    setDeleting(false)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return

    setDeleting(true)
    try {
      await api.deleteBudget(deleteTarget.id)
      toast({
        title: 'Berhasil',
        description: `Anggaran "${deleteTarget.categoryName}" berhasil dihapus`,
      })
      closeDeleteConfirm()
      fetchData(currentMonth)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal menghapus anggaran'
      toast({
        title: 'Gagal',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 rounded-full bg-destructive/10 p-4">
          <Target className="h-8 w-8 text-destructive" />
        </div>
        <p className="mb-2 text-lg font-semibold text-destructive">Oops!</p>
        <p className="mb-4 text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={() => fetchData(currentMonth)}>
          Coba Lagi
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Header + Month Selector ──────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPrevMonth} aria-label="Bulan sebelumnya">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            className="min-w-[140px] text-base font-semibold"
            onClick={goToCurrentMonth}
          >
            Anggaran {getMonthLabel(currentMonth)}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={goToNextMonth}
            disabled={isCurrentMonth}
            aria-label="Bulan berikutnya"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={openAddDialog} size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Tambah Anggaran
        </Button>
      </div>

      {/* ── Loading State ────────────────────────────────────────────────── */}
      {loading ? (
        <BudgetSkeleton />
      ) : (
        <>
          {/* ── Enhanced Summary Card ──────────────────────────────────────── */}
          {budgets.length > 0 && (
            <Card className="border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50/50 dark:from-teal-950/20 dark:to-emerald-950/10 dark:border-teal-900/40">
              <CardContent className="p-4 md:p-5">
                <div className="flex items-center gap-5">
                  {/* Circular progress indicator */}
                  <div className="relative flex-shrink-0">
                    <CircularProgress
                      percentage={overallPercentage}
                      size={80}
                      strokeWidth={6}
                      colorClass={getOverallProgressColor(overallPercentage)}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-foreground">
                        {overallPercentage}%
                      </span>
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="flex-1 min-w-0 grid grid-cols-3 gap-3">
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-muted-foreground">Total Anggaran</p>
                      <p className="text-base md:text-lg font-bold text-teal-700 dark:text-teal-400 truncate">
                        {formatCurrency(animatedBudget)}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-muted-foreground">Total Terpakai</p>
                      <p className="text-base md:text-lg font-bold text-foreground truncate">
                        {formatCurrency(animatedSpent)}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-muted-foreground">
                        {totalRemaining >= 0 ? 'Sisa' : 'Lebih'}
                      </p>
                      <p className={`text-base md:text-lg font-bold truncate ${
                        totalRemaining >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {totalRemaining < 0 ? '-' : ''}{formatCurrency(animatedRemaining)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Remaining days indicator */}
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    {remainingDays > 0
                      ? `${remainingDays} hari tersisa bulan ini`
                      : 'Bulan ini telah berakhir'}
                  </span>
                  {remainingDays > 0 && totalRemaining > 0 && (
                    <>
                      <span className="text-border">•</span>
                      <Clock className="h-3.5 w-3.5" />
                      <span>{formatCurrency(Math.round(totalRemaining / remainingDays))}/hari tersisa</span>
                    </>
                  )}
                </div>

                {/* Overall progress bar */}
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full progress-animate ${getProgressColor(overallPercentage)}`}
                    style={{ width: `${Math.min(overallPercentage, 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Budget Cards Grid ──────────────────────────────────────────── */}
          {budgets.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {budgets.map((budget) => (
                <BudgetCard
                  key={budget.id}
                  budget={budget}
                  onDelete={openDeleteConfirm}
                  remainingDays={remainingDays}
                />
              ))}
            </div>
          ) : (
            /* ── Empty State ──────────────────────────────────────────────── */
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
              <div className="mb-3 rounded-full bg-muted p-4">
                <Target className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="mb-1 text-sm font-medium text-muted-foreground">
                Belum ada anggaran
              </p>
              <p className="mb-4 text-xs text-muted-foreground max-w-xs">
                Atur anggaran per kategori untuk memantau pengeluaran
              </p>
              <Button variant="outline" size="sm" onClick={openAddDialog}>
                <Plus className="mr-1 h-4 w-4" />
                Tambah Anggaran
              </Button>
            </div>
          )}
        </>
      )}

      {/* ── Add Budget Dialog ──────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Anggaran</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Category Select */}
            <div className="space-y-2">
              <Label htmlFor="budget-category">Kategori</Label>
              {availableCategories.length > 0 ? (
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, categoryId: value }))
                  }
                >
                  <SelectTrigger className="w-full" id="budget-category">
                    <SelectValue placeholder="Pilih kategori pengeluaran" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <span className="flex items-center gap-2">
                          <span className="text-base">{cat.icon}</span>
                          {cat.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground rounded-md border border-dashed p-3 text-center">
                  Semua kategori sudah memiliki anggaran
                </p>
              )}
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="budget-amount">Nominal Anggaran</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  Rp
                </span>
                <Input
                  id="budget-amount"
                  type="text"
                  inputMode="numeric"
                  className="pl-9"
                  placeholder="0"
                  value={formData.amount}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^\d]/g, '')
                    const formatted = raw
                      ? new Intl.NumberFormat('id-ID').format(parseInt(raw))
                      : ''
                    setFormData((prev) => ({ ...prev, amount: formatted }))
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Bulan: {getMonthLabel(currentMonth)}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={saving}>
              Batal
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || availableCategories.length === 0}
            >
              {saving ? (
                <>
                  <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Menyimpan...
                </>
              ) : (
                'Tambah Anggaran'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && closeDeleteConfirm()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Anggaran?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus anggaran untuk kategori &quot;{deleteTarget?.categoryName}&quot;?
              Tindakan ini tidak dapat dibatalkan.
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
                  <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
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
