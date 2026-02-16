import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import {
  getPendingCertificates,
  approveCertificate,
  rejectCertificate,
  getCertificateFileUrl,
  getValidationStatusDisplay,
  type CertificateSubmission,
} from '@/lib/certificates';
import { FraudIndicators } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  Award,
  CheckCircle,
  XCircle,
  Eye,
  Loader2,
  AlertTriangle,
  Shield,
  HelpCircle,
  Search,
  ExternalLink,
  RefreshCw,
  FileWarning,
  Calendar,
  User,
  Settings,
  Layers,
  FileSignature,
  Edit3,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FacultyCertificateReviewProps {
  facultyId: string;
}

// Helper to get risk level display
function getRiskLevelDisplay(fraudScore: number | undefined) {
  const score = fraudScore || 0;
  if (score <= 20) {
    return { label: 'Low Risk', color: 'text-green-600', bgColor: 'bg-green-100', variant: 'default' as const };
  }
  if (score <= 40) {
    return { label: 'Moderate', color: 'text-yellow-600', bgColor: 'bg-yellow-100', variant: 'secondary' as const };
  }
  if (score <= 60) {
    return { label: 'Elevated', color: 'text-orange-600', bgColor: 'bg-orange-100', variant: 'secondary' as const };
  }
  if (score <= 80) {
    return { label: 'High Risk', color: 'text-red-600', bgColor: 'bg-red-100', variant: 'destructive' as const };
  }
  return { label: 'Critical', color: 'text-red-700', bgColor: 'bg-red-200', variant: 'destructive' as const };
}

export default function FacultyCertificateReview({ facultyId }: FacultyCertificateReviewProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<CertificateSubmission[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<CertificateSubmission | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadSubmissions();
  }, [facultyId]);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const data = await getPendingCertificates(facultyId);
      setSubmissions(data);
    } catch (error: any) {
      toast({
        title: 'Error loading submissions',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (submission: CertificateSubmission) => {
    setActionLoading(true);
    try {
      await approveCertificate(submission.id, facultyId);
      toast({
        title: 'Certificate approved',
        description: `Certificate "${submission.title}" has been approved.`,
      });
      loadSubmissions();
      setViewDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error approving certificate',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedSubmission || !rejectionReason.trim()) {
      toast({
        title: 'Rejection reason required',
        description: 'Please provide a reason for rejection',
        variant: 'destructive',
      });
      return;
    }

    setActionLoading(true);
    try {
      await rejectCertificate(selectedSubmission.id, facultyId, rejectionReason.trim());
      toast({
        title: 'Certificate rejected',
        description: `Certificate "${selectedSubmission.title}" has been rejected.`,
      });
      loadSubmissions();
      setRejectDialogOpen(false);
      setViewDialogOpen(false);
      setRejectionReason('');
    } catch (error: any) {
      toast({
        title: 'Error rejecting certificate',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectDialog = (submission: CertificateSubmission) => {
    setSelectedSubmission(submission);
    setRejectDialogOpen(true);
  };

  const openViewDialog = (submission: CertificateSubmission) => {
    setSelectedSubmission(submission);
    setViewDialogOpen(true);
  };

  const handleViewFile = async (submission: CertificateSubmission) => {
    if (!submission.file_url) return;
    
    try {
      const url = await getCertificateFileUrl(submission.file_url);
      if (url) {
        window.open(url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: 'Error opening file',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Sort submissions by fraud score (highest first)
  const sortedSubmissions = [...submissions].sort((a, b) => 
    (b.fraud_score || 0) - (a.fraud_score || 0)
  );

  const filteredSubmissions = sortedSubmissions.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.certificate_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.issuing_organization.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Certificate Review
            </CardTitle>
            <CardDescription>
              Review and approve/reject student certificate submissions
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadSubmissions} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, code, or organization..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Submissions Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No pending certificate submissions</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Certificate</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Fraud Risk</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filteredSubmissions.map((submission) => {
                    const riskDisplay = getRiskLevelDisplay(submission.fraud_score);
                    return (
                      <motion.tr
                        key={submission.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        className={`hover:bg-muted/50 ${(submission.fraud_score || 0) >= 60 ? 'bg-red-50 dark:bg-red-900/10' : ''}`}
                      >
                        <TableCell>
                          <div className="font-medium">
                            {submission.student?.full_name || 'Unknown Student'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {submission.student?.student_id}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{submission.title}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {submission.certificate_code}
                          </div>
                        </TableCell>
                        <TableCell>{submission.issuing_organization}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge
                              variant={riskDisplay.variant}
                              className="flex items-center gap-1 w-fit"
                            >
                              {(submission.fraud_score || 0) >= 60 ? (
                                <AlertTriangle className="h-3 w-3" />
                              ) : (submission.fraud_score || 0) >= 40 ? (
                                <FileWarning className="h-3 w-3" />
                              ) : (
                                <Shield className="h-3 w-3" />
                              )}
                              {riskDisplay.label}
                            </Badge>
                            <div className="flex items-center gap-1">
                              <Progress 
                                value={submission.fraud_score || 0} 
                                className="h-1 w-16" 
                              />
                              <span className="text-xs text-muted-foreground">
                                {submission.fraud_score || 0}%
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(submission.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openViewDialog(submission)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleApprove(submission)}
                              disabled={actionLoading}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => openRejectDialog(submission)}
                              disabled={actionLoading}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        )}

        {/* View Details Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Certificate Details
              </DialogTitle>
              <DialogDescription>
                Review the certificate submission details
              </DialogDescription>
            </DialogHeader>
            {selectedSubmission && (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {/* Fraud Risk Score */}
                <div className={`rounded-lg p-4 border ${
                  (selectedSubmission.fraud_score || 0) >= 60 
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    : (selectedSubmission.fraud_score || 0) >= 40
                    ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                    : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {(selectedSubmission.fraud_score || 0) >= 60 ? (
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      ) : (selectedSubmission.fraud_score || 0) >= 40 ? (
                        <FileWarning className="h-5 w-5 text-orange-500" />
                      ) : (
                        <Shield className="h-5 w-5 text-green-500" />
                      )}
                      <span className="font-medium">
                        Fraud Risk Score: {selectedSubmission.fraud_score || 0}/100
                      </span>
                    </div>
                    <Badge variant={getRiskLevelDisplay(selectedSubmission.fraud_score).variant}>
                      {getRiskLevelDisplay(selectedSubmission.fraud_score).label}
                    </Badge>
                  </div>
                  <Progress 
                    value={selectedSubmission.fraud_score || 0} 
                    className="h-2 mb-2" 
                  />
                  <p className="text-sm text-muted-foreground">
                    {(selectedSubmission.fraud_score || 0) >= 60 
                      ? 'High probability of fraudulent document. Careful review recommended.'
                      : (selectedSubmission.fraud_score || 0) >= 40
                      ? 'Some indicators of potential manipulation detected.'
                      : 'Document appears to be authentic with low risk indicators.'}
                  </p>
                </div>

                {/* Fraud Indicators */}
                {selectedSubmission.fraud_indicators && (
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Document Analysis
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {selectedSubmission.fraud_indicators.creation_software && (
                        <div className="flex items-start gap-2">
                          <Edit3 className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-muted-foreground">Creation Software</p>
                            <p className="font-medium">{selectedSubmission.fraud_indicators.creation_software}</p>
                          </div>
                        </div>
                      )}
                      {selectedSubmission.fraud_indicators.producer && (
                        <div className="flex items-start gap-2">
                          <Settings className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-muted-foreground">PDF Producer</p>
                            <p className="font-medium">{selectedSubmission.fraud_indicators.producer}</p>
                          </div>
                        </div>
                      )}
                      {selectedSubmission.fraud_indicators.creation_date && (
                        <div className="flex items-start gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-muted-foreground">Created</p>
                            <p className="font-medium">
                              {new Date(selectedSubmission.fraud_indicators.creation_date).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      )}
                      {selectedSubmission.fraud_indicators.modification_date && (
                        <div className="flex items-start gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-muted-foreground">Last Modified</p>
                            <p className="font-medium">
                              {new Date(selectedSubmission.fraud_indicators.modification_date).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      )}
                      {selectedSubmission.fraud_indicators.author && (
                        <div className="flex items-start gap-2">
                          <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-muted-foreground">Author</p>
                            <p className="font-medium">{selectedSubmission.fraud_indicators.author}</p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-start gap-2">
                        <FileSignature className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-muted-foreground">Digital Signature</p>
                          <p className="font-medium">
                            {selectedSubmission.fraud_indicators.has_digital_signature 
                              ? <span className="text-green-600">Present</span> 
                              : <span className="text-yellow-600">Not Found</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Layers className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-muted-foreground">Has Layers</p>
                          <p className="font-medium">
                            {selectedSubmission.fraud_indicators.has_layers 
                              ? <span className="text-orange-600">Yes (Possible Editing)</span>
                              : <span className="text-green-600">No</span>}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Suspicious Indicators */}
                    {selectedSubmission.fraud_indicators.suspicious_indicators && 
                     selectedSubmission.fraud_indicators.suspicious_indicators.length > 0 && (
                      <div className="mt-4 border-t pt-3">
                        <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-2 flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4" />
                          Suspicious Indicators
                        </p>
                        <ul className="space-y-1">
                          {selectedSubmission.fraud_indicators.suspicious_indicators.map((indicator, idx) => (
                            <li key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                              {indicator}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Student Name</p>
                    <p className="font-medium">
                      {selectedSubmission.student?.full_name || 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Roll Number</p>
                    <p className="font-medium">
                      {selectedSubmission.student?.student_id || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Certificate Code</p>
                    <p className="font-mono font-medium">
                      {selectedSubmission.certificate_code}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Issue Date</p>
                    <p className="font-medium">
                      {new Date(selectedSubmission.issue_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Certificate Title</p>
                    <p className="font-medium">{selectedSubmission.title}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Issuing Organization</p>
                    <p className="font-medium">{selectedSubmission.issuing_organization}</p>
                  </div>
                  {selectedSubmission.description && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Description</p>
                      <p className="font-medium">{selectedSubmission.description}</p>
                    </div>
                  )}
                </div>

                {/* View File Button */}
                {selectedSubmission.file_url && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleViewFile(selectedSubmission)}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Certificate File
                  </Button>
                )}
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setViewDialogOpen(false)}
                disabled={actionLoading}
              >
                Close
              </Button>
              <Button
                variant="destructive"
                onClick={() => selectedSubmission && openRejectDialog(selectedSubmission)}
                disabled={actionLoading}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => selectedSubmission && handleApprove(selectedSubmission)}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Approve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <XCircle className="h-5 w-5" />
                Reject Certificate
              </DialogTitle>
              <DialogDescription>
                Provide a reason for rejecting this certificate submission
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Certificate</p>
                <p className="font-medium">{selectedSubmission?.title}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {selectedSubmission?.certificate_code}
                </p>
              </div>
              <div>
                <Textarea
                  placeholder="Enter rejection reason..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setRejectDialogOpen(false);
                  setRejectionReason('');
                }}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={actionLoading || !rejectionReason.trim()}
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Reject Certificate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
