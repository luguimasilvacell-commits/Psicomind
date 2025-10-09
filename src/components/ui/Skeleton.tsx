import React from 'react'

interface SkeletonProps {
  className?: string
  width?: string | number
  height?: string | number
  rounded?: boolean
  animate?: boolean
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width = '100%',
  height = '1rem',
  rounded = false,
  animate = true
}) => {
  const baseClasses = 'bg-gray-200 dark:bg-gray-700'
  const animateClasses = animate ? 'animate-pulse' : ''
  const roundedClasses = rounded ? 'rounded-full' : 'rounded'
  
  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height
  }

  return (
    <div 
      className={`${baseClasses} ${animateClasses} ${roundedClasses} ${className}`}
      style={style}
    />
  )
}

// Skeleton específicos para diferentes componentes
export const CardSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg shadow p-6 space-y-4">
    <Skeleton height="1.5rem" width="60%" />
    <Skeleton height="1rem" width="100%" />
    <Skeleton height="1rem" width="80%" />
    <div className="flex justify-between items-center">
      <Skeleton height="2rem" width="5rem" rounded />
      <Skeleton height="1rem" width="4rem" />
    </div>
  </div>
)

export const TableRowSkeleton: React.FC = () => (
  <tr className="border-b">
    <td className="px-6 py-4"><Skeleton height="1rem" /></td>
    <td className="px-6 py-4"><Skeleton height="1rem" /></td>
    <td className="px-6 py-4"><Skeleton height="1rem" /></td>
    <td className="px-6 py-4"><Skeleton height="1rem" /></td>
    <td className="px-6 py-4">
      <div className="flex space-x-2">
        <Skeleton height="2rem" width="2rem" rounded />
        <Skeleton height="2rem" width="2rem" rounded />
      </div>
    </td>
  </tr>
)

export const StatCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton height="1rem" width="4rem" />
        <Skeleton height="2rem" width="3rem" />
      </div>
      <Skeleton height="3rem" width="3rem" rounded />
    </div>
  </div>
)

export const ChartSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg shadow p-6">
    <Skeleton height="1.5rem" width="8rem" className="mb-4" />
    <div className="h-64 flex items-end justify-between space-x-2">
      {Array.from({ length: 7 }).map((_, i) => (
        <Skeleton 
          key={i} 
          height={`${Math.random() * 60 + 40}%`} 
          width="2rem" 
          className="flex-shrink-0"
        />
      ))}
    </div>
  </div>
)

export const FormSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Skeleton height="1rem" width="4rem" />
        <Skeleton height="2.5rem" />
      </div>
      <div className="space-y-2">
        <Skeleton height="1rem" width="4rem" />
        <Skeleton height="2.5rem" />
      </div>
    </div>
    <div className="space-y-2">
      <Skeleton height="1rem" width="6rem" />
      <Skeleton height="6rem" />
    </div>
    <div className="flex justify-end space-x-2">
      <Skeleton height="2.5rem" width="5rem" rounded />
      <Skeleton height="2.5rem" width="5rem" rounded />
    </div>
  </div>
)

export const ListSkeleton: React.FC<{ items?: number }> = ({ items = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="flex items-center space-x-3 p-3 border rounded-lg">
        <Skeleton height="2.5rem" width="2.5rem" rounded />
        <div className="flex-1 space-y-2">
          <Skeleton height="1rem" width="60%" />
          <Skeleton height="0.75rem" width="40%" />
        </div>
        <Skeleton height="1.5rem" width="4rem" rounded />
      </div>
    ))}
  </div>
)