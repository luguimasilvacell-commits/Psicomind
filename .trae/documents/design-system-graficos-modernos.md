# Design System - Gráficos e Componentes SVG Modernos

## 1. Análise da Interface Atual

### 1.1 Componentes Gráficos Identificados

**Dashboard Principal:**
- Cards de estatísticas com ícones
- Gráfico de linha (Receita Mensal)
- Gráfico de barras (Agendamentos por Dia)
- Indicadores de tendência

**Página Financeiro:**
- Cards de métricas financeiras
- Gráfico de barras comparativo (Receitas vs Despesas)
- Gráfico de pizza (Distribuição por Status)
- Tabela de transações

**Componentes SVG:**
- Ícones Lucide React
- Elementos de loading (spinners)
- Avatares circulares
- Badges e indicadores

### 1.2 Problemas Identificados

- **Cores inconsistentes** entre gráficos
- **Falta de gradientes** e efeitos visuais modernos
- **Tipografia** não otimizada para dados
- **Espaçamentos** irregulares
- **Animações** ausentes ou básicas
- **Responsividade** limitada em gráficos

## 2. Design System Moderno

### 2.1 Paleta de Cores Atualizada

```css
/* Cores Primárias */
:root {
  /* Azuis Modernos */
  --primary-50: #eff6ff;
  --primary-100: #dbeafe;
  --primary-200: #bfdbfe;
  --primary-300: #93c5fd;
  --primary-400: #60a5fa;
  --primary-500: #3b82f6;
  --primary-600: #2563eb;
  --primary-700: #1d4ed8;
  --primary-800: #1e40af;
  --primary-900: #1e3a8a;

  /* Gradientes para Gráficos */
  --gradient-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --gradient-success: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  --gradient-warning: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
  --gradient-danger: linear-gradient(135deg, #ff6b6b 0%, #ffa726 100%);
  
  /* Cores de Dados */
  --chart-blue: #3b82f6;
  --chart-green: #10b981;
  --chart-purple: #8b5cf6;
  --chart-orange: #f59e0b;
  --chart-red: #ef4444;
  --chart-teal: #14b8a6;
  --chart-pink: #ec4899;
  --chart-indigo: #6366f1;

  /* Sombras Modernas */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}
```

### 2.2 Tipografia para Dados

```css
/* Fontes Otimizadas para Números */
.chart-title {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-weight: 600;
  font-size: 1.125rem;
  line-height: 1.5;
  color: #1f2937;
  letter-spacing: -0.025em;
}

.chart-value {
  font-family: 'JetBrains Mono', 'SF Mono', Consolas, monospace;
  font-weight: 700;
  font-size: 2rem;
  line-height: 1.2;
  color: #111827;
  font-variant-numeric: tabular-nums;
}

.chart-label {
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  font-size: 0.875rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

## 3. Componentes Modernizados

### 3.1 Card de Estatística Moderno

```tsx
// components/ModernStatCard.tsx
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
}

export const ModernStatCard: React.FC<ModernStatCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  gradient = 'from-blue-500 to-blue-600',
  description
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300"
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
```

### 3.2 Gráfico de Linha Moderno

```tsx
// components/ModernLineChart.tsx
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
  height = 300
}) => {
  const gradientId = `gradient-${dataKey}`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6"
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
```

### 3.3 Gráfico de Barras Moderno

```tsx
// components/ModernBarChart.tsx
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';

interface ModernBarChartProps {
  data: any[];
  dataKeys: string[];
  title: string;
  colors?: string[];
  height?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-xl shadow-xl border border-gray-100">
        <p className="text-sm font-medium text-gray-600 mb-3">{label}</p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between space-x-4">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {entry.dataKey}
                </span>
              </div>
              <span className="text-sm font-bold text-gray-900 font-mono">
                R$ {entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export const ModernBarChart: React.FC<ModernBarChartProps> = ({
  data,
  dataKeys,
  title,
  colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
  height = 300
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6"
    >
      <h3 className="text-xl font-bold text-gray-900 mb-6">{title}</h3>
      
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} barCategoryGap="20%">
          <defs>
            {colors.map((color, index) => (
              <linearGradient key={index} id={`gradient-bar-${index}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.9}/>
                <stop offset="95%" stopColor={color} stopOpacity={0.7}/>
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#f3f4f6" 
            strokeWidth={1}
            vertical={false}
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
          {dataKeys.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              fill={`url(#gradient-bar-${index})`}
              radius={[4, 4, 0, 0]}
              maxBarSize={60}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
};
```

### 3.4 Gráfico de Pizza Moderno

```tsx
// components/ModernPieChart.tsx
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { motion } from 'framer-motion';

interface ModernPieChartProps {
  data: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  title: string;
  height?: number;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-4 rounded-xl shadow-xl border border-gray-100">
        <div className="flex items-center space-x-3">
          <div 
            className="w-4 h-4 rounded-full" 
            style={{ backgroundColor: data.color }}
          />
          <div>
            <p className="text-sm font-medium text-gray-700">{data.name}</p>
            <p className="text-lg font-bold text-gray-900 font-mono">
              {data.value} ({((data.value / payload[0].payload.total) * 100).toFixed(1)}%)
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
          <span className="text-sm font-medium text-gray-700">
            {entry.value}: {entry.payload.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export const ModernPieChart: React.FC<ModernPieChartProps> = ({
  data,
  title,
  height = 350
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const dataWithTotal = data.map(item => ({ ...item, total }));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6"
    >
      <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">{title}</h3>
      
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={dataWithTotal}
            cx="50%"
            cy="50%"
            outerRadius={120}
            innerRadius={60}
            dataKey="value"
            startAngle={90}
            endAngle={450}
          >
            {dataWithTotal.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color}
                stroke="#fff"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Center Text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900 font-mono">{total}</p>
          <p className="text-sm text-gray-500">Total</p>
        </div>
      </div>
    </motion.div>
  );
};
```

## 4. Animações e Transições

### 4.1 Configuração do Framer Motion

```bash
npm install framer-motion
```

### 4.2 Animações de Entrada

```tsx
// utils/animations.ts
export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 }
};

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.3 }
};

export const slideInFromRight = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.4 }
};
```

### 4.3 Loading Skeleton Moderno

```tsx
// components/ModernSkeleton.tsx
import React from 'react';
import { motion } from 'framer-motion';

export const ModernSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <motion.div
      className={`bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-lg ${className}`}
      animate={{
        backgroundPosition: ['200% 0', '-200% 0'],
      }}
      transition={{
        duration: 1.5,
        ease: 'linear',
        repeat: Infinity,
      }}
      style={{
        backgroundSize: '200% 100%',
      }}
    />
  );
};

export const ChartSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
      <ModernSkeleton className="h-6 w-48 mb-6" />
      <div className="space-y-4">
        <ModernSkeleton className="h-4 w-full" />
        <ModernSkeleton className="h-4 w-3/4" />
        <ModernSkeleton className="h-4 w-5/6" />
        <ModernSkeleton className="h-64 w-full" />
      </div>
    </div>
  );
};
```

## 5. Ícones SVG Customizados

### 5.1 Ícones Animados

```tsx
// components/AnimatedIcons.tsx
import React from 'react';
import { motion } from 'framer-motion';

export const AnimatedTrendingUp: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <motion.svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 1, ease: "easeInOut" }}
    >
      <motion.path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
      />
    </motion.svg>
  );
};

export const AnimatedDollarSign: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <motion.svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      whileHover={{ scale: 1.1, rotate: 5 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
      />
    </motion.svg>
  );
};
```

### 5.2 Indicadores de Status Modernos

```tsx
// components/ModernStatusIndicator.tsx
import React from 'react';
import { motion } from 'framer-motion';

interface StatusIndicatorProps {
  status: 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

export const ModernStatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  size = 'md',
  animated = true
}) => {
  const colors = {
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
    info: 'bg-blue-500'
  };

  const sizes = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  return (
    <div className="relative">
      <div className={`${colors[status]} ${sizes[size]} rounded-full`} />
      {animated && (
        <motion.div
          className={`absolute inset-0 ${colors[status]} rounded-full`}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [1, 0, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}
    </div>
  );
};
```

## 6. Implementação no Dashboard

### 6.1 Dashboard Modernizado

```tsx
// pages/ModernDashboard.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { ModernStatCard } from '../components/ModernStatCard';
import { ModernLineChart } from '../components/ModernLineChart';
import { ModernBarChart } from '../components/ModernBarChart';
import { Users, Calendar, DollarSign, FileText } from 'lucide-react';

export const ModernDashboard: React.FC = () => {
  const statCards = [
    {
      title: 'Total de Pacientes',
      value: '127',
      icon: Users,
      gradient: 'from-blue-500 to-blue-600',
      trend: { value: '+12%', type: 'positive' as const },
      description: 'Novos pacientes este mês'
    },
    {
      title: 'Agendamentos Hoje',
      value: '8',
      icon: Calendar,
      gradient: 'from-green-500 to-green-600',
      trend: { value: '+8%', type: 'positive' as const },
      description: 'Consultas agendadas'
    },
    {
      title: 'Receita Mensal',
      value: 'R$ 12.450',
      icon: DollarSign,
      gradient: 'from-purple-500 to-purple-600',
      trend: { value: '+15%', type: 'positive' as const },
      description: 'Faturamento do mês'
    },
    {
      title: 'Prontuários Pendentes',
      value: '3',
      icon: FileText,
      gradient: 'from-orange-500 to-orange-600',
      trend: { value: '-5%', type: 'negative' as const },
      description: 'Aguardando preenchimento'
    },
  ];

  const revenueData = [
    { month: 'Jan', revenue: 8500 },
    { month: 'Fev', revenue: 9200 },
    { month: 'Mar', revenue: 10100 },
    { month: 'Abr', revenue: 11300 },
    { month: 'Mai', revenue: 12450 },
    { month: 'Jun', revenue: 13200 },
  ];

  const appointmentsData = [
    { month: 'Jan', receitas: 8500, despesas: 3200 },
    { month: 'Fev', receitas: 9200, despesas: 3800 },
    { month: 'Mar', receitas: 10100, despesas: 4100 },
    { month: 'Abr', receitas: 11300, despesas: 4500 },
    { month: 'Mai', receitas: 12450, despesas: 4800 },
    { month: 'Jun', receitas: 13200, despesas: 5200 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto space-y-8"
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            Visão geral da sua prática clínica
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          variants={{
            animate: {
              transition: {
                staggerChildren: 0.1
              }
            }
          }}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {statCards.map((card, index) => (
            <ModernStatCard key={index} {...card} />
          ))}
        </motion.div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <ModernLineChart
            data={revenueData}
            dataKey="revenue"
            title="Receita Mensal"
            color="#8b5cf6"
            gradient={true}
          />
          
          <ModernBarChart
            data={appointmentsData}
            dataKeys={['receitas', 'despesas']}
            title="Receitas vs Despesas"
            colors={['#10b981', '#ef4444']}
          />
        </div>
      </motion.div>
    </div>
  );
};
```

## 7. Responsividade Avançada

### 7.1 Breakpoints Customizados

```css
/* tailwind.config.js - Breakpoints customizados */
module.exports = {
  theme: {
    screens: {
      'xs': '475px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
      '3xl': '1920px',
    }
  }
}
```

### 7.2 Gráficos Responsivos

```tsx
// hooks/useResponsiveChart.ts
import { useState, useEffect } from 'react';

export const useResponsiveChart = () => {
  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0,
    isMobile: false,
    isTablet: false,
    isDesktop: false
  });

  useEffect(() => {
    const updateDimensions = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setDimensions({
        width,
        height,
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  return dimensions;
};
```

## 8. Acessibilidade e Performance

### 8.1 Melhorias de Acessibilidade

```tsx
// components/AccessibleChart.tsx
import React from 'react';

interface AccessibleChartProps {
  data: any[];
  title: string;
  description: string;
  children: React.ReactNode;
}

export const AccessibleChart: React.FC<AccessibleChartProps> = ({
  data,
  title,
  description,
  children
}) => {
  return (
    <div 
      role="img" 
      aria-labelledby="chart-title" 
      aria-describedby="chart-description"
      className="focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
      tabIndex={0}
    >
      <h3 id="chart-title" className="sr-only">{title}</h3>
      <p id="chart-description" className="sr-only">{description}</p>
      
      {children}
      
      {/* Tabela de dados para leitores de tela */}
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th>Período</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index}>
              <td>{item.month || item.name}</td>
              <td>{item.value || item.revenue}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

### 8.2 Otimizações de Performance

```tsx
// hooks/useChartOptimization.ts
import { useMemo } from 'react';

export const useChartOptimization = (data: any[], threshold: number = 50) => {
  const optimizedData = useMemo(() => {
    if (data.length <= threshold) return data;
    
    // Reduzir pontos de dados para melhor performance
    const step = Math.ceil(data.length / threshold);
    return data.filter((_, index) => index % step === 0);
  }, [data, threshold]);

  return optimizedData;
};
```

## 9. Temas e Personalização

### 9.1 Sistema de Temas

```tsx
// contexts/ThemeContext.tsx
import React, { createContext, useContext, useState } from 'react';

interface Theme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    background: string;
    surface: string;
    text: string;
  };
}

const themes: Record<string, Theme> = {
  default: {
    name: 'Default',
    colors: {
      primary: '#3b82f6',
      secondary: '#6b7280',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      background: '#f9fafb',
      surface: '#ffffff',
      text: '#111827'
    }
  },
  dark: {
    name: 'Dark',
    colors: {
      primary: '#60a5fa',
      secondary: '#9ca3af',
      success: '#34d399',
      warning: '#fbbf24',
      error: '#f87171',
      background: '#111827',
      surface: '#1f2937',
      text: '#f9fafb'
    }
  },
  medical: {
    name: 'Medical',
    colors: {
      primary: '#0ea5e9',
      secondary: '#64748b',
      success: '#22c55e',
      warning: '#eab308',
      error: '#dc2626',
      background: '#f8fafc',
      surface: '#ffffff',
      text: '#0f172a'
    }
  }
};

interface ThemeContextType {
  currentTheme: Theme;
  setTheme: (themeName: string) => void;
  availableThemes: string[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState(themes.default);

  const setTheme = (themeName: string) => {
    if (themes[themeName]) {
      setCurrentTheme(themes[themeName]);
    }
  };

  return (
    <ThemeContext.Provider value={{
      currentTheme,
      setTheme,
      availableThemes: Object.keys(themes)
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
```

## 10. Implementação Gradual

### 10.1 Roadmap de Implementação

**Fase 1 (Semana 1-2): Fundação**
- [ ] Instalar dependências (framer-motion, recharts atualizados)
- [ ] Configurar sistema de cores e tipografia
- [ ] Criar componentes base (ModernStatCard, ModernSkeleton)

**Fase 2 (Semana 3-4): Gráficos Principais**
- [ ] Implementar ModernLineChart
- [ ] Implementar ModernBarChart
- [ ] Implementar ModernPieChart
- [ ] Adicionar animações básicas

**Fase 3 (Semana 5-6): Dashboard**
- [ ] Modernizar página Dashboard
- [ ] Modernizar página Financeiro
- [ ] Implementar responsividade avançada

**Fase 4 (Semana 7-8): Refinamentos**
- [ ] Adicionar sistema de temas
- [ ] Implementar acessibilidade
- [ ] Otimizações de performance
- [ ] Testes e ajustes finais

### 10.2 Migração Gradual

```tsx
// utils/featureFlags.ts
export const FEATURE_FLAGS = {
  MODERN_CHARTS: process.env.REACT_APP_MODERN_CHARTS === 'true',
  ANIMATIONS: process.env.REACT_APP_ANIMATIONS === 'true',
  THEMES: process.env.REACT_APP_THEMES === 'true',
};

// Componente de migração gradual
export const ChartWrapper: React.FC<{
  modern?: boolean;
  children: React.ReactNode;
  fallback: React.ReactNode;
}> = ({ modern = FEATURE_FLAGS.MODERN_CHARTS, children, fallback }) => {
  return modern ? <>{children}</> : <>{fallback}</>;
};
```

## 11. Conclusão

Este design system moderno para gráficos e componentes SVG transformará a interface do Psicomind em uma experiência visual mais:

### ✅ **Benefícios Principais:**

- **Visual Moderno**: Gradientes, sombras e animações suaves
- **Performance Otimizada**: Lazy loading e otimizações de renderização
- **Acessibilidade**: Suporte completo a leitores de tela
- **Responsividade**: Adaptação perfeita a todos os dispositivos
- **Consistência**: Design system unificado
- **Manutenibilidade**: Componentes reutilizáveis e bem documentados

### 🎯 **Impacto Esperado:**

- **UX Melhorada**: Interface mais intuitiva e agradável
- **Profissionalismo**: Visual mais moderno e confiável
- **Engajamento**: Animações e interações que prendem a atenção
- **Escalabilidade**: Sistema preparado para crescimento

A implementação gradual permite uma transição suave sem interrupções no sistema atual, garantindo que os psicólogos tenham uma experiência cada vez melhor com o Psicomind! 🚀