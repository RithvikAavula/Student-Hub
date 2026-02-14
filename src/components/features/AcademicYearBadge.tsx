import { AcademicYear } from '@/types';
import { getAcademicYearLabel } from '@/lib/academicYear';
import { cn } from '@/lib/utils';

interface AcademicYearBadgeProps {
  year: AcademicYear | number;
  className?: string;
  size?: 'sm' | 'md';
}

export default function AcademicYearBadge({ year, className, size = 'sm' }: AcademicYearBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        sizeClasses[size],
        className
      )}
    >
      {getAcademicYearLabel(year as AcademicYear)}
    </span>
  );
}
