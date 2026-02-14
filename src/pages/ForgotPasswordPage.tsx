import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Mail, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setEmailSent(true);
      toast({
        title: 'Reset email sent',
        description: 'Check your inbox for the password reset link.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-blob" />
      <div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-accent/20 rounded-full blur-3xl animate-blob" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-blob" style={{ animationDelay: '4s' }} />
      
      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="text-center space-y-2 animate-fade-in-down">
          <div className="flex justify-center">
            <div className="w-16 h-16 animate-float">
              <img 
                src="https://res.cloudinary.com/dfnpgl0bb/image/upload/v1771046687/ChatGPT_Image_Feb_14_2026_10_54_24_AM_k20wkr.png" 
                alt="Student Hub Logo" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">Student Hub</h1>
          <p className="text-muted-foreground">Reset your password</p>
        </div>

        <Card className="animate-fade-in-up backdrop-blur-sm bg-card/80 border-white/20 shadow-2xl hover:shadow-primary/10 transition-shadow duration-500">
          <CardHeader>
            <CardTitle className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text flex items-center gap-2">
              {emailSent ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Check your email
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5" />
                  Forgot Password
                </>
              )}
            </CardTitle>
            <CardDescription>
              {emailSent 
                ? "We've sent a password reset link to your email address." 
                : "Enter your email address and we'll send you a reset link."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {emailSent ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    A password reset link has been sent to <strong className="text-foreground">{email}</strong>. 
                    Please check your inbox and spam folder.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setEmailSent(false)}
                >
                  Send another email
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full"
                  onClick={() => navigate('/login')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2 animate-fade-in-left stagger-1">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="student@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="transition-all duration-300 focus:scale-[1.01] focus:shadow-lg focus:shadow-primary/10"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg hover:shadow-primary/30 transition-all duration-300 hover:scale-[1.02] animate-fade-in-up stagger-2" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Reset Link
                    </>
                  )}
                </Button>
                <Button 
                  type="button"
                  variant="ghost" 
                  className="w-full animate-fade-in stagger-3"
                  onClick={() => navigate('/login')}
                  disabled={loading}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to login
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
