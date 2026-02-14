import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError) throw profileError;

        // Convert avatar_path to public URL if it exists
        let avatarUrl = data.user.user_metadata?.avatar_url;
        const avatarPath = (profileData as any).avatar_path as string | undefined;
        if (avatarPath) {
          const { data: urlData } = supabase.storage.from('profile').getPublicUrl(avatarPath);
          if (urlData?.publicUrl) {
            avatarUrl = urlData.publicUrl;
          }
        }

        const authUser = {
          id: data.user.id,
          email: data.user.email!,
          username: profileData.full_name,
          avatar: avatarUrl,
        };

        login(authUser, profileData);
        navigate('/dashboard');
      }
    } catch (error: any) {
      toast({
        title: 'Login failed',
        description: error.message,
        variant: 'destructive',
      });
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
          <p className="text-muted-foreground">Sign in to access your dashboard</p>
        </div>

        <Card className="animate-fade-in-up backdrop-blur-sm bg-card/80 border-white/20 shadow-2xl hover:shadow-primary/10 transition-shadow duration-500">
          <CardHeader>
            <CardTitle className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">Welcome back</CardTitle>
            <CardDescription>Enter your credentials to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
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
              <div className="space-y-2 animate-fade-in-left stagger-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="transition-all duration-300 focus:scale-[1.01] focus:shadow-lg focus:shadow-primary/10"
                />
              </div>
              <Button type="submit" className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg hover:shadow-primary/30 transition-all duration-300 hover:scale-[1.02] animate-fade-in-up stagger-3" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>
            <div className="mt-4 text-center animate-fade-in stagger-4">
              <Button variant="link" onClick={() => navigate('/register')} disabled={loading} className="hover:text-purple-600 transition-colors">
                Don't have an account? Register
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
