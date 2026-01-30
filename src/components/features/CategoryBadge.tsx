import { RecordCategory } from '@/types';
import { Trophy, Palette, Code, Users, BookOpen, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategoryBadgeProps {
  category: RecordCategory;
  className?: string;
}

export default function CategoryBadge({ category, className }: CategoryBadgeProps) {
  const getCategoryConfig = (category: RecordCategory) => {
    switch (category) {
      case 'academic':
        return {
          icon: BookOpen,
          label: 'Academic',
          className: 'bg-blue-50 text-blue-700 border-blue-200',
        };
      case 'sports':
        return {
          icon: Trophy,
          label: 'Sports',
          className: 'bg-green-50 text-green-700 border-green-200',
        };
      case 'cultural':
        return {
          icon: Palette,
          label: 'Cultural',
          className: 'bg-purple-50 text-purple-700 border-purple-200',
        };
      case 'technical':
        return {
          icon: Code,
          label: 'Technical',
          className: 'bg-orange-50 text-orange-700 border-orange-200',
        };
      case 'social':
        return {
          icon: Users,
          label: 'Social',
          className: 'bg-pink-50 text-pink-700 border-pink-200',
        };
      case 'other':
      default:
        return {
          icon: MoreHorizontal,
          label: 'Other',
          className: 'bg-gray-50 text-gray-700 border-gray-200',
        };
    }
  };

  const config = getCategoryConfig(category);
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium',
        config.className,
        className
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{config.label}</span>
    </div>
  );
}
