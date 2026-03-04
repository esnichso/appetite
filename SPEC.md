# Meal Planner - Specification

## Tech Stack
- **Framework**: Next.js
- **Backend/Database**: Supabase
- **Storage**: Supabase Storage (for meal photos)
- **Authentication**: Supabase Auth (personal/private access)

## Navigation
- Top header navigation bar with links to: Meals, Planner, Shopping List

---

## Pages

### 1. Meals Page (`/meals`)
- Grid/list view of all saved meals
- Each meal card shows: photo (if available), name
- If no photo, card shows only the name
- Search bar with partial matching on ingredients
- "Add Meal" button → navigates to new meal editor
- Click meal card → navigates to `/meals/[id]`

### 2. Meal Editor (`/meals/[id]`)
- Form fields:
  - Meal name (text input)
  - Photo upload (optional, stored in Supabase Storage)
  - Ingredients list (add/remove items)
  - Recipe (textarea)
- Save button (creates or updates meal)
- Delete button (removes meal)

### 3. Week Planner (`/planner`)
- Header: Week navigation with prev/next buttons, displays current week by default
- 7-day grid (Monday - Sunday)
- Each day shows:
  - Assigned meals (unlimited number)
  - Small "+" button to add meals
- Two ways to add meals to a day:
  1. Drag and drop from a searchable meal list
  2. Click the "+" button → opens popup with search to find and select meals
- Remove meals from days (click X or drag out)
- Sidebar: Live shopping list preview
  - Aggregated ingredients for that week
  - Checkboxes: checked items move to bottom and gray out

### 4. Shopping List Page (`/shopping-list`)
- Full shopping list for selected week
- Aggregated ingredients from planned meals
- Checkbox behavior: checked items move to bottom, grayed out
- Manual add custom item option

---

## Data Behavior

### Week Planner
- Always displays current week by default
- Scrollable to past and future weeks
- Days are Monday through Sunday

### Shopping List
- Live preview in planner sidebar (same functionality as full page)
- Full page at `/shopping-list`
- Checked items: move to bottom of list, grayed out
- Items merged by name with combined quantities

### Search
- Partial matching on ingredients (case-insensitive)

### Authentication
- Supabase Auth for personal access
- Private app - only authorized user can access

---

## Database Schema (Supabase)

### meals
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Meal name |
| image_url | text | URL to photo (optional) |
| recipe | text | Recipe instructions |
| created_at | timestamp | Creation timestamp |
| user_id | uuid | Foreign key to auth.users |

### ingredients
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| meal_id | uuid | Foreign key to meals |
| name | text | Ingredient name |
| quantity | text | Quantity (e.g., "2 eggs", "500g") |

### week_plans
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Foreign key to auth.users |
| date | date | The date of the plan |
| meal_id | uuid | Foreign key to meals |

### shopping_items
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Foreign key to auth.users |
| name | text | Item name |
| quantity | text | Quantity |
| is_custom | boolean | True if manually added |
| is_checked | boolean | Checkbox state |
| week_start | date | Start of the week |
