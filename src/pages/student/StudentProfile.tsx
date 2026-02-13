import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { processAvatarImage } from '@/lib/utils';
import { useRef, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';

export default function StudentProfile() {
  const { user, profile } = useAuth();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const updateUser = useAuthStore((s) => s.updateUser);

  // Use the global user.avatar directly - it's now loaded on auth init
  const avatarUrl = user?.avatar;

  if (!user || !profile) {
    return null;
  }

  // Handle avatar upload
  const handleAvatarUpload = async (file: File) => {
    setUploading(true);
    try {
      const processed = await processAvatarImage(file, 512);
      const safeName = processed.fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const path = `${profile.id}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from('profile')
        .upload(path, processed.blob, {
          upsert: true,
          cacheControl: '3600',
          contentType: processed.contentType,
        });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('profile').getPublicUrl(path);
      const publicUrl = data.publicUrl;
      // Persist avatar_path on profiles
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ avatar_path: path })
        .eq('id', profile.id);
      if (profileErr) throw profileErr;
      // Update global auth state so avatar shows everywhere
      updateUser({ ...user, avatar: publicUrl });
    } catch (err) {
      console.error('Avatar upload failed', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container px-6 md:px-8 py-8">
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Student Profile</h2>
            <p className="text-muted-foreground mt-2">View your account and academic details</p>
          </div>

          <div className="flex items-center gap-4">
            {avatarUrl ? (
              <Dialog>
                <DialogTrigger asChild>
                  <button aria-label="View profile image" className="outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-full">
                    <Avatar className="h-20 w-20 cursor-zoom-in ring-2 ring-primary/20 hover:ring-4 hover:ring-primary/40 transition-all shadow-lg">
                      <AvatarImage className="object-cover object-center" src={avatarUrl} alt={profile.full_name} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground text-2xl font-semibold">
                        {profile.full_name.slice(0,1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] sm:max-w-[90vw] md:max-w-[70vw] lg:max-w-[60vw] p-0 bg-black/95 border-0 overflow-hidden">
                  <div className="relative flex items-center justify-center min-h-[50vh] max-h-[90vh]">
                    <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
                      <Avatar className="h-10 w-10 border-2 border-white/30">
                        <AvatarImage src={avatarUrl} alt={profile.full_name} className="object-cover" />
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                          {profile.full_name.slice(0,1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-white font-medium text-lg drop-shadow-lg">{profile.full_name}</span>
                    </div>
                    <img
                      src={avatarUrl}
                      alt={profile.full_name}
                      className="max-h-[80vh] max-w-full w-auto h-auto object-contain rounded-lg shadow-2xl"
                      style={{ margin: '70px 20px 20px 20px' }}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            ) : (
              <Avatar className="h-20 w-20 ring-2 ring-muted">
                <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground text-2xl font-semibold">
                  {profile.full_name.slice(0,1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            <div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAvatarUpload(file);
              }} />
              <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? 'Uploading...' : 'Upload Profile Picture'}
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Full Name</p>
                <p className="font-medium">{profile.full_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Role</p>
                <p className="font-medium">Student</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Academic</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {profile.student_id && (
                <div>
                  <p className="text-sm text-muted-foreground">Student ID</p>
                  <p className="font-medium">{profile.student_id}</p>
                </div>
              )}
              {profile.department && (
                <div>
                  <p className="text-sm text-muted-foreground">Department</p>
                  <p className="font-medium">{profile.department}</p>
                </div>
              )}
              {typeof profile.year_of_study === 'number' && (
                <div>
                  <p className="text-sm text-muted-foreground">Year of Study</p>
                  <p className="font-medium">{profile.year_of_study}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
