export interface Meal {
  id: string
  name: string
  image_url: string | null
  recipe: string | null
  created_at: string
  user_id: string
}

export interface Ingredient {
  id: string
  meal_id: string
  name: string
  quantity: string
}

export interface WeekPlan {
  id: string
  user_id: string
  date: string
  meal_id: string
  meal?: Meal
}

export interface ShoppingItem {
  id: string
  user_id: string
  name: string
  quantity: string
  is_custom: boolean
  is_checked: boolean
  week_start: string
}

export type Database = {
  public: {
    Tables: {
      meals: {
        Row: Meal
        Insert: Omit<Meal, 'id' | 'created_at'>
        Update: Partial<Omit<Meal, 'id' | 'created_at'>>
      }
      ingredients: {
        Row: Ingredient
        Insert: Omit<Ingredient, 'id'>
        Update: Partial<Omit<Ingredient, 'id'>>
      }
      week_plans: {
        Row: WeekPlan
        Insert: Omit<WeekPlan, 'id'>
        Update: Partial<Omit<WeekPlan, 'id'>>
      }
      shopping_items: {
        Row: ShoppingItem
        Insert: Omit<ShoppingItem, 'id'>
        Update: Partial<Omit<ShoppingItem, 'id'>>
      }
    }
  }
}
