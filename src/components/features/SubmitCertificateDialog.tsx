import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { submitCertificate } from '@/lib/certificates';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, Award, Calendar, FileText, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SubmitCertificateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function SubmitCertificateDialog({ open, onOpenChange, onSuccess }: SubmitCertificateDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    certificateCode: '',
    title: '',
    description: '',
    issuingOrganization: '',
    issueDate: new Date().toISOString().split('T')[0],
  });
  const [certificateFile, setCertificateFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload a PDF or image file (PNG, JPEG)',
          variant: 'destructive',
        });
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Maximum file size is 10MB',
          variant: 'destructive',
        });
        return;
      }

      setCertificateFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !certificateFile) return;

    // Validation
    if (!formData.certificateCode.trim()) {
      toast({
        title: 'Certificate code required',
        description: 'Please enter the certificate code',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.title.trim()) {
      toast({
        title: 'Title required',
        description: 'Please enter the certificate title',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.issuingOrganization.trim()) {
      toast({
        title: 'Issuing organization required',
        description: 'Please enter the issuing organization',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const submission = await submitCertificate({
        studentId: user.id,
        certificateCode: formData.certificateCode.trim(),
        title: formData.title.trim(),
        description: formData.description?.trim() || undefined,
        issuingOrganization: formData.issuingOrganization.trim(),
        issueDate: formData.issueDate,
        file: certificateFile,
      });

      // Show appropriate toast based on validation status
      if (submission.validation_status === 'valid') {
        toast({
          title: 'Certificate submitted successfully',
          description: 'Your certificate has been verified and submitted for faculty approval.',
        });
      } else if (submission.validation_status === 'tampered') {
        toast({
          title: 'Warning: Certificate may be altered',
          description: 'Your certificate has been submitted but appears to be modified from the original.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Certificate submitted for review',
          description: 'Your certificate could not be automatically verified. Faculty will review it.',
        });
      }

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: 'Error submitting certificate',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      certificateCode: '',
      title: '',
      description: '',
      issuingOrganization: '',
      issueDate: new Date().toISOString().split('T')[0],
    });
    setCertificateFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Submit Certificate for Validation
          </DialogTitle>
          <DialogDescription>
            Upload your certificate for verification and faculty approval
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-1 py-4 space-y-4">
            {/* Certificate Code */}
            <div className="space-y-2">
              <Label htmlFor="certificateCode" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Certificate Code *
              </Label>
              <Input
                id="certificateCode"
                placeholder="e.g., CERT-2026-000001"
                value={formData.certificateCode}
                onChange={(e) => setFormData({ ...formData, certificateCode: e.target.value })}
                className="font-mono"
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter the unique code printed on your certificate
              </p>
            </div>

            {/* Certificate Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Certificate Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Certificate of Completion"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            {/* Issuing Organization */}
            <div className="space-y-2">
              <Label htmlFor="issuingOrganization" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Issuing Organization *
              </Label>
              <Input
                id="issuingOrganization"
                placeholder="e.g., Coursera, NPTEL, AWS"
                value={formData.issuingOrganization}
                onChange={(e) => setFormData({ ...formData, issuingOrganization: e.target.value })}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Additional details about the certificate..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            {/* Issue Date */}
            <div className="space-y-2">
              <Label htmlFor="issueDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Issue Date *
              </Label>
              <Input
                id="issueDate"
                type="date"
                value={formData.issueDate}
                onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                required
              />
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Certificate File *
              </Label>
              <div className="border-2 border-dashed rounded-lg p-4 hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  id="certificateFile"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="certificateFile"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <AnimatePresence mode="wait">
                    {certificateFile ? (
                      <motion.div
                        key="file"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="flex items-center gap-2 text-green-600 dark:text-green-400"
                      >
                        <FileText className="h-8 w-8" />
                        <div className="text-left">
                          <p className="font-medium">{certificateFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(certificateFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="placeholder"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-center"
                      >
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mt-2">
                          Click to upload certificate file
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PDF, PNG, or JPEG (max 10MB)
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </label>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>How it works:</strong> Your certificate will be automatically validated 
                against our database. The validation status (Valid/Fake/Tampered) will be 
                shown to faculty for review.
              </p>
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !certificateFile}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Award className="mr-2 h-4 w-4" />
                  Submit Certificate
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
