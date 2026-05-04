'use client'

import { useAppStore, type Page } from '@/lib/store'
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarInset, SidebarTrigger, SidebarSeparator } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { LayoutDashboard, ArrowLeftRight, History, Tags, Heart, Receipt, CreditCard, Target, Plus, BarChart3, PiggyBank, ArrowLeft, Wallet, Menu, MoreHorizontal, Database, FileText, Bell, TrendingDown, RefreshCw } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { PageTransition } from '@/components/page-transition'
import { NotificationCenter } from '@/components/notification-center'
import { api } from '@/lib/api'
import { formatCurrency, getMonthYear, getMonthLabel } from '@/lib/format'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { CommandPalette } from '@/components/command-palette'
import dynamic from 'next/dynamic'
import { useState, useEffect, useCallback, useRef } from 'react'

// Dynamic imports for page components to reduce initial bundle
const Dashboard = dynamic(() => import('@/components/dashboard'), { ssr: false })
const Transaksi = dynamic(() => import('@/components/transaksi'), { ssr: false })
const HistoryPage = dynamic(() => import('@/components/history'), { ssr: false })
const Kategori = dynamic(() => import('@/components/kategori'), { ssr: false })
const Wishlist = dynamic(() => import('@/components/wishlist'), { ssr: false })
const Tagihan = dynamic(() => import('@/components/tagihan'), { ssr: false })
const Metode = dynamic(() => import('@/components/metode'), { ssr: false })
const Budget = dynamic(() => import('@/components/budget'), { ssr: false })
const Analytics = dynamic(() => import('@/components/analytics'), { ssr: false })
const Savings = dynamic(() => import('@/components/savings'), { ssr: false })
const Recurring = dynamic(() => import('@/components/recurring'), { ssr: false })
const BackupRestore = dynamic(() => import('@/components/backup-restore'), { ssr: false })
const Reports = dynamic(() => import('@/components/reports'), { ssr: false })

const menuItems: { page: Page; label: string; icon: React.ElementType; group: 'aktivitas' | 'manajemen'; shortcut: string; description: string }[] = [
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'aktivitas', shortcut: '⌘1', description: 'Ringkasan keuangan bulanan' },
  { page: 'analytics', label: 'Analisis', icon: BarChart3, group: 'aktivitas', shortcut: '⌘2', description: 'Analisis pola pengeluaran' },
  { page: 'transaksi', label: 'Transaksi', icon: ArrowLeftRight, group: 'aktivitas', shortcut: '⌘3', description: 'Tambah transaksi baru' },
  { page: 'history', label: 'History', icon: History, group: 'aktivitas', shortcut: '⌘4', description: 'Riwayat semua transaksi' },
  { page: 'budget', label: 'Anggaran', icon: Target, group: 'aktivitas', shortcut: '⌘5', description: 'Anggaran per kategori' },
  { page: 'reports', label: 'Laporan', icon: FileText, group: 'aktivitas', shortcut: '⌘R', description: 'Cetak laporan keuangan' },
  { page: 'kategori', label: 'Kategori', icon: Tags, group: 'manajemen', shortcut: '⌘6', description: 'Kelola kategori pemasukan/pengeluaran' },
  { page: 'wishlist', label: 'Wishlist', icon: Heart, group: 'manajemen', shortcut: '⌘7', description: 'Daftar keinginan belanja' },
  { page: 'savings', label: 'Tabungan', icon: PiggyBank, group: 'manajemen', shortcut: '⌘8', description: 'Target tabungan' },
  { page: 'recurring', label: 'Berulang', icon: RefreshCw, group: 'manajemen', shortcut: '⌘E', description: 'Transaksi berulang otomatis' },
  { page: 'tagihan', label: 'Tagihan', icon: Receipt, group: 'manajemen', shortcut: '⌘9', description: 'Tagihan & pembayaran rutin' },
  { page: 'metode', label: 'Metode Bayar', icon: CreditCard, group: 'manajemen', shortcut: '⌘0', description: 'Kelola metode pembayaran' },
  { page: 'backup', label: 'Backup', icon: Database, group: 'manajemen', shortcut: '⌘B', description: 'Backup & pulihkan data' },
]

const BULAN_INDONESIA = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

function formatTanggalIndonesia(): string {
  const now = new Date()
  return `${now.getDate()} ${BULAN_INDONESIA[now.getMonth()]} ${now.getFullYear()}`
}

// ─── Sidebar Balance Widget ────────────────────────────────────────────────────
function SidebarBalanceWidget() {
  const [balance, setBalance] = useState<number | null>(null)
  const currentMonth = getMonthYear()

  useEffect(() => {
    let cancelled = false
    api.getDashboard(currentMonth).then((data: { balance?: number }) => {
      if (!cancelled) setBalance(data.balance ?? 0)
    }).catch(() => {
      if (!cancelled) setBalance(0)
    })
    return () => { cancelled = true }
  }, [currentMonth])

  const monthLabel = getMonthLabel(currentMonth)

  return (
    <div className="mx-3 mb-2 rounded-xl bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-card border border-emerald-100 dark:border-emerald-900/30 p-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-900/40">
          <Wallet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <span className="text-[11px] text-muted-foreground">Sisa Uang</span>
      </div>
      <div className="flex items-baseline gap-1">
        {balance !== null ? (
          <span className={`text-sm font-bold stat-value ${balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatCurrency(balance)}
          </span>
        ) : (
          <span className="text-sm font-bold text-muted-foreground">...</span>
        )}
      </div>
      <span className="text-[10px] text-muted-foreground/70">{monthLabel}</span>
    </div>
  )
}

// ─── Sidebar Quick Stats Mini Bar ─────────────────────────────────────────
function SidebarQuickStats() {
  const [todayExpense, setTodayExpense] = useState<number>(0)
  const [weekExpense, setWeekExpense] = useState<number>(0)

  useEffect(() => {
    let cancelled = false
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - dayOfWeek)
    weekStart.setHours(0, 0, 0, 0)

    api.getTransactions().then((data: any) => {
      if (cancelled) return
      const txList = Array.isArray(data) ? data : data.transactions || []
      const today = txList
        .filter((t: any) => t.type === 'expense' && new Date(t.date).toISOString().split('T')[0] === todayStr)
        .reduce((s: number, t: any) => s + t.amount, 0)
      const week = txList
        .filter((t: any) => t.type === 'expense' && new Date(t.date) >= weekStart)
        .reduce((s: number, t: any) => s + t.amount, 0)
      setTodayExpense(today)
      setWeekExpense(week)
    }).catch(() => {})

    return () => { cancelled = true }
  }, [])

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-2.5 py-1.5">
      <div className="flex items-center gap-1.5 min-w-0">
        <TrendingDown className="h-3 w-3 text-red-500 shrink-0" />
        <span className="text-[10px] text-muted-foreground truncate">Hari ini</span>
        <span className="text-[10px] font-semibold text-red-600 dark:text-red-400 truncate">{formatCurrency(todayExpense)}</span>
      </div>
      <div className="w-px h-3 bg-border shrink-0" />
      <div className="flex items-center gap-1.5 min-w-0">
        <Receipt className="h-3 w-3 text-amber-500 shrink-0" />
        <span className="text-[10px] text-muted-foreground truncate">Minggu</span>
        <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 truncate">{formatCurrency(weekExpense)}</span>
      </div>
    </div>
  )
}

// ─── App Sidebar ───────────────────────────────────────────────────────────────
function AppSidebar() {
  const { currentPage, setCurrentPage, setSidebarOpen } = useAppStore()
  const aktivitasItems = menuItems.filter(i => i.group === 'aktivitas')
  const manajemenItems = menuItems.filter(i => i.group === 'manajemen')
  const [urgentBillCount, setUrgentBillCount] = useState(0)

  // Fetch urgent bill count
  const fetchUrgentBills = useCallback(() => {
    api.getBills().then((bills: Array<{ status: string; dueDate: string }>) => {
      const now = new Date()
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      const count = bills.filter(b => {
        if (b.status !== 'pending') return false
        const due = new Date(b.dueDate)
        return due <= sevenDaysFromNow
      }).length
      setUrgentBillCount(count)
    }).catch(() => {
      setUrgentBillCount(0)
    })
  }, [])

  useEffect(() => {
    fetchUrgentBills()
  }, [fetchUrgentBills, currentPage])

  return (
    <Sidebar collapsible="offcanvas" className="bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <SidebarHeader className="border-b px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold text-sm shadow-sm">
            Rp
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">DompetKu</span>
            <span className="text-xs text-muted-foreground">Pencatatan Keuangan</span>
          </div>
          <div className="ml-auto">
            <NotificationCenter />
          </div>
        </div>
      </SidebarHeader>
      <SidebarSeparator />

      {/* Balance Widget */}
      <div className="pt-2">
        <SidebarBalanceWidget />
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Aktivitas</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {aktivitasItems.map((item) => {
                const isActive = currentPage === item.page
                return (
                  <SidebarMenuItem key={item.page}>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton
                            isActive={isActive}
                            onClick={() => {
                              setCurrentPage(item.page)
                              setSidebarOpen(false)
                            }}
                            tooltip={item.label}
                            className={`sidebar-menu-hover ${isActive
                              ? "font-semibold border-l-2 border-emerald-500 pl-1.5"
                              : "pl-3"
                            }`}
                          >
                            <div className="relative">
                              <item.icon className="size-4" />
                              {isActive && (
                                <span className="absolute -left-1.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              )}
                            </div>
                            <span className="flex-1">{item.label}</span>
                            <span className="hidden lg:inline-flex items-center justify-center h-4 min-w-[24px] px-1 rounded text-[10px] font-medium text-muted-foreground/60 bg-muted/50 border border-border/50">
                              {item.shortcut}
                            </span>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs max-w-[200px]">
                          <p className="font-medium">{item.label}</p>
                          <p className="text-muted-foreground mt-0.5">{item.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {/* Divider with ••• decoration */}
        <div className="flex items-center justify-center py-1">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
          <span className="px-2 text-[8px] text-muted-foreground/40 select-none">•••</span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>Manajemen</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {manajemenItems.map((item) => {
                const isActive = currentPage === item.page
                return (
                  <SidebarMenuItem key={item.page}>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton
                            isActive={isActive}
                            onClick={() => {
                              setCurrentPage(item.page)
                              setSidebarOpen(false)
                            }}
                            tooltip={item.label}
                            className={`sidebar-menu-hover ${isActive
                              ? "font-semibold border-l-2 border-emerald-500 pl-1.5"
                              : "pl-3"
                            }`}
                          >
                            <div className="relative">
                              <item.icon className="size-4" />
                              {isActive && (
                                <span className="absolute -left-1.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              )}
                              {/* Notification badge for Tagihan */}
                              {item.page === 'tagihan' && urgentBillCount > 0 && (
                                <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white bell-pulse">
                                  {urgentBillCount > 9 ? '9+' : urgentBillCount}
                                </span>
                              )}
                            </div>
                            <span className="flex-1">{item.label}</span>
                            {/* Bill count badge on text side for clarity */}
                            {item.page === 'tagihan' && urgentBillCount > 0 && (
                              <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-red-100 dark:bg-red-900/40 text-[9px] font-bold text-red-600 dark:text-red-400">
                                {urgentBillCount}
                              </span>
                            )}
                            {item.page !== 'tagihan' && (
                              <span className="hidden lg:inline-flex items-center justify-center h-4 min-w-[24px] px-1 rounded text-[10px] font-medium text-muted-foreground/60 bg-muted/50 border border-border/50">
                                {item.shortcut}
                              </span>
                            )}
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs max-w-[200px]">
                          <p className="font-medium">{item.label}</p>
                          <p className="text-muted-foreground mt-0.5">{item.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="px-4 py-3 border-t">
        <div className="flex flex-col gap-2">
          {/* Quick Stats Mini Bar */}
          <SidebarQuickStats />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">DompetKu v1.0</span>
            <ThemeToggle />
          </div>
          <span className="text-[10px] text-muted-foreground/60">{formatTanggalIndonesia()}</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

// ─── Page Content ──────────────────────────────────────────────────────────────
function PageContent() {
  const { currentPage } = useAppStore()

  switch (currentPage) {
    case 'dashboard':
      return <Dashboard />
    case 'analytics':
      return <Analytics />
    case 'transaksi':
      return <Transaksi />
    case 'history':
      return <HistoryPage />
    case 'budget':
      return <Budget />
    case 'reports':
      return <Reports />
    case 'kategori':
      return <Kategori />
    case 'wishlist':
      return <Wishlist />
    case 'savings':
      return <Savings />
    case 'recurring':
      return <Recurring />
    case 'tagihan':
      return <Tagihan />
    case 'metode':
      return <Metode />
    case 'backup':
      return <BackupRestore />
    default:
      return <Dashboard />
  }
}

// ─── Page Header ───────────────────────────────────────────────────────────────
function PageHeader() {
  const { currentPage, setCurrentPage } = useAppStore()
  const titles: Record<Page, string> = {
    dashboard: 'Dashboard',
    analytics: 'Analisis',
    transaksi: 'Transaksi Baru',
    history: 'Riwayat Transaksi',
    budget: 'Anggaran',
    reports: 'Laporan Keuangan',
    kategori: 'Kategori',
    wishlist: 'Wishlist',
    savings: 'Tabungan',
    recurring: 'Transaksi Berulang',
    tagihan: 'Tagihan',
    metode: 'Metode Pembayaran',
    backup: 'Backup & Pulihkan',
  }

  if (currentPage === 'dashboard') return null

  return (
    <div className="relative">
      <div className="flex items-center gap-2 px-4 pt-4 md:px-6">
        {currentPage !== 'dashboard' && (
          <button
            onClick={() => setCurrentPage('dashboard')}
            className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-muted transition-colors focus-ring-animated"
            aria-label="Kembali ke Dashboard"
          >
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <h1 className="text-lg font-semibold title-fade-in">{titles[currentPage]}</h1>
      </div>
      {/* Gradient border bottom */}
      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  )
}

// ─── Quick Add FAB (hidden on mobile when bottom nav is visible) ───────────────
function QuickAddFAB() {
  const { currentPage, setCurrentPage } = useAppStore()
  if (currentPage === 'transaksi') return null
  // Hidden on mobile (md:hidden) - bottom nav handles it
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setCurrentPage('transaksi')}
            className="fixed bottom-6 right-6 z-50 hidden md:flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 hover:scale-110 active:scale-95 transition-all focus-ring-animated press-scale"
            aria-label="Tambah Transaksi"
          >
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-full bg-emerald-600 fab-pulse-ring" />
            <Plus className="h-6 w-6 relative z-10" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" className="text-xs">
          Tambah Transaksi (Ctrl+N)
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ─── Mobile Bottom Navigation ─────────────────────────────────────────────────
const bottomNavItems: { page: Page; label: string; icon: React.ElementType }[] = [
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { page: 'transaksi', label: 'Transaksi', icon: ArrowLeftRight },
  { page: 'history', label: 'History', icon: History },
  { page: 'budget', label: 'Anggaran', icon: Target },
]

const moreMenuItems: { page: Page; label: string; icon: React.ElementType }[] = [
  { page: 'analytics', label: 'Analisis', icon: BarChart3 },
  { page: 'reports', label: 'Laporan', icon: FileText },
  { page: 'kategori', label: 'Kategori', icon: Tags },
  { page: 'wishlist', label: 'Wishlist', icon: Heart },
  { page: 'savings', label: 'Tabungan', icon: PiggyBank },
  { page: 'recurring', label: 'Berulang', icon: RefreshCw },
  { page: 'tagihan', label: 'Tagihan', icon: Receipt },
  { page: 'metode', label: 'Metode Bayar', icon: CreditCard },
  { page: 'backup', label: 'Backup', icon: Database },
]

function MobileBottomNav() {
  const { currentPage, setCurrentPage } = useAppStore()
  const [moreOpen, setMoreOpen] = useState(false)

  // Check if current page is in the "more" menu
  const isInMoreMenu = moreMenuItems.some(item => item.page === currentPage)

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-around h-16 px-1">
          {bottomNavItems.map((item) => {
            const isActive = currentPage === item.page
            return (
              <button
                key={item.page}
                onClick={() => setCurrentPage(item.page)}
                className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] h-full transition-colors ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium leading-tight">{item.label}</span>
              </button>
            )
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] h-full transition-colors ${isInMoreMenu ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}
            aria-label="Lainnya"
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-tight">Lainnya</span>
          </button>
        </div>
      </nav>

      {/* More Menu Sheet */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh]">
          <SheetHeader className="pb-2">
            <SheetTitle className="text-base">Menu Lainnya</SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">Pilih halaman yang ingin dibuka</SheetDescription>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-3 p-4 pt-2">
            {moreMenuItems.map((item) => {
              const isActive = currentPage === item.page
              return (
                <button
                  key={item.page}
                  onClick={() => {
                    setCurrentPage(item.page)
                    setMoreOpen(false)
                  }}
                  className={`flex flex-col items-center gap-2 rounded-xl p-3 transition-colors ${isActive ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground'}`}
                  aria-label={item.label}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              )
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

// ─── Main App ──────────────────────────────────────────────────────────────────
export default function Home() {
  const { currentPage, setCurrentPage } = useAppStore()
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  const toggleCommandPalette = useCallback(() => {
    setCommandPaletteOpen((prev) => !prev)
  }, [])

  const closeCommandPalette = useCallback(() => {
    setCommandPaletteOpen(false)
  }, [])

  useKeyboardShortcuts({
    setCurrentPage,
    onToggleCommandPalette: toggleCommandPalette,
    onEscape: closeCommandPalette,
  })

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <PageHeader />
        <div className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6">
          <PageTransition pageKey={currentPage}>
            <PageContent />
          </PageTransition>
        </div>
      </SidebarInset>
      <QuickAddFAB />
      <MobileBottomNav />
      <CommandPalette
        open={commandPaletteOpen}
        onClose={closeCommandPalette}
        onNavigate={setCurrentPage}
      />
    </SidebarProvider>
  )
}
