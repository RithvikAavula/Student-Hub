import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { StudentRecord, Profile, RecordStatus, RecordCategory } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Filter } from 'lucide-react';
import StatusBadge from '@/components/features/StatusBadge';
import CategoryBadge from '@/components/features/CategoryBadge';
import RecordDetailsDialog from '@/components/features/RecordDetailsDialog';

interface RecordWithStudent extends StudentRecord {
  student?: Profile;
}

export default function RecordsTab() {
  const [records, setRecords] = useState<RecordWithStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<RecordWithStudent | null>(null);
  const [statusFilter, setStatusFilter] = useState<RecordStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<RecordCategory | 'all'>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    setErrorMsg(null);
    const { data, error } = await supabase
      .from('student_records')
      .select(`*, student:profiles!student_records_student_id_fkey(*)`)
      .order('created_at', { ascending: false });

    console.debug('[Admin RecordsTab] fetchRecords', { dataLength: (data || []).length, error });
    if (error) {
      setErrorMsg(error.message || JSON.stringify(error));
      setRecords([]);
    } else {
      setRecords(data || []);
    }
    setLoading(false);
  };

  const availableYears = Array.from(new Set(records.map(r => r.student?.year_of_study).filter(Boolean))).sort() as number[];
  const availableSections = Array.from(new Set(records.map(r => r.student?.section).filter(Boolean))).sort() as string[];

  const filteredRecords = records.filter(r => {
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || r.category === categoryFilter;
    const matchesYear = yearFilter === 'all' || r.student?.year_of_study?.toString() === yearFilter;
    const matchesSection = sectionFilter === 'all' || r.student?.section === sectionFilter;
    const matchesSearch =
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.student?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.student?.student_id?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesCategory && matchesYear && matchesSection && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">Showing <span className="font-semibold text-slate-900">{records.length}</span> records</div>
              {errorMsg && (
                <div className="ml-4 w-full md:w-auto">
                  <Alert>
                    <AlertDescription>
                      <span className="font-medium">Data load error:</span> {errorMsg}. Ensure your .env is present and restart the dev server.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="relative flex-1">
                <label className="block text-xs font-semibold mb-1 text-slate-600">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="By student name, ID, or record title..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2 items-end flex-wrap">
                <div className="flex flex-col">
                  <label className="text-xs font-semibold mb-1 text-slate-600">Status</label>
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="border rounded px-2 py-1 text-sm min-w-[110px]">
                    <option value="all">All</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-semibold mb-1 text-slate-600">Category</label>
                  <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as any)} className="border rounded px-2 py-1 text-sm min-w-[110px]">
                    <option value="all">All</option>
                    <option value="academic">Academic</option>
                    <option value="technical">Technical</option>
                    <option value="sports">Sports</option>
                    <option value="cultural">Cultural</option>
                    <option value="social">Social</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-semibold mb-1 text-slate-600">Year</label>
                  <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} className="border rounded px-2 py-1 text-sm min-w-[90px]">
                    <option value="all">All</option>
                    {availableYears.map(y => (
                      <option key={y} value={y}>{`Year ${y}`}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-semibold mb-1 text-slate-600">Section</label>
                  <select value={sectionFilter} onChange={e => setSectionFilter(e.target.value)} className="border rounded px-2 py-1 text-sm min-w-[90px]">
                    <option value="all">All</option>
                    {availableSections.map(s => (
                      <option key={s} value={s}>{`Section ${s}`}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col justify-end">
                  <button
                    type="button"
                    onClick={() => { setStatusFilter('all'); setCategoryFilter('all'); setYearFilter('all'); setSectionFilter('all'); }}
                    className="text-xs px-2 py-1 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600"
                  >
                    Clear Filters
                  </button>
                </div>
                <div className="flex flex-col justify-end">
                  <button
                    type="button"
                    onClick={fetchRecords}
                    className="text-xs px-2 py-1 rounded border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {filteredRecords.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-slate-500">No records found.</p>
              </CardContent>
            </Card>
          ) : (
            filteredRecords.map(record => (
              <Card key={record.id} className="border border-slate-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {record.title}
                    <StatusBadge status={record.status} />
                    <CategoryBadge category={record.category} />
                    <Badge variant="secondary">{record.student?.full_name}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row md:items-center md:gap-6 gap-2">
                    <div className="flex-1">
                      <div className="text-sm text-slate-600 mb-2">
                        <span className="font-medium">Student ID:</span> {record.student?.student_id || 'N/A'}
                        {' | '}
                        <span className="font-medium">Year:</span> {record.student?.year_of_study || 'N/A'}
                        {' | '}
                        <span className="font-medium">Section:</span> {record.student?.section || 'N/A'}
                      </div>
                      <div className="text-xs text-slate-500 mb-2">
                        Submitted: {new Date(record.created_at).toLocaleString()}
                      </div>
                      {record.certificate_url && (
                        <Button variant="outline" asChild className="mt-2">
                          <a href={record.certificate_url} target="_blank" rel="noopener noreferrer">
                            View Certificate
                          </a>
                        </Button>
                      )}
                    </div>
                    <Button variant="secondary" onClick={() => setSelectedRecord(record)}>
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
      {selectedRecord && (
        <RecordDetailsDialog
          record={selectedRecord}
          open={!!selectedRecord}
          onOpenChange={() => setSelectedRecord(null)}
        />
      )}
    </div>
  );
}
