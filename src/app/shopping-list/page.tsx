'use client'

import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getShoppingItems, createShoppingItem, updateShoppingItem, deleteShoppingItem } from '@/lib/db'
import type { ShoppingItem } from '@/types/database'

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

export default function ShoppingListPage() {
  const { user, loading: authLoading } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newItemName, setNewItemName] = useState('')
  const [newItemQuantity, setNewItemQuantity] = useState('')

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate])
  const weekStart = formatDate(weekDates[0])

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
      const items = await getShoppingItems(user.id, weekStart)
      setShoppingItems(items)
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

  const toggleItem = async (item: ShoppingItem) => {
    try {
      const updated = await updateShoppingItem(item.id, { is_checked: !item.is_checked })
      setShoppingItems(shoppingItems.map(i => i.id === item.id ? updated : i))
    } catch (err) {
      console.error('Failed to toggle item:', err)
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
      setShoppingItems([...shoppingItems, item])
      setNewItemName('')
      setNewItemQuantity('')
    } catch (err) {
      console.error('Failed to add item:', err)
    }
  }

  const removeItem = async (itemId: string) => {
    try {
      await deleteShoppingItem(itemId)
      setShoppingItems(shoppingItems.filter(i => i.id !== itemId))
    } catch (err) {
      console.error('Failed to remove item:', err)
    }
  }

  const sortedItems = useMemo(() => {
    return [...shoppingItems].sort((a, b) => {
      if (a.is_checked !== b.is_checked) return a.is_checked ? 1 : -1
      return a.name.localeCompare(b.name)
    })
  }, [shoppingItems])

  const uncheckedCount = shoppingItems.filter(i => !i.is_checked).length

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
        <h1 className="text-2xl font-bold">Shopping List</h1>
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

      {shoppingItems.length > 0 && (
        <p className="text-sm text-gray-500 mb-4">
          {uncheckedCount} items remaining
        </p>
      )}

      <div className="space-y-2">
        {sortedItems.map(item => (
          <div
            key={item.id}
            className={`flex items-center gap-3 p-4 bg-white border rounded-lg ${
              item.is_checked ? 'bg-gray-50' : ''
            }`}
          >
            <input
              type="checkbox"
              checked={item.is_checked}
              onChange={() => toggleItem(item)}
              className="w-5 h-5 rounded"
            />
            <span className={`flex-1 ${item.is_checked ? 'text-gray-400 line-through' : ''}`}>
              {item.name}
              {item.quantity && <span className="text-gray-400 ml-2">({item.quantity})</span>}
              {item.is_custom && <span className="ml-2 text-xs text-blue-500">(custom)</span>}
            </span>
            <button
              onClick={() => removeItem(item.id)}
              className="text-gray-400 hover:text-red-500"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {shoppingItems.length === 0 && (
        <p className="text-gray-500 text-center py-8">
          No items in shopping list. Add items or plan some meals!
        </p>
      )}
    </div>
  )
}
