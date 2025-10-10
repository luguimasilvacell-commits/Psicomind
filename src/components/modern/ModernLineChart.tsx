import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { motion } from 'framer-motion';

interface ModernLineChartProps {
  data: any[];
  dataKey: string;
  title: string;
  color?: string;
  gradient?: boolean;
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
              ? `R$ ${payload[0].value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
              : payload[0].value
            }
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export const ModernLineChart: React.FC<ModernLineChartProps> = ({
  data,
  dataKey,
  title,
  color = '#3b82f6',
  gradient = true,
  height = 300,
  className = ''
}) => {
  const gradientId = `gradient-${dataKey}-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className={`bg-white rounded-2xl shadow-lg border border-gray-100 p-6 ${className}`}
    >
      <h3 className="text-xl font-bold text-gray-900 mb-6">{title}</h3>
      
      <ResponsiveContainer width="100%" height={height}>
        {gradient ? (
          <AreaChart data={data}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
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
              tickFormatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={3}
              fill={`url(#${gradientId})`}
              dot={{ fill: color, strokeWidth: 2, r: 6 }}
              activeDot={{ r: 8, stroke: color, strokeWidth: 2, fill: '#fff' }}
            />
          </AreaChart>
        ) : (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis 
              dataKey="month" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={3}
              dot={{ fill: color, strokeWidth: 2, r: 6 }}
              activeDot={{ r: 8, stroke: color, strokeWidth: 2, fill: '#fff' }}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </motion.div>
  );
};