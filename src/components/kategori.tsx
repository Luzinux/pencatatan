'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Plus, Pencil, Trash2, Tag, ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'

// ── Types ──────────────────────────────────────────────────────────────────
interface Category {
  id: string
  name: string
  icon: string
  type: string
  createdAt: string
  updatedAt: string
}

interface FormData {
  name: string
  icon: string
  type: string
}

// ── Emoji suggestions ──────────────────────────────────────────────────────
const EMOJI_SUGGESTIONS = [
  '🍕', '🚗', '🏠', '💡', '🛒', '💊', '🎬', '📱', '👕', '🎓',
  '✈️', '🏋️', '🎁', '🐕', '💄', '🔧', '🚌', '☕', '📖', '🎵',
  '💰', '💵', '📈', '🏦', '💼', '🎯', '💎', '🪙', '🎰', '🏆',
]

// ── Loading Skeleton ───────────────────────────────────────────────────────
function CategoryGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-2 rounded-xl border p-4">
          <Skeleton className="h-10 w-10 rounded-md" />
          <Skeleton className="h-4 w-20" />
          <div className="flex gap-1">
            <Skeleton className="h-7 w-7 rounded-md" />
            <Skeleton className="h-7 w-7 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Empty State ────────────────────────────────────────────────────────────
function EmptyCategoryState({ type, onAdd }: { type: string; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
      <div className="mb-3 rounded-full bg-muted p-4">
        <Tag className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="mb-1 text-sm font-medium text-muted-foreground">
        Belum ada kategori {type === 'expense' ? 'pengeluaran' : 'pemasukan'}
      </p>
      <p className="mb-4 text-xs text-muted-foreground">
        Tambahkan kategori untuk mengelompokkan transaksi
      </p>
      <Button variant="outline" size="sm" onClick={onAdd}>
        <Plus className="mr-1 h-4 w-4" />
        Tambah Kategori
      </Button>
    </div>
  )
}

// ── Category Card ──────────────────────────────────────────────────────────
function CategoryCard({
  category,
  onEdit,
  onDelete,
}: {
  category: Category
  onEdit: (cat: Category) => void
  onDelete: (cat: Category) => void
}) {
  return (
    <Card className="group relative cursor-default overflow-hidden border py-0 transition-all hover:border-foreground/20 hover:shadow-md">
      <CardContent className="flex flex-col items-center gap-2 p-4">
        {/* Emoji Icon */}
        <span className="text-3xl leading-none" role="img" aria-label={category.name}>
          {category.icon || '📝'}
        </span>

        {/* Name */}
        <p className="max-w-full truncate text-center text-sm font-medium">
          {category.name}
        </p>

        {/* Action Buttons (visible on hover) */}
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEdit(category)}
            aria-label={`Edit ${category.name}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => onDelete(category)}
            aria-label={`Hapus ${category.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Main Kategori Component ────────────────────────────────────────────────
export default function Kategori() {
  const { toast } = useToast()

  // State
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    icon: '📝',
    type: 'expense',
  })
  const [saving, setSaving] = useState(false)

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ── Fetch Categories ───────────────────────────────────────────────────
  const fetchCategories = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getCategories()
      setCategories(data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal memuat kategori'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  // ── Derived Data ───────────────────────────────────────────────────────
  const expenseCategories = categories.filter((c) => c.type === 'expense')
  const incomeCategories = categories.filter((c) => c.type === 'income')

  // ── Dialog Handlers ────────────────────────────────────────────────────
  const openAddDialog = (type?: string) => {
    setEditingCategory(null)
    setFormData({
      name: '',
      icon: '📝',
      type: type || 'expense',
    })
    setDialogOpen(true)
  }

  const openEditDialog = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      icon: category.icon,
      type: category.type,
    })
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingCategory(null)
    setSaving(false)
  }

  const handleSave = async () => {
    // Validation
    if (!formData.name.trim()) {
      toast({
        title: 'Validasi Gagal',
        description: 'Nama kategori wajib diisi',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      if (editingCategory) {
        await api.updateCategory(editingCategory.id, {
          name: formData.name.trim(),
          icon: formData.icon || '📝',
          type: formData.type,
        })
        toast({
          title: 'Berhasil',
          description: 'Kategori berhasil diperbarui',
        })
      } else {
        await api.createCategory({
          name: formData.name.trim(),
          icon: formData.icon || '📝',
          type: formData.type,
        })
        toast({
          title: 'Berhasil',
          description: 'Kategori baru berhasil ditambahkan',
        })
      }
      closeDialog()
      fetchCategories()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal menyimpan kategori'
      toast({
        title: 'Gagal',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // ── Delete Handlers ────────────────────────────────────────────────────
  const openDeleteConfirm = (category: Category) => {
    setDeleteTarget(category)
  }

  const closeDeleteConfirm = () => {
    setDeleteTarget(null)
    setDeleting(false)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return

    setDeleting(true)
    try {
      await api.deleteCategory(deleteTarget.id)
      toast({
        title: 'Berhasil',
        description: `Kategori "${deleteTarget.name}" berhasil dihapus`,
      })
      closeDeleteConfirm()
      fetchCategories()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal menghapus kategori'
      toast({
        title: 'Gagal',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 rounded-full bg-destructive/10 p-4">
          <Tag className="h-8 w-8 text-destructive" />
        </div>
        <p className="mb-2 text-lg font-semibold text-destructive">Oops!</p>
        <p className="mb-4 text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={fetchCategories}>
          Coba Lagi
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Kategori</h2>
        <Button onClick={() => openAddDialog()} size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Tambah Kategori
        </Button>
      </div>

      {/* ── Loading State ──────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-8">
          <div>
            <Skeleton className="mb-4 h-6 w-48" />
            <CategoryGridSkeleton />
          </div>
          <div>
            <Skeleton className="mb-4 h-6 w-48" />
            <CategoryGridSkeleton />
          </div>
        </div>
      ) : (
        <>
          {/* ── Kategori Pengeluaran ────────────────────────────────────── */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <div className="rounded-full bg-red-100 p-1.5 dark:bg-red-900/30">
                <ArrowDownLeft className="h-4 w-4 text-red-500" />
              </div>
              <h3 className="text-base font-semibold text-red-600 dark:text-red-400">
                Kategori Pengeluaran
              </h3>
              <span className="text-xs text-muted-foreground">
                ({expenseCategories.length})
              </span>
            </div>

            {expenseCategories.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {expenseCategories.map((cat) => (
                  <CategoryCard
                    key={cat.id}
                    category={cat}
                    onEdit={openEditDialog}
                    onDelete={openDeleteConfirm}
                  />
                ))}

                {/* Quick add card */}
                <button
                  onClick={() => openAddDialog('expense')}
                  className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/20 p-4 text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                >
                  <Plus className="h-6 w-6" />
                  <span className="text-xs">Tambah</span>
                </button>
              </div>
            ) : (
              <EmptyCategoryState type="expense" onAdd={() => openAddDialog('expense')} />
            )}
          </section>

          {/* ── Kategori Pemasukan ─────────────────────────────────────── */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <div className="rounded-full bg-green-100 p-1.5 dark:bg-green-900/30">
                <ArrowUpRight className="h-4 w-4 text-green-500" />
              </div>
              <h3 className="text-base font-semibold text-green-600 dark:text-green-400">
                Kategori Pemasukan
              </h3>
              <span className="text-xs text-muted-foreground">
                ({incomeCategories.length})
              </span>
            </div>

            {incomeCategories.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {incomeCategories.map((cat) => (
                  <CategoryCard
                    key={cat.id}
                    category={cat}
                    onEdit={openEditDialog}
                    onDelete={openDeleteConfirm}
                  />
                ))}

                {/* Quick add card */}
                <button
                  onClick={() => openAddDialog('income')}
                  className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/20 p-4 text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                >
                  <Plus className="h-6 w-6" />
                  <span className="text-xs">Tambah</span>
                </button>
              </div>
            ) : (
              <EmptyCategoryState type="income" onAdd={() => openAddDialog('income')} />
            )}
          </section>
        </>
      )}

      {/* ── Add/Edit Dialog ──────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Kategori' : 'Tambah Kategori Baru'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Icon Preview */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-5xl leading-none" role="img" aria-label={formData.name || 'Ikon'}>
                {formData.icon || '📝'}
              </span>
              <p className="text-xs text-muted-foreground">Pratinjau ikon</p>
            </div>

            {/* Icon Input */}
            <div className="space-y-2">
              <Label htmlFor="category-icon">Ikon (Emoji)</Label>
              <Input
                id="category-icon"
                value={formData.icon}
                onChange={(e) => setFormData((prev) => ({ ...prev, icon: e.target.value }))}
                placeholder="Masukkan emoji, misalnya 🍕"
                className="text-center text-2xl"
              />
              {/* Emoji Suggestions */}
              <div className="flex flex-wrap gap-1.5">
                {EMOJI_SUGGESTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, icon: emoji }))}
                    className={`rounded-md p-1.5 text-lg transition-colors hover:bg-muted ${
                      formData.icon === emoji ? 'bg-primary/10 ring-1 ring-primary' : ''
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Name Input */}
            <div className="space-y-2">
              <Label htmlFor="category-name">Nama Kategori</Label>
              <Input
                id="category-name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Misalnya: Makanan & Minuman"
              />
            </div>

            {/* Type Select */}
            <div className="space-y-2">
              <Label>Tipe</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">
                    <span className="flex items-center gap-2">
                      <ArrowDownLeft className="h-4 w-4 text-red-500" />
                      Pengeluaran
                    </span>
                  </SelectItem>
                  <SelectItem value="income">
                    <span className="flex items-center gap-2">
                      <ArrowUpRight className="h-4 w-4 text-green-500" />
                      Pemasukan
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={saving}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Menyimpan...
                </>
              ) : editingCategory ? (
                'Simpan Perubahan'
              ) : (
                'Tambah Kategori'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ──────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && closeDeleteConfirm()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kategori?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus kategori &quot;{deleteTarget?.name}&quot;?
              Kategori ini mungkin digunakan di beberapa transaksi. Menghapus kategori tidak akan
              menghapus transaksi yang sudah ada, tetapi transaksi tersebut akan kehilangan kategori.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Menghapus...
                </>
              ) : (
                'Hapus'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
