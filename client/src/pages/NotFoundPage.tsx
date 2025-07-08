import { Link } from 'react-router-dom'
import { Home, ChefHat } from 'lucide-react'

export function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ChefHat className="w-12 h-12 text-gray-400" />
        </div>
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          The page you're looking for doesn't exist. Maybe you want to go back to the home page and start parsing some recipes?
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/" className="btn-primary btn-lg inline-flex items-center space-x-2">
            <Home className="w-5 h-5" />
            <span>Go Home</span>
          </Link>
          <Link to="/recipe" className="btn-outline btn-lg inline-flex items-center space-x-2">
            <ChefHat className="w-5 h-5" />
            <span>Parse Recipe</span>
          </Link>
        </div>
      </div>
    </div>
  )
} 
