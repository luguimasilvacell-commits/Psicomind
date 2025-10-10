import React from 'react';
import { motion } from 'framer-motion';

interface ModernSkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'card' | 'chart';
  width?: string | number;
  height?: string | number;
  className?: string;
  lines?: number;
}

const shimmer = {
  initial: { x: '-100%' },
  animate: { x: '100%' },
  transition: {
    repeat: Infinity,
    duration: 1.5,
    ease: 'easeInOut'
  }
};

export const ModernSkeleton: React.FC<ModernSkeletonProps> = ({
  variant = 'text',
  width = '100%',
  height = '1rem',
  className = '',
  lines = 1
}) => {
  const baseClasses = 'relative overflow-hidden bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-lg';

  const getVariantClasses = () => {
    switch (variant) {
      case 'circular':
        return 'rounded-full';
      case 'rectangular':
        return 'rounded-lg';
      case 'card':
        return 'rounded-2xl shadow-lg border border-gray-100';
      case 'chart':
        return 'rounded-2xl shadow-lg border border-gray-100';
      default:
        return 'rounded-md';
    }
  };

  const getDefaultDimensions = () => {
    switch (variant) {
      case 'circular':
        return { width: '3rem', height: '3rem' };
      case 'card':
        return { width: '100%', height: '12rem' };
      case 'chart':
        return { width: '100%', height: '20rem' };
      default:
        return { width, height };
    }
  };

  const dimensions = getDefaultDimensions();

  if (variant === 'text' && lines > 1) {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: lines }).map((_, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.1 }}
            className={`${baseClasses} ${getVariantClasses()}`}
            style={{
              width: index === lines - 1 ? '75%' : width,
              height: height
            }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-60"
              {...shimmer}
            />
          </motion.div>
        ))}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className={`${baseClasses} ${getVariantClasses()} p-6 ${className}`}
        style={{ width: dimensions.width, height: dimensions.height }}
      >
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gray-300 rounded-xl relative overflow-hidden">
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-60"
                {...shimmer}
              />
            </div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-300 rounded w-3/4 relative overflow-hidden">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-60"
                  {...shimmer}
                />
              </div>
              <div className="h-3 bg-gray-300 rounded w-1/2 relative overflow-hidden">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-60"
                  {...shimmer}
                />
              </div>
            </div>
          </div>
          
          {/* Content */}
          <div className="space-y-3">
            <div className="h-6 bg-gray-300 rounded w-full relative overflow-hidden">
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-60"
                {...shimmer}
              />
            </div>
            <div className="h-4 bg-gray-300 rounded w-5/6 relative overflow-hidden">
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-60"
                {...shimmer}
              />
            </div>
            <div className="h-4 bg-gray-300 rounded w-4/6 relative overflow-hidden">
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-60"
                {...shimmer}
              />
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (variant === 'chart') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className={`${baseClasses} ${getVariantClasses()} p-6 ${className}`}
        style={{ width: dimensions.width, height: dimensions.height }}
      >
        <div className="space-y-6">
          {/* Title */}
          <div className="h-6 bg-gray-300 rounded w-1/3 relative overflow-hidden">
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-60"
              {...shimmer}
            />
          </div>
          
          {/* Chart Area */}
          <div className="flex items-end space-x-2 h-48">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="flex-1 bg-gray-300 rounded-t relative overflow-hidden"
                style={{ height: `${Math.random() * 80 + 20}%` }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-60"
                  {...shimmer}
                  transition={{ ...shimmer.transition, delay: index * 0.1 }}
                />
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`${baseClasses} ${getVariantClasses()} ${className}`}
      style={{ width: dimensions.width, height: dimensions.height }}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-60"
        {...shimmer}
      />
    </motion.div>
  );
};