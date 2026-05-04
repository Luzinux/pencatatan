'use client'

import { useState, useRef, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { Download, Upload, Database, Loader2, CheckCircle2, AlertTriangle, FileJson } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ImportResult {
  categories: number
  paymentMethods: number
  transactions: number
  wishlists: number
  bills: number
  budgets: number
  savingsGoals: number
}

const LAST_BACKUP_KEY = 'dompetku-last-backup'

export default function BackupRestore() {
  const [downloading, setDownloading] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Get last backup date from localStorage
  const lastBackupDate = typeof window !== 'undefined'
    ? localStorage.getItem(LAST_BACKUP_KEY)
    : null

  const handleDownload = useCallback(async () => {
    setDownloading(true)
    try {
      const response = await fetch('/api/backup')
      if (!response.ok) {
        throw new Error('Gagal mengunduh backup')
      }
      const blob = await response.blob()

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `dompetku-backup-${new Date().toISOString().split('T')[0]}.json`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/)
        if (match) filename = match[1]
      }

      // Trigger browser download
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Save backup date
      localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString())

      toast({
        title: 'Backup berhasil',
        description: `File ${filename} berhasil diunduh`,
      })
    } catch (error) {
      toast({
        title: 'Gagal mengunduh',
        description: error instanceof Error ? error.message : 'Terjadi kesalahan saat mengunduh backup',
        variant: 'destructive',
      })
    } finally {
      setDownloading(false)
    }
  }, [toast])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setImportResult(null)
      setConfirmOpen(true)
    }
    // Reset input so same file can be selected again
    e.target.value = ''
  }, [])

  const handleRestore = useCallback(async () => {
    if (!selectedFile) return

    setConfirmOpen(false)
    setRestoring(true)
    setImportResult(null)

    try {
      const text = await selectedFile.text()
      const data = JSON.parse(text)

      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Gagal memulihkan data')
      }

      setImportResult(result.imported)

      toast({
        title: 'Data berhasil dipulihkan',
        description: 'Semua data dari backup telah diimpor',
      })
    } catch (error) {
      toast({
        title: 'Gagal memulihkan',
        description: error instanceof Error ? error.message : 'Terjadi kesalahan saat memulihkan data',
        variant: 'destructive',
      })
    } finally {
      setRestoring(false)
      setSelectedFile(null)
    }
  }, [selectedFile, toast])

  const formatDate = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
          <Database className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Backup & Pulihkan</h2>
          <p className="text-sm text-muted-foreground">Kelola data keuangan Anda</p>
        </div>
      </div>

      {/* Backup Section */}
      <Card className="border-border/60">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <Download className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-base">Cadangkan Data</CardTitle>
              <CardDescription>Unduh semua data keuangan Anda sebagai file JSON</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Data info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileJson className="h-4 w-4" />
            <span>Format: JSON • Termasuk kategori, transaksi, wishlist, tagihan, anggaran, tabungan</span>
          </div>

          {/* Last backup date */}
          {lastBackupDate && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Backup terakhir: {formatDate(lastBackupDate)}</span>
            </div>
          )}

          {/* Download button */}
          <Button
            onClick={handleDownload}
            disabled={downloading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {downloading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Mengunduh...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Unduh Backup
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Restore Section */}
      <Card className="border-border/60">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Upload className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-base">Pulihkan Data</CardTitle>
              <CardDescription>Impor data dari file backup sebelumnya</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Warning */}
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/20 p-3">
            <AlertTriangle className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              ⚠️ Memulihkan data akan mengganti semua data yang ada. Pastikan Anda sudah membuat backup terlebih dahulu.
            </p>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
            aria-label="Pilih file backup"
          />

          {/* Select file button */}
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={restoring}
            variant="outline"
            className="border-dashed"
          >
            {restoring ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Memulihkan...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Pilih File Backup
              </>
            )}
          </Button>

          {/* Import result */}
          {importResult && (
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/20 p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-medium">Data berhasil dipulihkan!</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between px-2 py-1 rounded bg-emerald-100/50 dark:bg-emerald-900/20">
                  <span className="text-muted-foreground">Kategori</span>
                  <span className="font-medium">{importResult.categories}</span>
                </div>
                <div className="flex justify-between px-2 py-1 rounded bg-emerald-100/50 dark:bg-emerald-900/20">
                  <span className="text-muted-foreground">Metode Bayar</span>
                  <span className="font-medium">{importResult.paymentMethods}</span>
                </div>
                <div className="flex justify-between px-2 py-1 rounded bg-emerald-100/50 dark:bg-emerald-900/20">
                  <span className="text-muted-foreground">Transaksi</span>
                  <span className="font-medium">{importResult.transactions}</span>
                </div>
                <div className="flex justify-between px-2 py-1 rounded bg-emerald-100/50 dark:bg-emerald-900/20">
                  <span className="text-muted-foreground">Wishlist</span>
                  <span className="font-medium">{importResult.wishlists}</span>
                </div>
                <div className="flex justify-between px-2 py-1 rounded bg-emerald-100/50 dark:bg-emerald-900/20">
                  <span className="text-muted-foreground">Tagihan</span>
                  <span className="font-medium">{importResult.bills}</span>
                </div>
                <div className="flex justify-between px-2 py-1 rounded bg-emerald-100/50 dark:bg-emerald-900/20">
                  <span className="text-muted-foreground">Anggaran</span>
                  <span className="font-medium">{importResult.budgets}</span>
                </div>
                <div className="flex justify-between px-2 py-1 rounded bg-emerald-100/50 dark:bg-emerald-900/20 col-span-2">
                  <span className="text-muted-foreground">Tabungan</span>
                  <span className="font-medium">{importResult.savingsGoals}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Konfirmasi Pemulihan Data
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Apakah Anda yakin ingin memulihkan data dari file <strong>{selectedFile?.name}</strong>?
                </p>
                <p className="text-amber-600 dark:text-amber-400 font-medium">
                  Semua data yang ada saat ini akan dihapus dan diganti dengan data dari file backup. Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedFile(null)}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Ya, Pulihkan Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
