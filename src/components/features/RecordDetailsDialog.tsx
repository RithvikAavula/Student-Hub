import { useState } from 'react';
import { StudentRecord, RecordCategory } from '@/types';
import { supabase } from '@/lib/supabase';
import { analyzeCertificateForFraud } from '@/lib/certificates';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import StatusBadge from './StatusBadge';
import CategoryBadge from './CategoryBadge';
import { Calendar, FileText, Award, ExternalLink, AlertCircle, GraduationCap, Edit, Trash2, Loader2, X, Save, Upload } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getAcademicYearLabel } from '@/lib/academicYear';
import { useToast } from '@/hooks/use-toast';

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
  onSuccess,
}: RecordDetailsDialogProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Edit form state
  const [formData, setFormData] = useState({
    title: record.title,
    description: record.description || '',
    category: record.category as RecordCategory,
    activity_date: record.activity_date,
    points: record.points || 0,
  });
  const [newCertificate, setNewCertificate] = useState<File | null>(null);

  // Check if student can edit/delete (only pending records)
  const canModify = record.status === 'pending';

  const handleEdit = () => {
    // Reset form data to current record values
    setFormData({
      title: record.title,
      description: record.description || '',
      category: record.category as RecordCategory,
      activity_date: record.activity_date,
      points: record.points || 0,
    });
    setNewCertificate(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setNewCertificate(null);
  };

  const handleSaveEdit = async () => {
    setLoading(true);

    try {
      let certificateUrl = record.certificate_url;
      let fraudAnalysis = null;

      // Upload new certificate if provided
      if (newCertificate) {
        setUploading(true);
        
        // Run fraud analysis on the new certificate
        const studentProfile = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', record.student_id)
          .single();
        
        const studentName = studentProfile.data?.full_name || '';
        fraudAnalysis = await analyzeCertificateForFraud(newCertificate, studentName);
        
        const fileExt = newCertificate.name.split('.').pop();
        const fileName = `${record.student_id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('certificates')
          .upload(fileName, newCertificate);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('certificates')
          .getPublicUrl(fileName);

        certificateUrl = urlData.publicUrl;
        setUploading(false);
      }

      // Update the record
      const updateData: any = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        activity_date: formData.activity_date,
        points: formData.points,
        certificate_url: certificateUrl,
      };

      // If new certificate uploaded, update fraud analysis
      if (fraudAnalysis) {
        updateData.fraud_indicators = fraudAnalysis.fraud_indicators;
        updateData.fraud_score = fraudAnalysis.fraud_score;
        updateData.analysis_completed = fraudAnalysis.analysis_completed;
      }

      const { error } = await supabase
        .from('student_records')
        .update(updateData)
        .eq('id', record.id);

      if (error) throw error;

      toast({
        title: 'Certificate updated',
        description: 'Your certificate has been updated successfully.',
      });

      setIsEditing(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Error updating certificate',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);

    try {
      // Delete the certificate file from storage if exists
      if (record.certificate_url) {
        // Extract the file path from the URL
        const urlParts = record.certificate_url.split('/certificates/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          await supabase.storage.from('certificates').remove([filePath]);
        }
      }

      // Delete the record
      const { error } = await supabase
        .from('student_records')
        .delete()
        .eq('id', record.id);

      if (error) throw error;

      toast({
        title: 'Certificate deleted',
        description: 'Your certificate has been deleted.',
      });

      setShowDeleteConfirm(false);
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Error deleting certificate',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Edit Mode View
  if (isEditing) {
    return (
      <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) handleCancelEdit();
        onOpenChange(isOpen);
      }}>
        <DialogContent className="sm:max-w-[525px] max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Edit Certificate</DialogTitle>
            <DialogDescription>
              Update your certificate details
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin">
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title *</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., First Prize in Hackathon"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value as RecordCategory })}
                >
                  <SelectTrigger id="edit-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="academic">Academic</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="sports">Sports</SelectItem>
                    <SelectItem value="cultural">Cultural</SelectItem>
                    <SelectItem value="social">Social Service</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-activity_date">Activity Date *</Label>
                <Input
                  id="edit-activity_date"
                  type="date"
                  value={formData.activity_date}
                  onChange={(e) => setFormData({ ...formData, activity_date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-points">Points</Label>
                <Input
                  id="edit-points"
                  type="number"
                  min="0"
                  value={formData.points}
                  onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide details about this activity..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-certificate">
                  {record.certificate_url ? 'Replace Certificate (Optional)' : 'Certificate (Optional)'}
                </Label>
                {record.certificate_url && !newCertificate && (
                  <div className="text-sm text-muted-foreground mb-2">
                    Current: <a href={record.certificate_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">View current certificate</a>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Input
                    id="edit-certificate"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setNewCertificate(e.target.files?.[0] || null)}
                    className="cursor-pointer"
                  />
                  {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
                {newCertificate && (
                  <p className="text-xs text-muted-foreground">New file: {newCertificate.name}</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 pt-4 border-t gap-2">
            <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={loading}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={loading || uploading || !formData.title || !formData.activity_date}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Normal View Mode
  return (
    <>
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

            {/* Edit/Delete Actions - Only for pending records */}
            {canModify && (
              <div className="pt-4 border-t flex gap-2">
                <Button variant="outline" onClick={handleEdit} className="flex-1">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)} className="flex-1">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            )}

            {!canModify && (
              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground text-center">
                  This certificate has been {record.status} and cannot be edited.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Certificate?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{record.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
