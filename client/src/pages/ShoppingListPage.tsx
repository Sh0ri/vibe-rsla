import { useState, useEffect } from 'react'
import { ShoppingCart, Plus, Download, ExternalLink, Trash2, Edit } from 'lucide-react'
import { apiService } from '@/lib/api'
import { formatDate, formatPrice } from '@/lib/utils'
import { toast } from 'react-hot-toast'

interface ShoppingList {
  id: string
  name: string
  store?: {
    id: string
    name: string
    domain: string
  }
  totalCost?: number
  status: string
  createdAt: string
  updatedAt: string
}

export function ShoppingListPage() {
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadShoppingLists()
  }, [])

  async function loadShoppingLists() {
    try {
      const response = await apiService.getShoppingLists()
      if (response.success) {
        setShoppingLists(response.data)
      }
    } catch (error) {
      console.error('Error loading shopping lists:', error)
      toast.error('Failed to load shopping lists')
    } finally {
      setLoading(false)
    }
  }

  async function handleExport(listId: string, format: string) {
    try {
      const response = await apiService.exportShoppingList(listId, format)
      // Handle file download
      const blob = new Blob([response], { type: 'text/plain' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `shopping-list-${listId}.${format}`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Shopping list exported successfully!')
    } catch (error) {
      console.error('Error exporting shopping list:', error)
      toast.error('Failed to export shopping list')
    }
  }

  async function handleDelete(listId: string) {
    if (!confirm('Are you sure you want to delete this shopping list?')) return

    try {
      await apiService.deleteShoppingList(listId)
      setShoppingLists(prev => prev.filter(list => list.id !== listId))
      toast.success('Shopping list deleted successfully!')
    } catch (error) {
      console.error('Error deleting shopping list:', error)
      toast.error('Failed to delete shopping list')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading shopping lists...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shopping Lists</h1>
          <p className="text-gray-600 mt-1">
            Manage your recipe shopping lists
          </p>
        </div>
        <button className="btn-primary btn-lg">
          <Plus className="w-5 h-5" />
          <span>Create New List</span>
        </button>
      </div>

      {/* Shopping Lists Grid */}
      {shoppingLists.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No shopping lists yet</h3>
          <p className="text-gray-600 mb-6">
            Create your first shopping list by parsing a recipe
          </p>
          <button className="btn-primary btn-lg">
            <Plus className="w-5 h-5" />
            <span>Create Shopping List</span>
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {shoppingLists.map(list => (
            <div key={list.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {list.name}
                    </h3>
                    {list.store && (
                      <p className="text-sm text-gray-600 mt-1">
                        Store: {list.store.name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleExport(list.id, 'json')}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title="Export"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(list.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Status</span>
                    <span className={`
                      px-2 py-1 rounded-full text-xs font-medium
                      ${list.status === 'active' ? 'bg-green-100 text-green-800' : 
                        list.status === 'completed' ? 'bg-blue-100 text-blue-800' : 
                        'bg-gray-100 text-gray-800'}
                    `}>
                      {list.status}
                    </span>
                  </div>

                  {list.totalCost && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Total Cost</span>
                      <span className="font-medium text-gray-900">
                        {formatPrice(list.totalCost)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Created</span>
                    <span className="text-gray-900">
                      {formatDate(list.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 mt-6">
                  <button className="btn-outline btn-sm flex-1">
                    <Edit className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                  <button className="btn-primary btn-sm flex-1">
                    <ExternalLink className="w-4 h-4" />
                    <span>View Details</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 
