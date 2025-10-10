import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';

interface ModernBarChartProps {
  data: any[];
  dataKey: string;
  title: string;
  colors?: string[];
  height?: number;
  className?: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-xl shadow-xl border border-gray-100">
        <p className="text-sm font-medium text-gray-600 mb-2">{label}</p>
        <div className="flex items-center space-x-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: payload[0].color }}
          />
          <span className="text-lg font-bold text-gray-900 font-mono">
            {typeof payload[0].value === 'number' 
              ? payload[0].value.toLocaleString('pt-BR')
              : payload[0].value
            }
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export const ModernBarChart: React.FC<ModernBarChartProps> = ({
  data,
  dataKey,
  title,
  colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'],
  height = 300,
  className = ''
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className={`bg-white rounded-2xl shadow-lg border border-gray-100 p-6 ${className}`}
    >
      <h3 className="text-xl font-bold text-gray-900 mb-6">{title}</h3>
      
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <defs>
            {colors.map((color, index) => (
              <linearGradient key={index} id={`barGradient${index}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.9}/>
                <stop offset="95%" stopColor={color} stopOpacity={0.6}/>
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#f3f4f6" 
            strokeWidth={1}
          />
          <XAxis 
            dataKey="month" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            dy={10}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickFormatter={(value) => value.toLocaleString('pt-BR')}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey={dataKey} 
            radius={[8, 8, 0, 0]}
            strokeWidth={2}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={`url(#barGradient${index % colors.length})`}
                stroke={colors[index % colors.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
};