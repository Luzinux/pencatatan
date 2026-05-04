# Task R5 - Budget Per Category Feature

## Summary
Successfully implemented the Budget Per Category feature for DompetKu, an Indonesian monthly expense tracker.

## Changes Made

### 1. Prisma Schema (`prisma/schema.prisma`)
- Added `Budget` model with fields: id, amount, month (YYYY-MM), categoryId, createdAt, updatedAt
- Added `budgets Budget[]` relation to `Category` model
- Ran `db:push` and `prisma generate` to sync

### 2. Budget API Routes
- `src/app/api/budgets/route.ts` - GET (list by month) + POST (upsert budget)
- `src/app/api/budgets/[id]/route.ts` - DELETE budget

### 3. API Helper (`src/lib/api.ts`)
- Added `getBudgets`, `createBudget`, `deleteBudget` methods

### 4. Dashboard API (`src/app/api/dashboard/route.ts`)
- Added `budgetProgress` to response with per-category budget tracking
- Calculates spent per category using groupBy aggregation

### 5. Budget Component (`src/components/budget.tsx`)
- Full budget management UI with:
  - Month navigation (prev/next/current)
  - Summary card (total budget, spent, percentage)
  - Budget cards grid with color-coded progress bars
  - Add/delete budget dialogs
  - Empty state, loading skeleton
  - All text in Indonesian

### 6. Navigation (`src/app/page.tsx` + `src/lib/store.ts`)
- Added 'budget' to Page type
- Added "Anggaran" with Target icon to sidebar (aktivitas group)
- Added Budget component to page content switch

## Lint Status
✅ ESLint passes with zero errors
