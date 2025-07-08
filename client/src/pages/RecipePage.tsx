import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useDropzone } from 'react-dropzone'
import { Camera, Upload, Link as LinkIcon, ChefHat, Loader2, CheckCircle, AlertCircle, ShoppingCart } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { RecipeInputForm } from '@/components/RecipeInputForm'
import { IngredientList } from '@/components/IngredientList'
import { ProductSearch } from '@/components/ProductSearch'
import { api } from '@/lib/api'

const recipeSchema = z.object({
  recipeText: z.string().min(10, 'Recipe text must be at least 10 characters'),
})

type RecipeFormData = z.infer<typeof recipeSchema>

interface ParsedIngredient {
  name: string
  quantity: number
  unit?: string
  category?: string
  notes?: string
  synonyms?: string[]
}

interface ParsedRecipe {
  ingredients: ParsedIngredient[]
  totalIngredients: number
  originalText: string
}

export function RecipePage() {
  const [inputMethod, setInputMethod] = useState<'text' | 'image' | 'url'>('text')
  const [isParsing, setIsParsing] = useState(false)
  const [parsedRecipe, setParsedRecipe] = useState<ParsedRecipe | null>(null)
  const [selectedIngredients, setSelectedIngredients] = useState<ParsedIngredient[]>([])

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RecipeFormData>({
    resolver: zodResolver(recipeSchema),
  })

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.webp']
    },
    maxFiles: 1,
    onDrop: handleImageDrop,
  })

  async function handleImageDrop(acceptedFiles: File[]) {
    if (acceptedFiles.length === 0) return

    const file = acceptedFiles[0]
    setIsParsing(true)

    try {
      const formData = new FormData()
      formData.append('image', file)

      const response = await api.post('/ocr/parse-recipe', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      if (response.data.success) {
        setParsedRecipe(response.data.data)
        toast.success('Recipe parsed successfully!')
      } else {
        toast.error('Failed to parse recipe')
      }
    } catch (error) {
      console.error('Error parsing image:', error)
      toast.error('Error parsing recipe image')
    } finally {
      setIsParsing(false)
    }
  }

  async function handleTextSubmit(data: RecipeFormData) {
    setIsParsing(true)

    try {
      const response = await api.post('/recipes/parse', {
        recipeText: data.recipeText,
      })

      if (response.data.success) {
        setParsedRecipe(response.data.data)
        toast.success('Recipe parsed successfully!')
      } else {
        toast.error('Failed to parse recipe')
      }
    } catch (error) {
      console.error('Error parsing recipe:', error)
      toast.error('Error parsing recipe text')
    } finally {
      setIsParsing(false)
    }
  }

  async function handleUrlSubmit(url: string) {
    setIsParsing(true)

    try {
      const response = await api.post('/ocr/parse-recipe-url', {
        imageUrl: url,
      })

      if (response.data.success) {
        setParsedRecipe(response.data.data)
        toast.success('Recipe parsed successfully!')
      } else {
        toast.error('Failed to parse recipe')
      }
    } catch (error) {
      console.error('Error parsing recipe URL:', error)
      toast.error('Error parsing recipe from URL')
    } finally {
      setIsParsing(false)
    }
  }

  function handleIngredientToggle(ingredient: ParsedIngredient) {
    setSelectedIngredients(prev => {
      const isSelected = prev.some(item => item.name === ingredient.name)
      if (isSelected) {
        return prev.filter(item => item.name !== ingredient.name)
      } else {
        return [...prev, ingredient]
      }
    })
  }

  function handleCreateShoppingList() {
    if (selectedIngredients.length === 0) {
      toast.error('Please select at least one ingredient')
      return
    }
    // Navigate to shopping list creation
    // This would be implemented with React Router
    toast.success('Shopping list created!')
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Recipe Parser
        </h1>
        <p className="text-lg text-gray-600">
          Upload a photo, paste text, or provide a URL to extract ingredients
        </p>
      </div>

      {/* Input Methods */}
      <div className="grid md:grid-cols-3 gap-6">
        <button
          onClick={() => setInputMethod('text')}
          className={`p-6 rounded-lg border-2 transition-colors ${
            inputMethod === 'text'
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-center">
            <ChefHat className="w-8 h-8 mx-auto mb-3 text-primary-600" />
            <h3 className="font-semibold mb-2">Text Input</h3>
            <p className="text-sm text-gray-600">Paste recipe text directly</p>
          </div>
        </button>

        <button
          onClick={() => setInputMethod('image')}
          className={`p-6 rounded-lg border-2 transition-colors ${
            inputMethod === 'image'
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-center">
            <Camera className="w-8 h-8 mx-auto mb-3 text-primary-600" />
            <h3 className="font-semibold mb-2">Image Upload</h3>
            <p className="text-sm text-gray-600">Upload a recipe photo</p>
          </div>
        </button>

        <button
          onClick={() => setInputMethod('url')}
          className={`p-6 rounded-lg border-2 transition-colors ${
            inputMethod === 'url'
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-center">
            <LinkIcon className="w-8 h-8 mx-auto mb-3 text-primary-600" />
            <h3 className="font-semibold mb-2">URL Input</h3>
            <p className="text-sm text-gray-600">Provide image URL</p>
          </div>
        </button>
      </div>

      {/* Input Form */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        {inputMethod === 'text' && (
          <form onSubmit={handleSubmit(handleTextSubmit)} className="space-y-4">
            <div>
              <label htmlFor="recipeText" className="block text-sm font-medium text-gray-700 mb-2">
                Recipe Text
              </label>
              <textarea
                {...register('recipeText')}
                id="recipeText"
                rows={8}
                className="input w-full"
                placeholder="Paste your recipe here... Example:&#10;2 cups all-purpose flour&#10;1 cup sugar&#10;2 eggs&#10;1/2 cup milk&#10;1 tsp vanilla extract"
              />
              {errors.recipeText && (
                <p className="text-sm text-red-600 mt-1">{errors.recipeText.message}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={isParsing}
              className="btn-primary btn-lg w-full"
            >
              {isParsing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Parsing Recipe...</span>
                </>
              ) : (
                <>
                  <ChefHat className="w-5 h-5" />
                  <span>Parse Ingredients</span>
                </>
              )}
            </button>
          </form>
        )}

        {inputMethod === 'image' && (
          <div className="space-y-4">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              {isDragActive ? (
                <p className="text-lg font-medium text-primary-600">Drop the image here...</p>
              ) : (
                <div>
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    Drop a recipe image here
                  </p>
                  <p className="text-gray-600">or click to select a file</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Supports JPEG, PNG, GIF, BMP, WebP
                  </p>
                </div>
              )}
            </div>
            {isParsing && (
              <div className="text-center py-4">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary-600" />
                <p className="text-gray-600">Processing image...</p>
              </div>
            )}
          </div>
        )}

        {inputMethod === 'url' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 mb-2">
                Image URL
              </label>
              <input
                type="url"
                id="imageUrl"
                className="input"
                placeholder="https://example.com/recipe-image.jpg"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const url = (e.target as HTMLInputElement).value
                    if (url) handleUrlSubmit(url)
                  }
                }}
              />
            </div>
            <button
              onClick={() => {
                const url = (document.getElementById('imageUrl') as HTMLInputElement).value
                if (url) handleUrlSubmit(url)
              }}
              disabled={isParsing}
              className="btn-primary btn-lg w-full"
            >
              {isParsing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <LinkIcon className="w-5 h-5" />
                  <span>Parse from URL</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Parsed Results */}
      {parsedRecipe && (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-800">
                Successfully parsed {parsedRecipe.totalIngredients} ingredients
              </span>
            </div>
          </div>

          <IngredientList
            ingredients={parsedRecipe.ingredients}
            selectedIngredients={selectedIngredients}
            onIngredientToggle={handleIngredientToggle}
          />

          {selectedIngredients.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4">Product Search</h3>
              <ProductSearch ingredients={selectedIngredients} />
            </div>
          )}

          <div className="flex justify-center">
            <button
              onClick={handleCreateShoppingList}
              disabled={selectedIngredients.length === 0}
              className="btn-primary btn-lg"
            >
              <ShoppingCart className="w-5 h-5" />
              <span>Create Shopping List ({selectedIngredients.length} items)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
} 
