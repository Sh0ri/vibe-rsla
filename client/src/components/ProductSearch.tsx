import { useState, useEffect } from 'react'
import { Search, ExternalLink, Star, Package, Store } from 'lucide-react'
import { apiService } from '@/lib/api'
import { formatPrice } from '@/lib/utils'

interface ParsedIngredient {
  name: string
  quantity: number
  unit?: string
  category?: string
  notes?: string
  synonyms?: string[]
}

interface Product {
  id: string
  name: string
  brand?: string
  price?: number
  currency: string
  imageUrl?: string
  productUrl: string
  store: {
    id: string
    name: string
    domain: string
  }
  matchScore: number
  packageSize?: string
  unit?: string
}

interface ProductSearchProps {
  ingredients: ParsedIngredient[]
}

export function ProductSearch({ ingredients }: ProductSearchProps) {
  const [products, setProducts] = useState<Record<string, Product[]>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [selectedProducts, setSelectedProducts] = useState<Record<string, Product>>({})

  useEffect(() => {
    // Search for products for each ingredient
    ingredients.forEach(ingredient => {
      if (!products[ingredient.name]) {
        searchProducts(ingredient)
      }
    })
  }, [ingredients])

  async function searchProducts(ingredient: ParsedIngredient) {
    setLoading(prev => ({ ...prev, [ingredient.name]: true }))
    
    try {
      const response = await apiService.searchProducts(
        ingredient.name,
        ingredient.quantity,
        ingredient.unit
      )
      
      if (response.success) {
        setProducts(prev => ({
          ...prev,
          [ingredient.name]: response.data.products
        }))
        
        // Auto-select the first product if available
        if (response.data.products.length > 0 && !selectedProducts[ingredient.name]) {
          setSelectedProducts(prev => ({
            ...prev,
            [ingredient.name]: response.data.products[0]
          }))
        }
      }
    } catch (error) {
      console.error('Error searching products:', error)
    } finally {
      setLoading(prev => ({ ...prev, [ingredient.name]: false }))
    }
  }

  function handleProductSelect(ingredientName: string, product: Product) {
    setSelectedProducts(prev => ({
      ...prev,
      [ingredientName]: product
    }))
  }

  function handleAddToCart(product: Product) {
    window.open(product.productUrl, '_blank')
  }

  return (
    <div className="space-y-6">
      {ingredients.map(ingredient => (
        <div key={ingredient.name} className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-medium text-gray-900">{ingredient.name}</h3>
              <p className="text-sm text-gray-600">
                {ingredient.quantity} {ingredient.unit || 'unit'}
              </p>
            </div>
            {loading[ingredient.name] && (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                <span>Searching...</span>
              </div>
            )}
          </div>

          {products[ingredient.name] && products[ingredient.name].length > 0 ? (
            <div className="grid gap-3">
              {products[ingredient.name].map(product => {
                const isSelected = selectedProducts[ingredient.name]?.id === product.id
                
                return (
                  <div
                    key={product.id}
                    className={`
                      border rounded-lg p-3 cursor-pointer transition-colors
                      ${isSelected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}
                    `}
                    onClick={() => handleProductSelect(ingredient.name, product)}
                  >
                    <div className="flex items-start space-x-3">
                      {product.imageUrl && (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-16 h-16 object-cover rounded border"
                        />
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">
                              {product.name}
                            </h4>
                            {product.brand && (
                              <p className="text-sm text-gray-600">{product.brand}</p>
                            )}
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                {product.store.name}
                              </span>
                              {product.packageSize && (
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                  {product.packageSize}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right">
                            {product.price ? (
                              <p className="font-medium text-gray-900">
                                {formatPrice(product.price, product.currency)}
                              </p>
                            ) : (
                              <p className="text-sm text-gray-500">Price not available</p>
                            )}
                            <div className="flex items-center space-x-1 mt-1">
                              <Star className="w-3 h-3 text-yellow-400 fill-current" />
                              <span className="text-xs text-gray-600">
                                {Math.round(product.matchScore * 100)}% match
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 mt-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAddToCart(product)
                            }}
                            className="btn-outline btn-sm"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>View Product</span>
                          </button>
                          
                          {isSelected && (
                            <span className="text-xs text-primary-600 font-medium">
                              Selected
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : !loading[ingredient.name] ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No products found for this ingredient</p>
            </div>
          ) : null}
        </div>
      ))}
      
      {Object.keys(selectedProducts).length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Selected Products</h3>
          <div className="space-y-2">
            {Object.entries(selectedProducts).map(([ingredientName, product]) => (
              <div key={ingredientName} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{ingredientName}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-900">{product.name}</span>
                  {product.price && (
                    <span className="font-medium text-gray-900">
                      {formatPrice(product.price, product.currency)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 
