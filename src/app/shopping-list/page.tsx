'use client'

import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getShoppingItems, createShoppingItem, updateShoppingItem, deleteShoppingItem, getWeekPlans, getIngredientsByMealIds } from '@/lib/db'
import type { ShoppingItem, WeekPlan, Ingredient } from '@/types/database'

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

type DisplayItem = {
  id: string
  name: string
  quantity: string
  isCustom: boolean
  isChecked: boolean
  dbItem?: ShoppingItem
}

export default function ShoppingListPage() {
  const { user, loading: authLoading } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [customItems, setCustomItems] = useState<ShoppingItem[]>([])
  const [mealIngredients, setMealIngredients] = useState<Ingredient[]>([])
  const [checkedMealIngredients, setCheckedMealIngredients] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [newItemName, setNewItemName] = useState('')
  const [newItemQuantity, setNewItemQuantity] = useState('')

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
      const [custom, plans] = await Promise.all([
        getShoppingItems(user.id, weekStart),
        getWeekPlans(user.id, weekStart, weekEnd)
      ])
      setCustomItems(custom)

      const mealIds = plans.map(p => p.meal_id)
      const ingredients = await getIngredientsByMealIds(mealIds)
      setMealIngredients(ingredients)

      const checked = custom.filter(i => i.is_checked && !i.is_custom).map(i => i.name.toLowerCase())
      setCheckedMealIngredients(new Set(checked))
    } catch (err) {
      console.error('Failed to load shopping items:', err)
    } finally {
      setLoading(false)
    }
  }

  const navigateWeek = (direction: number) => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + direction * 7)
    setCurrentDate(newDate)
  }

  const toggleCustomItem = async (item: ShoppingItem) => {
    try {
      const updated = await updateShoppingItem(item.id, { is_checked: !item.is_checked })
      setCustomItems(customItems.map(i => i.id === item.id ? updated : i))
    } catch (err) {
      console.error('Failed to toggle item:', err)
    }
  }

  const toggleMealIngredient = async (name: string) => {
    if (!user) return
    const lowerName = name.toLowerCase()
    const isChecked = checkedMealIngredients.has(lowerName)

    try {
      if (isChecked) {
        const existing = customItems.find(
          i => i.name.toLowerCase() === lowerName && !i.is_custom
        )
        if (existing) {
          await deleteShoppingItem(existing.id)
          setCustomItems(customItems.filter(i => i.id !== existing.id))
        }
      } else {
        const item = await createShoppingItem({
          user_id: user.id,
          name: name,
          quantity: '',
          is_custom: false,
          is_checked: true,
          week_start: weekStart
        })
        setCustomItems([...customItems, item])
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

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newItemName.trim()) return

    try {
      const item = await createShoppingItem({
        user_id: user.id,
        name: newItemName.trim(),
        quantity: newItemQuantity.trim(),
        is_custom: true,
        is_checked: false,
        week_start: weekStart
      })
      setCustomItems([...customItems, item])
      setNewItemName('')
      setNewItemQuantity('')
    } catch (err) {
      console.error('Failed to add item:', err)
    }
  }

  const removeItem = async (itemId: string) => {
    try {
      await deleteShoppingItem(itemId)
      setCustomItems(customItems.filter(i => i.id !== itemId))
    } catch (err) {
      console.error('Failed to remove item:', err)
    }
  }

  const aggregatedIngredients = useMemo(() => {
    const map: Record<string, { quantity: string }> = {}
    mealIngredients.forEach(ing => {
      const name = ing.name.toLowerCase().trim()
      if (map[name]) {
        if (ing.quantity && !map[name].quantity.includes(ing.quantity)) {
          map[name].quantity += `, ${ing.quantity}`
        }
      } else {
        map[name] = { quantity: ing.quantity || '' }
      }
    })
    return Object.entries(map).map(([name, data]) => ({ name, quantity: data.quantity }))
  }, [mealIngredients])

  const allItems: DisplayItem[] = useMemo(() => {
    const items: DisplayItem[] = []

    customItems.forEach(item => {
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
      const existingCustom = customItems.find(
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
  }, [customItems, aggregatedIngredients, checkedMealIngredients])

  const uncheckedCount = allItems.filter(i => !i.isChecked).length

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Shopping List</h1>
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

      <form onSubmit={addItem} className="mb-6 flex gap-4">
        <input
          type="text"
          placeholder="Item name"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          className="flex-1 px-3 py-2 border rounded-md"
        />
        <input
          type="text"
          placeholder="Quantity (optional)"
          value={newItemQuantity}
          onChange={(e) => setNewItemQuantity(e.target.value)}
          className="w-40 px-3 py-2 border rounded-md"
        />
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Add
        </button>
      </form>

      {allItems.length > 0 && (
        <p className="text-sm text-gray-500 mb-4">
          {uncheckedCount} items remaining
        </p>
      )}

      <div className="space-y-2">
        {allItems.map(item => (
          <div
            key={item.id}
            className={`flex items-center gap-3 p-4 bg-white border rounded-lg ${
              item.isChecked ? 'bg-gray-50' : ''
            }`}
          >
            <input
              type="checkbox"
              checked={item.isChecked}
              onChange={() => {
                if (item.dbItem) {
                  toggleCustomItem(item.dbItem)
                } else {
                  toggleMealIngredient(item.name)
                }
              }}
              className="w-5 h-5 rounded"
            />
            <span className={`flex-1 capitalize ${item.isChecked ? 'text-gray-400 line-through' : ''}`}>
              {item.name}
              {item.quantity && <span className="text-gray-400 ml-2">({item.quantity})</span>}
              {item.isCustom && <span className="ml-2 text-xs text-blue-500">(custom)</span>}
            </span>
            <button
              onClick={() => item.dbItem && removeItem(item.dbItem.id)}
              className="text-gray-400 hover:text-red-500"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {allItems.length === 0 && (
        <p className="text-gray-500 text-center py-8">
          No items in shopping list. Plan some meals!
        </p>
      )}
    </div>
  )
}
