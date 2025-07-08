import { Link } from 'react-router-dom'
import { ChefHat, ShoppingCart, Camera, Zap, Globe, Shield } from 'lucide-react'

export function HomePage() {
  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="text-center py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Transform Recipes into{' '}
            <span className="text-primary-600">Smart Shopping Lists</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Upload a recipe photo, paste text, or provide a URL. Our AI extracts ingredients 
            and creates shopping lists with direct links to purchase from your favorite stores.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/recipe"
              className="btn-primary btn-lg inline-flex items-center space-x-2"
            >
              <ChefHat className="w-5 h-5" />
              <span>Start Parsing Recipes</span>
            </Link>
            <Link
              to="/shopping-list"
              className="btn-outline btn-lg inline-flex items-center space-x-2"
            >
              <ShoppingCart className="w-5 h-5" />
              <span>View Shopping Lists</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">1. Input Recipe</h3>
              <p className="text-gray-600">
                Upload a photo, paste text, or provide a URL. Our OCR and AI technology 
                extracts ingredients automatically.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-secondary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">2. Smart Parsing</h3>
              <p className="text-gray-600">
                AI-powered ingredient extraction with quantity normalization, 
                unit conversion, and ingredient categorization.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="w-8 h-8 text-success-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">3. Shopping List</h3>
              <p className="text-gray-600">
                Get product suggestions with prices from multiple stores. 
                Export lists or add items directly to cart.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 bg-white rounded-lg shadow-sm">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Powerful Features
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <Camera className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold">OCR Image Processing</h3>
              <p className="text-gray-600">
                Extract text from recipe photos with advanced OCR technology. 
                Supports multiple languages and formats.
              </p>
            </div>
            <div className="space-y-3">
              <div className="w-12 h-12 bg-secondary-100 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-secondary-600" />
              </div>
              <h3 className="text-lg font-semibold">AI Ingredient Parsing</h3>
              <p className="text-gray-600">
                Intelligent extraction of ingredients, quantities, and units. 
                Handles synonyms and regional variations.
              </p>
            </div>
            <div className="space-y-3">
              <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center">
                <Globe className="w-6 h-6 text-success-600" />
              </div>
              <h3 className="text-lg font-semibold">Multi-Store Integration</h3>
              <p className="text-gray-600">
                Connect with Amazon, Carrefour, Monoprix, and local stores. 
                Compare prices and find the best deals.
              </p>
            </div>
            <div className="space-y-3">
              <div className="w-12 h-12 bg-warning-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-warning-600" />
              </div>
              <h3 className="text-lg font-semibold">Smart Shopping Lists</h3>
              <p className="text-gray-600">
                Organize ingredients by category, exclude pantry items, 
                and export in multiple formats.
              </p>
            </div>
            <div className="space-y-3">
              <div className="w-12 h-12 bg-error-100 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-error-600" />
              </div>
              <h3 className="text-lg font-semibold">Privacy & Security</h3>
              <p className="text-gray-600">
                Your recipes and data are secure. We don't store sensitive 
                information and use encrypted connections.
              </p>
            </div>
            <div className="space-y-3">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <ChefHat className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold">Recipe Management</h3>
              <p className="text-gray-600">
                Save and organize your favorite recipes. Create collections 
                and share with friends and family.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-center py-16 bg-primary-50 rounded-lg">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Join thousands of users who are already saving time and money 
            with smart recipe shopping lists.
          </p>
          <Link
            to="/recipe"
            className="btn-primary btn-lg inline-flex items-center space-x-2"
          >
            <ChefHat className="w-5 h-5" />
            <span>Try Recipe Parser Now</span>
          </Link>
        </div>
      </section>
    </div>
  )
} 
