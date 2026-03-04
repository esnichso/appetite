'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { getMeal, getIngredients, createMeal, updateMeal, deleteMeal, createIngredients, deleteIngredients } from '@/lib/db'
import type { Meal, Ingredient } from '@/types/database'

export default function MealEditorPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const isNew = params.id === 'new'
  const mealId = isNew ? null : (params.id as string)
  
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  
  const [name, setName] = useState('')
  const [recipe, setRecipe] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [newIngredient, setNewIngredient] = useState({ name: '', quantity: '' })
  const [uploading, setUploading] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/auth'
      return
    }

    if (!isNew && user) {
      loadMeal()
    }
  }, [user, authLoading, isNew])

  const loadMeal = async () => {
    if (!mealId || !user) return
    try {
      setLoading(true)
      const [meal, ingrs] = await Promise.all([
        getMeal(mealId),
        getIngredients(mealId)
      ])
      if (meal) {
        setName(meal.name)
        setRecipe(meal.recipe || '')
        setImageUrl(meal.image_url || '')
        setIngredients(ingrs)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load meal')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!user || !name.trim()) return
    
    try {
      setSaving(true)
      setError('')

      let savedMeal: Meal

      if (isNew) {
        savedMeal = await createMeal({
          name: name.trim(),
          recipe: recipe.trim() || null,
          image_url: imageUrl || null,
          user_id: user.id
        })
      } else {
        if (!mealId) return
        savedMeal = await updateMeal(mealId, {
          name: name.trim(),
          recipe: recipe.trim() || null,
          image_url: imageUrl || null
        })
      }

      if (!isNew && mealId) {
        await deleteIngredients(mealId)
      }

      if (ingredients.length > 0) {
        await createIngredients(
          ingredients.map(ing => ({
            meal_id: savedMeal.id,
            name: ing.name,
            quantity: ing.quantity
          }))
        )
      }

      router.push('/meals')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save meal')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!mealId || !confirm('Are you sure you want to delete this meal?')) return

    try {
      setSaving(true)
      await deleteMeal(mealId)
      router.push('/meals')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete meal')
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    try {
      setUploading(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('meals')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('meals')
        .getPublicUrl(filePath)

      setImageUrl(publicUrl)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const addIngredient = () => {
    if (!newIngredient.name.trim()) return
    setIngredients([...ingredients, { id: Math.random().toString(), meal_id: '', ...newIngredient }])
    setNewIngredient({ name: '', quantity: '' })
  }

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">{isNew ? 'New Meal' : 'Edit Meal'}</h1>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Photo</label>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />
          {imageUrl ? (
            <div className="relative inline-block">
              <img src={imageUrl} alt="Meal" className="w-48 h-48 object-cover rounded-lg" />
              <button
                onClick={() => setImageUrl('')}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6"
              >
                ×
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 border rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload Photo'}
            </button>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ingredients</label>
          <div className="space-y-2">
            {ingredients.map((ing, index) => (
              <div key={ing.id || index} className="flex gap-2">
                <input
                  type="text"
                  value={ing.name}
                  onChange={(e) => {
                    const updated = [...ingredients]
                    updated[index].name = e.target.value
                    setIngredients(updated)
                  }}
                  placeholder="Ingredient name"
                  className="flex-1 px-3 py-2 border rounded-md"
                />
                <input
                  type="text"
                  value={ing.quantity}
                  onChange={(e) => {
                    const updated = [...ingredients]
                    updated[index].quantity = e.target.value
                    setIngredients(updated)
                  }}
                  placeholder="Quantity (e.g., 2 eggs)"
                  className="w-40 px-3 py-2 border rounded-md"
                />
                <button
                  onClick={() => removeIngredient(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                type="text"
                value={newIngredient.name}
                onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
                placeholder="Ingredient name"
                className="flex-1 px-3 py-2 border rounded-md"
              />
              <input
                type="text"
                value={newIngredient.quantity}
                onChange={(e) => setNewIngredient({ ...newIngredient, quantity: e.target.value })}
                placeholder="Quantity"
                className="w-40 px-3 py-2 border rounded-md"
              />
              <button
                onClick={addIngredient}
                className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Recipe</label>
          <textarea
            value={recipe}
            onChange={(e) => setRecipe(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          {!isNew && (
            <button
              onClick={handleDelete}
              disabled={saving}
              className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
