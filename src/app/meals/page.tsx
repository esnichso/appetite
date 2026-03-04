'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { getMeals, searchMealsByIngredient } from '@/lib/db'
import type { Meal } from '@/types/database'

export default function MealsPage() {
  const { user, loading: authLoading } = useAuth()
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/auth'
      return
    }

    if (user) {
      loadMeals()
    }
  }, [user, authLoading])

  const loadMeals = async () => {
    if (!user) return
    try {
      setLoading(true)
      const data = await getMeals(user.id)
      setMeals(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load meals')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    
    if (!search.trim()) {
      loadMeals()
      return
    }

    try {
      setLoading(true)
      const data = await searchMealsByIngredient(user.id, search)
      setMeals(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
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
        <h1 className="text-2xl font-bold">Meals</h1>
        <Link
          href="/meals/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Add Meal
        </Link>
      </div>

      <form onSubmit={handleSearch} className="mb-8">
        <input
          type="text"
          placeholder="Search by ingredients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 border rounded-md"
        />
      </form>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {meals.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No meals yet. Add your first meal!</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {meals.map((meal) => (
            <Link
              key={meal.id}
              href={`/meals/${meal.id}`}
              className="block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              {meal.image_url ? (
                <div className="aspect-video bg-gray-200">
                  <img
                    src={meal.image_url}
                    alt={meal.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-video bg-gray-100 flex items-center justify-center">
                  <span className="text-4xl">🍽️</span>
                </div>
              )}
              <div className="p-4">
                <h2 className="font-semibold text-lg">{meal.name}</h2>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
