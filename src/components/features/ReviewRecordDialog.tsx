import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { StudentRecord } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import StatusBadge from './StatusBadge';
import CategoryBadge from './CategoryBadge';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, ExternalLink, Calendar, FileText, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ReviewRecordDialogProps {
  record: StudentRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function ReviewRecordDialog({
  record,
  open,
  onOpenChange,
  onSuccess,
}: ReviewRecordDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleApprove = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('student_records')
        .update({
          status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: null,
        })
        .eq('id', record.id);

      if (error) throw error;

      toast({
        title: 'Record approved',
        description: 'The student will be notified of the approval.',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error approving record',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast({
        title: 'Rejection reason required',
        description: 'Please provide a reason for rejection.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('student_records')
        .update({
          status: 'rejected',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq('id', record.id);

      if (error) throw error;

      toast({
        title: 'Record rejected',
        description: 'The student will be notified with your feedback.',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error rejecting record',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4 mb-2">
            <DialogTitle className="text-2xl">{record.title}</DialogTitle>
            <StatusBadge status={record.status} />
          </div>
          <DialogDescription>Review Student Activity Record</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-center gap-2 flex-wrap">
            <CategoryBadge category={record.category} />
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
              <p className="text-sm text-muted-foreground pl-6 bg-muted/50 p-3 rounded-lg">
                {record.description}
              </p>
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

          {record.status === 'pending' && (
            <div className="space-y-2 pt-4 border-t">
              <Label htmlFor="rejection-reason">Rejection Reason (if rejecting)</Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Provide feedback on why this record is being rejected..."
                rows={3}
              />
            </div>
          )}
        </div>

        {record.status === 'pending' && (
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={loading}>
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
            <Button onClick={handleApprove} disabled={loading}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Approve
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
