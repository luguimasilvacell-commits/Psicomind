import React, { Suspense } from 'react'
import { Skeleton } from './Skeleton'

interface LazyLoaderProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

const DefaultFallback = () => (
  <div className="space-y-6 p-6">
    <div className="space-y-2">
      <Skeleton height="2rem" width="12rem" />
      <Skeleton height="1rem" width="20rem" />
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow p-6 space-y-4">
          <Skeleton height="1.5rem" width="60%" />
          <Skeleton height="1rem" width="100%" />
          <Skeleton height="1rem" width="80%" />
          <div className="flex justify-between items-center">
            <Skeleton height="2rem" width="5rem" rounded />
            <Skeleton height="1rem" width="4rem" />
          </div>
        </div>
      ))}
    </div>
  </div>
)

export const LazyLoader: React.FC<LazyLoaderProps> = ({ 
  children, 
  fallback = <DefaultFallback /> 
}) => {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  )
}

// Componente específico para páginas
export const PageLoader: React.FC<LazyLoaderProps> = ({ children }) => {
  const pageFallback = (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton height="2rem" width="12rem" />
          <Skeleton height="1rem" width="20rem" />
        </div>
        <Skeleton height="2.5rem" width="8rem" rounded />
      </div>
      
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton height="1.5rem" width="8rem" />
          <div className="flex space-x-2">
            <Skeleton height="2.5rem" width="6rem" rounded />
            <Skeleton height="2.5rem" width="6rem" rounded />
          </div>
        </div>
        
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4 p-3 border rounded">
              <Skeleton height="2rem" width="2rem" rounded />
              <div className="flex-1 space-y-2">
                <Skeleton height="1rem" width="60%" />
                <Skeleton height="0.75rem" width="40%" />
              </div>
              <div className="flex space-x-2">
                <Skeleton height="2rem" width="2rem" rounded />
                <Skeleton height="2rem" width="2rem" rounded />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <Suspense fallback={pageFallback}>
      {children}
    </Suspense>
  )
}

// HOC para lazy loading de componentes
export const withLazyLoading = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
) => {
  const LazyComponent = React.lazy(() => Promise.resolve({ default: Component }))
  
  return (props: P) => (
    <LazyLoader fallback={fallback}>
      <LazyComponent {...(props as any)} />
    </LazyLoader>
  )
}