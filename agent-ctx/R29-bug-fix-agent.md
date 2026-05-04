# Task R29 - Bug Fix Agent

## Task
Fix Budget API RpNaN bug and undefined button labels + formatCurrency NaN handling

## Changes Made

### 1. /src/app/api/budgets/route.ts
- Added `enrichBudget()` helper function that calculates `spent` and `percentage` for each budget
- GET endpoint: When month filter provided, uses efficient single `db.transaction.groupBy` query for all category spending, then maps to enriched format. Falls back to per-budget enrichment when no month filter.
- POST endpoint: After create/update, calls `enrichBudget()` to return enriched format
- Both endpoints now return: `{ id, categoryId, categoryName, categoryIcon, budgetAmount, spent, percentage }`

### 2. /src/lib/format.ts
- Updated `formatCurrency()` to handle NaN/undefined/null inputs gracefully
- Added guard: `const num = typeof amount === 'number' && !isNaN(amount) ? amount : 0`
- Prevents "RpNaN" display

## Verification
- `bun run lint` passes with zero errors
