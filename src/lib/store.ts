import { create } from 'zustand'

export type Page = 'dashboard' | 'analytics' | 'transaksi' | 'history' | 'budget' | 'reports' | 'kategori' | 'wishlist' | 'tagihan' | 'metode' | 'savings' | 'backup'

export interface TransactionTemplate {
  type: string
  amount: number
  categoryId?: string
  paymentMethodId?: string
  note?: string
}

interface AppState {
  currentPage: Page
  setCurrentPage: (page: Page) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  transactionTemplate?: TransactionTemplate
  setTransactionTemplate: (template?: TransactionTemplate) => void
}

export const useAppStore = create<AppState>((set) => ({
  currentPage: 'dashboard',
  setCurrentPage: (page) => set({ currentPage: page }),
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  transactionTemplate: undefined,
  setTransactionTemplate: (template) => set({ transactionTemplate: template }),
}))
