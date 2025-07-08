import { Checkbox, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ParsedIngredient {
  name: string
  quantity: number
  unit?: string
  category?: string
  notes?: string
  synonyms?: string[]
}

interface IngredientListProps {
  ingredients: ParsedIngredient[]
  selectedIngredients: ParsedIngredient[]
  onIngredientToggle: (ingredient: ParsedIngredient) => void
}

const categoryColors = {
  produce: 'bg-green-100 text-green-800',
  dairy: 'bg-blue-100 text-blue-800',
  meat: 'bg-red-100 text-red-800',
  pantry: 'bg-yellow-100 text-yellow-800',
  grains: 'bg-orange-100 text-orange-800',
  nuts: 'bg-purple-100 text-purple-800',
  fruits: 'bg-pink-100 text-pink-800',
  other: 'bg-gray-100 text-gray-800',
}

export function IngredientList({ ingredients, selectedIngredients, onIngredientToggle }: IngredientListProps) {
  const isSelected = (ingredient: ParsedIngredient) => 
    selectedIngredients.some(item => item.name === ingredient.name)

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold text-gray-900">Parsed Ingredients</h2>
        <p className="text-gray-600 mt-1">
          Select the ingredients you want to include in your shopping list
        </p>
      </div>
      
      <div className="divide-y divide-gray-200">
        {ingredients.map((ingredient, index) => {
          const selected = isSelected(ingredient)
          const categoryColor = categoryColors[ingredient.category as keyof typeof categoryColors] || categoryColors.other
          
          return (
            <div
              key={index}
              className={cn(
                'p-4 hover:bg-gray-50 transition-colors cursor-pointer',
                selected && 'bg-primary-50'
              )}
              onClick={() => onIngredientToggle(ingredient)}
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <Checkbox
                    className={cn(
                      'w-5 h-5 rounded border-2 transition-colors',
                      selected
                        ? 'bg-primary-600 border-primary-600 text-white'
                        : 'border-gray-300'
                    )}
                    checked={selected}
                    readOnly
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {ingredient.name}
                    </h3>
                    {ingredient.category && (
                      <span className={cn('px-2 py-1 text-xs font-medium rounded-full', categoryColor)}>
                        {ingredient.category}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-sm text-gray-600">
                      {ingredient.quantity} {ingredient.unit || 'unit'}
                    </span>
                    {ingredient.notes && (
                      <span className="text-sm text-gray-500">
                        • {ingredient.notes}
                      </span>
                    )}
                  </div>
                  
                  {ingredient.synonyms && ingredient.synonyms.length > 0 && (
                    <div className="flex items-center space-x-1 mt-2">
                      <Tag className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        Also known as: {ingredient.synonyms.join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      
      <div className="p-4 bg-gray-50 border-t">
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>
            {selectedIngredients.length} of {ingredients.length} ingredients selected
          </span>
          <span>
            Total: {ingredients.length} ingredients
          </span>
        </div>
      </div>
    </div>
  )
} 
