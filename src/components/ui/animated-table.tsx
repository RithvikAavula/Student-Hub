/**
 * Animated Table and Leaderboard Components
 * 
 * Features:
 * - Animated row entry
 * - Highlight animation for current user row
 * - Animated rank change when data updates
 * - Smooth row rearrangement on sort/filter
 * - Skeleton loading states
 */

import React, { ReactNode, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion, LayoutGroup } from 'framer-motion';
import { cn } from '@/lib/utils';
import { spring, duration, easing, staggerItemVariants } from '@/lib/motion';
import { Trophy, Medal, Award, TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ============================================
// ANIMATED TABLE
// ============================================

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T, index: number) => ReactNode;
  sortable?: boolean;
  width?: string;
}

interface AnimatedTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  highlightRow?: (item: T) => boolean;
  emptyMessage?: string;
  loading?: boolean;
  className?: string;
}

export function AnimatedTable<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  highlightRow,
  emptyMessage = 'No data available',
  loading = false,
  className,
}: AnimatedTableProps<T>) {
  const shouldReduceMotion = useReducedMotion();

  if (loading) {
    return <TableSkeleton columns={columns.length} rows={5} className={className} />;
  }

  return (
    <div className={cn('overflow-hidden rounded-xl border border-border', className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              {columns.map((column, index) => (
                <th
                  key={String(column.key)}
                  className={cn(
                    'px-4 py-3 text-left text-sm font-medium text-muted-foreground',
                    column.width
                  )}
                >
                  <motion.span
                    initial={shouldReduceMotion ? {} : { opacity: 0, y: -10 }}
                    animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    {column.header}
                  </motion.span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <LayoutGroup>
              <AnimatePresence mode="popLayout">
                {data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="px-4 py-12 text-center text-muted-foreground"
                    >
                      <motion.div
                        initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.9 }}
                        animate={shouldReduceMotion ? {} : { opacity: 1, scale: 1 }}
                        className="flex flex-col items-center gap-2"
                      >
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                          <span className="text-2xl">📭</span>
                        </div>
                        {emptyMessage}
                      </motion.div>
                    </td>
                  </tr>
                ) : (
                  data.map((item, rowIndex) => (
                    <motion.tr
                      key={keyExtractor(item)}
                      layout
                      initial={shouldReduceMotion ? {} : { opacity: 0, x: -20 }}
                      animate={shouldReduceMotion ? {} : { opacity: 1, x: 0 }}
                      exit={shouldReduceMotion ? {} : { opacity: 0, x: 20 }}
                      transition={{
                        delay: rowIndex * 0.05,
                        layout: spring.snappy,
                      }}
                      className={cn(
                        'border-b border-border transition-colors',
                        onRowClick && 'cursor-pointer hover:bg-muted/50',
                        highlightRow?.(item) && 'bg-primary/10 hover:bg-primary/15'
                      )}
                      onClick={() => onRowClick?.(item)}
                      whileHover={shouldReduceMotion || !onRowClick ? {} : {
                        backgroundColor: 'hsl(var(--muted) / 0.5)',
                      }}
                    >
                      {columns.map((column) => (
                        <td
                          key={String(column.key)}
                          className={cn('px-4 py-3 text-sm', column.width)}
                        >
                          {column.render
                            ? column.render(item, rowIndex)
                            : String(item[column.key as keyof T] ?? '')}
                        </td>
                      ))}
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </LayoutGroup>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================
// TABLE SKELETON
// ============================================

interface TableSkeletonProps {
  columns: number;
  rows: number;
  className?: string;
}

const TableSkeleton: React.FC<TableSkeletonProps> = ({
  columns,
  rows,
  className,
}) => {
  return (
    <div className={cn('overflow-hidden rounded-xl border border-border', className)}>
      <table className="w-full">
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <div className="h-4 bg-muted rounded animate-skeleton" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} className="border-b border-border">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="px-4 py-3">
                  <motion.div
                    className="h-4 bg-muted rounded animate-skeleton"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: (rowIndex * columns + colIndex) * 0.02 }}
                    style={{ width: `${60 + Math.random() * 30}%` }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ============================================
// ANIMATED LEADERBOARD
// ============================================

interface LeaderboardItem {
  id: string;
  rank: number;
  previousRank?: number;
  name: string;
  avatar?: string;
  score: number;
  isCurrentUser?: boolean;
  subtitle?: string;
  metadata?: Record<string, any>;
}

interface AnimatedLeaderboardProps {
  items: LeaderboardItem[];
  onItemClick?: (item: LeaderboardItem) => void;
  showRankChange?: boolean;
  maxItems?: number;
  loading?: boolean;
  className?: string;
}

export const AnimatedLeaderboard: React.FC<AnimatedLeaderboardProps> = ({
  items,
  onItemClick,
  showRankChange = true,
  maxItems,
  loading = false,
  className,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const displayItems = maxItems ? items.slice(0, maxItems) : items;

  if (loading) {
    return <LeaderboardSkeleton rows={maxItems || 5} className={className} />;
  }

  return (
    <div className={cn('space-y-2', className)}>
      <LayoutGroup>
        <AnimatePresence mode="popLayout">
          {displayItems.map((item, index) => (
            <LeaderboardRow
              key={item.id}
              item={item}
              index={index}
              onClick={() => onItemClick?.(item)}
              showRankChange={showRankChange}
            />
          ))}
        </AnimatePresence>
      </LayoutGroup>
    </div>
  );
};

// ============================================
// LEADERBOARD ROW
// ============================================

interface LeaderboardRowProps {
  item: LeaderboardItem;
  index: number;
  onClick?: () => void;
  showRankChange?: boolean;
}

const LeaderboardRow: React.FC<LeaderboardRowProps> = ({
  item,
  index,
  onClick,
  showRankChange,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [isHighlighted, setIsHighlighted] = useState(false);

  // Determine rank change
  const rankChange = useMemo(() => {
    if (!item.previousRank) return 'same';
    if (item.rank < item.previousRank) return 'up';
    if (item.rank > item.previousRank) return 'down';
    return 'same';
  }, [item.rank, item.previousRank]);

  // Highlight animation when rank changes
  useEffect(() => {
    if (item.previousRank && item.previousRank !== item.rank) {
      setIsHighlighted(true);
      const timer = setTimeout(() => setIsHighlighted(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [item.rank, item.previousRank]);

  const getRankIcon = () => {
    switch (item.rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return (
          <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">
            {item.rank}
          </span>
        );
    }
  };

  const getRankChangeIcon = () => {
    if (rankChange === 'up') {
      return <TrendingUp className="w-4 h-4 text-success" />;
    }
    if (rankChange === 'down') {
      return <TrendingDown className="w-4 h-4 text-destructive" />;
    }
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <motion.div
      layout
      initial={shouldReduceMotion ? {} : { opacity: 0, x: -30, scale: 0.95 }}
      animate={shouldReduceMotion ? {} : { 
        opacity: 1, 
        x: 0, 
        scale: 1,
        backgroundColor: isHighlighted ? 'hsl(var(--primary) / 0.15)' : undefined,
      }}
      exit={shouldReduceMotion ? {} : { opacity: 0, x: 30, scale: 0.95 }}
      transition={{
        delay: index * 0.05,
        layout: spring.snappy,
      }}
      className={cn(
        'relative flex items-center gap-4 p-4 rounded-xl border border-border bg-card',
        'transition-colors cursor-pointer hover:bg-muted/50',
        item.isCurrentUser && 'ring-2 ring-primary bg-primary/5',
        item.rank <= 3 && 'bg-gradient-to-r from-card to-muted/30'
      )}
      onClick={onClick}
      whileHover={shouldReduceMotion ? {} : { scale: 1.01, y: -2 }}
      whileTap={shouldReduceMotion ? {} : { scale: 0.99 }}
    >
      {/* Rank */}
      <motion.div
        className={cn(
          'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
          item.rank <= 3
            ? 'bg-gradient-to-br from-primary/20 to-accent/20'
            : 'bg-muted'
        )}
        animate={shouldReduceMotion ? {} : {
          scale: isHighlighted ? [1, 1.2, 1] : 1,
          rotate: isHighlighted && rankChange === 'up' ? [0, -10, 10, 0] : 0,
        }}
        transition={{ duration: 0.5 }}
      >
        {getRankIcon()}
      </motion.div>

      {/* Avatar */}
      {item.avatar ? (
        <motion.img
          src={item.avatar}
          alt={item.name}
          className="w-10 h-10 rounded-full object-cover border-2 border-border"
          whileHover={shouldReduceMotion ? {} : { scale: 1.1 }}
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold">
          {item.name.charAt(0).toUpperCase()}
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'font-medium truncate',
          item.isCurrentUser && 'text-primary'
        )}>
          {item.name}
          {item.isCurrentUser && (
            <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
              You
            </span>
          )}
        </p>
        {item.subtitle && (
          <p className="text-sm text-muted-foreground truncate">{item.subtitle}</p>
        )}
      </div>

      {/* Score */}
      <motion.div
        className="flex items-center gap-2"
        animate={shouldReduceMotion ? {} : {
          scale: isHighlighted ? [1, 1.1, 1] : 1,
        }}
      >
        <span className="text-lg font-bold">{item.score.toLocaleString()}</span>
        <span className="text-sm text-muted-foreground">pts</span>
      </motion.div>

      {/* Rank Change Indicator */}
      {showRankChange && item.previousRank && (
        <motion.div
          initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0 }}
          animate={shouldReduceMotion ? {} : { opacity: 1, scale: 1 }}
          className="flex items-center gap-1"
        >
          {getRankChangeIcon()}
          {rankChange !== 'same' && (
            <span className={cn(
              'text-xs font-medium',
              rankChange === 'up' && 'text-success',
              rankChange === 'down' && 'text-destructive'
            )}>
              {Math.abs(item.rank - item.previousRank)}
            </span>
          )}
        </motion.div>
      )}

      {/* Current user highlight animation */}
      {item.isCurrentUser && !shouldReduceMotion && (
        <motion.div
          className="absolute inset-0 rounded-xl border-2 border-primary pointer-events-none"
          animate={{
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
    </motion.div>
  );
};

// ============================================
// LEADERBOARD SKELETON
// ============================================

interface LeaderboardSkeletonProps {
  rows: number;
  className?: string;
}

const LeaderboardSkeleton: React.FC<LeaderboardSkeletonProps> = ({
  rows,
  className,
}) => {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <motion.div
          key={index}
          className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <div className="w-10 h-10 rounded-full bg-muted animate-skeleton" />
          <div className="w-10 h-10 rounded-full bg-muted animate-skeleton" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded animate-skeleton w-32" />
            <div className="h-3 bg-muted rounded animate-skeleton w-24" />
          </div>
          <div className="h-6 bg-muted rounded animate-skeleton w-16" />
        </motion.div>
      ))}
    </div>
  );
};

export { TableSkeleton, LeaderboardSkeleton };
export default AnimatedTable;
