# Task R9 - Savings Goals (Tabungan) Feature

## Task
Add a new "Tabungan" (Savings Goals) feature with database model, API routes, and rich UI component.

## What Was Done

### Database
- Added `SavingsGoal` model to `prisma/schema.prisma`
- Added `savingsGoals SavingsGoal[]` relation to `PaymentMethod` model
- Ran `db:push` to sync schema

### API Routes
- `GET /api/savings` - List all savings goals with payment method
- `POST /api/savings` - Create new savings goal
- `PUT /api/savings/[id]` - Update savings goal
- `DELETE /api/savings/[id]` - Delete savings goal
- `POST /api/savings/[id]/deposit` - Add deposit (auto-completes goal, creates income transaction)

### Frontend
- Created `/src/components/savings.tsx` with full UI
- Updated navigation in `/src/app/page.tsx`
- Updated store and API helper

## Key Files Modified
- `prisma/schema.prisma`
- `src/app/api/savings/route.ts` (new)
- `src/app/api/savings/[id]/route.ts` (new)
- `src/app/api/savings/[id]/deposit/route.ts` (new)
- `src/components/savings.tsx` (new)
- `src/lib/store.ts`
- `src/lib/api.ts`
- `src/app/page.tsx`

## Verification
- `bun run lint` passes with zero errors
- Dev server running without errors
