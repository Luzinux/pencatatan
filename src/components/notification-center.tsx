'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/format'
import { useAppStore, type Page } from '@/lib/store'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Bell,
  AlertTriangle,
  Target,
  PiggyBank,
  TrendingDown,
  Wallet,
  Check,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────
interface NotificationItem {
  id: string
  type: 'overdue-bill' | 'budget-warning' | 'savings-complete' | 'large-expense' | 'low-balance'
  icon: React.ElementType
  iconColor: string
  iconBg: string
  title: string
  description: string
  targetPage: Page
  createdAt: Date
}

// ── Helpers ────────────────────────────────────────────────────────────────
function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Baru saja'
  if (diffMins < 60) return `${diffMins} menit lalu`
  if (diffHours < 24) return `${diffHours} jam lalu`
  return `${diffDays} hari lalu`
}

function getReadState(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem('dompetku-notifications-read')
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function saveReadState(state: Record<string, boolean>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem('dompetku-notifications-read', JSON.stringify(state))
  } catch {
    // ignore storage errors
  }
}

function cleanupOldReadState(notifications: NotificationItem[]) {
  const readState = getReadState()
  const validIds = new Set(notifications.map((n) => n.id))
  const cleaned: Record<string, boolean> = {}
  for (const [id, value] of Object.entries(readState)) {
    if (validIds.has(id)) {
      cleaned[id] = value
    }
  }
  saveReadState(cleaned)
}

// ── Notification Center Component ──────────────────────────────────────────
export function NotificationCenter() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  // Load read state from localStorage - use initializer pattern
  const [readState, setReadState] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {}
    try {
      const stored = localStorage.getItem('dompetku-notifications-read')
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  })

  const [open, setOpen] = useState(false)
  const setCurrentPage = useAppStore((s) => s.setCurrentPage)

  // Fetch data and generate notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const now = new Date()
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const items: NotificationItem[] = []

      // Fetch all required data in parallel
      const [bills, budgets, savings, dashboardData] = await Promise.all([
        api.getBills().catch(() => []),
        api.getBudgets().catch(() => []),
        api.getSavings().catch(() => []),
        api.getDashboard().catch(() => null),
      ])

      // 1. Overdue Bills
      const billsList = Array.isArray(bills) ? bills : []
      billsList.forEach((bill: { id: string; name: string; status: string; dueDate: string; amount: number }) => {
        const dueDate = new Date(bill.dueDate)
        if (bill.status === 'pending' && dueDate < now) {
          items.push({
            id: `overdue-${bill.id}`,
            type: 'overdue-bill',
            icon: AlertTriangle,
            iconColor: '#ef4444',
            iconBg: '#fef2f2',
            title: 'Tagihan Jatuh Tempo',
            description: `Tagihan ${bill.name} sudah jatuh tempo (${formatCurrency(bill.amount)})`,
            targetPage: 'tagihan',
            createdAt: dueDate > sevenDaysAgo ? dueDate : sevenDaysAgo,
          })
        }
      })

      // 2. Budget Warning (>80% used)
      const budgetsList = Array.isArray(budgets) ? budgets : []
      budgetsList.forEach((budget: { id: string; categoryName: string; percentage: number; spent: number; budgetAmount: number }) => {
        if (budget.percentage > 80) {
          items.push({
            id: `budget-warn-${budget.id}`,
            type: 'budget-warning',
            icon: Target,
            iconColor: '#f59e0b',
            iconBg: '#fffbeb',
            title: 'Anggaran Hampir Habis',
            description: `Anggaran ${budget.categoryName} sudah ${budget.percentage.toFixed(0)}% terpakai`,
            targetPage: 'budget',
            createdAt: now,
          })
        }
      })

      // 3. Savings Goal Complete
      const savingsList = Array.isArray(savings) ? savings : []
      savingsList.forEach((goal: { id: string; name: string; status: string; currentAmount: number; targetAmount: number }) => {
        if (goal.status === 'completed') {
          items.push({
            id: `savings-complete-${goal.id}`,
            type: 'savings-complete',
            icon: PiggyBank,
            iconColor: '#22c55e',
            iconBg: '#f0fdf4',
            title: 'Target Tercapai!',
            description: `Target tabungan ${goal.name} tercapai!`,
            targetPage: 'savings',
            createdAt: now,
          })
        }
      })

      // 4. Large Expense (>1,000,000) - from recent transactions in dashboard
      if (dashboardData?.recentTransactions) {
        const recentTx = Array.isArray(dashboardData.recentTransactions) ? dashboardData.recentTransactions : []
        recentTx.forEach((tx: { id: string; type: string; amount: number; date: string; category: { name: string } | null }) => {
          const txDate = new Date(tx.date)
          if (tx.type === 'expense' && tx.amount > 1000000 && txDate >= sevenDaysAgo) {
            const catName = tx.category?.name || 'Lainnya'
            items.push({
              id: `large-expense-${tx.id}`,
              type: 'large-expense',
              icon: TrendingDown,
              iconColor: '#ef4444',
              iconBg: '#fef2f2',
              title: 'Pengeluaran Besar',
              description: `Pengeluaran besar: ${formatCurrency(tx.amount)} untuk ${catName}`,
              targetPage: 'history',
              createdAt: txDate,
            })
          }
        })
      }

      // 5. Low Balance (<500,000)
      if (dashboardData?.balance !== undefined && dashboardData.balance < 500000) {
        items.push({
          id: 'low-balance',
          type: 'low-balance',
          icon: Wallet,
          iconColor: '#ef4444',
          iconBg: '#fef2f2',
          title: 'Saldo Rendah',
          description: `Saldo tinggal ${formatCurrency(dashboardData.balance)}`,
          targetPage: 'dashboard',
          createdAt: now,
        })
      }

      // Sort by date (newest first) and limit to 10
      items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      const limited = items.slice(0, 10)

      setNotifications(limited)
      cleanupOldReadState(limited)
    } catch {
      // Silently fail - notifications are optional
    }
  }, [])

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void fetchNotifications()
  }, [fetchNotifications])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Calculate unread count
  const unreadCount = notifications.filter((n) => !readState[n.id]).length

  // Mark a single notification as read
  const markAsRead = (id: string) => {
    const newState = { ...readState, [id]: true }
    setReadState(newState)
    saveReadState(newState)
  }

  // Mark all as read
  const markAllAsRead = () => {
    const newState: Record<string, boolean> = {}
    notifications.forEach((n) => {
      newState[n.id] = true
    })
    setReadState(newState)
    saveReadState(newState)
  }

  // Handle notification click
  const handleNotificationClick = (notification: NotificationItem) => {
    markAsRead(notification.id)
    setCurrentPage(notification.targetPage)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={`Notifikasi${unreadCount > 0 ? ` (${unreadCount} belum dibaca)` : ''}`}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        className="w-80 p-0 glass-effect shadow-lg"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-sm font-semibold">Notifikasi</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
              onClick={markAllAsRead}
            >
              <Check className="mr-1 h-3 w-3" />
              Tandai semua dibaca
            </Button>
          )}
        </div>

        {/* Notification list */}
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <Bell className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Tidak ada notifikasi</p>
          </div>
        ) : (
          <ScrollArea className="max-h-80">
            <div className="flex flex-col">
              {notifications.map((notification, idx) => {
                const IconComponent = notification.icon
                const isUnread = !readState[notification.id]

                return (
                  <div key={notification.id}>
                    {idx > 0 && <Separator />}
                    <button
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                        isUnread ? 'bg-emerald-50/50 dark:bg-emerald-950/10' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      {/* Icon */}
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: notification.iconBg }}
                      >
                        <IconComponent className="h-4 w-4" style={{ color: notification.iconColor }} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <p className={`text-xs font-medium ${isUnread ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {notification.title}
                          </p>
                          {isUnread && (
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {notification.description}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {getTimeAgo(notification.createdAt)}
                        </p>
                      </div>
                    </button>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  )
}
