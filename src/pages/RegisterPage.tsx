import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { UserRole } from '@/types';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('');
  const [section, setSection] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create auth user with metadata (trigger will auto-create profile)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Update profile with additional details
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            student_id: role === 'student' ? studentId : null,
            department: department || null,
            year_of_study: yearOfStudy ? parseInt(yearOfStudy) : null,
            section: role === 'student' ? section || null : null,
          })
          .eq('id', authData.user.id);

        if (updateError) throw updateError;

        toast({
          title: 'Registration successful',
          description: 'Please sign in with your credentials.',
        });

        navigate('/login');
      }
    } catch (error: any) {
      toast({
        title: 'Registration failed',
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
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">Create Account</h1>
          <p className="text-muted-foreground">Register to access the platform</p>
        </div>

        <Card className="animate-fade-in-up backdrop-blur-sm bg-card/80 border-white/20 shadow-2xl hover:shadow-primary/10 transition-shadow duration-500">
          <CardHeader>
            <CardTitle className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">Register</CardTitle>
            <CardDescription>Fill in your details to create an account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={loading}
                  className="transition-all duration-300 focus:scale-[1.01] focus:shadow-lg focus:shadow-primary/10"
                />
              </div>
              <div className="space-y-2">
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
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                    className="transition-all duration-300 focus:scale-[1.01] focus:shadow-lg focus:shadow-primary/10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={(value) => setRole(value as UserRole)} disabled={loading}>
                  <SelectTrigger id="role" className="transition-all duration-300 focus:scale-[1.01] focus:shadow-lg focus:shadow-primary/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="faculty">Faculty</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {role === 'student' && (
                <div className="space-y-2 animate-fade-in-up">
                  <Label htmlFor="studentId">Student ID</Label>
                  <Input
                    id="studentId"
                    type="text"
                    placeholder="CS2021001"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    required
                    disabled={loading}
                    className="transition-all duration-300 focus:scale-[1.01] focus:shadow-lg focus:shadow-primary/10"
                  />
                </div>
              )}
              {role === 'student' && (
                <>
                  <div className="space-y-2 animate-fade-in-up">
                    <Label htmlFor="department">Department <span className="text-destructive">*</span></Label>
                    <Input
                      id="department"
                      type="text"
                      placeholder="Computer Science"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      required
                      disabled={loading}
                      className="transition-all duration-300 focus:scale-[1.01] focus:shadow-lg focus:shadow-primary/10"
                    />
                  </div>
                  <div className="space-y-2 animate-fade-in-up">
                    <Label htmlFor="yearOfStudy">Year of Study <span className="text-destructive">*</span></Label>
                    <Select value={yearOfStudy} onValueChange={setYearOfStudy} disabled={loading} required>
                      <SelectTrigger id="yearOfStudy" className="transition-all duration-300 focus:scale-[1.01] focus:shadow-lg focus:shadow-primary/10">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1st Year</SelectItem>
                        <SelectItem value="2">2nd Year</SelectItem>
                        <SelectItem value="3">3rd Year</SelectItem>
                        <SelectItem value="4">4th Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 animate-fade-in-up">
                    <Label htmlFor="section">Section <span className="text-destructive">*</span></Label>
                    <Input
                      id="section"
                      type="text"
                      placeholder="e.g., A, B, C or Section-1"
                      value={section}
                      onChange={(e) => setSection(e.target.value)}
                      required
                      disabled={loading}
                      className="transition-all duration-300 focus:scale-[1.01] focus:shadow-lg focus:shadow-primary/10"
                    />
                  </div>
                </>
              )}
              {role !== 'student' && (
                <div className="space-y-2 animate-fade-in-up">
                  <Label htmlFor="department">Department (Optional)</Label>
                  <Input
                    id="department"
                    type="text"
                    placeholder="Computer Science"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    disabled={loading}
                    className="transition-all duration-300 focus:scale-[1.01] focus:shadow-lg focus:shadow-primary/10"
                  />
                </div>
              )}
              <Button type="submit" className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg hover:shadow-primary/30 transition-all duration-300 hover:scale-[1.02]" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create account'
                )}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <Button variant="link" onClick={() => navigate('/login')} disabled={loading} className="hover:text-purple-600 transition-colors">
                Already have an account? Sign in
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
