import { createClient } from '@/lib/supabase'
import type { Meal, Ingredient, WeekPlan, ShoppingItem } from '@/types/database'

const supabase = createClient()

export async function getMeals(userId: string): Promise<Meal[]> {
  const { data, error } = await supabase
    .from('meals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getMeal(id: string): Promise<Meal | null> {
  const { data, error } = await supabase
    .from('meals')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createMeal(meal: Omit<Meal, 'id' | 'created_at'>): Promise<Meal> {
  const { data, error } = await supabase
    .from('meals')
    .insert(meal)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateMeal(id: string, meal: Partial<Omit<Meal, 'id' | 'created_at'>>): Promise<Meal> {
  const { data, error } = await supabase
    .from('meals')
    .update(meal)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteMeal(id: string): Promise<void> {
  const { error } = await supabase
    .from('meals')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function getIngredients(mealId: string): Promise<Ingredient[]> {
  const { data, error } = await supabase
    .from('ingredients')
    .select('*')
    .eq('meal_id', mealId)
  if (error) throw error
  return data || []
}

export async function getIngredientsByMealIds(mealIds: string[]): Promise<Ingredient[]> {
  if (mealIds.length === 0) return []
  const { data, error } = await supabase
    .from('ingredients')
    .select('*')
    .in('meal_id', mealIds)
  if (error) throw error
  return data || []
}

export async function createIngredient(ingredient: Omit<Ingredient, 'id'>): Promise<Ingredient> {
  const { data, error } = await supabase
    .from('ingredients')
    .insert(ingredient)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteIngredients(mealId: string): Promise<void> {
  const { error } = await supabase
    .from('ingredients')
    .delete()
    .eq('meal_id', mealId)
  if (error) throw error
}

export async function createIngredients(ingredients: Omit<Ingredient, 'id'>[]): Promise<Ingredient[]> {
  const { data, error } = await supabase
    .from('ingredients')
    .insert(ingredients)
    .select()
  if (error) throw error
  return data || []
}

export async function getWeekPlans(userId: string, startDate: string, endDate: string): Promise<WeekPlan[]> {
  const { data, error } = await supabase
    .from('week_plans')
    .select('*, meal:meals(*)')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date')
  if (error) throw error
  return data || []
}

export async function createWeekPlan(plan: Omit<WeekPlan, 'id'>): Promise<WeekPlan> {
  const { data, error } = await supabase
    .from('week_plans')
    .insert(plan)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteWeekPlan(id: string): Promise<void> {
  const { error } = await supabase
    .from('week_plans')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function getShoppingItems(userId: string, weekStart: string): Promise<ShoppingItem[]> {
  const { data, error } = await supabase
    .from('shopping_items')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .order('is_checked', { ascending: true })
    .order('name')
  if (error) throw error
  return data || []
}

export async function createShoppingItem(item: Omit<ShoppingItem, 'id'>): Promise<ShoppingItem> {
  const { data, error } = await supabase
    .from('shopping_items')
    .insert(item)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateShoppingItem(id: string, item: Partial<Omit<ShoppingItem, 'id'>>): Promise<ShoppingItem> {
  const { data, error } = await supabase
    .from('shopping_items')
    .update(item)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteShoppingItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('shopping_items')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function searchMealsByIngredient(userId: string, query: string): Promise<Meal[]> {
  const { data: ingredients, error } = await supabase
    .from('ingredients')
    .select('meal_id')
    .ilike('name', `%${query}%`)
  
  if (error) throw error
  if (!ingredients?.length) return []

  const mealIds = [...new Set(ingredients.map(i => i.meal_id))]
  
  const { data, error: mealsError } = await supabase
    .from('meals')
    .select('*')
    .eq('user_id', userId)
    .in('id', mealIds)
  
  if (mealsError) throw mealsError
  return data || []
}
