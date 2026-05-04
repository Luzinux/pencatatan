'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { type Page } from '@/lib/store'
import {
  LayoutDashboard,
  BarChart3,
  ArrowLeftRight,
  History,
  Target,
  Tags,
  Heart,
  PiggyBank,
  Receipt,
  CreditCard,
  Plus,
  Search,
} from 'lucide-react'

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  onNavigate: (page: Page) => void
}

interface CommandItem {
  id: string
  label: string
  icon: React.ElementType
  shortcut: string
  category: 'navigasi' | 'aksi'
  page?: Page
  action?: () => void
}

const COMMAND_ITEMS: CommandItem[] = [
  // Navigasi
  { id: 'nav-dashboard', label: 'Dashboard', icon: LayoutDashboard, shortcut: '⌘1', category: 'navigasi', page: 'dashboard' },
  { id: 'nav-analytics', label: 'Analisis', icon: BarChart3, shortcut: '⌘2', category: 'navigasi', page: 'analytics' },
  { id: 'nav-transaksi', label: 'Transaksi', icon: ArrowLeftRight, shortcut: '⌘3', category: 'navigasi', page: 'transaksi' },
  { id: 'nav-history', label: 'History', icon: History, shortcut: '⌘4', category: 'navigasi', page: 'history' },
  { id: 'nav-budget', label: 'Anggaran', icon: Target, shortcut: '⌘5', category: 'navigasi', page: 'budget' },
  { id: 'nav-kategori', label: 'Kategori', icon: Tags, shortcut: '⌘6', category: 'navigasi', page: 'kategori' },
  { id: 'nav-wishlist', label: 'Wishlist', icon: Heart, shortcut: '⌘7', category: 'navigasi', page: 'wishlist' },
  { id: 'nav-savings', label: 'Tabungan', icon: PiggyBank, shortcut: '⌘8', category: 'navigasi', page: 'savings' },
  { id: 'nav-tagihan', label: 'Tagihan', icon: Receipt, shortcut: '⌘9', category: 'navigasi', page: 'tagihan' },
  { id: 'nav-metode', label: 'Metode Bayar', icon: CreditCard, shortcut: '⌘0', category: 'navigasi', page: 'metode' },
  // Aksi
  { id: 'action-add', label: 'Tambah Transaksi', icon: Plus, shortcut: '⌘N', category: 'aksi', page: 'transaksi' },
]

const CATEGORIES = [
  { key: 'navigasi' as const, label: 'Navigasi' },
  { key: 'aksi' as const, label: 'Aksi' },
]

function CommandPaletteInner({ onClose, onNavigate }: Omit<CommandPaletteProps, 'open'>) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Filter items based on query
  const filteredItems = COMMAND_ITEMS.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase())
  )

  // Group filtered items by category
  const groupedItems = CATEGORIES.map((cat) => ({
    ...cat,
    items: filteredItems.filter((item) => item.category === cat.key),
  })).filter((group) => group.items.length > 0)

  // Focus input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // Auto-scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeElement = listRef.current.querySelector('[data-active="true"]')
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [activeIndex])

  function executeItem(item: CommandItem) {
    if (item.page) {
      onNavigate(item.page)
    }
    if (item.action) {
      item.action()
    }
    onClose()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = filteredItems[activeIndex]
      if (item) {
        executeItem(item)
      }
    }
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Command Palette */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="fixed left-1/2 top-[15%] z-[101] w-full max-w-lg -translate-x-1/2 rounded-xl border border-border bg-background shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Palet Perintah"
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActiveIndex(0)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Cari halaman atau perintah..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Cari perintah"
            autoComplete="off"
          />
          <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          className="max-h-72 overflow-y-auto p-2"
          role="listbox"
          aria-label="Daftar perintah"
        >
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Search className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">Tidak ada hasil ditemukan</p>
            </div>
          ) : (
            groupedItems.map((group) => (
              <div key={group.key}>
                <div className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  {group.label}
                </div>
                {group.items.map((item) => {
                  const globalIndex = filteredItems.indexOf(item)
                  const isActive = globalIndex === activeIndex
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      data-active={isActive}
                      onClick={() => executeItem(item)}
                      onMouseEnter={() => setActiveIndex(globalIndex)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                        isActive
                          ? 'bg-muted text-foreground'
                          : 'text-foreground/80 hover:bg-muted/50'
                      }`}
                      role="option"
                      aria-selected={isActive}
                    >
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                        isActive
                          ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                          : 'bg-muted/60 text-muted-foreground'
                      }`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="flex-1 text-left">{item.label}</span>
                      <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border/60 bg-muted/40 px-1.5 text-[10px] font-medium text-muted-foreground/70">
                        {item.shortcut}
                      </kbd>
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t border-border px-4 py-2 flex items-center gap-4 text-[10px] text-muted-foreground/60">
          <span className="flex items-center gap-1">
            <kbd className="inline-flex h-4 items-center rounded border border-border/60 bg-muted/40 px-1 text-[9px]">↑↓</kbd>
            <span>Navigasi</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="inline-flex h-4 items-center rounded border border-border/60 bg-muted/40 px-1 text-[9px]">↵</kbd>
            <span>Pilih</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="inline-flex h-4 items-center rounded border border-border/60 bg-muted/40 px-1 text-[9px]">ESC</kbd>
            <span>Tutup</span>
          </span>
        </div>
      </motion.div>
    </>
  )
}

export function CommandPalette({ open, onClose, onNavigate }: CommandPaletteProps) {
  return (
    <AnimatePresence>
      {open && <CommandPaletteInner onClose={onClose} onNavigate={onNavigate} />}
    </AnimatePresence>
  )
}
