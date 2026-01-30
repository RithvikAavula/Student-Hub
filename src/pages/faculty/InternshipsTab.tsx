import { useEffect, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { listInternships, createInternship, updateInternship, reviewApplication, verifyStudentInternship } from '@/lib/internships';
import type { Internship } from '@/types';
import { supabase } from '@/lib/supabase';
import { CardDescription } from '@/components/ui/card';

export default function InternshipsTab() {
  const [tab, setTab] = useState('postings');
  const [internships, setInternships] = useState<Internship[]>([]);
  const [loadingPost, setLoadingPost] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  // posting form
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const posts = await listInternships(false);
        setInternships(posts);
      } catch (e: any) {
        toast.error(e.message ?? 'Error loading postings');
      }
    })();
  }, []);

  const handleCreate = async () => {
    if (!title || !company || !role) {
      return toast.error('Title, Company, and Role are required');
    }
    setLoadingPost(true);
    setPostError(null);
    try {
      const post = await createInternship({ title, company, role });
      setTitle(''); setCompany(''); setRole('');
      setInternships([post, ...internships]);
      toast.success('Internship posted');
    } catch (e: any) {
      const msg = e?.message || 'Error posting';
      setPostError(msg);
      toast.error(msg);
    } finally {
      setLoadingPost(false);
    }
  };

  const closePosting = async (id: string) => {
    try {
      const updated = await updateInternship(id, { is_open: false });
      setInternships((prev) => prev.map(i => i.id === id ? updated : i));
      toast.success('Posting closed');
    } catch (e: any) {
      toast.error(e.message ?? 'Error closing');
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="postings">Postings</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
          <TabsTrigger value="evaluation">Evaluation</TabsTrigger>
        </TabsList>

        <TabsContent value="postings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Internship Posting</CardTitle>
              <CardDescription className="text-muted-foreground">You must be logged in as Faculty/Admin to post.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Input placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)} />
              <Input placeholder="Role" value={role} onChange={(e) => setRole(e.target.value)} />
              <Button onClick={handleCreate} disabled={loadingPost}>{loadingPost ? 'Posting...' : 'Post'}</Button>
              {postError && <div className="col-span-1 md:col-span-3 text-sm text-red-600">{postError}</div>}
            </CardContent>
          </Card>
          {internships.map((i) => (
            <Card key={i.id}>
              <CardHeader>
                <CardTitle>{i.title} — {i.company}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Role: {i.role}</div>
                {!i.is_open ? <span className="text-xs">Closed</span> : <Button variant="destructive" onClick={() => closePosting(i.id)}>Close</Button>}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="applications" className="space-y-4">
          {/* Minimal listing; in production, filter by faculty-owned postings */}
          <Button onClick={async () => {
            const { data, error } = await supabase.from('internship_applications').select('*').order('applied_at', { ascending: false });
            if (error) return toast.error(error.message);
            toast.message(`Loaded ${data?.length ?? 0} applications`);
          }}>Load Applications</Button>
          <div className="text-sm text-muted-foreground">Use detailed tables and actions to approve/reject.</div>
        </TabsContent>

        <TabsContent value="verification" className="space-y-4">
          <Button onClick={async () => {
            const { data, error } = await supabase.from('student_internships').select('*').order('created_at', { ascending: false });
            if (error) return toast.error(error.message);
            toast.message(`Loaded ${data?.length ?? 0} uploads`);
          }}>Load Self-Uploads</Button>
          <div className="flex gap-2">
            <Input placeholder="Student Internship ID" id="ver_id" />
            <Button onClick={async () => {
              const id = (document.getElementById('ver_id') as HTMLInputElement)?.value;
              if (!id) return toast.error('Enter ID');
              await verifyStudentInternship(id, 'approved');
              toast.success('Marked approved');
            }}>Approve</Button>
            <Button variant="destructive" onClick={async () => {
              const id = (document.getElementById('ver_id') as HTMLInputElement)?.value;
              if (!id) return toast.error('Enter ID');
              await verifyStudentInternship(id, 'rejected');
              toast.success('Marked rejected');
            }}>Reject</Button>
          </div>
        </TabsContent>

        <TabsContent value="evaluation" className="space-y-2">
          <div className="text-sm text-muted-foreground">Hook up evaluation forms and save via service.</div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
