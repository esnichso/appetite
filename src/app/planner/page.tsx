'use client'

import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getMeals, getWeekPlans, createWeekPlan, deleteWeekPlan, updateWeekPlan, getShoppingItems, createShoppingItem, updateShoppingItem, getIngredientsByMealIds } from '@/lib/db'
import type { Meal, WeekPlan, ShoppingItem, Ingredient } from '@/types/database'

function getWeekDates(date: Date): Date[] {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return Array.from({ length: 7 }, (_, i) => {
    const nd = new Date(d)
    nd.setDate(d.getDate() + i)
    return nd
  })
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function getDayName(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short' })
}

export default function PlannerPage() {
  const { user, loading: authLoading } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [meals, setMeals] = useState<Meal[]>([])
  const [weekPlans, setWeekPlans] = useState<WeekPlan[]>([])
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([])
  const [mealIngredients, setMealIngredients] = useState<Ingredient[]>([])
  const [checkedMealIngredients, setCheckedMealIngredients] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [showMealSelector, setShowMealSelector] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [draggedMeal, setDraggedMeal] = useState<Meal | null>(null)

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate])
  const weekStart = formatDate(weekDates[0])
  const weekEnd = formatDate(weekDates[6])

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/auth'
      return
    }

    if (user) {
      loadData()
    }
  }, [user, authLoading, weekStart])

  const loadData = async () => {
    if (!user) return
    try {
      setLoading(true)
      const [mealsData, plansData, itemsData] = await Promise.all([
        getMeals(user.id),
        getWeekPlans(user.id, weekStart, weekEnd),
        getShoppingItems(user.id, weekStart)
      ])
      setMeals(mealsData)
      setWeekPlans(plansData)
      setShoppingItems(itemsData)

      const mealIds = plansData.map(p => p.meal_id)
      const ingredients = await getIngredientsByMealIds(mealIds)
      setMealIngredients(ingredients)

      const checked = itemsData.filter(i => i.is_checked && !i.is_custom).map(i => i.name.toLowerCase())
      setCheckedMealIngredients(new Set(checked))
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  const navigateWeek = (direction: number) => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + direction * 7)
    setCurrentDate(newDate)
  }

  const addMealToDay = async (meal: Meal, date: string) => {
    if (!user) return
    try {
      const plan = await createWeekPlan({
        user_id: user.id,
        date,
        meal_id: meal.id,
        person_count: 1
      })
      setWeekPlans([...weekPlans, { ...plan, meal }])
      setShowMealSelector(null)
      setSearchQuery('')
    } catch (err) {
      console.error('Failed to add meal:', err)
    }
  }

  const updatePersonCount = async (planId: string, count: number) => {
    if (!user || count < 1) return
    try {
      await updateWeekPlan(planId, { person_count: count })
      setWeekPlans(weekPlans.map(p => p.id === planId ? { ...p, person_count: count } : p))
    } catch (err) {
      console.error('Failed to update person count:', err)
    }
  }

  const removeMealFromDay = async (planId: string) => {
    try {
      await deleteWeekPlan(planId)
      setWeekPlans(weekPlans.filter(p => p.id !== planId))
    } catch (err) {
      console.error('Failed to remove meal:', err)
    }
  }

  const toggleShoppingItem = async (item: ShoppingItem) => {
    try {
      const updated = await updateShoppingItem(item.id, { is_checked: !item.is_checked })
      setShoppingItems(shoppingItems.map(i => i.id === item.id ? updated : i))
    } catch (err) {
      console.error('Failed to toggle item:', err)
    }
  }

  const addCustomItem = async () => {
    if (!user || !searchQuery.trim()) return
    try {
      const item = await createShoppingItem({
        user_id: user.id,
        name: searchQuery.trim(),
        quantity: '',
        is_custom: true,
        is_checked: false,
        week_start: weekStart
      })
      setShoppingItems([...shoppingItems, item])
      setSearchQuery('')
    } catch (err) {
      console.error('Failed to add item:', err)
    }
  }

  const toggleMealIngredient = async (ingredientName: string) => {
    if (!user) return
    const lowerName = ingredientName.toLowerCase()
    const isChecked = checkedMealIngredients.has(lowerName)

    try {
      if (isChecked) {
        const existing = shoppingItems.find(
          i => i.name.toLowerCase() === lowerName && !i.is_custom
        )
        if (existing) {
          const { deleteShoppingItem } = await import('@/lib/db')
          await deleteShoppingItem(existing.id)
          setShoppingItems(shoppingItems.filter(i => i.id !== existing.id))
        }
      } else {
        const { createShoppingItem } = await import('@/lib/db')
        const item = await createShoppingItem({
          user_id: user.id,
          name: ingredientName,
          quantity: '',
          is_custom: false,
          is_checked: true,
          week_start: weekStart
        })
        setShoppingItems([...shoppingItems, item])
      }

      setCheckedMealIngredients(prev => {
        const newSet = new Set(prev)
        if (isChecked) {
          newSet.delete(lowerName)
        } else {
          newSet.add(lowerName)
        }
        return newSet
      })
    } catch (err) {
      console.error('Failed to toggle meal ingredient:', err)
    }
  }

  const aggregatedIngredients = useMemo(() => {
    const map: Record<string, { quantity: string; multiplier: number }> = {}
    
    const mealPersonCounts: Record<string, number> = {}
    weekPlans.forEach(plan => {
      const count = plan.person_count || 1
      mealPersonCounts[plan.meal_id] = (mealPersonCounts[plan.meal_id] || 0) + count
    })

    mealIngredients.forEach(ing => {
      const name = ing.name.toLowerCase().trim()
      const multiplier = mealPersonCounts[ing.meal_id] || 1
      
      if (map[name]) {
        if (ing.quantity && !map[name].quantity.includes(ing.quantity)) {
          map[name].quantity += `, ${ing.quantity}`
        }
        map[name].multiplier += multiplier
      } else {
        map[name] = { quantity: ing.quantity || '', multiplier }
      }
    })
    
    return Object.entries(map).map(([name, data]) => {
      let quantity = data.quantity
      if (data.multiplier > 1 && quantity) {
        const numMatch = quantity.match(/^([\d.]+)/)
        if (numMatch) {
          const num = parseFloat(numMatch[1])
          quantity = `${num * data.multiplier}${quantity.slice(numMatch[0].length)}`
        } else {
          quantity = `${data.multiplier}x ${quantity}`
        }
      } else if (data.multiplier > 1) {
        quantity = `${data.multiplier}x`
      }
      return { name, quantity }
    })
  }, [mealIngredients, weekPlans])

  const allShoppingItems = useMemo(() => {
    const items: { id: string; name: string; quantity: string; isCustom: boolean; isChecked: boolean; dbItem?: ShoppingItem }[] = []

    shoppingItems.forEach(item => {
      items.push({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        isCustom: item.is_custom,
        isChecked: item.is_checked,
        dbItem: item
      })
    })

    aggregatedIngredients.forEach(ing => {
      const isChecked = checkedMealIngredients.has(ing.name.toLowerCase())
      const existingCustom = shoppingItems.find(
        i => i.name.toLowerCase() === ing.name.toLowerCase()
      )
      if (!existingCustom) {
        items.push({
          id: `meal-${ing.name}`,
          name: ing.name,
          quantity: ing.quantity,
          isCustom: false,
          isChecked
        })
      }
    })

    return items.sort((a, b) => {
      if (a.isChecked !== b.isChecked) return a.isChecked ? 1 : -1
      return a.name.localeCompare(b.name)
    })
  }, [shoppingItems, aggregatedIngredients, checkedMealIngredients])

  const filteredMeals = useMemo(() => {
    if (!searchQuery.trim()) return meals
    return meals.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [meals, searchQuery])

  const plansByDate = useMemo(() => {
    const map: Record<string, WeekPlan[]> = {}
    weekDates.forEach(d => {
      map[formatDate(d)] = weekPlans.filter(p => p.date === formatDate(d))
    })
    return map
  }, [weekPlans, weekDates])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (date: string) => {
    if (draggedMeal) {
      addMealToDay(draggedMeal, date)
      setDraggedMeal(null)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Week Planner</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigateWeek(-1)}
            className="px-3 py-1 border rounded-md hover:bg-gray-50"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-600">
            {weekDates[0].toLocaleDateString()} - {weekDates[6].toLocaleDateString()}
          </span>
          <button
            onClick={() => navigateWeek(1)}
            className="px-3 py-1 border rounded-md hover:bg-gray-50"
          >
            Next →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-4 mb-8">
            {weekDates.map(date => {
              const dateStr = formatDate(date)
              const plans = plansByDate[dateStr] || []
              return (
                <div
                  key={dateStr}
                  className="min-h-[280px] border rounded-lg p-3 bg-white"
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(dateStr)}
                >
                  <div className="text-sm font-medium text-gray-500 mb-2">
                    {getDayName(date)}
                  </div>
                  <div className="text-sm mb-2">{date.getDate()}</div>
                  <div className="space-y-2">
                    {plans.map(plan => (
                      <div
                        key={plan.id}
                        className="relative group rounded-lg overflow-hidden bg-gray-100"
                      >
                        <a href={`/meals/${plan.meal?.id}`} className="block">
                          {plan.meal?.image_url ? (
                            <img
                              src={plan.meal.image_url}
                              alt={plan.meal.name}
                              className="w-full h-24 object-cover"
                            />
                          ) : (
                            <div className="w-full h-24 bg-gray-200 flex items-center justify-center text-3xl">
                              🍽️
                            </div>
                          )}
                        </a>
                        <button
                          onClick={() => removeMealFromDay(plan.id)}
                          className="absolute top-1 right-1 w-6 h-6 bg-black/50 hover:bg-red-500 text-white rounded-full text-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                        <div className="p-2 bg-white">
                          <span className="text-xs font-medium truncate block">{plan.meal?.name}</span>
                          <div className="flex items-center gap-1 mt-1">
                            <button
                              onClick={(e) => { e.preventDefault(); updatePersonCount(plan.id, (plan.person_count || 1) - 1) }}
                              className="w-5 h-5 text-xs bg-gray-200 rounded hover:bg-gray-300"
                            >
                              -
                            </button>
                            <span className="text-xs">{plan.person_count || 1}</span>
                            <button
                              onClick={(e) => { e.preventDefault(); updatePersonCount(plan.id, (plan.person_count || 1) + 1) }}
                              className="w-5 h-5 text-xs bg-gray-200 rounded hover:bg-gray-300"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowMealSelector(dateStr)}
                    className="w-full mt-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                  >
                    + Add
                  </button>

                  {showMealSelector === dateStr && (
                    <div className="absolute mt-1 w-64 bg-white border rounded-lg shadow-lg z-10 p-2">
                      <input
                        type="text"
                        placeholder="Search meals..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-2 py-1 border rounded mb-2"
                        autoFocus
                      />
                      <div className="max-h-48 overflow-y-auto">
                        {filteredMeals.map(meal => (
                          <button
                            key={meal.id}
                            onClick={() => addMealToDay(meal, dateStr)}
                            className="w-full text-left px-2 py-1 hover:bg-gray-50 rounded flex items-center gap-2"
                          >
                            {meal.image_url ? (
                              <img
                                src={meal.image_url}
                                alt={meal.name}
                                className="w-6 h-6 rounded object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center flex-shrink-0 text-xs">
                                🍽️
                              </div>
                            )}
                            <span className="truncate">{meal.name}</span>
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setShowMealSelector(null)}
                        className="w-full mt-2 text-sm text-gray-500 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
      </div>

      <div className="bg-white border rounded-lg p-4">
        <h2 className="font-semibold mb-4 text-lg">Shopping List</h2>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Add item..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-2 border rounded-md text-sm"
          />
          <button
            onClick={addCustomItem}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm"
          >
            Add
          </button>
        </div>
        <div className="space-y-1">
          {allShoppingItems.map(item => (
            <div
              key={item.id}
              className={`flex items-center gap-3 p-2 rounded ${
                item.isChecked ? 'bg-gray-50 text-gray-400' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={item.isChecked}
                onChange={() => {
                  if (item.dbItem) {
                    toggleShoppingItem(item.dbItem)
                  } else {
                    toggleMealIngredient(item.name)
                  }
                }}
                className="rounded"
              />
              <span className={`flex-1 capitalize ${item.isChecked ? 'line-through' : ''}`}>
                {item.name}
              </span>
              {item.quantity && (
                <span className="text-sm text-gray-400">{item.quantity}</span>
              )}
            </div>
          ))}
        </div>
        {allShoppingItems.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">
            Plan meals to see ingredients
          </p>
        )}
      </div>
    </div>
  )
}
