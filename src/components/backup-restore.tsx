'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { Download, Upload, Database, Loader2, CheckCircle2, AlertTriangle, FileJson, HardDrive, Shield } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'

interface ImportResult {
  categories: number
  paymentMethods: number
  transactions: number
  wishlists: number
  bills: number
  budgets: number
  savingsGoals: number
}

interface DataSummary {
  categories: number
  paymentMethods: number
  transactions: number
  wishlists: number
  bills: number
  budgets: number
  savingsGoals: number
}

const LAST_BACKUP_KEY = 'dompetku-last-backup'

// ── Animation Variants ─────────────────────────────────────────────────────
const cardVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 12 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
}

export default function BackupRestore() {
  const [downloading, setDownloading] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [dataSummary, setDataSummary] = useState<DataSummary | null>(null)
  const [backupSize, setBackupSize] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Get last backup date from localStorage
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(LAST_BACKUP_KEY)
    if (stored) setLastBackupDate(stored)
  }, [])

  // Fetch data summary on mount
  useEffect(() => {
    async function fetchSummary() {
      try {
        // Fetch counts from each API
        const [categories, paymentMethods, transactions, wishlists, bills, budgets, savings] = await Promise.all([
          api.getCategories().then((d) => Array.isArray(d) ? d.length : 0).catch(() => 0),
          api.getPaymentMethods().then((d) => Array.isArray(d) ? d.length : 0).catch(() => 0),
          api.getTransactions().then((d) => Array.isArray(d) ? d.length : 0).catch(() => 0),
          api.getWishlists().then((d) => Array.isArray(d) ? d.length : 0).catch(() => 0),
          api.getBills().then((d) => Array.isArray(d) ? d.length : 0).catch(() => 0),
          api.getBudgets().then((d) => Array.isArray(d) ? d.length : 0).catch(() => 0),
          api.getSavings().then((d) => Array.isArray(d) ? d.length : 0).catch(() => 0),
        ])
        setDataSummary({
          categories,
          paymentMethods,
          transactions,
          wishlists,
          bills,
          budgets,
          savingsGoals: savings,
        })

        // Estimate backup size (rough estimate: ~500 bytes per record)
        const totalRecords = categories + paymentMethods + transactions + wishlists + bills + budgets + savings
        const estimatedBytes = totalRecords * 500 + 200 // +200 for metadata
        if (estimatedBytes < 1024) {
          setBackupSize(`~${estimatedBytes} B`)
        } else if (estimatedBytes < 1024 * 1024) {
          setBackupSize(`~${Math.round(estimatedBytes / 1024)} KB`)
        } else {
          setBackupSize(`~${(estimatedBytes / (1024 * 1024)).toFixed(1)} MB`)
        }
      } catch {
        // Silently fail - summary is optional
      }
    }
    fetchSummary()
  }, [])

  const handleDownload = useCallback(async () => {
    setDownloading(true)
    setDownloadProgress(0)

    // Simulate brief progress animation
    const progressInterval = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + Math.random() * 25
      })
    }, 150)

    try {
      const response = await fetch('/api/backup')
      if (!response.ok) {
        throw new Error('Gagal mengunduh backup')
      }
      const blob = await response.blob()

      // Complete progress
      clearInterval(progressInterval)
      setDownloadProgress(100)

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `dompetku-backup-${new Date().toISOString().split('T')[0]}.json`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/)
        if (match) filename = match[1]
      }

      // Update actual backup size
      const sizeBytes = blob.size
      if (sizeBytes < 1024) {
        setBackupSize(`${sizeBytes} B`)
      } else if (sizeBytes < 1024 * 1024) {
        setBackupSize(`${Math.round(sizeBytes / 1024)} KB`)
      } else {
        setBackupSize(`${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`)
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
      const now = new Date().toISOString()
      localStorage.setItem(LAST_BACKUP_KEY, now)
      setLastBackupDate(now)

      toast({
        title: 'Backup berhasil',
        description: `File ${filename} berhasil diunduh`,
      })
    } catch (error) {
      clearInterval(progressInterval)
      toast({
        title: 'Gagal mengunduh',
        description: error instanceof Error ? error.message : 'Terjadi kesalahan saat mengunduh backup',
        variant: 'destructive',
      })
    } finally {
      setTimeout(() => {
        setDownloadProgress(0)
        setDownloading(false)
      }, 600)
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

  // Build data summary text
  const buildSummaryText = () => {
    if (!dataSummary) return null
    const parts = []
    if (dataSummary.transactions > 0) parts.push(`${dataSummary.transactions} transaksi`)
    if (dataSummary.categories > 0) parts.push(`${dataSummary.categories} kategori`)
    if (dataSummary.paymentMethods > 0) parts.push(`${dataSummary.paymentMethods} metode`)
    if (dataSummary.budgets > 0) parts.push(`${dataSummary.budgets} anggaran`)
    if (dataSummary.savingsGoals > 0) parts.push(`${dataSummary.savingsGoals} tabungan`)
    if (dataSummary.wishlists > 0) parts.push(`${dataSummary.wishlists} wishlist`)
    if (dataSummary.bills > 0) parts.push(`${dataSummary.bills} tagihan`)
    return parts.join(', ')
  }

  const summaryText = buildSummaryText()

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-3"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
          <Database className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Backup & Pulihkan</h2>
          <p className="text-sm text-muted-foreground">Kelola data keuangan Anda</p>
        </div>
      </motion.div>

      {/* Backup Section */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.1 }}
      >
        <Card className="border-emerald-200/60 dark:border-emerald-900/30">
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
            {/* Data summary */}
            {summaryText && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <HardDrive className="h-4 w-4" />
                <span>Akan dicadangkan: {summaryText}</span>
              </div>
            )}

            {/* Backup size estimate */}
            {backupSize && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileJson className="h-4 w-4" />
                <span>Format: JSON • Ukuran: {backupSize}</span>
              </div>
            )}

            {!backupSize && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileJson className="h-4 w-4" />
                <span>Format: JSON • Termasuk kategori, transaksi, wishlist, tagihan, anggaran, tabungan</span>
              </div>
            )}

            {/* Last backup date with visual status indicator */}
            {lastBackupDate && (
              <div className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20 p-2.5">
                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Backup terakhir</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-500">{formatDate(lastBackupDate)}</p>
                </div>
              </div>
            )}

            {/* Download progress */}
            {downloading && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Mengunduh backup...</span>
                  <span className="text-muted-foreground">{Math.round(downloadProgress)}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-full rounded-full bg-emerald-500"
                    initial={{ width: '0%' }}
                    animate={{ width: `${downloadProgress}%` }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  />
                </div>
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
      </motion.div>

      {/* Restore Section - Danger Zone */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.2 }}
      >
        <Card className="border-red-300/60 dark:border-red-900/40 ring-1 ring-red-200/30 dark:ring-red-900/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                <Shield className="h-4.5 w-4.5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  Pulihkan Data
                  <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px] px-1.5 py-0">
                    Zona Berbahaya
                  </Badge>
                </CardTitle>
                <CardDescription>Impor data dari file backup sebelumnya</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Warning - Danger Zone */}
            <div className="flex items-start gap-2.5 rounded-lg border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/20 p-3">
              <AlertTriangle className="h-4.5 w-4.5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  Peringatan: Data akan diganti
                </p>
                <p className="text-xs text-red-700 dark:text-red-300">
                  Memulihkan data akan menghapus dan mengganti semua data yang ada saat ini. Pastikan Anda sudah membuat backup terlebih dahulu.
                </p>
              </div>
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
              className="border-dashed border-red-300 dark:border-red-800/50 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-700 dark:text-red-400"
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
      </motion.div>

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
                <p className="text-red-600 dark:text-red-400 font-medium">
                  Semua data yang ada saat ini akan dihapus dan diganti dengan data dari file backup. Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedFile(null)}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Ya, Pulihkan Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
