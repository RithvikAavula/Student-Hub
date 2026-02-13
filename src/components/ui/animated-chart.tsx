/**
 * Animated Chart Wrappers for Recharts
 * 
 * Features:
 * - Animated bar growth
 * - Line reveal animations
 * - Pie/donut sweep animations
 * - Count-up animated values
 * - Staggered data point reveals
 * - Loading skeletons
 */

import React, { useState, useEffect, ReactNode } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { spring, duration as durationConfig } from '@/lib/motion';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// ============================================
// COUNT UP COMPONENT
// ============================================

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 2000,
  prefix = '',
  suffix = '',
  decimals = 0,
  className,
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplayValue(value);
      return;
    }

    const startTime = Date.now();
    const startValue = displayValue;
    const difference = value - startValue;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + difference * easeOut;
      
      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration, shouldReduceMotion]);

  const formattedValue = displayValue.toFixed(decimals);

  return (
    <span className={cn('tabular-nums', className)}>
      {prefix}
      {formattedValue}
      {suffix}
    </span>
  );
};

// ============================================
// ANIMATED CHART CONTAINER
// ============================================

interface AnimatedChartContainerProps {
  children: ReactNode;
  className?: string;
  isLoading?: boolean;
  delay?: number;
}

export const AnimatedChartContainer: React.FC<AnimatedChartContainerProps> = ({
  children,
  className,
  isLoading = false,
  delay = 0,
}) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className={cn('w-full h-full', className)}
      initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
      animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
      transition={{ delay, ...spring.gentle }}
    >
      <AnimatePresence mode="wait">
        {isLoading ? (
          <ChartSkeleton key="skeleton" />
        ) : (
          <motion.div
            key="chart"
            initial={shouldReduceMotion ? {} : { opacity: 0 }}
            animate={shouldReduceMotion ? {} : { opacity: 1 }}
            exit={shouldReduceMotion ? {} : { opacity: 0 }}
            className="w-full h-full"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ============================================
// CHART SKELETON LOADER
// ============================================

interface ChartSkeletonProps {
  type?: 'bar' | 'line' | 'pie';
  className?: string;
}

export const ChartSkeleton: React.FC<ChartSkeletonProps> = ({
  type = 'bar',
  className,
}) => {
  return (
    <motion.div
      className={cn('w-full h-full flex items-end gap-2 p-4', className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {type === 'bar' && (
        <div className="flex items-end gap-2 w-full h-full">
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-muted rounded-t animate-pulse"
              style={{
                height: `${30 + Math.random() * 60}%`,
                animationDelay: `${i * 100}ms`,
              }}
            />
          ))}
        </div>
      )}
      {type === 'line' && (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-full h-1/2 rounded bg-muted animate-pulse" />
        </div>
      )}
      {type === 'pie' && (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-32 h-32 rounded-full bg-muted animate-pulse" />
        </div>
      )}
    </motion.div>
  );
};

// ============================================
// ANIMATED BAR CHART
// ============================================

interface AnimatedBarChartProps {
  data: any[];
  dataKey: string;
  xAxisKey?: string;
  color?: string;
  colors?: string[];
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
  showLegend?: boolean;
  animationDuration?: number;
  className?: string;
}

export const AnimatedBarChart: React.FC<AnimatedBarChartProps> = ({
  data,
  dataKey,
  xAxisKey = 'name',
  color = 'hsl(var(--primary))',
  colors,
  height = 300,
  showGrid = true,
  showTooltip = true,
  showLegend = false,
  animationDuration = 1500,
  className,
}) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              opacity={0.3}
            />
          )}
          <XAxis
            dataKey={xAxisKey}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickLine={{ stroke: 'hsl(var(--border))' }}
          />
          <YAxis
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickLine={{ stroke: 'hsl(var(--border))' }}
          />
          {showTooltip && (
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            />
          )}
          {showLegend && <Legend />}
          <Bar
            dataKey={dataKey}
            fill={color}
            radius={[4, 4, 0, 0]}
            animationDuration={shouldReduceMotion ? 0 : animationDuration}
            animationEasing="ease-out"
          >
            {colors && data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// ============================================
// ANIMATED LINE CHART
// ============================================

interface AnimatedLineChartProps {
  data: any[];
  dataKeys: string[];
  xAxisKey?: string;
  colors?: string[];
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
  showLegend?: boolean;
  showDots?: boolean;
  curved?: boolean;
  animationDuration?: number;
  className?: string;
}

export const AnimatedLineChart: React.FC<AnimatedLineChartProps> = ({
  data,
  dataKeys,
  xAxisKey = 'name',
  colors = ['hsl(var(--primary))', 'hsl(var(--info))', 'hsl(var(--success))'],
  height = 300,
  showGrid = true,
  showTooltip = true,
  showLegend = false,
  showDots = true,
  curved = true,
  animationDuration = 2000,
  className,
}) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              opacity={0.3}
            />
          )}
          <XAxis
            dataKey={xAxisKey}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickLine={{ stroke: 'hsl(var(--border))' }}
          />
          <YAxis
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickLine={{ stroke: 'hsl(var(--border))' }}
          />
          {showTooltip && (
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            />
          )}
          {showLegend && <Legend />}
          {dataKeys.map((key, index) => (
            <Line
              key={key}
              type={curved ? 'monotone' : 'linear'}
              dataKey={key}
              stroke={colors[index % colors.length]}
              strokeWidth={2}
              dot={showDots ? { r: 4, fill: colors[index % colors.length] } : false}
              activeDot={{ r: 6 }}
              animationDuration={shouldReduceMotion ? 0 : animationDuration}
              animationEasing="ease-out"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// ============================================
// ANIMATED AREA CHART
// ============================================

interface AnimatedAreaChartProps {
  data: any[];
  dataKeys: string[];
  xAxisKey?: string;
  colors?: string[];
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
  showLegend?: boolean;
  stacked?: boolean;
  animationDuration?: number;
  className?: string;
}

export const AnimatedAreaChart: React.FC<AnimatedAreaChartProps> = ({
  data,
  dataKeys,
  xAxisKey = 'name',
  colors = ['hsl(var(--primary))', 'hsl(var(--info))', 'hsl(var(--success))'],
  height = 300,
  showGrid = true,
  showTooltip = true,
  showLegend = false,
  stacked = false,
  animationDuration = 2000,
  className,
}) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            {colors.map((color, index) => (
              <linearGradient
                key={`gradient-${index}`}
                id={`gradient-${index}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              opacity={0.3}
            />
          )}
          <XAxis
            dataKey={xAxisKey}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickLine={{ stroke: 'hsl(var(--border))' }}
          />
          <YAxis
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickLine={{ stroke: 'hsl(var(--border))' }}
          />
          {showTooltip && (
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            />
          )}
          {showLegend && <Legend />}
          {dataKeys.map((key, index) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stroke={colors[index % colors.length]}
              fill={`url(#gradient-${index % colors.length})`}
              strokeWidth={2}
              stackId={stacked ? 'stack' : undefined}
              animationDuration={shouldReduceMotion ? 0 : animationDuration}
              animationEasing="ease-out"
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// ============================================
// ANIMATED PIE CHART
// ============================================

interface AnimatedPieChartProps {
  data: Array<{ name: string; value: number; color?: string }>;
  colors?: string[];
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  showLabels?: boolean;
  showTooltip?: boolean;
  showLegend?: boolean;
  animationDuration?: number;
  className?: string;
}

export const AnimatedPieChart: React.FC<AnimatedPieChartProps> = ({
  data,
  colors = [
    'hsl(var(--primary))',
    'hsl(var(--info))',
    'hsl(var(--success))',
    'hsl(var(--warning))',
    'hsl(var(--destructive))',
  ],
  height = 300,
  innerRadius = 0,
  outerRadius = 100,
  showLabels = false,
  showTooltip = true,
  showLegend = true,
  animationDuration = 1500,
  className,
}) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          {showTooltip && (
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            />
          )}
          {showLegend && (
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
            />
          )}
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={innerRadius > 0 ? 4 : 0}
            dataKey="value"
            nameKey="name"
            label={showLabels ? ({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%` : false}
            labelLine={showLabels}
            animationDuration={shouldReduceMotion ? 0 : animationDuration}
            animationEasing="ease-out"
            animationBegin={0}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color || colors[index % colors.length]}
                strokeWidth={1}
                stroke="hsl(var(--background))"
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// ============================================
// ANIMATED DONUT CHART
// ============================================

export const AnimatedDonutChart: React.FC<AnimatedPieChartProps> = (props) => {
  return (
    <AnimatedPieChart
      {...props}
      innerRadius={props.innerRadius || 60}
      outerRadius={props.outerRadius || 100}
    />
  );
};

// ============================================
// ANIMATED STAT CARD
// ============================================

interface AnimatedStatCardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  change?: number;
  changeLabel?: string;
  icon?: ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'destructive' | 'info';
  delay?: number;
  className?: string;
}

export const AnimatedStatCard: React.FC<AnimatedStatCardProps> = ({
  title,
  value,
  prefix,
  suffix,
  decimals = 0,
  change,
  changeLabel,
  icon,
  color = 'primary',
  delay = 0,
  className,
}) => {
  const shouldReduceMotion = useReducedMotion();
  
  const colorClasses = {
    primary: 'from-primary/20 to-primary/5 border-primary/30',
    success: 'from-success/20 to-success/5 border-success/30',
    warning: 'from-warning/20 to-warning/5 border-warning/30',
    destructive: 'from-destructive/20 to-destructive/5 border-destructive/30',
    info: 'from-info/20 to-info/5 border-info/30',
  };

  const iconColorClasses = {
    primary: 'bg-primary/20 text-primary',
    success: 'bg-success/20 text-success',
    warning: 'bg-warning/20 text-warning',
    destructive: 'bg-destructive/20 text-destructive',
    info: 'bg-info/20 text-info',
  };

  return (
    <motion.div
      className={cn(
        'relative overflow-hidden rounded-xl border p-6',
        'bg-gradient-to-br',
        colorClasses[color],
        className
      )}
      initial={shouldReduceMotion ? {} : { opacity: 0, y: 20, scale: 0.95 }}
      animate={shouldReduceMotion ? {} : { opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, ...spring.gentle }}
      whileHover={shouldReduceMotion ? {} : { 
        scale: 1.02, 
        boxShadow: '0 8px 30px -12px rgba(0,0,0,0.2)' 
      }}
    >
      {/* Background decoration */}
      <div 
        className="absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10"
        style={{ background: `hsl(var(--${color}))` }}
      />

      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <motion.p
            className="text-sm font-medium text-muted-foreground"
            initial={shouldReduceMotion ? {} : { opacity: 0, x: -10 }}
            animate={shouldReduceMotion ? {} : { opacity: 1, x: 0 }}
            transition={{ delay: delay + 0.1 }}
          >
            {title}
          </motion.p>
          <motion.div
            className="text-3xl font-bold"
            initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.5 }}
            animate={shouldReduceMotion ? {} : { opacity: 1, scale: 1 }}
            transition={{ delay: delay + 0.2, ...spring.bouncy }}
          >
            <AnimatedCounter
              value={value}
              prefix={prefix}
              suffix={suffix}
              decimals={decimals}
              duration={1500}
            />
          </motion.div>
          {change !== undefined && (
            <motion.div
              className="flex items-center gap-1 text-sm"
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 5 }}
              animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
              transition={{ delay: delay + 0.3 }}
            >
              <span
                className={cn(
                  'font-medium',
                  change >= 0 ? 'text-success' : 'text-destructive'
                )}
              >
                {change >= 0 ? '+' : ''}{change}%
              </span>
              {changeLabel && (
                <span className="text-muted-foreground">{changeLabel}</span>
              )}
            </motion.div>
          )}
        </div>

        {icon && (
          <motion.div
            className={cn(
              'flex items-center justify-center w-12 h-12 rounded-xl',
              iconColorClasses[color]
            )}
            initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0, rotate: -90 }}
            animate={shouldReduceMotion ? {} : { opacity: 1, scale: 1, rotate: 0 }}
            transition={{ delay: delay + 0.15, ...spring.bouncy }}
          >
            {icon}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

// ============================================
// ANIMATED PROGRESS RING
// ============================================

interface AnimatedProgressRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  showValue?: boolean;
  label?: string;
  className?: string;
}

export const AnimatedProgressRing: React.FC<AnimatedProgressRingProps> = ({
  value,
  max = 100,
  size = 120,
  strokeWidth = 8,
  color = 'hsl(var(--primary))',
  trackColor = 'hsl(var(--muted))',
  showValue = true,
  label,
  className,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [animatedValue, setAnimatedValue] = useState(0);

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percent = Math.min((animatedValue / max) * 100, 100);
  const offset = circumference - (percent / 100) * circumference;

  useEffect(() => {
    if (shouldReduceMotion) {
      setAnimatedValue(value);
      return;
    }

    const duration = 1500;
    const startTime = Date.now();
    const startValue = animatedValue;
    const difference = value - startValue;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      setAnimatedValue(startValue + difference * easeOut);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, shouldReduceMotion]);

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={shouldReduceMotion ? circumference - (value / max) * circumference : offset}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: [0.4, 0, 0.2, 1] }}
        />
      </svg>
      {showValue && (
        <div className="absolute flex flex-col items-center">
          <span className="text-2xl font-bold">
            {Math.round(animatedValue)}
          </span>
          {label && (
            <span className="text-xs text-muted-foreground">{label}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default {
  AnimatedCounter,
  AnimatedChartContainer,
  ChartSkeleton,
  AnimatedBarChart,
  AnimatedLineChart,
  AnimatedAreaChart,
  AnimatedPieChart,
  AnimatedDonutChart,
  AnimatedStatCard,
  AnimatedProgressRing,
};
