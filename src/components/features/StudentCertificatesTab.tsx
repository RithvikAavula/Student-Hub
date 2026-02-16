import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  getStudentCertificates,
  getCertificateFileUrl,
  getApprovalStatusDisplay,
  getValidationStatusDisplay,
  type CertificateSubmission,
} from '@/lib/certificates';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  Plus,
  Eye,
  Loader2,
  Search,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SubmitCertificateDialog from './SubmitCertificateDialog';

export default function StudentCertificatesTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState<CertificateSubmission[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateSubmission | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadCertificates();
    }
  }, [user]);

  const loadCertificates = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const data = await getStudentCertificates(user.id);
      setCertificates(data);
    } catch (error: any) {
      toast({
        title: 'Error loading certificates',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewFile = async (filePath: string) => {
    try {
      const url = await getCertificateFileUrl(filePath);
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

  const openViewDialog = (certificate: CertificateSubmission) => {
    setSelectedCertificate(certificate);
    setViewDialogOpen(true);
  };

  const getApprovalIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getValidationIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <Shield className="h-4 w-4 text-green-500" />;
      case 'fake':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'tampered':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default:
        return <HelpCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const filteredCertificates = certificates.filter(
    (c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.certificate_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.issuing_organization.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group certificates by status
  const pendingCertificates = filteredCertificates.filter((c) => c.approval_status === 'pending');
  const approvedCertificates = filteredCertificates.filter((c) => c.approval_status === 'approved');
  const rejectedCertificates = filteredCertificates.filter((c) => c.approval_status === 'rejected');

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                My Certificates
              </CardTitle>
              <CardDescription>
                Submit and track your certificate validations
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadCertificates} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button size="sm" onClick={() => setSubmitDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Submit Certificate
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-yellow-600">{pendingCertificates.length}</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">Pending Review</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{approvedCertificates.length}</p>
              <p className="text-sm text-green-700 dark:text-green-300">Approved</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{rejectedCertificates.length}</p>
              <p className="text-sm text-red-700 dark:text-red-300">Rejected</p>
            </div>
          </div>

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

          {/* Certificates Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCertificates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No certificates submitted yet</p>
              <p className="text-sm mb-4">Submit your first certificate for validation</p>
              <Button onClick={() => setSubmitDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Submit Certificate
              </Button>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Certificate</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Validation</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filteredCertificates.map((certificate) => {
                      const approval = getApprovalStatusDisplay(certificate.approval_status);
                      const validation = getValidationStatusDisplay(certificate.validation_status);
                      return (
                        <motion.tr
                          key={certificate.id}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -100 }}
                          className="hover:bg-muted/50"
                        >
                          <TableCell>
                            <div className="font-medium">{certificate.title}</div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {certificate.certificate_code}
                            </div>
                          </TableCell>
                          <TableCell>{certificate.issuing_organization}</TableCell>
                          <TableCell>
                            <Badge
                              variant={validation.variant as any}
                              className="flex items-center gap-1 w-fit"
                            >
                              {getValidationIcon(certificate.validation_status)}
                              {validation.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={approval.variant as any}
                              className="flex items-center gap-1 w-fit"
                            >
                              {getApprovalIcon(certificate.approval_status)}
                              {approval.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(certificate.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openViewDialog(certificate)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Certificate Details
            </DialogTitle>
            <DialogDescription>View your certificate submission details</DialogDescription>
          </DialogHeader>
          {selectedCertificate && (
            <div className="space-y-4">
              {/* Status Alerts */}
              {selectedCertificate.approval_status === 'rejected' && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className="h-5 w-5 text-red-500" />
                    <p className="font-medium text-red-700 dark:text-red-300">
                      Certificate Rejected
                    </p>
                  </div>
                  {selectedCertificate.rejection_reason && (
                    <p className="text-sm text-red-600 dark:text-red-400 ml-7">
                      Reason: {selectedCertificate.rejection_reason}
                    </p>
                  )}
                </div>
              )}

              {selectedCertificate.approval_status === 'approved' && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <p className="font-medium text-green-700 dark:text-green-300">
                    Certificate Approved
                  </p>
                </div>
              )}

              {selectedCertificate.approval_status === 'pending' && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 flex items-center gap-3">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  <p className="font-medium text-yellow-700 dark:text-yellow-300">
                    Pending Faculty Review
                  </p>
                </div>
              )}

              {/* Validation Status */}
              {selectedCertificate.validation_status === 'valid' && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center gap-3">
                  <Shield className="h-5 w-5 text-blue-500" />
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Certificate verified against our database
                  </p>
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Certificate Title</p>
                  <p className="font-medium">{selectedCertificate.title}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Certificate Code</p>
                  <p className="font-mono font-medium">{selectedCertificate.certificate_code}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Issue Date</p>
                  <p className="font-medium">
                    {new Date(selectedCertificate.issue_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Issuing Organization</p>
                  <p className="font-medium">{selectedCertificate.issuing_organization}</p>
                </div>
                {selectedCertificate.description && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="font-medium">{selectedCertificate.description}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Submitted</p>
                  <p className="font-medium">
                    {new Date(selectedCertificate.created_at).toLocaleString()}
                  </p>
                </div>
                {selectedCertificate.reviewed_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Reviewed</p>
                    <p className="font-medium">
                      {new Date(selectedCertificate.reviewed_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {/* View File Button */}
              {selectedCertificate.file_url && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleViewFile(selectedCertificate.file_url!)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Certificate File
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Submit Certificate Dialog */}
      <SubmitCertificateDialog
        open={submitDialogOpen}
        onOpenChange={setSubmitDialogOpen}
        onSuccess={loadCertificates}
      />
    </div>
  );
}
