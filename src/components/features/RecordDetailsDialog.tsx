import { StudentRecord } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import StatusBadge from './StatusBadge';
import CategoryBadge from './CategoryBadge';
import { Calendar, FileText, Award, ExternalLink, AlertCircle, GraduationCap } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getAcademicYearLabel } from '@/lib/academicYear';

interface RecordDetailsDialogProps {
  record: StudentRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function RecordDetailsDialog({
  record,
  open,
  onOpenChange,
}: RecordDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4 mb-2">
            <DialogTitle className="text-2xl">{record.title}</DialogTitle>
            <StatusBadge status={record.status} />
          </div>
          <DialogDescription>Activity Record Details</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-center gap-2 flex-wrap">
            <CategoryBadge category={record.category} />
            {record.academic_year && (
              <Badge variant="outline" className="gap-1 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                <GraduationCap className="w-3 h-3" />
                {getAcademicYearLabel(record.academic_year)}
              </Badge>
            )}
            {record.points > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Award className="w-3 h-3" />
                {record.points} points
              </Badge>
            )}
          </div>

          {record.description && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileText className="w-4 h-4" />
                <span>Description</span>
              </div>
              <p className="text-sm text-muted-foreground pl-6">{record.description}</p>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="w-4 h-4" />
              <span>Activity Date</span>
            </div>
            <p className="text-sm text-muted-foreground pl-6">
              {new Date(record.activity_date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          {record.certificate_url && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Certificate</p>
              <Button variant="outline" asChild className="w-full">
                <a href={record.certificate_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Certificate
                </a>
              </Button>
            </div>
          )}

          {record.status === 'rejected' && record.rejection_reason && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <span className="font-semibold">Rejection Reason:</span> {record.rejection_reason}
              </AlertDescription>
            </Alert>
          )}

          {record.reviewed_at && (
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                {record.status === 'approved' ? 'Approved' : 'Reviewed'} on{' '}
                {new Date(record.reviewed_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
