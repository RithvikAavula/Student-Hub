import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { StudentRecord, FraudIndicators } from '@/types';
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
import { Progress } from '@/components/ui/progress';
import StatusBadge from './StatusBadge';
import CategoryBadge from './CategoryBadge';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, ExternalLink, Calendar, FileText, Award, GraduationCap, AlertTriangle, Shield, ShieldAlert, ShieldCheck, Settings, Layers, FileSignature, Edit3, User, Type, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getAcademicYearLabel } from '@/lib/academicYear';

// Helper to get risk level display based on fraud score
function getRiskLevelDisplay(fraudScore: number | undefined) {
  const score = fraudScore || 0;
  if (score <= 20) {
    return { label: 'Low Risk', color: 'text-green-600', bgColor: 'bg-green-100', variant: 'default' as const, Icon: ShieldCheck };
  }
  if (score <= 40) {
    return { label: 'Moderate', color: 'text-yellow-600', bgColor: 'bg-yellow-100', variant: 'secondary' as const, Icon: Shield };
  }
  if (score <= 60) {
    return { label: 'Elevated', color: 'text-orange-600', bgColor: 'bg-orange-100', variant: 'secondary' as const, Icon: AlertTriangle };
  }
  if (score <= 80) {
    return { label: 'High Risk', color: 'text-red-600', bgColor: 'bg-red-100', variant: 'destructive' as const, Icon: ShieldAlert };
  }
  return { label: 'Critical', color: 'text-red-700', bgColor: 'bg-red-200', variant: 'destructive' as const, Icon: ShieldAlert };
}

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

          {/* Fraud Analysis Section */}
          {record.analysis_completed && record.certificate_url && (
            <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  {(() => {
                    const riskDisplay = getRiskLevelDisplay(record.fraud_score);
                    const Icon = riskDisplay.Icon;
                    return <Icon className={`h-5 w-5 ${riskDisplay.color}`} />;
                  })()}
                  Document Analysis
                </h4>
                <Badge variant={getRiskLevelDisplay(record.fraud_score).variant}>
                  {getRiskLevelDisplay(record.fraud_score).label}
                </Badge>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Fraud Risk Score</span>
                  <span className={`font-semibold ${(record.fraud_score || 0) >= 60 ? 'text-red-600' : (record.fraud_score || 0) >= 40 ? 'text-orange-600' : 'text-green-600'}`}>
                    {record.fraud_score || 0}/100
                  </span>
                </div>
                <Progress 
                  value={record.fraud_score || 0} 
                  className={`h-3 ${(record.fraud_score || 0) >= 60 ? '[&>div]:bg-red-500' : (record.fraud_score || 0) >= 40 ? '[&>div]:bg-orange-500' : '[&>div]:bg-green-500'}`}
                />
              </div>

              {record.fraud_indicators && (
                <div className="grid gap-2 text-sm">
                  {record.fraud_indicators.creation_software && (
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Created with:</span>
                      <span className="font-medium">{record.fraud_indicators.creation_software}</span>
                    </div>
                  )}
                  
                  {record.fraud_indicators.modification_software && (
                    <div className="flex items-center gap-2">
                      <Edit3 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Modified with:</span>
                      <span className="font-medium text-orange-600">{record.fraud_indicators.modification_software}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <FileSignature className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Digital Signature:</span>
                    <span className={`font-medium ${record.fraud_indicators.has_digital_signature ? 'text-green-600' : 'text-red-600'}`}>
                      {record.fraud_indicators.has_digital_signature ? 'Present' : 'Not Found'}
                    </span>
                  </div>
                  
                  {record.fraud_indicators.has_layers && (
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-orange-500" />
                      <span className="text-orange-600 font-medium">Document contains layers (possible editing)</span>
                    </div>
                  )}
                  
                  {record.fraud_indicators.metadata_stripped && (
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <span className="text-orange-600 font-medium">Metadata has been stripped</span>
                    </div>
                  )}
                  
                  {record.fraud_indicators.suspicious_indicators && record.fraud_indicators.suspicious_indicators.length > 0 && (
                    <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                      <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">Suspicious Indicators:</p>
                      <ul className="text-xs text-red-600 dark:text-red-400 list-disc list-inside">
                        {record.fraud_indicators.suspicious_indicators.map((indicator, i) => (
                          <li key={i}>{indicator}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Name Verification Section */}
                  {record.fraud_indicators.name_verification_status && (
                    <div className={`mt-3 p-3 rounded border ${
                      record.fraud_indicators.name_verification_status === 'verified' 
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                        : record.fraud_indicators.name_verification_status === 'mismatch'
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <User className={`h-4 w-4 ${
                          record.fraud_indicators.name_verification_status === 'verified' ? 'text-green-600' :
                          record.fraud_indicators.name_verification_status === 'mismatch' ? 'text-red-600' : 'text-yellow-600'
                        }`} />
                        <p className={`text-sm font-medium ${
                          record.fraud_indicators.name_verification_status === 'verified' ? 'text-green-700 dark:text-green-400' :
                          record.fraud_indicators.name_verification_status === 'mismatch' ? 'text-red-700 dark:text-red-400' : 'text-yellow-700 dark:text-yellow-400'
                        }`}>
                          Name Verification: {
                            record.fraud_indicators.name_verification_status === 'verified' ? 'VERIFIED' :
                            record.fraud_indicators.name_verification_status === 'mismatch' ? 'MISMATCH DETECTED' :
                            record.fraud_indicators.name_verification_status === 'suspicious' ? 'SUSPICIOUS' : 'Could Not Verify'
                          }
                        </p>
                        {record.fraud_indicators.name_match_score !== undefined && (
                          <Badge variant={record.fraud_indicators.name_match_score >= 90 ? 'default' : record.fraud_indicators.name_match_score >= 70 ? 'secondary' : 'destructive'}>
                            {record.fraud_indicators.name_match_score}% match
                          </Badge>
                        )}
                      </div>
                      
                      {record.fraud_indicators.names_found && record.fraud_indicators.names_found.length > 0 && (
                        <div className="text-xs space-y-1">
                          <span className="text-muted-foreground">Names found in certificate:</span>
                          <ul className="list-disc list-inside ml-2">
                            {record.fraud_indicators.names_found.map((name, i) => (
                              <li key={i} className="font-medium">{name}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Text Analysis Anomalies */}
                  {record.fraud_indicators.text_anomalies && record.fraud_indicators.text_anomalies.length > 0 && (
                    <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-200 dark:border-orange-800">
                      <div className="flex items-center gap-2 mb-1">
                        <Type className="h-4 w-4 text-orange-600" />
                        <p className="text-sm font-medium text-orange-700 dark:text-orange-400">Text Anomalies Detected:</p>
                      </div>
                      <ul className="text-xs text-orange-600 dark:text-orange-400 list-disc list-inside">
                        {record.fraud_indicators.text_anomalies.map((anomaly, i) => (
                          <li key={i}>
                            <span className={anomaly.severity === 'high' ? 'font-bold' : ''}>
                              [{anomaly.severity.toUpperCase()}] {anomaly.description}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {record.fraud_indicators.font_inconsistencies && (
                    <div className="flex items-center gap-2 mt-2">
                      <Type className="h-4 w-4 text-orange-500" />
                      <span className="text-orange-600 font-medium text-sm">Font inconsistencies detected - possible text editing</span>
                    </div>
                  )}
                  
                  {/* Image Edit Detection Section */}
                  {record.fraud_indicators.image_edit_detected !== undefined && (
                    <div className={`mt-3 p-3 rounded border ${
                      record.fraud_indicators.image_edit_detected 
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Edit3 className={`h-4 w-4 ${
                          record.fraud_indicators.image_edit_detected ? 'text-red-600' : 'text-green-600'
                        }`} />
                        <p className={`text-sm font-medium ${
                          record.fraud_indicators.image_edit_detected ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'
                        }`}>
                          Image Edit Detection: {
                            record.fraud_indicators.image_edit_detected 
                              ? '⚠️ EDITING DETECTED' 
                              : '✓ No Editing Detected'
                          }
                        </p>
                        {record.fraud_indicators.image_edit_confidence !== undefined && record.fraud_indicators.image_edit_detected && (
                          <Badge variant="destructive">
                            {record.fraud_indicators.image_edit_confidence}% confidence
                          </Badge>
                        )}
                      </div>
                      
                      {record.fraud_indicators.image_edit_detected && record.fraud_indicators.image_suspicious_regions && 
                       record.fraud_indicators.image_suspicious_regions.length > 0 && (
                        <div className="text-xs space-y-1">
                          <span className="text-red-600 dark:text-red-400">Suspicious regions detected:</span>
                          <ul className="list-disc list-inside ml-2 text-red-500">
                            {record.fraud_indicators.image_suspicious_regions.slice(0, 5).map((region, i) => (
                              <li key={i}>{region}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* QR Code Analysis Section */}
                  {record.fraud_indicators.qr_codes_found !== undefined && (
                    <div className={`mt-3 p-3 rounded border ${
                      record.fraud_indicators.qr_code_status === 'verified'
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                        : record.fraud_indicators.qr_code_status === 'invalid'
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        : record.fraud_indicators.qr_code_status === 'suspicious'
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                        : 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Search className={`h-4 w-4 ${
                          record.fraud_indicators.qr_code_status === 'verified' ? 'text-green-600' :
                          record.fraud_indicators.qr_code_status === 'invalid' ? 'text-red-600' :
                          record.fraud_indicators.qr_code_status === 'suspicious' ? 'text-yellow-600' : 'text-gray-600'
                        }`} />
                        <p className={`text-sm font-medium ${
                          record.fraud_indicators.qr_code_status === 'verified' ? 'text-green-700 dark:text-green-400' :
                          record.fraud_indicators.qr_code_status === 'invalid' ? 'text-red-700 dark:text-red-400' :
                          record.fraud_indicators.qr_code_status === 'suspicious' ? 'text-yellow-700 dark:text-yellow-400' : 'text-gray-700 dark:text-gray-400'
                        }`}>
                          QR Code Analysis: {
                            record.fraud_indicators.qr_codes_found === 0
                              ? 'No QR Codes Found'
                              : record.fraud_indicators.qr_code_status === 'verified'
                              ? '✅ QR Code Verified'
                              : record.fraud_indicators.qr_code_status === 'invalid'
                              ? '🚫 Invalid QR Code'
                              : record.fraud_indicators.qr_code_status === 'suspicious'
                              ? '⚠️ Suspicious QR Code'
                              : 'ℹ️ QR Code Detected'
                          }
                        </p>
                        {record.fraud_indicators.qr_codes_found > 0 && (
                          <Badge variant={
                            record.fraud_indicators.qr_code_status === 'verified' ? 'default' :
                            record.fraud_indicators.qr_code_status === 'invalid' ? 'destructive' :
                            'secondary'
                          }>
                            {record.fraud_indicators.qr_codes_found} QR code{record.fraud_indicators.qr_codes_found !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>

                      {record.fraud_indicators.qr_codes_found === 0 && (
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          No QR codes were detected in this certificate. This is normal for many legitimate certificates.
                        </p>
                      )}

                      {record.fraud_indicators.qr_codes_found > 0 && record.fraud_indicators.qr_code_status !== 'verified' && (
                        <p className="text-xs text-muted-foreground">
                          QR codes were found but could not be verified. This may indicate the certificate is not from an official source or the QR code links to invalid content.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
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
