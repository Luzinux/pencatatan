'use client'

import { useAppStore, type Page } from '@/lib/store'
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarInset, SidebarTrigger, SidebarSeparator, SidebarGroup as SidebarGroupComponent } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { LayoutDashboard, ArrowLeftRight, History, Tags, Heart, Receipt, CreditCard, Target, Plus, BarChart3, PiggyBank, ArrowLeft } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { PageTransition } from '@/components/page-transition'
import dynamic from 'next/dynamic'

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

const menuItems: { page: Page; label: string; icon: React.ElementType; group: 'aktivitas' | 'manajemen'; shortcut: string }[] = [
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'aktivitas', shortcut: '⌘1' },
  { page: 'analytics', label: 'Analisis', icon: BarChart3, group: 'aktivitas', shortcut: '⌘2' },
  { page: 'transaksi', label: 'Transaksi', icon: ArrowLeftRight, group: 'aktivitas', shortcut: '⌘3' },
  { page: 'history', label: 'History', icon: History, group: 'aktivitas', shortcut: '⌘4' },
  { page: 'budget', label: 'Anggaran', icon: Target, group: 'aktivitas', shortcut: '⌘5' },
  { page: 'kategori', label: 'Kategori', icon: Tags, group: 'manajemen', shortcut: '⌘6' },
  { page: 'wishlist', label: 'Wishlist', icon: Heart, group: 'manajemen', shortcut: '⌘7' },
  { page: 'savings', label: 'Tabungan', icon: PiggyBank, group: 'manajemen', shortcut: '⌘8' },
  { page: 'tagihan', label: 'Tagihan', icon: Receipt, group: 'manajemen', shortcut: '⌘9' },
  { page: 'metode', label: 'Metode Bayar', icon: CreditCard, group: 'manajemen', shortcut: '⌘0' },
]

const BULAN_INDONESIA = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

function formatTanggalIndonesia(): string {
  const now = new Date()
  return `${now.getDate()} ${BULAN_INDONESIA[now.getMonth()]} ${now.getFullYear()}`
}

function AppSidebar() {
  const { currentPage, setCurrentPage, setSidebarOpen } = useAppStore()
  const aktivitasItems = menuItems.filter(i => i.group === 'aktivitas')
  const manajemenItems = menuItems.filter(i => i.group === 'manajemen')

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
        </div>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Aktivitas</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {aktivitasItems.map((item) => {
                const isActive = currentPage === item.page
                return (
                  <SidebarMenuItem key={item.page}>
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
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>Manajemen</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {manajemenItems.map((item) => {
                const isActive = currentPage === item.page
                return (
                  <SidebarMenuItem key={item.page}>
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
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="px-4 py-3 border-t">
        <div className="flex flex-col gap-1.5">
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
    case 'kategori':
      return <Kategori />
    case 'wishlist':
      return <Wishlist />
    case 'savings':
      return <Savings />
    case 'tagihan':
      return <Tagihan />
    case 'metode':
      return <Metode />
    default:
      return <Dashboard />
  }
}

function PageHeader() {
  const { currentPage, setCurrentPage } = useAppStore()
  const titles: Record<Page, string> = {
    dashboard: 'Dashboard',
    analytics: 'Analisis',
    transaksi: 'Transaksi Baru',
    history: 'Riwayat Transaksi',
    budget: 'Anggaran',
    kategori: 'Kategori',
    wishlist: 'Wishlist',
    savings: 'Tabungan',
    tagihan: 'Tagihan',
    metode: 'Metode Pembayaran',
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

function QuickAddFAB() {
  const { currentPage, setCurrentPage } = useAppStore()
  if (currentPage === 'transaksi') return null
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setCurrentPage('transaksi')}
            className="fixed bottom-6 right-6 z-50 flex md:hidden h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 hover:scale-110 active:scale-95 transition-all focus-ring-animated"
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

export default function Home() {
  const { currentPage } = useAppStore()
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <PageHeader />
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <PageTransition pageKey={currentPage}>
            <PageContent />
          </PageTransition>
        </div>
      </SidebarInset>
      <QuickAddFAB />
    </SidebarProvider>
  )
}
