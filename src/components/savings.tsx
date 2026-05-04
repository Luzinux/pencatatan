'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '@/lib/api'
import { formatCurrency, formatDate, getMonthYear } from '@/lib/format'
import { Card, CardContent } from '@/components/ui/card'
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
  PiggyBank,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Wallet,
  TrendingUp,
  CheckCircle2,
  Target,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAnimatedCounter } from '@/hooks/use-animated-counter'

interface PaymentMethod {
  id: string
  name: string
  type: string
}

interface SavingsGoal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  targetDate: string | null
  status: string
  note: string | null
  paymentMethodId: string | null
  createdAt: string
  updatedAt: string
  paymentMethod: PaymentMethod | null
}

interface SavingsFormData {
  name: string
  targetAmount: string
  targetDate: string
  paymentMethodId: string
  note: string
}

const emptyForm: SavingsFormData = {
  name: '',
  targetAmount: '',
  targetDate: '',
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

function getProgressColor(percentage: number): string {
  if (percentage >= 100) return 'bg-emerald-500'
  if (percentage >= 75) return 'bg-amber-500'
  if (percentage >= 50) return 'bg-sky-500'
  return 'bg-rose-500'
}

function getProgressTrackColor(percentage: number): string {
  if (percentage >= 100) return 'text-emerald-500'
  if (percentage >= 75) return 'text-amber-500'
  if (percentage >= 50) return 'text-sky-500'
  return 'text-rose-500'
}

// ── Circular Progress Component ────────────────────────────────────────────
function CircularProgress({
  percentage,
  size = 72,
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
  if (percentage >= 100) return 'text-emerald-500'
  if (percentage >= 75) return 'text-amber-500'
  if (percentage >= 50) return 'text-sky-500'
  return 'text-rose-500'
}

// ── Celebration Particles ──────────────────────────────────────────────────
function CelebrationParticles() {
  const colors = ['bg-emerald-400', 'bg-amber-400', 'bg-sky-400', 'bg-rose-400', 'bg-purple-400', 'bg-teal-400']
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {colors.map((color, i) => (
        <div
          key={i}
          className={`confetti-particle absolute w-2 h-2 rounded-full ${color}`}
          style={{
            left: `${15 + i * 14}%`,
            top: '30%',
            animationDelay: `${i * 0.08}s`,
          }}
        />
      ))}
    </div>
  )
}

// ── Milestone Marker Component ────────────────────────────────────────────
function MilestoneMarkers() {
  const milestones = [25, 50, 75, 100]
  return (
    <div className="relative h-0">
      {milestones.map((m) => (
        <div
          key={m}
          className="absolute top-0.5 w-0.5 h-2 bg-muted-foreground/30"
          style={{ left: `${m}%`, transform: 'translateX(-50%)' }}
        />
      ))}
    </div>
  )
}

function SavingsCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-3 w-full" />
        <div className="flex justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-4 w-1/3" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-8 flex-1" />
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
      <Skeleton className="h-32 w-full rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SavingsCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center mb-4">
        <PiggyBank className="h-8 w-8 text-teal-500" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">
        Belum ada tabungan
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        Mulai menabung untuk mencapai impian Anda!
      </p>
    </div>
  )
}

export default function Savings() {
  const { toast } = useToast()
  const [savings, setSavings] = useState<SavingsGoal[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')

  // Celebration tracking
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const prevCompletedRef = useRef<Set<string>>(new Set())

  // Add/Edit dialog states
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null)
  const [formData, setFormData] = useState<SavingsFormData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  // Deposit dialog states
  const [depositTarget, setDepositTarget] = useState<SavingsGoal | null>(null)
  const [depositAmount, setDepositAmount] = useState('')
  const [depositNote, setDepositNote] = useState('')
  const [depositPaymentMethodId, setDepositPaymentMethodId] = useState('')
  const [depositing, setDepositing] = useState(false)

  // Delete confirmation states
  const [deleteTarget, setDeleteTarget] = useState<SavingsGoal | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Fetch payment methods
  useEffect(() => {
    api.getPaymentMethods().then((pms) => {
      setPaymentMethods(Array.isArray(pms) ? pms : [])
    }).catch(() => {})
  }, [])

  // Fetch savings goals
  const fetchSavings = useCallback(async () => {
    try {
      const data = await api.getSavings()
      const list = Array.isArray(data) ? data : []

      // Detect newly completed goals for celebration
      const newCompleted = new Set(
        list.filter((s: SavingsGoal) => s.status === 'completed').map((s: SavingsGoal) => s.id)
      )
      const justCompleted = new Set(
        [...newCompleted].filter((id) => !prevCompletedRef.current.has(id))
      )
      if (justCompleted.size > 0) {
        setCompletedIds(justCompleted)
        setTimeout(() => setCompletedIds(new Set()), 1500)
      }
      prevCompletedRef.current = newCompleted

      setSavings(list)
    } catch {
      toast({
        title: 'Gagal memuat tabungan',
        description: 'Terjadi kesalahan saat memuat data tabungan',
        variant: 'destructive',
      })
      setSavings([])
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchSavings()
  }, [fetchSavings])

  // Filter savings based on active tab
  const filteredSavings =
    activeTab === 'all'
      ? savings
      : activeTab === 'active'
        ? savings.filter((s) => s.status === 'active')
        : savings.filter((s) => s.status === 'completed')

  // Summary calculations
  const totalSavings = savings.reduce((sum, s) => sum + s.currentAmount, 0)
  const totalTarget = savings.reduce((sum, s) => sum + s.targetAmount, 0)
  const overallProgress = totalTarget > 0 ? Math.min((totalSavings / totalTarget) * 100, 100) : 0
  const completedGoals = savings.filter((s) => s.status === 'completed').length
  const activeGoals = savings.filter((s) => s.status === 'active')

  // Goals on track: active goals where progress >= expected progress based on time
  const goalsOnTrack = activeGoals.filter((goal) => {
    if (!goal.targetDate) return true // no deadline = on track
    const daysRemaining = getDaysRemaining(goal.targetDate)
    if (daysRemaining === null || daysRemaining <= 0) return false // overdue = not on track
    const createdDate = new Date(goal.createdAt)
    const totalDays = new Date(goal.targetDate).getTime() - createdDate.getTime()
    const elapsedDays = Date.now() - createdDate.getTime()
    const expectedProgress = totalDays > 0 ? (elapsedDays / totalDays) * 100 : 100
    const actualProgress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0
    return actualProgress >= expectedProgress * 0.8 // 80% threshold for "on track"
  }).length

  // Animated counters
  const animatedTotalSavings = useAnimatedCounter(Math.round(totalSavings), 800, !loading && savings.length > 0)

  // Open add dialog
  const handleAdd = () => {
    setEditingGoal(null)
    setFormData(emptyForm)
    setDialogOpen(true)
  }

  // Open edit dialog
  const handleEdit = (goal: SavingsGoal) => {
    setEditingGoal(goal)
    setFormData({
      name: goal.name,
      targetAmount: String(goal.targetAmount),
      targetDate: goal.targetDate
        ? new Date(goal.targetDate).toISOString().split('T')[0]
        : '',
      paymentMethodId: goal.paymentMethodId || '',
      note: goal.note || '',
    })
    setDialogOpen(true)
  }

  // Calculate progress per month for a goal
  const getProgressPerMonth = (goal: SavingsGoal): number => {
    const createdDate = new Date(goal.createdAt)
    const now = new Date()
    const monthsDiff = (now.getFullYear() - createdDate.getFullYear()) * 12 +
      (now.getMonth() - createdDate.getMonth())
    if (monthsDiff <= 0) return goal.currentAmount
    return Math.round(goal.currentAmount / monthsDiff)
  }

  // Submit form (create or update)
  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'Nama wajib diisi', variant: 'destructive' })
      return
    }
    const amount = parseFloat(formData.targetAmount)
    if (!amount || amount <= 0) {
      toast({ title: 'Target jumlah harus lebih dari 0', variant: 'destructive' })
      return
    }

    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        name: formData.name.trim(),
        targetAmount: amount,
        targetDate: formData.targetDate || null,
        paymentMethodId: formData.paymentMethodId || null,
        note: formData.note.trim() || null,
      }

      if (editingGoal) {
        await api.updateSavings(editingGoal.id, payload)
        toast({
          title: 'Tabungan diperbarui',
          description: 'Data tabungan berhasil diperbarui',
        })
      } else {
        await api.createSavings(payload)
        toast({
          title: 'Tabungan ditambahkan',
          description: 'Target tabungan baru telah ditambahkan',
        })
      }

      setDialogOpen(false)
      setFormData(emptyForm)
      setEditingGoal(null)
      await fetchSavings()
    } catch {
      toast({
        title: editingGoal ? 'Gagal memperbarui' : 'Gagal menambahkan',
        description: 'Terjadi kesalahan, silakan coba lagi',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Open deposit dialog
  const handleOpenDeposit = (goal: SavingsGoal) => {
    setDepositTarget(goal)
    setDepositAmount('')
    setDepositNote('')
    setDepositPaymentMethodId(goal.paymentMethodId || '')
  }

  // Submit deposit
  const handleDeposit = async () => {
    if (!depositTarget) return
    const amount = parseFloat(depositAmount)
    if (!amount || amount <= 0) {
      toast({ title: 'Jumlah setor harus lebih dari 0', variant: 'destructive' })
      return
    }

    setDepositing(true)
    try {
      const result = await api.depositSavings(depositTarget.id, {
        amount,
        paymentMethodId: depositPaymentMethodId || undefined,
        note: depositNote.trim() || undefined,
      })
      toast({
        title: result.completed ? 'Tabungan tercapai! 🎉' : 'Setoran berhasil',
        description: result.completed
          ? `Selamat! Tabungan "${depositTarget.name}" telah mencapai target!`
          : `Setoran ${formatCurrency(amount)} berhasil ditambahkan`,
      })
      setDepositTarget(null)
      await fetchSavings()
    } catch {
      toast({
        title: 'Gagal menyetor',
        description: 'Terjadi kesalahan saat menyetor tabungan',
        variant: 'destructive',
      })
    } finally {
      setDepositing(false)
    }
  }

  // Delete savings goal
  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.deleteSavings(deleteTarget.id)
      toast({
        title: 'Tabungan dihapus',
        description: 'Tabungan berhasil dihapus',
      })
      setDeleteTarget(null)
      await fetchSavings()
    } catch {
      toast({
        title: 'Gagal menghapus',
        description: 'Terjadi kesalahan saat menghapus tabungan',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-teal-100 dark:bg-teal-950/50">
            <PiggyBank className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Tabungan</h2>
        </div>
        <Button onClick={handleAdd} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Tambah Tabungan</span>
          <span className="sm:hidden">Tambah</span>
        </Button>
      </div>

      {/* Enhanced Summary Card */}
      {!loading && savings.length > 0 && (
        <Card className="border-teal-200 bg-gradient-to-br from-teal-50 via-emerald-50/30 to-white dark:from-teal-950/20 dark:via-emerald-950/10 dark:to-card dark:border-teal-900/50">
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center gap-4">
              {/* Circular progress */}
              <div className="relative flex-shrink-0">
                <CircularProgress
                  percentage={overallProgress}
                  size={72}
                  strokeWidth={6}
                  colorClass={getOverallProgressColor(overallProgress)}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-foreground">
                    {overallProgress.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex-1 min-w-0">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-muted-foreground">Terkumpul</p>
                    <p className="text-sm md:text-base font-bold tabular-nums text-teal-600 dark:text-teal-400 truncate">
                      {formatCurrency(animatedTotalSavings)}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-muted-foreground">Target</p>
                    <p className="text-sm md:text-base font-bold tabular-nums text-foreground truncate">
                      {formatCurrency(totalTarget)}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-muted-foreground">Tercapai</p>
                    <p className="text-sm md:text-base font-bold text-foreground">
                      {completedGoals}/{savings.length}
                    </p>
                  </div>
                </div>

                {/* Goals on track indicator */}
                {activeGoals.length > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        goalsOnTrack === activeGoals.length
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900'
                          : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900'
                      }`}
                    >
                      <Target className="h-3 w-3 mr-1" />
                      {goalsOnTrack}/{activeGoals.length} on track
                    </Badge>
                  </div>
                )}

                {/* Overall progress bar */}
                <div className="mt-3 space-y-1">
                  <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full progress-animate ${getProgressColor(overallProgress)}`}
                      style={{ width: `${overallProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatCurrency(totalSavings)} terkumpul</span>
                    <span>Kurang {formatCurrency(Math.max(totalTarget - totalSavings, 0))}</span>
                  </div>
                </div>
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
          <TabsTrigger value="active" className="flex-1">
            Aktif
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex-1">
            Tercapai
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {loading ? (
            <LoadingSkeleton />
          ) : filteredSavings.length === 0 ? (
            <Card>
              <CardContent className="p-4">
                <EmptyState />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSavings.map((goal) => {
                const percentage = goal.targetAmount > 0
                  ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
                  : 0
                const daysRemaining = getDaysRemaining(goal.targetDate)
                const isCompleted = goal.status === 'completed'
                const isJustCompleted = completedIds.has(goal.id)
                const progressPerMonth = getProgressPerMonth(goal)

                return (
                  <Card
                    key={goal.id}
                    className={`relative overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5 ${
                      isCompleted
                        ? 'border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/50 dark:bg-emerald-950/10'
                        : 'border-amber-200 bg-amber-50/30 dark:border-amber-900/50 dark:bg-amber-950/10'
                    }`}
                  >
                    {/* Celebration overlay */}
                    {isJustCompleted && <CelebrationParticles />}

                    <CardContent className="p-4 space-y-3">
                      {/* Name & Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className={`flex items-center justify-center h-8 w-8 rounded-lg shrink-0 ${
                            isCompleted
                              ? 'bg-emerald-100 dark:bg-emerald-950/50'
                              : 'bg-amber-100 dark:bg-amber-950/50'
                          }`}>
                            <PiggyBank className={`h-4 w-4 ${
                              isCompleted
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }`} />
                          </div>
                          <h3 className={`font-semibold text-foreground ${isCompleted ? 'line-through opacity-70' : ''}`}>
                            {goal.name}
                          </h3>
                        </div>
                        {isCompleted && (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                        )}
                        {!isCompleted && (
                          <Badge
                            className={`shrink-0 text-xs ${
                              'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900'
                            }`}
                            variant="outline"
                          >
                            Aktif
                          </Badge>
                        )}
                      </div>

                      {/* Progress Bar with milestone markers */}
                      <div className="space-y-0">
                        <div className="flex items-center justify-between text-sm">
                          <span className={`font-medium ${getProgressTrackColor(percentage)}`}>
                            {percentage.toFixed(0)}%
                          </span>
                          <span className="text-muted-foreground text-xs tabular-nums">
                            {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                          </span>
                        </div>
                        <div className="relative">
                          <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full progress-animate ${getProgressColor(percentage)}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <MilestoneMarkers />
                        </div>
                      </div>

                      {/* Progress per month indicator */}
                      {!isCompleted && progressPerMonth > 0 && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <TrendingUp className="h-3 w-3" />
                          <span>Rata-rata {formatCurrency(progressPerMonth)}/bulan</span>
                        </div>
                      )}

                      {/* Days remaining & payment method */}
                      <div className="flex flex-wrap gap-2">
                        {goal.targetDate && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {daysRemaining !== null && daysRemaining > 0 ? (
                              <span>{daysRemaining} hari lagi</span>
                            ) : daysRemaining !== null && daysRemaining <= 0 ? (
                              <span className="text-red-500 font-medium">
                                {daysRemaining === 0 ? 'Hari ini' : `Terlambat ${Math.abs(daysRemaining)} hari`}
                              </span>
                            ) : (
                              <span>{formatDate(goal.targetDate)}</span>
                            )}
                          </div>
                        )}
                        {goal.paymentMethod && (
                          <Badge
                            variant="secondary"
                            className="text-xs px-1.5 py-0 h-5 font-normal"
                          >
                            {goal.paymentMethod.name}
                          </Badge>
                        )}
                      </div>

                      {/* Note */}
                      {goal.note && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {goal.note}
                        </p>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-1">
                        {!isCompleted && (
                          <Button
                            onClick={() => handleOpenDeposit(goal)}
                            size="sm"
                            className="flex-1 gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
                          >
                            <Wallet className="h-3.5 w-3.5" />
                            Setor
                          </Button>
                        )}
                        {isCompleted && <div className="flex-1" />}
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => handleEdit(goal)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-red-600 hover:border-red-200"
                          onClick={() => setDeleteTarget(goal)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
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
              {editingGoal ? 'Edit Tabungan' : 'Tambah Tabungan'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Nama */}
            <div className="space-y-2">
              <Label htmlFor="savings-name">
                Nama <span className="text-red-500">*</span>
              </Label>
              <Input
                id="savings-name"
                placeholder="Contoh: Dana Pernikahan"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            {/* Target Jumlah */}
            <div className="space-y-2">
              <Label htmlFor="savings-target">
                Target Jumlah <span className="text-red-500">*</span>
              </Label>
              {formData.targetAmount && parseFloat(formData.targetAmount) > 0 && (
                <p className="text-sm font-medium text-foreground -mb-1">
                  {formatCurrency(parseFloat(formData.targetAmount))}
                </p>
              )}
              <Input
                id="savings-target"
                type="number"
                placeholder="0"
                min="0"
                value={formData.targetAmount}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, targetAmount: e.target.value }))
                }
              />
            </div>

            {/* Tanggal Target */}
            <div className="space-y-2">
              <Label htmlFor="savings-target-date">Tanggal Target</Label>
              <Input
                id="savings-target-date"
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
              <Label htmlFor="savings-note">Catatan</Label>
              <Textarea
                id="savings-note"
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
                : editingGoal
                  ? 'Simpan Perubahan'
                  : 'Tambah Tabungan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deposit Dialog */}
      <Dialog open={!!depositTarget} onOpenChange={(open) => !open && setDepositTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Setor Tabungan</DialogTitle>
          </DialogHeader>

          {depositTarget && (
            <div className="space-y-4 py-2">
              {/* Goal Info */}
              <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <PiggyBank className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  <span className="font-semibold text-foreground">{depositTarget.name}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {depositTarget.targetAmount > 0
                        ? `${((depositTarget.currentAmount / depositTarget.targetAmount) * 100).toFixed(0)}%`
                        : '0%'}
                    </span>
                    <span className="text-muted-foreground">
                      {formatCurrency(depositTarget.currentAmount)} / {formatCurrency(depositTarget.targetAmount)}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getProgressColor(
                        depositTarget.targetAmount > 0
                          ? (depositTarget.currentAmount / depositTarget.targetAmount) * 100
                          : 0
                      )}`}
                      style={{
                        width: `${Math.min(
                          depositTarget.targetAmount > 0
                            ? (depositTarget.currentAmount / depositTarget.targetAmount) * 100
                            : 0,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Kurang {formatCurrency(Math.max(depositTarget.targetAmount - depositTarget.currentAmount, 0))} lagi
                </p>
              </div>

              {/* Deposit Amount */}
              <div className="space-y-2">
                <Label htmlFor="deposit-amount">
                  Jumlah Setor <span className="text-red-500">*</span>
                </Label>
                {depositAmount && parseFloat(depositAmount) > 0 && (
                  <p className="text-sm font-medium text-foreground -mb-1">
                    {formatCurrency(parseFloat(depositAmount))}
                  </p>
                )}
                <Input
                  id="deposit-amount"
                  type="number"
                  placeholder="0"
                  min="0"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                />
              </div>

              {/* Deposit Payment Method */}
              <div className="space-y-2">
                <Label>Metode Pembayaran</Label>
                <Select
                  value={depositPaymentMethodId}
                  onValueChange={(value) =>
                    setDepositPaymentMethodId(value === '__none' ? '' : value)
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

              {/* Deposit Note */}
              <div className="space-y-2">
                <Label htmlFor="deposit-note">Catatan</Label>
                <Input
                  id="deposit-note"
                  placeholder="Catatan setoran (opsional)"
                  value={depositNote}
                  onChange={(e) => setDepositNote(e.target.value)}
                />
              </div>

              {/* Preview after deposit */}
              {depositAmount && parseFloat(depositAmount) > 0 && (
                <div className="rounded-lg border border-teal-200 dark:border-teal-900/50 bg-teal-50/50 dark:bg-teal-950/20 p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-teal-700 dark:text-teal-400">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Pratinjau setelah setor
                  </div>
                  {(() => {
                    const newAmount = depositTarget.currentAmount + parseFloat(depositAmount)
                    const newPct = depositTarget.targetAmount > 0
                      ? Math.min((newAmount / depositTarget.targetAmount) * 100, 100)
                      : 0
                    return (
                      <>
                        <div className="flex items-center justify-between text-xs">
                          <span className={getProgressTrackColor(newPct)}>
                            {newPct.toFixed(0)}%
                          </span>
                          <span className="text-muted-foreground">
                            {formatCurrency(newAmount)} / {formatCurrency(depositTarget.targetAmount)}
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${getProgressColor(newPct)}`}
                            style={{ width: `${newPct}%` }}
                          />
                        </div>
                        {newAmount >= depositTarget.targetAmount && (
                          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            🎉 Target akan tercapai!
                          </p>
                        )}
                      </>
                    )
                  })()}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDepositTarget(null)}
              disabled={depositing}
            >
              Batal
            </Button>
            <Button
              onClick={handleDeposit}
              disabled={depositing}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {depositing ? 'Memproses...' : 'Setor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Tabungan?</AlertDialogTitle>
            <AlertDialogDescription>
              Tabungan &quot;{deleteTarget?.name}&quot; dengan target{' '}
              <span className="font-semibold text-foreground">
                {deleteTarget ? formatCurrency(deleteTarget.targetAmount) : ''}
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
