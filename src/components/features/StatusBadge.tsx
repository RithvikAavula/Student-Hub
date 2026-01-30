import { RecordStatus } from '@/types';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: RecordStatus;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusConfig = (status: RecordStatus) => {
    switch (status) {
      case 'approved':
        return {
          icon: CheckCircle2,
          label: 'Approved',
          className: 'bg-success/10 text-success border-success/20',
        };
      case 'rejected':
        return {
          icon: XCircle,
          label: 'Rejected',
          className: 'bg-destructive/10 text-destructive border-destructive/20',
        };
      case 'pending':
      default:
        return {
          icon: Clock,
          label: 'Pending',
          className: 'bg-warning/10 text-warning border-warning/20',
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium',
        config.className,
        className
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{config.label}</span>
    </div>
  );
}
