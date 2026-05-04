'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency, getMonthLabel } from '@/lib/format'

interface ReportPrintProps {
  currentMonth: string
}

const MONTH_NAMES_ID: Record<string, string> = {
  '01': 'Januari',
  '02': 'Februari',
  '03': 'Maret',
  '04': 'April',
  '05': 'Mei',
  '06': 'Juni',
  '07': 'Juli',
  '08': 'Agustus',
  '09': 'September',
  '10': 'Oktober',
  '11': 'November',
  '12': 'Desember',
}

export default function ReportPrint({ currentMonth }: ReportPrintProps) {
  const [loading, setLoading] = useState(false)

  const handlePrint = async () => {
    setLoading(true)
    try {
      const [dashboardData, transactions] = await Promise.all([
        api.getDashboard(currentMonth),
        api.getTransactions({ month: currentMonth, type: 'expense' }),
      ])

      const [year, month] = currentMonth.split('-')
      const monthName = MONTH_NAMES_ID[month] || month
      const titleMonth = `${monthName} ${year}`
      const printDate = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })

      const totalExpense = dashboardData.totalExpense || 0
      const totalIncome = dashboardData.totalIncome || 0
      const balance = dashboardData.balance || 0

      // Category breakdown
      const categoryRows = (dashboardData.topCategories || [])
        .filter((tc: any) => tc.category)
        .map((tc: any, idx: number) => {
          const pct = totalExpense > 0 ? ((tc.totalAmount / totalExpense) * 100).toFixed(1) : '0.0'
          return `
            <tr style="${idx % 2 === 0 ? '' : 'background:#f8f9fa'}">
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${tc.category.icon} ${tc.category.name}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatCurrency(tc.totalAmount)}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${pct}%</td>
            </tr>
          `
        })
        .join('')

      // Budget progress
      const budgetRows = (dashboardData.budgetProgress || [])
        .map((item: any, idx: number) => {
          const pct = item.budgetAmount > 0 ? ((item.spent / item.budgetAmount) * 100).toFixed(0) : '0'
          return `
            <tr style="${idx % 2 === 0 ? '' : 'background:#f8f9fa'}">
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${item.categoryIcon} ${item.categoryName}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatCurrency(item.budgetAmount)}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatCurrency(item.spent)}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${pct}%</td>
            </tr>
          `
        })
        .join('')

      // Transactions
      const txRows = (transactions || [])
        .slice(0, 50)
        .map((tx: any, idx: number) => {
          const dateStr = new Date(tx.date).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
          const catName = tx.category?.name || '-'
          const methodName = tx.paymentMethod?.name || '-'
          const note = tx.note || '-'
          return `
            <tr style="${idx % 2 === 0 ? '' : 'background:#f8f9fa'}">
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${dateStr}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${tx.type === 'expense' ? 'Pengeluaran' : tx.type === 'income' ? 'Pemasukan' : 'Transfer'}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${catName}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatCurrency(tx.amount)}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${methodName}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${note}</td>
            </tr>
          `
        })
        .join('')

      // Payment method breakdown
      const pmRows = (dashboardData.paymentMethodBreakdown || [])
        .map((pm: any, idx: number) => {
          return `
            <tr style="${idx % 2 === 0 ? '' : 'background:#f8f9fa'}">
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${pm.paymentMethodName}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatCurrency(pm.totalAmount)}</td>
            </tr>
          `
        })
        .join('')

      const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>DompetKu - Laporan Keuangan ${titleMonth}</title>
  <style>
    @media print {
      body { margin: 0; }
      .no-print { display: none !important; }
    }
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #1a1a2e;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 24px;
      background: #fff;
    }
    h1 { margin: 0 0 4px; font-size: 24px; color: #1a1a2e; }
    h2 { font-size: 16px; color: #4a5568; margin: 0 0 24px; font-weight: 400; }
    h3 { font-size: 14px; color: #2d3748; margin: 24px 0 12px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
    .summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }
    .summary-card {
      background: #f7fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    }
    .summary-card.expense { border-left: 4px solid #ef4444; }
    .summary-card.income { border-left: 4px solid #22c55e; }
    .summary-card.balance { border-left: 4px solid #14b8a6; }
    .summary-label { font-size: 12px; color: #718096; margin-bottom: 4px; }
    .summary-value { font-size: 20px; font-weight: 700; }
    .summary-value.expense { color: #ef4444; }
    .summary-value.income { color: #22c55e; }
    .summary-value.balance { color: #14b8a6; }
    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-card {
      background: #f7fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 16px;
      text-align: center;
    }
    .stat-label { font-size: 11px; color: #718096; }
    .stat-value { font-size: 16px; font-weight: 700; color: #2d3748; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
    th { padding: 10px 12px; text-align: left; background: #edf2f7; border-bottom: 2px solid #cbd5e0; font-weight: 600; font-size: 12px; color: #4a5568; }
    th.right { text-align: right; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #a0aec0; text-align: center; }
    .print-btn {
      position: fixed;
      top: 16px;
      right: 16px;
      background: #10b981;
      color: #fff;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 2px 8px rgba(16,185,129,0.3);
    }
    .print-btn:hover { background: #059669; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">
    <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
    Cetak Laporan
  </button>

  <h1>DompetKu - Laporan Keuangan</h1>
  <h2>Periode: ${titleMonth}</h2>

  <div class="summary-grid">
    <div class="summary-card expense">
      <div class="summary-label">Total Pengeluaran</div>
      <div class="summary-value expense">${formatCurrency(totalExpense)}</div>
    </div>
    <div class="summary-card income">
      <div class="summary-label">Total Pemasukan</div>
      <div class="summary-value income">${formatCurrency(totalIncome)}</div>
    </div>
    <div class="summary-card balance">
      <div class="summary-label">Sisa Uang</div>
      <div class="summary-value balance">${formatCurrency(balance)}</div>
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-label">Rasio Tabungan</div>
      <div class="stat-value">${(dashboardData.savingsRate || 0).toFixed(0)}%</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Rata-rata Harian</div>
      <div class="stat-value">${formatCurrency(dashboardData.dailyAverageExpense || 0)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Jumlah Transaksi</div>
      <div class="stat-value">${dashboardData.transactionCount || 0}</div>
    </div>
  </div>

  ${categoryRows ? `
  <h3>Pengeluaran per Kategori</h3>
  <table>
    <thead>
      <tr><th>Kategori</th><th class="right">Jumlah</th><th class="right">Persentase</th></tr>
    </thead>
    <tbody>${categoryRows}</tbody>
  </table>
  ` : ''}

  ${pmRows ? `
  <h3>Pengeluaran per Metode Pembayaran</h3>
  <table>
    <thead>
      <tr><th>Metode Pembayaran</th><th class="right">Total</th></tr>
    </thead>
    <tbody>${pmRows}</tbody>
  </table>
  ` : ''}

  ${budgetRows ? `
  <h3>Anggaran Bulan Ini</h3>
  <table>
    <thead>
      <tr><th>Kategori</th><th class="right">Anggaran</th><th class="right">Terpakai</th><th class="right">Persentase</th></tr>
    </thead>
    <tbody>${budgetRows}</tbody>
  </table>
  ` : ''}

  ${txRows ? `
  <h3>Transaksi Pengeluaran</h3>
  <table>
    <thead>
      <tr><th>Tanggal</th><th>Jenis</th><th>Kategori</th><th class="right">Jumlah</th><th>Metode</th><th>Catatan</th></tr>
    </thead>
    <tbody>${txRows}</tbody>
  </table>
  ` : ''}

  <div class="footer">Dicetak pada ${printDate} &mdash; DompetKu Pencatatan Pengeluaran</div>
</body>
</html>`

      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(html)
        printWindow.document.close()
      }
    } catch (error) {
      console.error('Error generating report:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      onClick={handlePrint}
      disabled={loading}
    >
      <Printer className="h-4 w-4" />
      {loading ? 'Mempersiapkan...' : 'Cetak Laporan'}
    </Button>
  )
}
