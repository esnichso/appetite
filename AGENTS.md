# Agent Guidelines for Meal Planner Project

## Project Overview
- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Styling**: CSS Modules or Tailwind (check existing code)

---

## Build Commands

```bash
npm install
npm run dev
npm run build
npm run lint
npm run typecheck
npx tsc --noEmit

# Tests
npm run test
npm run test -- path/to/test.file.ts
npm run test -- path/to/test.file.ts --watch
npm run test -- --coverage
```

---

## Implementation Strategy (Follow This Order)

### Phase 1: Setup
- 1.1 Initialize Next.js project with TypeScript
- 1.2 Set up Supabase project and get credentials
- 1.3 Configure Supabase client and auth
- 1.4 Create database tables (run SQL)
- 1.5 Set up Supabase Storage bucket for meal photos

### Phase 2: Core Infrastructure (2-3 hours)
- 2.1 Create types for meals, ingredients, week plans
- 2.2 Build Supabase service functions (CRUD for meals, ingredients, week plans)
- 2.3 Create auth context/hook
- 2.4 Build protected route wrapper
- 2.5 Create layout with header navigation

### Phase 3: Meals Feature (3-4 hours)
- 3.1 Build meals list page (`/meals`)
- 3.2 Add meal card component with image/name
- 3.3 Add search functionality (partial match)
- 3.4 Build meal editor page (`/meals/[id]`)
- 3.5 Add photo upload to meal editor
- 3.6 Add ingredient management

### Phase 4: Week Planner (4-5 hours)
- 4.1 Build week navigation logic (current week, prev/next)
- 4.2 Create 7-day grid layout
- 4.3 Add meal assignment functionality
- 4.4 Implement drag and drop
- 4.5 Build popup search modal for adding meals
- 4.6 Add shopping list sidebar

### Phase 5: Shopping List (2-3 hours)
- 5.1 Create ingredient aggregation logic
- 5.2 Build shopping list preview in planner sidebar
- 5.3 Build full shopping list page (`/shopping-list`)
- 5.4 Implement checkbox behavior (move to bottom, gray out)
- 5.5 Add manual item creation

### Phase 6: Polish (1-2 hours)
- 6.1 Add loading states
- 6.2 Add error handling
- 6.3 Responsive design for mobile
- 6.4 Test all flows

---

## Code Style Guidelines

### General Principles
- Keep components small and focused (single responsibility)
- Use functional components with hooks
- Prefer composition over inheritance
- Handle loading and error states explicitly

### TypeScript
- Use explicit types for function parameters and return values
- Use `interface` for object shapes, `type` for unions/aliases
- Enable strict mode in tsconfig
- Never use `any` - use `unknown` if type is truly unknown
- Use generated Supabase types from `database.types.ts`

### Naming Conventions
- **Components**: PascalCase (`MealCard.tsx`, `WeekGrid.tsx`)
- **Files**: kebab-case (`supabase-client.ts`, `meal-utils.ts`)
- **Functions**: camelCase, verb prefixes (`getMeals`, `createMeal`)
- **Constants**: SCREAMING_SNAKE_CASE for enums
- **Interfaces**: PascalCase (`Meal`, `WeekPlan`)

### Imports
```typescript
// External libraries
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

// Internal modules - absolute imports preferred
import { supabase } from '@/lib/supabase'
import type { Meal } from '@/types'
import { MealCard } from '@/components/MealCard'
```

### React/Next.js Patterns
- Use Server Components by default in App Router
- Use `'use client'` directive only when needed (hooks, event handlers, browser APIs)
- Colocate related files (component + tests + styles)
- Use composition for shared logic (custom hooks)
- Memoize with `useMemo` and `useCallback`

### Supabase Patterns
- Always handle loading and error states from Supabase calls
- Use Row Level Security (RLS) policies - filter by `auth.uid()`
- Use generated types: `import type { Database } from '@/types/database'`
- Use Supabase service functions in `/lib` folder

### Error Handling
- Use try/catch with async functions
- Provide user-friendly error messages
- Log errors appropriately (console.error for dev)
- Create custom error types for domain-specific errors

---

## Project Structure
```
/app           # Next.js App Router pages
  /meals       # Meals pages (/[id] editor)
  /planner     # Week planner
  /shopping-list
/components    # Reusable UI components
/lib           # Supabase client, utilities
/types         # TypeScript types
```

---

## Database Schema (Supabase)

### meals: id (uuid), name (text), image_url (text), recipe (text), created_at (timestamp), user_id (uuid)
### ingredients: id (uuid), meal_id (uuid), name (text), quantity (text)
### week_plans: id (uuid), user_id (uuid), date (date), meal_id (uuid)
### shopping_items: id (uuid), user_id (uuid), name (text), quantity (text), is_custom (boolean), is_checked (boolean), week_start (date)

---

## Git Workflow
- Branch naming: `feature/<name>`, `fix/<name>`, `refactor/<scope>`
- Process: branch from main → commit → push → PR → squash merge

---

## Before Writing Code
1. Read SPEC.md to understand requirements
2. Check existing code patterns
3. Plan component structure
4. Design data flow and state management

---

## After Writing Code
1. Run lint: `npm run lint`
2. Run typecheck: `npm run typecheck`
3. Test the feature manually
4. Verify no console errors

---

## Key Features to Implement
1. **Meals Page** (`/meals`) - Grid/list view, search by ingredients
2. **Meal Editor** (`/meals/[id]`) - Create/edit meals with photo upload
3. **Week Planner** (`/planner`) - 7-day grid, drag & drop, shopping list sidebar
4. **Shopping List** (`/shopping-list`) - Aggregated ingredients, checkboxes
5. **Authentication** - Supabase Auth for private access

---

## Cursor/Copilot Rules
No additional cursor or copilot rules found. If you add rules in `.cursor/rules/` or `.github/copilot-instructions.md`, include them in future updates to this file.
