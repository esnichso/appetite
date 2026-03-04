# Meal Planner - Build Plan

## Git Workflow

### Branch Naming
- `feature/<feature-name>` - New features
- `fix/<issue-name>` - Bug fixes
- `refactor/<scope>` - Code refactoring

### Process
1. Create branch from `main`: `git checkout -b feature/meals-page`
2. Make commits with clear messages: `git commit -m "add meals page with grid layout"`
3. Push branch: `git push -u origin feature/meals-page`
4. Create PR when feature is complete
5. Squash merge to main

---

## Build Order

### Phase 1: Setup (1-2 hours)
- [ ] 1.1 Initialize Next.js project with TypeScript
- [ ] 1.2 Set up Supabase project and get credentials
- [ ] 1.3 Configure Supabase client and auth
- [ ] 1.4 Create database tables (run SQL)
- [ ] 1.5 Set up Supabase Storage bucket for meal photos

### Phase 2: Core Infrastructure (2-3 hours)
- [ ] 2.1 Create types for meals, ingredients, week plans
- [ ] 2.2 Build Supabase service functions (CRUD for meals, ingredients, week plans)
- [ ] 2.3 Create auth context/hook
- [ ] 2.4 Build protected route wrapper
- [ ] 2.5 Create layout with header navigation

### Phase 3: Meals Feature (3-4 hours)
- [ ] 3.1 Build meals list page (`/meals`)
- [ ] 3.2 Add meal card component with image/name
- [ ] 3.3 Add search functionality (partial match)
- [ ] 3.4 Build meal editor page (`/meals/[id]`)
- [ ] 3.5 Add photo upload to meal editor
- [ ] 3.6 Add ingredient management

### Phase 4: Week Planner (4-5 hours)
- [ ] 4.1 Build week navigation logic (current week, prev/next)
- [ ] 4.2 Create 7-day grid layout
- [ ] 4.3 Add meal assignment functionality
- [ ] 4.4 Implement drag and drop
- [ ] 4.5 Build popup search modal for adding meals
- [ ] 4.6 Add shopping list sidebar

### Phase 5: Shopping List (2-3 hours)
- [ ] 5.1 Create ingredient aggregation logic
- [ ] 5.2 Build shopping list preview in planner sidebar
- [ ] 5.3 Build full shopping list page (`/shopping-list`)
- [ ] 5.4 Implement checkbox behavior (move to bottom, gray out)
- [ ] 5.5 Add manual item creation

### Phase 6: Polish (1-2 hours)
- [ ] 6.1 Add loading states
- [ ] 6.2 Add error handling
- [ ] 6.3 Responsive design for mobile
- [ ] 6.4 Test all flows

---

## Implementation Guidelines

### Before Writing Code
1. Read SPEC.md to understand requirements
2. Check existing code patterns in the project
3. Plan component structure

### While Writing Code
1. Use TypeScript for all files
2. Follow existing code style and conventions
3. Keep components small and focused
4. Use Supabase types from generated types
5. Handle loading and error states

### After Writing Code
1. Run lint: `npm run lint` (or check package.json for script)
2. Run typecheck: `npm run typecheck` or `npx tsc --noEmit`
3. Test the feature manually

### Code Organization
```
/app               # Next.js App Router pages
  /meals           # Meals pages
  /planner         # Week planner
  /shopping-list   # Shopping list
/components        # Reusable UI components
/lib               # Supabase client, utils
/types             # TypeScript types
```

### Supabase Tips
- Enable RLS (Row Level Security) on all tables
- Policies should filter by `auth.uid()`
- Use generated TypeScript types from Supabase
