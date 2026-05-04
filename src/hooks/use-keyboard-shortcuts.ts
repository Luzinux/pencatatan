'use client'

import { useEffect } from 'react'
import { type Page } from '@/lib/store'

interface UseKeyboardShortcutsOptions {
  setCurrentPage: (page: Page) => void
  onToggleCommandPalette: () => void
  onEscape?: () => void
}

// Mapping of digit keys to pages
const DIGIT_PAGE_MAP: Record<string, Page> = {
  '1': 'dashboard',
  '2': 'analytics',
  '3': 'transaksi',
  '4': 'history',
  '5': 'budget',
  '6': 'kategori',
  '7': 'wishlist',
  '8': 'savings',
  '9': 'tagihan',
  '0': 'metode',
}

export function useKeyboardShortcuts({
  setCurrentPage,
  onToggleCommandPalette,
  onEscape,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isMod = event.metaKey || event.ctrlKey

      // Cmd/Ctrl + K → Open command palette
      if (isMod && event.key === 'k') {
        event.preventDefault()
        onToggleCommandPalette()
        return
      }

      // Cmd/Ctrl + N → Navigate to Transaksi (quick add)
      if (isMod && event.key === 'n') {
        event.preventDefault()
        setCurrentPage('transaksi')
        return
      }

      // Cmd/Ctrl + B → Navigate to Backup
      if (isMod && event.key === 'b') {
        event.preventDefault()
        setCurrentPage('backup')
        return
      }

      // Cmd/Ctrl + 1-9, 0 → Navigate to pages
      if (isMod && event.key in DIGIT_PAGE_MAP) {
        event.preventDefault()
        setCurrentPage(DIGIT_PAGE_MAP[event.key])
        return
      }

      // Escape → Close command palette / dialogs
      if (event.key === 'Escape') {
        onEscape?.()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setCurrentPage, onToggleCommandPalette, onEscape])
}
