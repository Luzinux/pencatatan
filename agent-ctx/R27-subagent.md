# Task R27 - Financial Reports + Transaction Duplicate

## Task Summary
Add Financial Reports page with monthly PDF-ready report generation + Transaction Duplicate/Template feature

## Work Completed

### Feature 1: Financial Reports Page (Laporan Keuangan)
- **Backend API** (`/src/app/api/reports/route.ts`): GET endpoint accepting `?month=YYYY-MM` returning comprehensive report with summary, expense/income by category, payment method breakdown, daily spending, bills status, savings goals, previous month comparison, and top expenses
- **API Method** (`/src/lib/api.ts`): Added `getReports(month)` method
- **Frontend Component** (`/src/components/reports.tsx`): Full reports UI with 8 visualization sections including summary cards, expense breakdown with colored proportion bars, category analysis table with budget status badges (✅/⚠️/❌), monthly comparison bars, daily spending chart, payment method breakdown, bills/savings summaries, top expenses list, and income breakdown
- **Print Support**: "Cetak Laporan" button triggers `window.print()` with enhanced print CSS in globals.css (A4 page size, color printing, clean borders, page break avoidance)
- **Navigation**: Added FileText icon, "Laporan" menu item in aktivitas group (after Anggaran), added to command palette and mobile bottom nav

### Feature 2: Transaction Duplicate/Template
- **Store** (`/src/lib/store.ts`): Added `TransactionTemplate` interface and `transactionTemplate`/`setTransactionTemplate` state
- **History** (`/src/components/history.tsx`): Added Copy icon duplicate button next to Edit button on each transaction; `handleDuplicate` sets template and navigates to Transaksi page
- **Transaksi** (`/src/components/transaksi.tsx`): Added useEffect that reads `transactionTemplate` from store, pre-fills form (type, amount, category, payment method, note), then clears template

### Files Modified
- `/src/lib/store.ts` - Added 'reports' to Page type, TransactionTemplate interface, template state
- `/src/lib/api.ts` - Added getReports method
- `/src/app/api/reports/route.ts` - New: Reports API endpoint
- `/src/components/reports.tsx` - New: Reports page component
- `/src/app/page.tsx` - Added Reports import, navigation, switch case, title
- `/src/components/command-palette.tsx` - Added Laporan item
- `/src/components/history.tsx` - Added duplicate button and handler
- `/src/components/transaksi.tsx` - Added template pre-fill logic
- `/src/app/globals.css` - Enhanced print CSS styles

### Verification
- `bun run lint` passes with zero errors
