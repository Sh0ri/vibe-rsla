import { ReactNode } from 'react'

interface RecipeInputFormProps {
  children: ReactNode
}

export function RecipeInputForm({ children }: RecipeInputFormProps) {
  return <div>{children}</div>
} 
