import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { motion } from 'framer-motion';

interface ModernPieChartProps {
  data: any[];
  dataKey: string;
  nameKey: string;
  title: string;
  colors?: string[];
  height?: number;
  showLegend?: boolean;
  className?: string;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-4 rounded-xl shadow-xl border border-gray-100">
        <div className="flex items-center space-x-3">
          <div 
            className="w-4 h-4 rounded-full" 
            style={{ backgroundColor: payload[0].color }}
          />
          <div>
            <p className="text-sm font-medium text-gray-600">{data.name}</p>
            <p className="text-lg font-bold text-gray-900 font-mono">
              {typeof data.value === 'number' 
                ? data.value.toLocaleString('pt-BR')
                : data.value
              }
            </p>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const CustomLegend = ({ payload }: any) => {
  return (
    <div className="flex flex-wrap justify-center gap-4 mt-6">
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center space-x-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm text-gray-600">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export const ModernPieChart: React.FC<ModernPieChartProps> = ({
  data,
  dataKey,
  nameKey,
  title,
  colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'],
  height = 300,
  showLegend = true,
  className = ''
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className={`bg-white rounded-2xl shadow-lg border border-gray-100 p-6 ${className}`}
    >
      <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">{title}</h3>
      
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <defs>
            {colors.map((color, index) => (
              <linearGradient key={index} id={`pieGradient${index}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.9}/>
                <stop offset="100%" stopColor={color} stopOpacity={0.7}/>
              </linearGradient>
            ))}
          </defs>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={80}
            innerRadius={40}
            paddingAngle={2}
            dataKey={dataKey}
            nameKey={nameKey}
            strokeWidth={2}
            stroke="#fff"
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={`url(#pieGradient${index % colors.length})`}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          {showLegend && <Legend content={<CustomLegend />} />}
        </PieChart>
      </ResponsiveContainer>
    </motion.div>
  );
};