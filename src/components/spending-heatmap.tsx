'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { api } from '@/lib/api'
import { formatCurrency, getMonthYear, getMonthLabel } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Flame,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// ── Types ──────────────────────────────────────────────────────────────────
interface HeatmapDay {
  date: string
  amount: number
  count: number
}

interface HeatmapData {
  month: string
  days: HeatmapDay[]
}

// ── Indonesian month names ─────────────────────────────────────────────────
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const HARI = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

// ── Percentile calculation ─────────────────────────────────────────────────
function getPercentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const index = (p / 100) * (sorted.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sorted[lower]
  return sorted[lower] + (index - lower) * (sorted[upper] - sorted[lower])
}

// ── Get intensity level for a day ──────────────────────────────────────────
type IntensityLevel = 'none' | 'low' | 'medium' | 'high' | 'very-high'

function getIntensityLevel(amount: number, percentiles: { p25: number; p50: number; p75: number }): IntensityLevel {
  if (amount === 0) return 'none'
  if (amount <= percentiles.p25) return 'low'
  if (amount <= percentiles.p50) return 'medium'
  if (amount <= percentiles.p75) return 'high'
  return 'very-high'
}

const INTENSITY_CLASSES: Record<IntensityLevel, string> = {
  'none': 'bg-muted/50 dark:bg-muted/30',
  'low': 'bg-emerald-100 dark:bg-emerald-900/30',
  'medium': 'bg-amber-100 dark:bg-amber-900/30',
  'high': 'bg-orange-100 dark:bg-orange-900/30',
  'very-high': 'bg-red-100 dark:bg-red-900/30',
}

const INTENSITY_BORDER_CLASSES: Record<IntensityLevel, string> = {
  'none': 'border-muted/30',
  'low': 'border-emerald-200 dark:border-emerald-800/40',
  'medium': 'border-amber-200 dark:border-amber-800/40',
  'high': 'border-orange-200 dark:border-orange-800/40',
  'very-high': 'border-red-200 dark:border-red-800/40',
}

// ── Loading Skeleton ───────────────────────────────────────────────────────
function HeatmapSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="h-6 w-48 shimmer-loading rounded-md" />
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="aspect-square shimmer-loading rounded-md" />
        ))}
      </div>
      <div className="flex justify-center gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-4 w-12 shimmer-loading rounded" />
        ))}
      </div>
    </div>
  )
}

// ── Main Spending Heatmap Component ────────────────────────────────────────
export default function SpendingHeatmap({ month }: { month: string }) {
  const [data, setData] = useState<HeatmapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(month)

  const fetchData = useCallback(async (m: string) => {
    setLoading(true)
    try {
      const result = await api.getSpendingHeatmap(m)
      setData(result)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setCurrentMonth(month)
  }, [month])

  useEffect(() => {
    fetchData(currentMonth)
  }, [currentMonth, fetchData])

  const goToPrevMonth = () => {
    const [year, mon] = currentMonth.split('-').map(Number)
    const date = new Date(year, mon - 2, 1)
    setCurrentMonth(getMonthYear(date))
  }

  const goToNextMonth = () => {
    const [year, mon] = currentMonth.split('-').map(Number)
    const date = new Date(year, mon, 1)
    setCurrentMonth(getMonthYear(date))
  }

  // Filter days for the selected month only
  const monthDays = useMemo(() => {
    if (!data?.days) return []
    return data.days.filter((d) => d.date.startsWith(currentMonth))
  }, [data?.days, currentMonth])

  // Calculate percentiles from days with spending > 0
  const percentiles = useMemo(() => {
    const spendingDays = monthDays
      .filter((d) => d.amount > 0)
      .map((d) => d.amount)
    if (spendingDays.length === 0) return { p25: 0, p50: 0, p75: 0 }
    return {
      p25: getPercentile(spendingDays, 25),
      p50: getPercentile(spendingDays, 50),
      p75: getPercentile(spendingDays, 75),
    }
  }, [monthDays])

  // Build calendar grid
  const calendarGrid = useMemo(() => {
    const [year, mon] = currentMonth.split('-').map(Number)
    const firstDay = new Date(year, mon - 1, 1)
    // 0=Sunday, convert to Monday-based: 0=Monday
    let startDow = firstDay.getDay() - 1
    if (startDow < 0) startDow = 6

    const daysInMonth = new Date(year, mon, 0).getDate()

    // Create a map for quick day lookup
    const dayMap = new Map<string, HeatmapDay>()
    for (const d of monthDays) {
      dayMap.set(d.date, d)
    }

    const grid: (HeatmapDay & { day: number; isCurrentMonth: boolean } | null)[] = []

    // Add empty cells for days before the 1st
    for (let i = 0; i < startDow; i++) {
      grid.push(null)
    }

    // Add days of the month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentMonth}-${String(d).padStart(2, '0')}`
      const dayData = dayMap.get(dateStr)
      grid.push({
        date: dateStr,
        amount: dayData?.amount || 0,
        count: dayData?.count || 0,
        day: d,
        isCurrentMonth: true,
      })
    }

    return grid
  }, [currentMonth, monthDays])

  // Summary stats
  const summary = useMemo(() => {
    const spendingDays = monthDays.filter((d) => d.amount > 0)
    const totalSpent = monthDays.reduce((sum, d) => sum + d.amount, 0)
    const dailyAvg = spendingDays.length > 0 ? totalSpent / spendingDays.length : 0

    // Find most expensive day
    let mostExpensiveDay: HeatmapDay | null = null
    for (const d of monthDays) {
      if (d.amount > 0 && (!mostExpensiveDay || d.amount > mostExpensiveDay.amount)) {
        mostExpensiveDay = d
      }
    }

    return {
      totalSpent,
      dailyAvg,
      mostExpensiveDay,
      spendingDaysCount: spendingDays.length,
      totalDays: monthDays.length,
    }
  }, [monthDays])

  const isCurrentMonth = currentMonth === getMonthYear()

  // Format date for tooltip
  const formatTooltipDate = (dateStr: string): string => {
    const [y, m, d] = dateStr.split('-').map(Number)
    return `${d} ${BULAN[m - 1]} ${y}`
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="relative overflow-hidden">
        {/* Top accent line */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-500 via-red-500 to-amber-500" />
        <CardHeader className="pb-2">
          <CollapsibleTrigger asChild>
            <button className="flex w-full items-center justify-between">
              <CardTitle className="flex items-center gap-2.5 text-base">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                  <Flame className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                Peta Panas Pengeluaran 🔥
              </CardTitle>
              <ChevronDown
                className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>
          </CollapsibleTrigger>
        </CardHeader>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <CardContent className="pt-0">
                {loading ? (
                  <HeatmapSkeleton />
                ) : !data ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Flame className="mb-2 h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">Tidak ada data peta panas</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Month navigation */}
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={goToPrevMonth}
                        className="h-7 w-7 rounded-full"
                        aria-label="Bulan sebelumnya"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="min-w-[120px] text-center text-sm font-semibold">
                        {getMonthLabel(currentMonth)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={goToNextMonth}
                        disabled={isCurrentMonth}
                        className="h-7 w-7 rounded-full"
                        aria-label="Bulan berikutnya"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Calendar Grid */}
                    <div className="space-y-1">
                      {/* Day of week headers */}
                      <div className="grid grid-cols-7 gap-1.5">
                        {HARI.map((day) => (
                          <div
                            key={day}
                            className="text-center text-[10px] font-medium text-muted-foreground"
                          >
                            {day}
                          </div>
                        ))}
                      </div>

                      {/* Day cells */}
                      <TooltipProvider delayDuration={200}>
                        <div className="grid grid-cols-7 gap-1.5">
                          {calendarGrid.map((cell, idx) => {
                            if (!cell) {
                              return (
                                <div
                                  key={`empty-${idx}`}
                                  className="aspect-square rounded-md"
                                />
                              )
                            }

                            const intensity = getIntensityLevel(cell.amount, percentiles)
                            const bgClass = INTENSITY_CLASSES[intensity]
                            const borderClass = INTENSITY_BORDER_CLASSES[intensity]

                            return (
                              <Tooltip key={cell.date}>
                                <TooltipTrigger asChild>
                                  <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{
                                      duration: 0.2,
                                      delay: idx * 0.008,
                                    }}
                                    className={`aspect-square rounded-md border ${bgClass} ${borderClass} flex items-center justify-center cursor-default transition-colors hover:ring-2 hover:ring-primary/30`}
                                  >
                                    <span
                                      className={`text-[10px] font-medium ${
                                        intensity === 'very-high'
                                          ? 'text-red-700 dark:text-red-300'
                                          : intensity === 'high'
                                            ? 'text-orange-700 dark:text-orange-300'
                                            : intensity === 'medium'
                                              ? 'text-amber-700 dark:text-amber-300'
                                              : intensity === 'low'
                                                ? 'text-emerald-700 dark:text-emerald-300'
                                                : 'text-muted-foreground/50'
                                      }`}
                                    >
                                      {cell.day}
                                    </span>
                                  </motion.div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  <div className="font-medium">{formatTooltipDate(cell.date)}</div>
                                  {cell.amount > 0 ? (
                                    <div className="text-muted-foreground">
                                      {formatCurrency(cell.amount)} • {cell.count} transaksi
                                    </div>
                                  ) : (
                                    <div className="text-muted-foreground">Tidak ada pengeluaran</div>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            )
                          })}
                        </div>
                      </TooltipProvider>
                    </div>

                    {/* Summary */}
                    <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                      {summary.mostExpensiveDay && (
                        <div className="flex items-center gap-2 text-xs">
                          <Flame className="h-3.5 w-3.5 text-red-500" />
                          <span className="text-muted-foreground">Hari paling boros:</span>
                          <span className="font-semibold">
                            {formatTooltipDate(summary.mostExpensiveDay.date)} ({formatCurrency(summary.mostExpensiveDay.amount)})
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Rata-rata harian:</span>
                        <span className="font-semibold">{formatCurrency(Math.round(summary.dailyAvg))}</span>
                        <span className="text-muted-foreground">
                          ({summary.spendingDaysCount} dari {summary.totalDays} hari)
                        </span>
                      </div>
                    </div>

                    {/* Color Legend */}
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <div className="h-3 w-3 rounded-sm bg-muted/50 dark:bg-muted/30 border border-muted/30" />
                        <span>Tidak ada</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <div className="h-3 w-3 rounded-sm bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/40" />
                        <span>Rendah</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <div className="h-3 w-3 rounded-sm bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/40" />
                        <span>Sedang</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <div className="h-3 w-3 rounded-sm bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800/40" />
                        <span>Tinggi</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <div className="h-3 w-3 rounded-sm bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800/40" />
                        <span>Sangat tinggi</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </Collapsible>
  )
}
