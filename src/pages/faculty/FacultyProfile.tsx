import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { processAvatarImage } from '@/lib/utils';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';

export default function FacultyProfile() {
  const { user, profile } = useAuth();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [localAvatar, setLocalAvatar] = useState<string | undefined>(user?.avatar);
  const updateUser = useAuthStore((s) => s.updateUser);

  useEffect(() => {
    const path = (profile as any)?.avatar_path as string | undefined;
    if (!localAvatar && path) {
      const { data } = supabase.storage.from('profile').getPublicUrl(path);
      const url = data.publicUrl;
      setLocalAvatar(url);
      updateUser({ ...user, avatar: url });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(profile as any)?.avatar_path]);

  if (!user || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container px-6 md:px-8 py-8">
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Faculty Profile</h2>
            <p className="text-muted-foreground mt-2">View your account and department details</p>
          </div>

          <div className="flex items-center gap-4">
            {localAvatar ? (
              <Dialog>
                <DialogTrigger asChild>
                  <button aria-label="View profile image" className="outline-none">
                    <Avatar className="h-16 w-16 cursor-zoom-in ring-1 ring-border hover:ring-2 hover:ring-primary/50 transition">
                      <AvatarImage className="object-cover object-center" src={localAvatar} alt={profile.full_name} />
                      <AvatarFallback>{profile.full_name.slice(0,1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-[90vw] p-2 sm:p-4">
                  <img
                    src={localAvatar}
                    alt={profile.full_name}
                    className="max-h-[80vh] w-auto mx-auto rounded-md object-contain"
                  />
                </DialogContent>
              </Dialog>
            ) : (
              <Avatar className="h-16 w-16">
                <AvatarFallback>{profile.full_name.slice(0,1).toUpperCase()}</AvatarFallback>
              </Avatar>
            )}
            <div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploading(true);
                try {
                  const processed = await processAvatarImage(file, 512);
                  const safeName = processed.fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
                  const path = `${profile.id}/${Date.now()}-${safeName}`;
                  const { error: upErr } = await supabase.storage
                    .from('profile')
                    .upload(path, processed.blob, { upsert: true, cacheControl: '3600', contentType: processed.contentType });
                  if (upErr) throw upErr;
                  const { data } = supabase.storage.from('profile').getPublicUrl(path);
                  const publicUrl = data.publicUrl;
                  const { error: profileErr } = await supabase
                    .from('profiles')
                    .update({ avatar_path: path })
                    .eq('id', profile.id);
                  if (profileErr) throw profileErr;
                  setLocalAvatar(publicUrl);
                  updateUser({ ...user, avatar: publicUrl });
                } catch (err) {
                  console.error('Avatar upload failed', err);
                } finally {
                  setUploading(false);
                }
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
                <p className="font-medium">Faculty</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Department</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {profile.department && (
                <div>
                  <p className="text-sm text-muted-foreground">Department</p>
                  <p className="font-medium">{profile.department}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
