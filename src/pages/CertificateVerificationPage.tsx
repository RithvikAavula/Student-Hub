import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { 
  validateCertificateByFile,
  validateCertificateByCode, 
  getValidationStatusDisplay
} from '@/lib/certificates';
import { CertificateValidationResult, CertificateValidationStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/theme/ThemeProvider';
import { 
  Loader2, 
  Upload, 
  Search, 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Award,
  Calendar,
  User,
  FileText,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';

export default function CertificateVerificationPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [certificateCode, setCertificateCode] = useState('');
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [verificationResult, setVerificationResult] = useState<CertificateValidationResult | null>(null);
  const [verificationMode, setVerificationMode] = useState<'file' | 'code'>('file');

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
      // Auto-verify when file is selected
      handleVerifyByFile(file);
    }
  };

  const handleVerifyByFile = async (file: File) => {
    setLoading(true);
    setVerificationResult(null);

    try {
      const result = await validateCertificateByFile(file, user?.id);
      setVerificationResult(result);
    } catch (error: any) {
      toast({
        title: 'Verification failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certificateCode.trim()) {
      toast({
        title: 'Certificate code required',
        description: 'Please enter the certificate code to verify',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setVerificationResult(null);

    try {
      const result = await validateCertificateByCode(certificateCode.trim(), user?.id);
      setVerificationResult(result);
    } catch (error: any) {
      toast({
        title: 'Verification failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCertificateCode('');
    setCertificateFile(null);
    setVerificationResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getStatusIcon = (status: CertificateValidationStatus) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="h-16 w-16 text-green-500" />;
      case 'fake':
        return <XCircle className="h-16 w-16 text-red-500" />;
      case 'tampered':
        return <AlertTriangle className="h-16 w-16 text-amber-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/">
              <img 
                src="https://res.cloudinary.com/dfnpgl0bb/image/upload/v1771046687/ChatGPT_Image_Feb_14_2026_10_54_24_AM_k20wkr.png" 
                alt="Student Hub Logo" 
                className="h-8 w-8 object-contain"
              />
            </Link>
            <span className="font-semibold text-lg">Certificate Verification</span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-4xl py-8 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Hero Section */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4"
            >
              <Shield className="h-10 w-10 text-primary" />
            </motion.div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Certificate Verification System
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Verify the authenticity of certificates. Simply upload the certificate file and 
              it will be automatically verified against our secure database.
            </p>
          </div>

          {/* Verification Card */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Verify Certificate
              </CardTitle>
              <CardDescription>
                Upload a certificate file to instantly verify its authenticity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs 
                value={verificationMode} 
                onValueChange={(v) => {
                  setVerificationMode(v as 'file' | 'code');
                  setVerificationResult(null);
                }}
              >
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="file" className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Upload File (Automatic)
                  </TabsTrigger>
                  <TabsTrigger value="code" className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Enter Code
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="file">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Upload Certificate</Label>
                      <div className="border-2 border-dashed rounded-lg p-8 hover:border-primary/50 transition-colors bg-muted/30">
                        <input
                          ref={fileInputRef}
                          type="file"
                          id="certificateFileInput"
                          accept=".pdf,.png,.jpg,.jpeg"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <label
                          htmlFor="certificateFileInput"
                          className="cursor-pointer flex flex-col items-center gap-2"
                        >
                          <AnimatePresence mode="wait">
                            {certificateFile ? (
                              <motion.div
                                key="file"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="flex items-center gap-3 text-green-600 dark:text-green-400"
                              >
                                <FileText className="h-12 w-12" />
                                <div className="text-left">
                                  <p className="font-medium">{certificateFile.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {(certificateFile.size / 1024 / 1024).toFixed(2)} MB
                                  </p>
                                  {loading && (
                                    <p className="text-xs text-primary flex items-center gap-1 mt-1">
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                      Verifying...
                                    </p>
                                  )}
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
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-3">
                                  <Upload className="h-8 w-8 text-primary" />
                                </div>
                                <p className="font-medium text-foreground">
                                  Drop your certificate here or click to browse
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  PDF, PNG, or JPEG (max 10MB)
                                </p>
                                <p className="text-xs text-primary mt-2">
                                  Verification happens automatically upon upload
                                </p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </label>
                      </div>
                    </div>

                    {(verificationResult || certificateFile) && (
                      <div className="flex justify-center">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={handleReset}
                          className="flex items-center gap-2"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Verify Another Certificate
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="code">
                  <form onSubmit={handleVerifyByCode} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="code">Certificate Code</Label>
                      <Input
                        id="code"
                        placeholder="e.g., CERT-2026-000001"
                        value={certificateCode}
                        onChange={(e) => setCertificateCode(e.target.value)}
                        className="font-mono text-lg"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter the unique code printed on the certificate
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={loading} className="flex-1">
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          <>
                            <Search className="mr-2 h-4 w-4" />
                            Verify Certificate
                          </>
                        )}
                      </Button>
                      {verificationResult && (
                        <Button type="button" variant="outline" onClick={handleReset}>
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </form>
                </TabsContent>
              </Tabs>

              {/* Verification Result */}
              <AnimatePresence mode="wait">
                {verificationResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 20, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -20, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-6"
                  >
                    <div className={`rounded-lg border-2 p-6 ${getValidationStatusDisplay(verificationResult.status).bgColor} ${getValidationStatusDisplay(verificationResult.status).borderColor}`}>
                      <div className="flex flex-col items-center text-center mb-4">
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: 'spring', stiffness: 200 }}
                        >
                          {getStatusIcon(verificationResult.status)}
                        </motion.div>
                        <motion.h3
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className={`text-2xl font-bold mt-4 ${getValidationStatusDisplay(verificationResult.status).color}`}
                        >
                          {getValidationStatusDisplay(verificationResult.status).label}
                        </motion.h3>
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.3 }}
                          className="text-muted-foreground mt-1"
                        >
                          {verificationResult.message}
                        </motion.p>
                      </div>

                      {verificationResult.status !== 'fake' && verificationResult.certificate && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.4 }}
                          className="grid gap-3 mt-6 p-4 bg-background/50 rounded-lg"
                        >
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-2">
                              <Award className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">Certificate Code</p>
                                <p className="font-mono font-medium">{verificationResult.certificate.certificate_code}</p>
                              </div>
                            </div>
                            {verificationResult.certificate.student_name && (
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Recipient</p>
                                  <p className="font-medium">{verificationResult.certificate.student_name}</p>
                                </div>
                              </div>
                            )}
                            {verificationResult.certificate.title && (
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Title</p>
                                  <p className="font-medium">{verificationResult.certificate.title}</p>
                                </div>
                              </div>
                            )}
                            {verificationResult.certificate.issue_date && (
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Issue Date</p>
                                  <p className="font-medium">
                                    {new Date(verificationResult.certificate.issue_date).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 pt-2 border-t">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Issued By</p>
                              <p className="font-medium">{verificationResult.certificate.issuing_organization}</p>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {verificationResult.status === 'fake' && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.4 }}
                          className="mt-4 p-4 bg-background/50 rounded-lg text-center"
                        >
                          <p className="text-sm text-muted-foreground">
                            {certificateFile ? (
                              <>The uploaded certificate <span className="font-mono font-bold">{certificateFile.name}</span> was not found in our system.</>
                            ) : certificateCode ? (
                              <>The certificate code <span className="font-mono font-bold">{certificateCode}</span> was not found in our system.</>
                            ) : (
                              <>This certificate was not found in our system.</>
                            )}
                            {' '}This certificate may be fraudulent.
                          </p>
                        </motion.div>
                      )}

                      {verificationResult.status === 'tampered' && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.4 }}
                          className="mt-4 p-4 bg-background/50 rounded-lg"
                        >
                          <p className="text-sm text-amber-700 dark:text-amber-300 text-center">
                            <strong>Warning:</strong> The uploaded file does not match the original certificate.
                            The document may have been edited or modified after issuance.
                          </p>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Info Section */}
          <div className="grid md:grid-cols-3 gap-4 mt-8">
            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                  <h3 className="font-semibold text-green-700 dark:text-green-300">VALID</h3>
                </div>
                <p className="text-sm text-green-600 dark:text-green-400">
                  The certificate file matches our records. This is an authentic, verified certificate.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-2">
                  <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                  <h3 className="font-semibold text-red-700 dark:text-red-300">FAKE</h3>
                </div>
                <p className="text-sm text-red-600 dark:text-red-400">
                  The certificate was not found in our system. This document is likely fraudulent.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-2">
                  <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  <h3 className="font-semibold text-amber-700 dark:text-amber-300">TAMPERED</h3>
                </div>
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  The certificate exists but has been modified since issuance. The document is altered.
                </p>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 py-6">
        <div className="container text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Student Hub. All certificates are securely stored and verified.</p>
        </div>
      </footer>
    </div>
  );
}
