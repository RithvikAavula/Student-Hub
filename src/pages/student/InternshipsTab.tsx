import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { listInternships, applyToInternship, listMyApplications, uploadStudentInternship, listMyStudentInternships } from '@/lib/internships';
import type { Internship, InternshipApplication, StudentInternship } from '@/types';

export default function InternshipsTab() {
  const [tab, setTab] = useState('browse');
  const [internships, setInternships] = useState<Internship[]>([]);
  const [applications, setApplications] = useState<InternshipApplication[]>([]);
  const [selfInternships, setSelfInternships] = useState<StudentInternship[]>([]);

  // self-upload form state
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [duration, setDuration] = useState('');
  const [externalUrl, setExternalUrl] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [posts, apps, selfs] = await Promise.all([
          listInternships(true),
          listMyApplications(),
          listMyStudentInternships(),
        ]);
        setInternships(posts);
        setApplications(apps);
        setSelfInternships(selfs);
      } catch (e: any) {
        toast.error(e.message ?? 'Error loading internships');
      }
    })();
  }, []);

  const handleApply = async (id: string) => {
    try {
      await applyToInternship(id);
      toast.success('Applied successfully');
      const apps = await listMyApplications();
      setApplications(apps);
    } catch (e: any) {
      toast.error(e.message ?? 'Error applying');
    }
  };

  const handleSelfUpload = async () => {
    try {
      await uploadStudentInternship({ company, role, duration, external_url: externalUrl });
      toast.success('Submitted for verification');
      setCompany(''); setRole(''); setDuration(''); setExternalUrl('');
      const selfs = await listMyStudentInternships();
      setSelfInternships(selfs);
    } catch (e: any) {
      toast.error(e.message ?? 'Error submitting');
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="browse">Browse & Apply</TabsTrigger>
          <TabsTrigger value="uploads">My Uploads</TabsTrigger>
          <TabsTrigger value="submit">Submit External Internship</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4">
          {internships.map((i) => (
            <Card key={i.id}>
              <CardHeader>
                <CardTitle>{i.title} — {i.company}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Role: {i.role}</div>
                  {i.eligibility && <div className="text-sm">Eligibility: {i.eligibility}</div>}
                  {i.deadline && <div className="text-sm">Deadline: {new Date(i.deadline).toLocaleDateString()}</div>}
                </div>
                <Button onClick={() => handleApply(i.id)}>Apply</Button>
              </CardContent>
            </Card>
          ))}
          <div className="mt-4">
            <h4 className="font-semibold">My Applications</h4>
            <ul className="list-disc ml-6 text-sm">
              {applications.map((a) => (
                <li key={a.id}>#{a.id.slice(0,8)} — {a.status}</li>
              ))}
            </ul>
          </div>
        </TabsContent>

        <TabsContent value="uploads" className="space-y-2">
          <h4 className="font-semibold">My Self-uploaded Internships</h4>
          <ul className="list-disc ml-6 text-sm">
            {selfInternships.map((si) => (
              <li key={si.id}>{si.company} — {si.role} ({si.status})</li>
            ))}
          </ul>
        </TabsContent>

        <TabsContent value="submit" className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)} />
            <Input placeholder="Role" value={role} onChange={(e) => setRole(e.target.value)} />
            <Input placeholder="Duration" value={duration} onChange={(e) => setDuration(e.target.value)} />
            <Input placeholder="External URL" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} />
          </div>
          <Button onClick={handleSelfUpload}>Submit for Verification</Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
