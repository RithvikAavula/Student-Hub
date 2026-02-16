import { useState, useEffect } from 'react';
import {
  getFraudulentCertificatesReport,
  getCertificateStats,
  getCertificateFileUrl,
  type FraudulentCertificateReport,
  type CertificateStats,
} from '@/lib/certificates';
import { FraudIndicators } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
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
  AlertTriangle,
  Shield,
  ShieldAlert,
  RefreshCw,
  Search,
  Eye,
  ExternalLink,
  Loader2,
  BarChart3,
  FileWarning,
  Users,
  Award,
  Clock,
  Settings,
  Calendar,
  User,
  FileSignature,
  Layers,
  Edit3,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

export default function AdminFraudReport() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<FraudulentCertificateReport[]>([]);
  const [stats, setStats] = useState<CertificateStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState<FraudulentCertificateReport | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reportsData, statsData] = await Promise.all([
        getFraudulentCertificatesReport(),
        getCertificateStats(),
      ]);
      setReports(reportsData);
      setStats(statsData);
    } catch (error: any) {
      toast({
        title: 'Error loading fraud report',
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

  const openDetailDialog = (report: FraudulentCertificateReport) => {
    setSelectedReport(report);
    setDetailDialogOpen(true);
  };

  const filteredReports = reports.filter(
    (r) =>
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.certificate_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.student_roll_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort by fraud score (highest first)
  const sortedReports = [...filteredReports].sort((a, b) => 
    (b.fraud_score || 0) - (a.fraud_score || 0)
  );

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_submissions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending_submissions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fake Certificates</CardTitle>
              <ShieldAlert className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.fake_certificates}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tampered Certificates</CardTitle>
              <FileWarning className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.tampered_certificates}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Fraud Report Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Fraudulent Certificate Report
              </CardTitle>
              <CardDescription>
                View all fake and tampered certificate submissions
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
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
                placeholder="Search by title, code, student name, or roll number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : sortedReports.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
              <p className="text-lg font-medium text-green-600">No Fraudulent Certificates Detected</p>
              <p className="text-sm">All certificate submissions appear to be legitimate.</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Certificate</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Fraud Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {sortedReports.map((report) => {
                      const riskDisplay = getRiskLevelDisplay(report.fraud_score);
                      return (
                        <motion.tr
                          key={report.id}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -100 }}
                          className={`hover:bg-muted/50 ${(report.fraud_score || 0) >= 60 ? 'bg-red-50 dark:bg-red-900/10' : ''}`}
                        >
                          <TableCell>
                            <div className="font-medium">{report.student_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {report.student_roll_number}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{report.title}</div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {report.certificate_code}
                            </div>
                          </TableCell>
                          <TableCell>{report.issuing_organization}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge variant={riskDisplay.variant} className="flex items-center gap-1 w-fit">
                                {(report.fraud_score || 0) >= 60 ? (
                                  <AlertTriangle className="h-3 w-3" />
                                ) : (
                                  <Shield className="h-3 w-3" />
                                )}
                                {report.fraud_score || 0}%
                              </Badge>
                              <Progress value={report.fraud_score || 0} className="h-1 w-16" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={report.approval_status === 'rejected' ? 'destructive' : 'secondary'}>
                              {report.approval_status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDetailDialog(report)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Details
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

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Fraudulent Certificate Details
            </DialogTitle>
            <DialogDescription>
              Investigation details for the flagged certificate
            </DialogDescription>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Fraud Risk Score */}
              <div className={`rounded-lg p-4 border ${
                (selectedReport.fraud_score || 0) >= 60 
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  : (selectedReport.fraud_score || 0) >= 40
                  ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                  : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {(selectedReport.fraud_score || 0) >= 60 ? (
                      <ShieldAlert className="h-5 w-5 text-red-500" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                    )}
                    <span className="font-medium">
                      Fraud Risk Score: {selectedReport.fraud_score || 0}/100
                    </span>
                  </div>
                  <Badge variant={getRiskLevelDisplay(selectedReport.fraud_score).variant}>
                    {getRiskLevelDisplay(selectedReport.fraud_score).label}
                  </Badge>
                </div>
                <Progress value={selectedReport.fraud_score || 0} className="h-2 mb-2" />
                <p className="text-sm text-muted-foreground">
                  {(selectedReport.fraud_score || 0) >= 60 
                    ? 'High probability of fraudulent document detected.'
                    : 'Indicators of potential manipulation detected.'}
                </p>
              </div>

              {/* Fraud Indicators */}
              {selectedReport.fraud_indicators && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Document Analysis
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {selectedReport.fraud_indicators.creation_software && (
                      <div className="flex items-start gap-2">
                        <Edit3 className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-muted-foreground">Creation Software</p>
                          <p className="font-medium">{selectedReport.fraud_indicators.creation_software}</p>
                        </div>
                      </div>
                    )}
                    {selectedReport.fraud_indicators.producer && (
                      <div className="flex items-start gap-2">
                        <Settings className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-muted-foreground">PDF Producer</p>
                          <p className="font-medium">{selectedReport.fraud_indicators.producer}</p>
                        </div>
                      </div>
                    )}
                    {selectedReport.fraud_indicators.creation_date && (
                      <div className="flex items-start gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-muted-foreground">Created</p>
                          <p className="font-medium">
                            {new Date(selectedReport.fraud_indicators.creation_date).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                    {selectedReport.fraud_indicators.modification_date && (
                      <div className="flex items-start gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-muted-foreground">Last Modified</p>
                          <p className="font-medium">
                            {new Date(selectedReport.fraud_indicators.modification_date).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-2">
                      <FileSignature className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-muted-foreground">Digital Signature</p>
                        <p className="font-medium">
                          {selectedReport.fraud_indicators.has_digital_signature 
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
                          {selectedReport.fraud_indicators.has_layers 
                            ? <span className="text-orange-600">Yes</span>
                            : <span className="text-green-600">No</span>}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Suspicious Indicators */}
                  {selectedReport.fraud_indicators.suspicious_indicators && 
                   selectedReport.fraud_indicators.suspicious_indicators.length > 0 && (
                    <div className="mt-4 border-t pt-3">
                      <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-2 flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4" />
                        Suspicious Indicators
                      </p>
                      <ul className="space-y-1">
                        {selectedReport.fraud_indicators.suspicious_indicators.map((indicator, idx) => (
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

              {/* Student Information */}
              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Student Information
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Name</p>
                    <p className="font-medium">{selectedReport.student_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Roll Number</p>
                    <p className="font-medium">{selectedReport.student_roll_number}</p>
                  </div>
                </div>
              </div>

              {/* Certificate Details */}
              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Certificate Details
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Title</p>
                    <p className="font-medium">{selectedReport.title}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Certificate Code</p>
                    <p className="font-mono font-medium">{selectedReport.certificate_code}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Issue Date</p>
                    <p className="font-medium">
                      {new Date(selectedReport.issue_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Issuing Organization</p>
                    <p className="font-medium">{selectedReport.issuing_organization}</p>
                  </div>
                  {selectedReport.rejection_reason && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Rejection Reason</p>
                      <p className="font-medium text-red-600">{selectedReport.rejection_reason}</p>
                    </div>
                  )}
                  {selectedReport.reviewed_by_name && (
                    <div>
                      <p className="text-muted-foreground">Reviewed By</p>
                      <p className="font-medium">{selectedReport.reviewed_by_name}</p>
                    </div>
                  )}
                  {selectedReport.reviewed_at && (
                    <div>
                      <p className="text-muted-foreground">Reviewed At</p>
                      <p className="font-medium">
                        {new Date(selectedReport.reviewed_at).toLocaleString()}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground">Approval Status</p>
                    <Badge
                      variant={
                        selectedReport.approval_status === 'rejected'
                          ? 'destructive'
                          : selectedReport.approval_status === 'approved'
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {selectedReport.approval_status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* View File Button */}
              {selectedReport.file_path && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleViewFile(selectedReport.file_path)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Submitted Certificate File
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
