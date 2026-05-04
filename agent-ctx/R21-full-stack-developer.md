# Task R21 - Financial Health Score and Smart Insights

## Agent: full-stack-developer

## Summary
Added Financial Health Score (Skor Keuangan), Smart Insights (Wawasan Cerdas), and enhanced summary cards to the Dashboard component.

## Changes Made

### 1. Financial Health Score (`/src/components/dashboard.tsx`)
- `calculateHealthScore()`: Computes 0-100 score from 4 factors (Savings Rate, Budget Adherence, Bill Timeliness, Emergency Fund)
- `HealthScoreGauge`: Large 180x180 SVG circular gauge with gradient (red→amber→green), score number + status label in center
- `HealthScoreBreakdown`: 4 mini progress bars showing individual factor scores with icons and color coding
- Score normalized when budget data missing

### 2. Smart Insights (`/src/components/dashboard.tsx`)
- `generateInsights()`: Generates 3-5 dynamic insight cards from dashboard data
- `InsightCard`: Colored icon circle + text + optional navigation arrow, slide-in animation via framer-motion
- 7 insight types: expense increase, low savings, budget near limit, overdue bills, budget overspent, positive balance growth, general tip

### 3. Enhanced Summary Cards (`/src/components/dashboard.tsx`)
- `GradientBorderCard`: Animated gradient border wrapper (1px, CSS @property animation)
- `Sparkline`: Simple SVG path trend line (6 months) in each summary card
- `MonthComparisonText`: "vs bulan lalu X%" with colored trend indicator

### 4. CSS Animation (`/src/app/globals.css`)
- `@property --border-angle` with `gradient-border-rotate` keyframe
- `.animate-gradient-border` utility class (4s linear infinite)

### 5. Skeleton Loading
- Updated `DashboardSkeleton` with health score + insights grid skeleton

## Quality Checks
- ESLint: zero errors
- TypeScript: zero errors in dashboard.tsx
- Dark mode: fully supported
- All text: Indonesian
- Existing functionality: preserved
