import { useState, useEffect } from 'react'
import { User, Settings, Store, ShoppingCart, ChefHat } from 'lucide-react'
import { apiService } from '@/lib/api'
import { toast } from 'react-hot-toast'

interface UserProfile {
  id: string
  email: string
  name: string
  createdAt: string
  _count: {
    recipes: number
    shoppingLists: number
    pantryItems: number
  }
}

export function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    try {
      const response = await apiService.getProfile()
      if (response.success) {
        setProfile(response.data)
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <User className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Profile not found</h3>
        <p className="text-gray-600">Please log in to view your profile</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-600 mt-1">
          Manage your account and preferences
        </p>
      </div>

      {/* Profile Info */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Account Information</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-primary-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">{profile.name}</h3>
              <p className="text-gray-600">{profile.email}</p>
              <p className="text-sm text-gray-500">
                Member since {new Date(profile.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <ChefHat className="w-8 h-8 mx-auto mb-3 text-primary-600" />
          <h3 className="text-2xl font-bold text-gray-900">{profile._count.recipes}</h3>
          <p className="text-gray-600">Recipes</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <ShoppingCart className="w-8 h-8 mx-auto mb-3 text-secondary-600" />
          <h3 className="text-2xl font-bold text-gray-900">{profile._count.shoppingLists}</h3>
          <p className="text-gray-600">Shopping Lists</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <Store className="w-8 h-8 mx-auto mb-3 text-success-600" />
          <h3 className="text-2xl font-bold text-gray-900">{profile._count.pantryItems}</h3>
          <p className="text-gray-600">Pantry Items</p>
        </div>
      </div>

      {/* Settings */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Store Preferences</h3>
            <p className="text-gray-600 mb-4">
              Configure your preferred grocery stores for shopping list generation
            </p>
            <button className="btn-outline">
              <Store className="w-4 h-4" />
              <span>Manage Store Preferences</span>
            </button>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Account Settings</h3>
            <div className="space-y-3">
              <button className="btn-outline w-full justify-start">
                <Settings className="w-4 h-4" />
                <span>Edit Profile</span>
              </button>
              <button className="btn-outline w-full justify-start">
                <Settings className="w-4 h-4" />
                <span>Change Password</span>
              </button>
              <button className="btn-outline w-full justify-start text-red-600 hover:text-red-700">
                <Settings className="w-4 h-4" />
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 
