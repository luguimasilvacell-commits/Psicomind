import React from 'react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface ModernStatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    type: 'positive' | 'negative' | 'neutral';
  };
  gradient?: string;
  description?: string;
  className?: string;
}

export const ModernStatCard: React.FC<ModernStatCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  gradient = 'from-blue-500 to-blue-600',
  description,
  className = ''
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`relative overflow-hidden bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 group ${className}`}
    >
      {/* Gradient Background */}
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradient} opacity-10 rounded-full -mr-16 -mt-16`} />
      
      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          {trend && (
            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
              trend.type === 'positive' 
                ? 'bg-green-100 text-green-700' 
                : trend.type === 'negative'
                ? 'bg-red-100 text-red-700'
                : 'bg-gray-100 text-gray-700'
            }`}>
              {trend.value}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">
            {title}
          </h3>
          <p className="text-3xl font-bold text-gray-900 font-mono">
            {value}
          </p>
          {description && (
            <p className="text-sm text-gray-500">
              {description}
            </p>
          )}
        </div>

        {/* Animated Border */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
    </motion.div>
  );
};