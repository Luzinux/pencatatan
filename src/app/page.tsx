'use client'

import { useAppStore, type Page } from '@/lib/store'
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarInset, SidebarTrigger, SidebarSeparator, SidebarGroup as SidebarGroupComponent } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { LayoutDashboard, ArrowLeftRight, History, Tags, Heart, Receipt, CreditCard, Target, PanelLeft, Plus } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
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

const menuItems: { page: Page; label: string; icon: React.ElementType; group: 'aktivitas' | 'manajemen' }[] = [
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'aktivitas' },
  { page: 'transaksi', label: 'Transaksi', icon: ArrowLeftRight, group: 'aktivitas' },
  { page: 'history', label: 'History', icon: History, group: 'aktivitas' },
  { page: 'budget', label: 'Anggaran', icon: Target, group: 'aktivitas' },
  { page: 'kategori', label: 'Kategori', icon: Tags, group: 'manajemen' },
  { page: 'wishlist', label: 'Wishlist', icon: Heart, group: 'manajemen' },
  { page: 'tagihan', label: 'Tagihan', icon: Receipt, group: 'manajemen' },
  { page: 'metode', label: 'Metode Bayar', icon: CreditCard, group: 'manajemen' },
]

function AppSidebar() {
  const { currentPage, setCurrentPage, setSidebarOpen } = useAppStore()
  const aktivitasItems = menuItems.filter(i => i.group === 'aktivitas')
  const manajemenItems = menuItems.filter(i => i.group === 'manajemen')

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-sm">
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
              {aktivitasItems.map((item) => (
                <SidebarMenuItem key={item.page}>
                  <SidebarMenuButton
                    isActive={currentPage === item.page}
                    onClick={() => {
                      setCurrentPage(item.page)
                      setSidebarOpen(false)
                    }}
                    tooltip={item.label}
                  >
                    <item.icon className="size-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>Manajemen</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {manajemenItems.map((item) => (
                <SidebarMenuItem key={item.page}>
                  <SidebarMenuButton
                    isActive={currentPage === item.page}
                    onClick={() => {
                      setCurrentPage(item.page)
                      setSidebarOpen(false)
                    }}
                    tooltip={item.label}
                  >
                    <item.icon className="size-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">DompetKu v1.0</span>
          <ThemeToggle />
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
    case 'tagihan':
      return <Tagihan />
    case 'metode':
      return <Metode />
    default:
      return <Dashboard />
  }
}

function PageHeader() {
  const { currentPage } = useAppStore()
  const titles: Record<Page, string> = {
    dashboard: 'Dashboard',
    transaksi: 'Transaksi Baru',
    history: 'Riwayat Transaksi',
    budget: 'Anggaran',
    kategori: 'Kategori',
    wishlist: 'Wishlist',
    tagihan: 'Tagihan',
    metode: 'Metode Pembayaran',
  }

  if (currentPage === 'dashboard') return null

  return (
    <div className="flex items-center gap-2 px-4 pt-4 md:px-6">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <h1 className="text-lg font-semibold">{titles[currentPage]}</h1>
    </div>
  )
}

function QuickAddFAB() {
  const { currentPage, setCurrentPage } = useAppStore()
  if (currentPage === 'transaksi') return null
  return (
    <button
      onClick={() => setCurrentPage('transaksi')}
      className="fixed bottom-6 right-6 z-50 flex md:hidden h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 active:scale-95 transition-all"
      aria-label="Tambah Transaksi"
    >
      <Plus className="h-6 w-6" />
    </button>
  )
}

export default function Home() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <PageHeader />
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <PageContent />
        </div>
      </SidebarInset>
      <QuickAddFAB />
    </SidebarProvider>
  )
}
