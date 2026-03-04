'use client'

import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getMeals, getWeekPlans, createWeekPlan, deleteWeekPlan, getShoppingItems, createShoppingItem, updateShoppingItem } from '@/lib/db'
import type { Meal, WeekPlan, ShoppingItem } from '@/types/database'

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
        meal_id: meal.id
      })
      setWeekPlans([...weekPlans, { ...plan, meal }])
      setShowMealSelector(null)
      setSearchQuery('')
    } catch (err) {
      console.error('Failed to add meal:', err)
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
        <h1 className="text-2xl font-bold">Week Planner</h1>
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

      <div className="flex gap-8">
        <div className="flex-1">
          <div className="grid grid-cols-7 gap-4">
            {weekDates.map(date => {
              const dateStr = formatDate(date)
              const plans = plansByDate[dateStr] || []
              return (
                <div
                  key={dateStr}
                  className="min-h-[200px] border rounded-lg p-3 bg-white"
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
                        className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                      >
                        <span className="truncate">{plan.meal?.name}</span>
                        <button
                          onClick={() => removeMealFromDay(plan.id)}
                          className="text-gray-400 hover:text-red-500 ml-1"
                        >
                          ×
                        </button>
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
                            className="w-full text-left px-2 py-1 hover:bg-gray-50 rounded"
                          >
                            {meal.name}
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
        </div>

        <div className="w-80">
          <div className="bg-white border rounded-lg p-4">
            <h2 className="font-semibold mb-4">Shopping List</h2>
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
                className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm"
              >
                Add
              </button>
            </div>
            <div className="space-y-2">
              {shoppingItems
                .sort((a, b) => {
                  if (a.is_checked !== b.is_checked) return a.is_checked ? 1 : -1
                  return a.name.localeCompare(b.name)
                })
                .map(item => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-2 p-2 rounded ${
                      item.is_checked ? 'bg-gray-50 text-gray-400' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.is_checked}
                      onChange={() => toggleShoppingItem(item)}
                      className="rounded"
                    />
                    <span className={item.is_checked ? 'line-through' : ''}>
                      {item.name}
                      {item.quantity && <span className="text-gray-400 ml-1">({item.quantity})</span>}
                    </span>
                  </div>
                ))}
              {shoppingItems.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  Plan meals to see ingredients
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
